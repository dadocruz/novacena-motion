import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { DATA_DIR, uid } from './storage';
import type { BillingCycle } from './saasPlans';

export const SAAS_COOKIE_NAME = 'novacena_session';
export const TRIAL_RENDER_TOKENS = 1;

const USERS_FILE = path.join(DATA_DIR, 'users', 'saas-users.json');

export type SaasUser = {
  id: string;
  email: string;
  name: string;
  provider: 'password' | 'google';
  passwordHash?: string;
  passwordSalt?: string;
  tokens: number;
  planId?: string;
  billingCycle?: BillingCycle;
  googleSub?: string;
  createdAt: string;
  updatedAt: string;
};

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  exp: number;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

// Segredo de assinatura da sessão. NUNCA cair num valor público em produção
// (qualquer um forjaria a sessão de qualquer usuário). Se nenhum env estiver
// configurado em prod, geramos um segredo aleatório POR PROCESSO: não é
// forjável, mas invalida sessões a cada restart — é o empurrão pra configurar
// NOVACENA_AUTH_SECRET na VPS.
let runtimeRandomSecret: string | null = null;
function authSecret() {
  const explicit = process.env.NOVACENA_AUTH_SECRET || process.env.NOVACENA_SAAS_PASSWORD;
  if (explicit) return explicit;

  if (process.env.NODE_ENV === 'production') {
    if (!runtimeRandomSecret) {
      runtimeRandomSecret = randomBytes(32).toString('hex');
      console.error(
        '[SECURITY] NOVACENA_AUTH_SECRET ausente/curto em produção — usando segredo aleatório por processo. ' +
        'Configure NOVACENA_AUTH_SECRET (>=32 chars) na VPS para as sessões persistirem e serem seguras.'
      );
    }
    return runtimeRandomSecret;
  }

  return 'novacena-dev-secret-DEV-ONLY';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function readUsers(): Promise<SaasUser[]> {
  try {
    const raw = await readFile(USERS_FILE, 'utf-8');
    return JSON.parse(raw) as SaasUser[];
  } catch {
    return [];
  }
}

async function writeUsers(users: SaasUser[]) {
  await mkdir(path.dirname(USERS_FILE), { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function listSaasUsers() {
  return readUsers();
}

export async function getSaasUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email === normalizeEmail(email)) ?? null;
}

export async function getSaasUserById(id: string) {
  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const incoming = Buffer.from(hashPassword(password, salt).hash, 'hex');
  const expected = Buffer.from(hash, 'hex');
  return incoming.length === expected.length && timingSafeEqual(incoming, expected);
}

export async function createPasswordUser(input: { email: string; name?: string; password: string }) {
  const email = normalizeEmail(input.email);
  const users = await readUsers();
  if (users.some((user) => user.email === email)) {
    throw new Error('Este email já possui uma conta.');
  }

  const { hash, salt } = hashPassword(input.password);
  const now = new Date().toISOString();
  const user: SaasUser = {
    id: uid('usr_'),
    email,
    name: input.name?.trim() || email.split('@')[0],
    provider: 'password',
    passwordHash: hash,
    passwordSalt: salt,
    tokens: TRIAL_RENDER_TOKENS,
    createdAt: now,
    updatedAt: now,
  };
  users.unshift(user);
  await writeUsers(users);
  return user;
}

export async function upsertGoogleUser(input: { email: string; name?: string; googleSub: string }) {
  const email = normalizeEmail(input.email);
  const users = await readUsers();
  const index = users.findIndex((user) => user.email === email);
  const now = new Date().toISOString();
  if (index >= 0) {
    users[index] = {
      ...users[index],
      name: input.name || users[index].name,
      provider: 'google',
      googleSub: input.googleSub,
      updatedAt: now,
    };
    await writeUsers(users);
    return users[index];
  }

  const user: SaasUser = {
    id: uid('usr_'),
    email,
    name: input.name?.trim() || email.split('@')[0],
    provider: 'google',
    googleSub: input.googleSub,
    tokens: TRIAL_RENDER_TOKENS,
    createdAt: now,
    updatedAt: now,
  };
  users.unshift(user);
  await writeUsers(users);
  return user;
}

export async function updateUserPlan(userId: string, patch: { planId: string; billingCycle: BillingCycle; tokensToAdd: number }) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) return null;
  users[index] = {
    ...users[index],
    planId: patch.planId,
    billingCycle: patch.billingCycle,
    tokens: users[index].tokens + patch.tokensToAdd,
    updatedAt: new Date().toISOString(),
  };
  await writeUsers(users);
  return users[index];
}

export async function addUserTokens(userId: string, amount: number, patch?: { planId?: string; billingCycle?: BillingCycle }) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) return null;
  users[index] = {
    ...users[index],
    planId: patch?.planId ?? users[index].planId,
    billingCycle: patch?.billingCycle ?? users[index].billingCycle,
    tokens: users[index].tokens + Math.max(0, Math.floor(amount)),
    updatedAt: new Date().toISOString(),
  };
  await writeUsers(users);
  return users[index];
}

export async function consumeUserTokens(userId: string, amount = 1) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0 || users[index].tokens < amount) return null;
  users[index] = {
    ...users[index],
    tokens: users[index].tokens - amount,
    updatedAt: new Date().toISOString(),
  };
  await writeUsers(users);
  return users[index];
}

export function createSessionToken(user: Pick<SaasUser, 'id' | 'email' | 'name'>) {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', authSecret()).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  const expected = createHmac('sha256', authSecret()).update(encodedPayload).digest('base64url');
  const incoming = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (incoming.length !== expectedBuffer.length || !timingSafeEqual(incoming, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
