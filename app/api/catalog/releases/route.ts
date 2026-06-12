import { NextRequest, NextResponse } from 'next/server';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';
import {
  applyReleasePatch,
  loadCatalog,
  saveCatalog,
  uid,
  validateRelease,
  type CatalogRelease,
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
  const releases = catalog.releases.map((release) => {
    const client = catalog.clients.find((c) => c.id === release.clientId) || null;
    const validation = validateRelease(release, client);
    return { ...release, validation };
  });

  return NextResponse.json({ ok: true, releases, settings: catalog.settings });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const catalog = await loadCatalog(session.sub);

  if (catalog.releases.length >= 500) {
    return NextResponse.json({ ok: false, error: 'Limite de lançamentos atingido.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const release: CatalogRelease = {
    id: uid('rel_'),
    title: '',
    type: 'single',
    mainArtist: '',
    label: catalog.settings.defaultLabel || '',
    tracks: [],
    status: 'rascunho',
    createdAt: now,
    updatedAt: now,
  };
  applyReleasePatch(release, body || {});

  catalog.releases.unshift(release);
  await saveCatalog(session.sub, catalog);

  const client = catalog.clients.find((c) => c.id === release.clientId) || null;
  return NextResponse.json({
    ok: true,
    release: { ...release, validation: validateRelease(release, client) },
  });
}
