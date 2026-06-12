import { NextRequest, NextResponse } from 'next/server';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../../lib/saasUsers';
import { audit } from '../../../../../lib/auditLog';
import { clientIp, rateLimit } from '../../../../../lib/rateLimit';
import {
  buildCredentials,
  clientForApi,
  decryptSecret,
  loadCatalog,
  saveCatalog,
} from '../../../../../lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const catalog = await loadCatalog(session.sub);
  const client = catalog.clients.find((c) => c.id === id);
  if (!client) return NextResponse.json({ ok: false, error: 'Cliente não encontrado.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (typeof body?.name === 'string' && body.name.trim()) client.name = body.name.trim().slice(0, 120);
  for (const field of ['fullName', 'cpfCnpj', 'email', 'phone', 'instagram', 'notes'] as const) {
    if (typeof body?.[field] === 'string') client[field] = body[field].trim().slice(0, field === 'notes' ? 2000 : 160);
  }
  if (body?.credentials !== undefined) {
    client.credentials = buildCredentials(body.credentials, client.credentials);
  }
  client.updatedAt = new Date().toISOString();

  await saveCatalog(session.sub, catalog);
  return NextResponse.json({ ok: true, client: clientForApi(client) });
}

/** POST { action: 'reveal', credentialId } — devolve login+senha em claro. */
export async function POST(req: NextRequest, context: RouteContext) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const limit = rateLimit(`catalog-reveal:${session.sub}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: `Muitas tentativas. Tente em ${limit.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'reveal') {
    return NextResponse.json({ ok: false, error: 'Ação inválida.' }, { status: 400 });
  }

  const catalog = await loadCatalog(session.sub);
  const client = catalog.clients.find((c) => c.id === id);
  const cred = client?.credentials.find((c) => c.id === String(body?.credentialId || ''));
  if (!client || !cred) {
    return NextResponse.json({ ok: false, error: 'Credencial não encontrada.' }, { status: 404 });
  }

  const password = cred.passwordEnc ? decryptSecret(cred.passwordEnc) : '';
  if (cred.passwordEnc && password === null) {
    return NextResponse.json(
      { ok: false, error: 'Não foi possível descriptografar (a chave do servidor mudou). Salve a senha de novo.' },
      { status: 409 }
    );
  }

  await audit('credential_reveal', {
    userId: session.sub,
    clientId: client.id,
    credentialId: cred.id,
    platform: cred.platform,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, login: cred.login, password: password || '' });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const catalog = await loadCatalog(session.sub);
  const before = catalog.clients.length;
  catalog.clients = catalog.clients.filter((c) => c.id !== id);
  if (catalog.clients.length === before) {
    return NextResponse.json({ ok: false, error: 'Cliente não encontrado.' }, { status: 404 });
  }
  // releases mantêm clientId órfão de propósito (histórico); a UI mostra "sem cliente"
  await saveCatalog(session.sub, catalog);
  return NextResponse.json({ ok: true });
}
