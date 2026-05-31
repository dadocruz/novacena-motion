import { NextRequest, NextResponse } from 'next/server';
import { createArtist, listArtists } from '../../../lib/storage';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../lib/saasUsers';

export const runtime = 'nodejs';

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

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  const artists = await listArtists(getScopedUserId(req));
  return NextResponse.json({ ok: true, artists });
}

export async function POST(req: NextRequest) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json(
        { ok: false, error: 'Nome do artista é obrigatório.' },
        { status: 400 }
      );
    }
    const artist = await createArtist(name.trim(), getScopedUserId(req));
    return NextResponse.json({ ok: true, artist });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}
