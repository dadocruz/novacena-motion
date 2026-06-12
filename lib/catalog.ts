/**
 * Catálogo de Registros & Distribuição (aba /registros).
 *
 * Guarda, POR USUÁRIO, os clientes (artistas atendidos pela equipe) e os
 * lançamentos (release + faixas + obra autoral + fonograma) prontos para o
 * operador registrar na Abramus e distribuir na agregadora (ONErpm, OFstep...).
 *
 * Armazenamento: data/users/catalog/{userId}.json — fica dentro de data/users
 * de propósito: esse diretório é bind mount na VPS, então persiste no deploy.
 * Tokens de aprovação (link público pro artista) ficam num índice próprio.
 *
 * Credenciais de agregadora são criptografadas com AES-256-GCM. A chave deriva
 * de NOVACENA_AUTH_SECRET — sem ela em produção, segredo aleatório por processo
 * (mesma política de lib/saasUsers): dados antigos ficam ilegíveis após restart.
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { DATA_DIR, uid } from './storage';

const CATALOG_DIR = path.join(DATA_DIR, 'users', 'catalog');
const APPROVALS_FILE = path.join(CATALOG_DIR, '_approvals.json');

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type AggregatorCredential = {
  id: string;
  /** onerpm | ofstep | distrokid | tunecore | cdbaby | symphonic | altafonte | outra */
  platform: string;
  /** rótulo livre, ex.: "Conta Gaveta principal" */
  label?: string;
  login: string;
  /** AES-256-GCM (v1:iv:tag:ct em base64) — nunca sai da API em texto puro */
  passwordEnc?: string;
  notes?: string;
  updatedAt: string;
};

export type CatalogClient = {
  id: string;
  /** nome artístico */
  name: string;
  fullName?: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  notes?: string;
  credentials: AggregatorCredential[];
  createdAt: string;
  updatedAt: string;
};

export type WorkRole = 'compositor_autor' | 'versionista' | 'editora';

export type WorkParticipant = {
  name: string;
  cpf?: string;
  role: WorkRole;
  association?: string;
  percent: number;
};

export type PhonoCategory = 'interprete' | 'musico' | 'produtor_fonografico';

export type PhonoParticipant = {
  name: string;
  cpf?: string;
  category: PhonoCategory;
  instrument?: string;
  association?: string;
  percent: number;
};

export type CatalogTrack = {
  id: string;
  title: string;
  /** original | acustica | remix | ao_vivo | playback | outra */
  version?: string;
  durationSec?: number;
  explicit: boolean;
  instrumental: boolean;
  language?: string;
  audioUrl?: string;
  audioName?: string;
  audioFormat?: string;
  lyrics?: string;
  isrc?: string;
  isrcAuto?: boolean;
  composers: WorkParticipant[];
  phonogram: PhonoParticipant[];
};

export type ReleaseStatus =
  | 'rascunho'
  | 'aguardando_artista'
  | 'aprovado'
  | 'registrado'
  | 'distribuido';

export const RELEASE_STATUSES: ReleaseStatus[] = [
  'rascunho',
  'aguardando_artista',
  'aprovado',
  'registrado',
  'distribuido',
];

export type ReleaseApproval = {
  token: string;
  createdAt: string;
  approvedAt?: string;
  approvedName?: string;
  approvedIp?: string;
  artistNotes?: string;
};

