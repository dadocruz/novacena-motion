import { NextRequest, NextResponse } from 'next/server';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';
import {
  buildCredentials,
  clientForApi,
  loadCatalog,
  saveCatalog,
  uid,
  type CatalogClient,
} from '../../../../lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const catalog = await loadCatalog(session.sub);
  return NextResponse.json({
    ok: true,
    clients: catalog.clients.map(clientForApi),
    settings: catalog.settings,
  });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim().slice(0, 120);
  if (!name) {
    return NextResponse.json({ ok: false, error: 'Informe o nome artístico.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const client: CatalogClient = {
    id: uid('cli_'),
    name,
    fullName: String(body?.fullName || '').trim().slice(0, 160),
    cpfCnpj: String(body?.cpfCnpj || '').trim().slice(0, 30),
    email: String(body?.email || '').trim().slice(0, 160),
    phone: String(body?.phone || '').trim().slice(0, 40),
    instagram: String(body?.instagram || '').trim().slice(0, 80),
    notes: String(body?.notes || '').trim().slice(0, 2000),
    credentials: buildCredentials(body?.credentials, []),
    createdAt: now,
    updatedAt: now,
  };

  const catalog = await loadCatalog(session.sub);
  catalog.clients.unshift(client);
  await saveCatalog(session.sub, catalog);

  return NextResponse.json({ ok: true, client: clientForApi(client) });
}
