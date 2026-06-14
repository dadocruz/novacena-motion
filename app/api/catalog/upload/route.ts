import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { randomBytes } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../../lib/uploadHelpers';

// Upload grande: precisa de force-dynamic pro Next streamar o body inteiro
// (lição do upload-overlay: sem isso trunca ~10MB).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const execFileAsync = promisify(execFile);

const COVER_EXTS = new Set(['.jpg', '.jpeg', '.png']);
const AUDIO_EXTS = new Set(['.wav', '.wave', '.flac', '.aif', '.aiff', '.mp3', '.m4a', '.ogg']);
const COVER_MAX = 40 * 1024 * 1024;
const AUDIO_MAX = 1024 * 1024 * 1024;

type AudioIdentity = {
  title?: string;
  artist?: string;
};

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
}

function cleanMetadataValue(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || undefined;
}

function firstTag(tags: Record<string, unknown> | undefined, keys: string[]) {
  if (!tags) return undefined;
  const normalized = new Map(
    Object.entries(tags).map(([key, value]) => [key.toLowerCase().replace(/[\s_-]+/g, ''), value])
  );
  for (const key of keys) {
    const value = cleanMetadataValue(normalized.get(key.toLowerCase().replace(/[\s_-]+/g, '')));
    if (value) return value;
  }
  return undefined;
}

function inferIdentityFromFilename(fileName: string): AudioIdentity {
  const base = path
    .basename(fileName || '', path.extname(fileName || ''))
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return {};

  const parts = base.split(/\s+(?:-|–|—)\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      artist: cleanMetadataValue(parts[0]),
      title: cleanMetadataValue(parts.slice(1).join(' - ')),
    };
  }

  return { title: cleanMetadataValue(base) };
}

async function probeAudioInfo(filePath: string): Promise<{ durationSec?: number } & AudioIdentity> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration:format_tags',
      '-of', 'json',
      filePath,
    ]);
    const data = JSON.parse(stdout);
    const format = data?.format || {};
    const sec = parseFloat(String(format.duration || ''));
    return {
      durationSec: Number.isFinite(sec) && sec > 0 ? Math.round(sec) : undefined,
      title: firstTag(format.tags, ['title', 'tit2']),
      artist: firstTag(format.tags, ['artist', 'albumartist', 'album_artist', 'composer', 'tpe1', 'tpe2']),
    };
  } catch {
    return {}; // ffprobe ausente/falhou — duração/metadados ficam manuais
  }
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Envio inválido.' }, { status: 400 });
  }

  const kind = String(form.get('kind') || '');
  const file = form.get('file');
  if ((kind !== 'cover' && kind !== 'audio') || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Envie kind=cover|audio e o arquivo.' }, { status: 400 });
  }

  const ext = path.extname(file.name || '').toLowerCase();
  const allowed = kind === 'cover' ? COVER_EXTS : AUDIO_EXTS;
  if (!allowed.has(ext)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          kind === 'cover'
            ? 'Capa: use JPG ou PNG.'
            : 'Áudio: use WAV, FLAC, AIFF, MP3, M4A ou OGG (WAV recomendado).',
      },
      { status: 400 }
    );
  }

  const cap = kind === 'cover' ? COVER_MAX : AUDIO_MAX;
  if (file.size > cap) {
    return NextResponse.json(
      { ok: false, error: `Arquivo acima do limite de ${Math.round(cap / 1024 / 1024)}MB.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length < file.size * 0.98) {
    return NextResponse.json({ ok: false, error: 'Upload chegou incompleto. Tente de novo.' }, { status: 400 });
  }

  const warnings: string[] = [];
  let width: number | undefined;
  let height: number | undefined;

  if (kind === 'cover') {
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
      if (!width || !height) throw new Error('sem dimensões');
      if (Math.abs(width - height) > 4) {
        return NextResponse.json(
          { ok: false, error: `A capa precisa ser quadrada (recebi ${width}×${height}).` },
          { status: 400 }
        );
      }
      if (Math.min(width, height) < 1400) {
        return NextResponse.json(
          { ok: false, error: `Capa muito pequena (${width}×${height}). Mínimo 1400×1400; ideal 3000×3000.` },
          { status: 400 }
        );
      }
      if (Math.min(width, height) < 3000) {
        warnings.push(`Capa ${width}×${height} — recomendado 3000×3000.`);
      }
      if (meta.space && meta.space !== 'srgb' && meta.space !== 'rgb') {
        warnings.push(`Capa em espaço de cor ${meta.space.toUpperCase()} — as plataformas pedem RGB.`);
      }
    } catch {
      return NextResponse.json({ ok: false, error: 'Não consegui ler a imagem da capa.' }, { status: 400 });
    }
  }

  const userDir = String(session.sub).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
  const dir = path.join(PUBLIC_UPLOADS, 'catalog', userDir);
  const name = `${randomBytes(4).toString('hex')}-${safeFileName(file.name || `arquivo${ext}`, ext)}`;
  await saveFile(dir, name, buffer);
  // servida por /api/uploads (no standalone da VPS o public/ não é servido direto)
  const url = `/api/uploads/catalog/${userDir}/${name}`;

  let durationSec: number | undefined;
  let audioIdentity: AudioIdentity = {};
  if (kind === 'audio') {
    const probed = await probeAudioInfo(path.join(dir, name));
    const inferred = inferIdentityFromFilename(file.name || name);
    durationSec = probed.durationSec;
    audioIdentity = {
      title: probed.title || inferred.title,
      artist: probed.artist || inferred.artist,
    };
    if (['.mp3', '.m4a', '.ogg'].includes(ext)) {
      warnings.push('Áudio com perdas — pra distribuição o ideal é WAV 24bit/44.1kHz ou FLAC.');
    }
  }

  return NextResponse.json({
    ok: true,
    url,
    name: file.name || name,
    format: ext.slice(1),
    width,
    height,
    durationSec,
    metadata: audioIdentity,
    suggestedTitle: audioIdentity.title || '',
    suggestedArtist: audioIdentity.artist || '',
    warnings,
  });
}