export type CatalogRelease = {
  id: string;
  clientId?: string;
  title: string;
  type: 'single' | 'ep' | 'album';
  mainArtist: string;
  featuring?: string;
  label?: string;
  genre?: string;
  subgenre?: string;
  language?: string;
  releaseDate?: string; // YYYY-MM-DD
  coverUrl?: string;
  coverInfo?: { width: number; height: number; format?: string };
  upc?: string;
  distributor?: string;
  distributorNote?: string;
  tracks: CatalogTrack[];
  status: ReleaseStatus;
  approval?: ReleaseApproval;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogSettings = {
  /** prefixo ISRC do produtor fonográfico: país + registrante, ex. BRGCA */
  isrcPrefix?: string;
  defaultLabel?: string;
  defaultProducer?: string;
};

export type UserCatalog = {
  clients: CatalogClient[];
  releases: CatalogRelease[];
  settings: CatalogSettings;
  /** último sequencial de ISRC emitido por ano (chave = 2 dígitos do ano) */
  isrcCounters: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function userFile(userId: string) {
  // userId vem do cookie de sessão assinado, mas sanitiza por castidade
  const safe = String(userId).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
  return path.join(CATALOG_DIR, `${safe}.json`);
}

const EMPTY_CATALOG: UserCatalog = {
  clients: [],
  releases: [],
  settings: {},
  isrcCounters: {},
};

export async function loadCatalog(userId: string): Promise<UserCatalog> {
  try {
    const raw = await readFile(userFile(userId), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<UserCatalog>;
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      releases: Array.isArray(parsed.releases) ? parsed.releases : [],
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
      isrcCounters:
        parsed.isrcCounters && typeof parsed.isrcCounters === 'object'
          ? (parsed.isrcCounters as Record<string, number>)
          : {},
    };
  } catch {
    return JSON.parse(JSON.stringify(EMPTY_CATALOG)) as UserCatalog;
  }
}

export async function saveCatalog(userId: string, catalog: UserCatalog): Promise<void> {
  await mkdir(CATALOG_DIR, { recursive: true });
  await writeFile(userFile(userId), JSON.stringify(catalog, null, 2), 'utf-8');
}

export { uid };

// ---------------------------------------------------------------------------
// Criptografia de credenciais (AES-256-GCM)
// ---------------------------------------------------------------------------

let processSecret: string | null = null;

function catalogKey(): Buffer {
  let secret = process.env.NOVACENA_AUTH_SECRET || process.env.NOVACENA_SAAS_PASSWORD || '';
  if (!secret || secret.length < 16) {
    if (!processSecret) {
      processSecret = randomBytes(32).toString('hex');
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          '[SECURITY] NOVACENA_AUTH_SECRET ausente — credenciais do catálogo usarão chave por processo (ilegíveis após restart).'
        );
      }
    }
    secret = processSecret;
  }
  return createHash('sha256').update(`novacena-catalog:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', catalogKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptSecret(enc: string): string | null {
  try {
    const [v, ivB64, tagB64, ctB64] = enc.split(':');
    if (v !== 'v1') return null;
    const decipher = createDecipheriv('aes-256-gcm', catalogKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const out = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
    return out.toString('utf-8');
  } catch {
    return null;
  }
}

export type CredentialInput = {
  id?: string;
  platform?: string;
  label?: string;
  login?: string;
  password?: string;
  notes?: string;
};

/**
 * Monta a lista de credenciais a partir do payload do browser, preservando a
 * senha criptografada existente quando o campo vem vazio (não trocar).
 */
export function buildCredentials(
  inputs: CredentialInput[] | undefined,
  existing: AggregatorCredential[]
): AggregatorCredential[] {
  if (!Array.isArray(inputs)) return existing;
  const byId = new Map(existing.map((c) => [c.id, c]));
  const now = new Date().toISOString();
  const out: AggregatorCredential[] = [];
  for (const input of inputs.slice(0, 20)) {
    const platform = String(input.platform || '').trim().slice(0, 40);
    const prev = input.id ? byId.get(String(input.id)) : undefined;
    // login vazio numa credencial existente = manter o atual (mesma regra da senha)
    const login = String(input.login || '').trim().slice(0, 160) || prev?.login || '';
    if (!platform || !login) continue;
    const password = typeof input.password === 'string' ? input.password : '';
    out.push({
      id: prev?.id || uid('cred_'),
      platform,
      label: String(input.label || '').trim().slice(0, 80),
      login,
      passwordEnc: password ? encryptSecret(password.slice(0, 200)) : prev?.passwordEnc,
      notes: String(input.notes || '').trim().slice(0, 500),
      updatedAt: password || !prev ? now : prev.updatedAt,
    });
  }
  return out;
}

/** "estudionovacena@gmail.com" -> "es•••••••@gmail.com" */
export function maskLogin(login: string): string {
  const v = String(login || '');
  if (!v) return '';
  const at = v.indexOf('@');
  if (at > 1) return `${v.slice(0, 2)}${'•'.repeat(Math.max(3, at - 2))}${v.slice(at)}`;
  if (v.length <= 4) return '•'.repeat(v.length || 4);
  return `${v.slice(0, 2)}${'•'.repeat(v.length - 4)}${v.slice(-2)}`;
}

/** Versão segura de um cliente pra ir pro browser: senha nunca, login mascarado. */
export function clientForApi(client: CatalogClient) {
  return {
    ...client,
    credentials: client.credentials.map((c) => ({
      id: c.id,
      platform: c.platform,
      label: c.label || '',
      loginMasked: maskLogin(c.login),
      hasPassword: Boolean(c.passwordEnc),
      notes: c.notes || '',
      updatedAt: c.updatedAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// ISRC
// ---------------------------------------------------------------------------

/** Normaliza "br-gca" / "BR GCA" -> "BRGCA". Retorna null se inválido. */
export function normalizeIsrcPrefix(input: string): string | null {
  const v = String(input || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  if (!/^[A-Z]{2}[A-Z0-9]{3}$/.test(v)) return null;
  return v;
}

export function isValidIsrc(input: string): boolean {
  const v = String(input || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  return /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(v);
}

export function normalizeIsrc(input: string): string {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

/** "BRGCA2600136" -> "BR-GCA-26-00136" */
export function formatIsrc(code: string): string {
  const v = normalizeIsrc(code);
  if (!isValidIsrc(v)) return code;
  return `${v.slice(0, 2)}-${v.slice(2, 5)}-${v.slice(5, 7)}-${v.slice(7)}`;
}

/**
 * Emite o próximo ISRC do prefixo configurado. Mutates catalog.isrcCounters —
 * o chamador é responsável por persistir com saveCatalog. Sequencial nunca é
 * reaproveitado (regra do padrão ISRC), mesmo se a faixa for apagada depois.
 */
export function allocateIsrc(catalog: UserCatalog): { isrc?: string; error?: string } {
  const prefix = normalizeIsrcPrefix(catalog.settings.isrcPrefix || '');
  if (!prefix) {
    return {
      error:
        'Configure o prefixo ISRC nas Configurações (ex.: BRGCA — código de produtor fonográfico obtido na Abramus/UBC).',
    };
  }
  const yy = String(new Date().getFullYear() % 100).padStart(2, '0');
  const allocated = new Set(
    catalog.releases.flatMap((r) => r.tracks.map((t) => normalizeIsrc(t.isrc || ''))).filter(Boolean)
  );
  let seq = Math.max(0, Math.floor(catalog.isrcCounters[yy] || 0));
  let candidate = '';
  do {
    seq += 1;
    if (seq > 99999) return { error: `Sequencial ISRC do ano ${yy} esgotado (99999).` };
    candidate = `${prefix}${yy}${String(seq).padStart(5, '0')}`;
  } while (allocated.has(candidate));
  catalog.isrcCounters[yy] = seq;
  return { isrc: candidate };
}

// ---------------------------------------------------------------------------
// Tokens de aprovação (link público do artista)
// ---------------------------------------------------------------------------

type ApprovalIndex = Record<string, { userId: string; releaseId: string; createdAt: string }>;

async function loadApprovals(): Promise<ApprovalIndex> {
  try {
    const raw = await readFile(APPROVALS_FILE, 'utf-8');
    return JSON.parse(raw) as ApprovalIndex;
  } catch {
    return {};
  }
}

async function saveApprovals(index: ApprovalIndex): Promise<void> {
  await mkdir(CATALOG_DIR, { recursive: true });
  await writeFile(APPROVALS_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

export async function registerApprovalToken(userId: string, releaseId: string): Promise<string> {
  const index = await loadApprovals();
  // remove tokens antigos do mesmo release (regenerar = invalidar o anterior)
  for (const [token, entry] of Object.entries(index)) {
    if (entry.userId === userId && entry.releaseId === releaseId) delete index[token];
  }
  const token = randomBytes(18).toString('base64url');
  index[token] = { userId, releaseId, createdAt: new Date().toISOString() };
  await saveApprovals(index);
  return token;
}

export async function resolveApprovalToken(
  token: string
): Promise<{ userId: string; releaseId: string } | null> {
  if (!token || token.length < 10 || token.length > 64) return null;
  const index = await loadApprovals();
  const entry = index[token];
  return entry ? { userId: entry.userId, releaseId: entry.releaseId } : null;
}

/** Usado ao excluir um release — o link público morre junto. */
export async function revokeApprovalTokens(userId: string, releaseId: string): Promise<void> {
  const index = await loadApprovals();
  let changed = false;
  for (const [token, entry] of Object.entries(index)) {
    if (entry.userId === userId && entry.releaseId === releaseId) {
      delete index[token];
      changed = true;
    }
  }
  if (changed) await saveApprovals(index);
}

/** O que o artista vê no link público (sem notas internas / sem credenciais). */
export function releaseForArtist(release: CatalogRelease, clientName?: string) {
  return {
    id: release.id,
    title: release.title,
    type: release.type,
    mainArtist: release.mainArtist,
    featuring: release.featuring || '',
    label: release.label || '',
    genre: release.genre || '',
    subgenre: release.subgenre || '',
    language: release.language || '',
    releaseDate: release.releaseDate || '',
    coverUrl: release.coverUrl || '',
    status: release.status,
    clientName: clientName || '',
    approval: release.approval
      ? {
          approvedAt: release.approval.approvedAt || '',
          approvedName: release.approval.approvedName || '',
          artistNotes: release.approval.artistNotes || '',
        }
      : null,
    tracks: release.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      version: t.version || '',
      explicit: t.explicit,
      instrumental: t.instrumental,
      durationSec: t.durationSec || 0,
      audioUrl: t.audioUrl || '',
      lyrics: t.lyrics || '',
      isrc: t.isrc ? formatIsrc(t.isrc) : '',
      composers: t.composers.map((c) => ({
        name: c.name,
        role: c.role,
        percent: c.percent,
      })),
      phonogram: t.phonogram.map((p) => ({
        name: p.name,
        category: p.category,
        instrument: p.instrument || '',
        percent: p.percent,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Normalização de payloads do browser
// ---------------------------------------------------------------------------

const WORK_ROLES: WorkRole[] = ['compositor_autor', 'versionista', 'editora'];
const PHONO_CATEGORIES: PhonoCategory[] = ['interprete', 'musico', 'produtor_fonografico'];

const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function normalizeTrack(input: Record<string, unknown>, prev?: CatalogTrack): CatalogTrack {
  const composers: WorkParticipant[] = Array.isArray(input.composers)
    ? (input.composers as Record<string, unknown>[]).slice(0, 30).map((c) => ({
        name: str(c.name, 160),
        cpf: str(c.cpf, 30),
        role: WORK_ROLES.includes(c.role as WorkRole) ? (c.role as WorkRole) : 'compositor_autor',
        association: str(c.association, 60),
        percent: Math.max(0, Math.min(100, num(c.percent))),
      }))
    : prev?.composers || [];

  const phonogram: PhonoParticipant[] = Array.isArray(input.phonogram)
    ? (input.phonogram as Record<string, unknown>[]).slice(0, 40).map((p) => ({
        name: str(p.name, 160),
        cpf: str(p.cpf, 30),
        category: PHONO_CATEGORIES.includes(p.category as PhonoCategory)
          ? (p.category as PhonoCategory)
          : 'musico',
        instrument: str(p.instrument, 60),
        association: str(p.association, 60),
        percent: Math.max(0, Math.min(100, num(p.percent))),
      }))
    : prev?.phonogram || [];

  const isrcRaw = input.isrc !== undefined ? normalizeIsrc(String(input.isrc || '')) : prev?.isrc || '';

  return {
    id: typeof input.id === 'string' && input.id.startsWith('tr_') ? input.id : prev?.id || uid('tr_'),
    title: input.title !== undefined ? str(input.title, 200) : prev?.title || '',
    version: input.version !== undefined ? str(input.version, 60) : prev?.version,
    durationSec:
      input.durationSec !== undefined ? Math.max(0, Math.round(num(input.durationSec))) : prev?.durationSec,
    explicit: input.explicit !== undefined ? Boolean(input.explicit) : Boolean(prev?.explicit),
    instrumental:
      input.instrumental !== undefined ? Boolean(input.instrumental) : Boolean(prev?.instrumental),
    language: input.language !== undefined ? str(input.language, 40) : prev?.language,
    audioUrl: input.audioUrl !== undefined ? str(input.audioUrl, 400) : prev?.audioUrl,
    audioName: input.audioName !== undefined ? str(input.audioName, 200) : prev?.audioName,
    audioFormat: input.audioFormat !== undefined ? str(input.audioFormat, 10).toLowerCase() : prev?.audioFormat,
    lyrics: input.lyrics !== undefined ? String(input.lyrics ?? '').slice(0, 20000) : prev?.lyrics,
    isrc: isrcRaw || undefined,
    isrcAuto: input.isrcAuto !== undefined ? Boolean(input.isrcAuto) : prev?.isrcAuto,
    composers,
    phonogram,
  };
}

/**
 * Aplica um patch vindo do browser num release existente. Status e aprovação
 * têm ações próprias na API — aqui são ignorados de propósito.
 */
export function applyReleasePatch(release: CatalogRelease, input: Record<string, unknown>): void {
  if (input.title !== undefined) release.title = str(input.title, 200);
  if (input.mainArtist !== undefined) release.mainArtist = str(input.mainArtist, 160);
  if (input.featuring !== undefined) release.featuring = str(input.featuring, 200);
  if (input.label !== undefined) release.label = str(input.label, 120);
  if (input.genre !== undefined) release.genre = str(input.genre, 60);
  if (input.subgenre !== undefined) release.subgenre = str(input.subgenre, 60);
  if (input.language !== undefined) release.language = str(input.language, 40);
  if (input.upc !== undefined) release.upc = str(input.upc, 20);
  if (input.distributor !== undefined) release.distributor = str(input.distributor, 40);
  if (input.distributorNote !== undefined) release.distributorNote = str(input.distributorNote, 500);
  if (input.internalNotes !== undefined) release.internalNotes = String(input.internalNotes ?? '').slice(0, 5000);
  if (input.clientId !== undefined) release.clientId = str(input.clientId, 60) || undefined;
  if (input.coverUrl !== undefined) release.coverUrl = str(input.coverUrl, 400) || undefined;

  if (input.type !== undefined) {
    const t = String(input.type);
    if (t === 'single' || t === 'ep' || t === 'album') release.type = t;
  }

  if (input.releaseDate !== undefined) {
    const d = str(input.releaseDate, 10);
    release.releaseDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
  }

  if (input.coverInfo !== undefined) {
    const ci = input.coverInfo as Record<string, unknown> | null;
    release.coverInfo =
      ci && num(ci.width) > 0 && num(ci.height) > 0
        ? { width: Math.round(num(ci.width)), height: Math.round(num(ci.height)), format: str(ci.format, 10) }
        : undefined;
  }

  if (Array.isArray(input.tracks)) {
    const prevById = new Map(release.tracks.map((t) => [t.id, t]));
    release.tracks = (input.tracks as Record<string, unknown>[])
      .slice(0, 50)
      .map((t) => normalizeTrack(t, typeof t.id === 'string' ? prevById.get(t.id) : undefined));
  }

  release.updatedAt = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Validação (o "pré-voo" Abramus + agregadora)
// ---------------------------------------------------------------------------

export type ValidationResult = { errors: string[]; warnings: string[] };

const sum = (ns: number[]) => ns.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
const near100 = (n: number) => Math.abs(n - 100) <= 0.11;

export function validateRelease(
  release: CatalogRelease,
  client?: CatalogClient | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Release / agregadora ---
  if (!release.title?.trim()) errors.push('Lançamento: título obrigatório.');
  if (!release.mainArtist?.trim()) errors.push('Lançamento: artista principal obrigatório.');
  if (!release.genre?.trim()) errors.push('Lançamento: gênero obrigatório.');
  if (!release.language?.trim()) warnings.push('Lançamento: idioma não informado.');
  if (!release.clientId) warnings.push('Lançamento: nenhum cliente vinculado.');
  if (!release.label?.trim()) warnings.push('Lançamento: selo/label não informado (ex.: GAVETA MUSIC LTDA).');

  if (!release.releaseDate) {
    errors.push('Lançamento: data de lançamento obrigatória.');
  } else {
    const date = new Date(`${release.releaseDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
      errors.push('Lançamento: data de lançamento inválida.');
    } else {
      const days = Math.floor((date.getTime() - Date.now()) / 86400000);
      if (days < 0) warnings.push('Lançamento: a data de lançamento já passou.');
      else if (days < 14)
        warnings.push(
          `Lançamento: faltam só ${days} dia(s) — o ideal são 14+ dias pra entrega e pitching de playlists.`
        );
    }
  }

  if (!release.coverUrl) {
    errors.push('Capa: nenhuma capa enviada.');
  } else if (release.coverInfo) {
    const { width, height } = release.coverInfo;
    if (Math.abs(width - height) > 4) errors.push(`Capa: precisa ser quadrada (atual ${width}×${height}).`);
    if (Math.min(width, height) < 1400) errors.push(`Capa: mínimo 1400×1400 (atual ${width}×${height}).`);
    else if (Math.min(width, height) < 3000)
      warnings.push(`Capa: recomendado 3000×3000 (atual ${width}×${height}).`);
  }

  if (release.upc && !/^\d{12,14}$/.test(release.upc.replace(/\D+/g, '')))
    warnings.push('Lançamento: UPC parece inválido (12–14 dígitos). Se a agregadora gera, deixe em branco.');

  if (!release.distributor) warnings.push('Distribuição: nenhuma agregadora selecionada.');
  else if (client) {
    const hasCred = client.credentials.some((c) => c.platform === release.distributor);
    if (!hasCred)
      warnings.push(
        `Distribuição: o cliente não tem credencial salva da agregadora "${release.distributor}".`
      );
  }

  if (release.type !== 'single' && release.tracks.length < 2)
    warnings.push('Lançamento: EP/álbum normalmente tem 2+ faixas.');

  // --- Faixas ---
  if (!release.tracks.length) errors.push('Faixas: adicione pelo menos uma faixa.');

  release.tracks.forEach((t, i) => {
    const tag = `Faixa ${i + 1}${t.title ? ` ("${t.title}")` : ''}`;

    if (!t.title?.trim()) errors.push(`${tag}: título obrigatório.`);
    if (!t.audioUrl) errors.push(`${tag}: áudio não enviado.`);
    else if (t.audioFormat && !['wav', 'flac', 'aif', 'aiff'].includes(t.audioFormat))
      warnings.push(`${tag}: áudio em ${t.audioFormat.toUpperCase()} — agregadoras pedem WAV/FLAC sem perdas.`);
    if (!t.durationSec)
      warnings.push(`${tag}: duração desconhecida (a Abramus pede duração da obra).`);
    if (!t.instrumental && !t.lyrics?.trim())
      warnings.push(`${tag}: sem letra (usada no registro da obra e nas plataformas de letra).`);
    if (t.isrc && !isValidIsrc(t.isrc)) errors.push(`${tag}: ISRC inválido (formato BR-XXX-AA-NNNNN).`);
    if (!t.isrc)
      warnings.push(`${tag}: sem ISRC — gere pelo sistema ou deixe a agregadora atribuir.`);

    // Obra (autoral)
    if (!t.composers.length) {
      errors.push(`${tag}: obra sem compositores/autores.`);
    } else {
      t.composers.forEach((c, ci) => {
        if (!c.name?.trim()) errors.push(`${tag}: participante autoral ${ci + 1} sem nome.`);
        if (!c.cpf?.trim() && c.role !== 'editora')
          warnings.push(`${tag}: ${c.name || `participante ${ci + 1}`} sem CPF (a Abramus usa pra identificar o titular).`);
      });
      const total = sum(t.composers.map((c) => c.percent));
      if (!near100(total))
        errors.push(`${tag}: percentuais da obra somam ${total.toFixed(2)}% — precisam fechar 100%.`);
    }

    // Fonograma (conexos)
    const interpretes = t.phonogram.filter((p) => p.category === 'interprete');
    const produtores = t.phonogram.filter((p) => p.category === 'produtor_fonografico');
    const musicos = t.phonogram.filter((p) => p.category === 'musico');
    if (!interpretes.length) errors.push(`${tag}: fonograma sem intérprete.`);
    if (!produtores.length)
      errors.push(`${tag}: fonograma sem produtor fonográfico (ex.: GAVETA MUSIC LTDA).`);
    t.phonogram.forEach((p, pi) => {
      if (!p.name?.trim()) errors.push(`${tag}: integrante ${pi + 1} do fonograma sem nome.`);
      if (p.category === 'musico' && !p.instrument?.trim())
        warnings.push(`${tag}: músico ${p.name || pi + 1} sem instrumento.`);
    });
    if (t.phonogram.length) {
      const total = sum(t.phonogram.map((p) => p.percent));
      if (!near100(total))
        errors.push(
          `${tag}: percentuais de conexos somam ${total.toFixed(2)}% — padrão ECAD fecha 100% (41,7 intérprete / 41,7 produtor / 16,6 músicos).`
        );
    }
  });

  return { errors, warnings };
}
