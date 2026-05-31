import { NextRequest, NextResponse } from 'next/server';
import {
  addGalleryItem,
  deleteGalleryItem,
  listGallery,
} from '../../../../../lib/storage';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../../lib/saasUsers';

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
  const items = await listGallery(slug, getScopedUserId(req));
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  try {
    const body = await req.json();
    if (!body.title || !body.template) {
      return NextResponse.json(
        { ok: false, error: 'title e template são obrigatórios.' },
        { status: 400 }
      );
    }
    const item = await addGalleryItem(slug, body, getScopedUserId(req));
    return NextResponse.json({ ok: true, item });
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório.' }, { status: 400 });
  const ok = await deleteGalleryItem(slug, id, getScopedUserId(req));
  return NextResponse.json({ ok });
}
