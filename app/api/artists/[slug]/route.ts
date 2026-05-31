import { NextRequest, NextResponse } from 'next/server';
import {
  deleteArtist,
  getArtist,
  updateArtist,
} from '../../../../lib/storage';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ slug: string }> };

function isSaasMode() {
  return process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
    process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
}

function getScopedUserId(req: NextRequest): string | null {
  if (!isSaasMode()) return null;
  const session = verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
  return session?.sub ?? null;
}

function unauthorizedIfNeeded(req: NextRequest) {
  if (!isSaasMode()) return null;
  return getScopedUserId(req) ? null : NextResponse.json({ ok: false, error: 'Acesso não autorizado.' }, { status: 401 });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const artist = await getArtist(slug, getScopedUserId(req));
  if (!artist) {
    return NextResponse.json({ ok: false, error: 'Artista não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, artist });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  try {
    const body = await req.json();
    const updated = await updateArtist(slug, body, getScopedUserId(req));
    if (!updated) {
      return NextResponse.json({ ok: false, error: 'Não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, artist: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const ok = await deleteArtist(slug, getScopedUserId(req));
  return NextResponse.json({ ok });
}
