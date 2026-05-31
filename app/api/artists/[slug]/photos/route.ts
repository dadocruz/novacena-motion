import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import {
  addPhoto,
  deletePhoto,
  listPhotos,
} from '../../../../../lib/storage';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../../lib/saasUsers';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type RouteContext = { params: Promise<{ slug: string }> };

function safeSlugSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || 'artist';
}

function isSaasMode() {
  return process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
    process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
}

function getScopedUserId(req: NextRequest): string | null {
  if (!isSaasMode()) return null;
  const session = verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
  return session?.sub ?? null;
}

function uploadOwnerSegment(req: NextRequest): string {
  const userId = getScopedUserId(req);
  return userId ? `users/${safeSlugSegment(userId)}` : 'artists';
}

function unauthorizedIfNeeded(req: NextRequest) {
  if (!isSaasMode()) return null;
  return getScopedUserId(req) ? null : NextResponse.json({ ok: false, error: 'Acesso não autorizado.' }, { status: 401 });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const photos = await listPhotos(slug, getScopedUserId(req));
  return NextResponse.json({ ok: true, photos });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const unauthorized = unauthorizedIfNeeded(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  try {
    const form = await req.formData();
    const files = form.getAll('photos').filter(
      (f): f is File => f instanceof File && f.size > 0
    );
    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Nenhuma foto enviada.' },
        { status: 400 }
      );
    }

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        return NextResponse.json(
          { ok: false, error: `Tipo não suportado: ${ext || 'sem extensão'}. Use PNG/JPG/WEBP.` },
          { status: 400 }
        );
      }
      if (file.type && !ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { ok: false, error: `Tipo não suportado: ${file.type}. Use imagem PNG/JPG/WEBP.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { ok: false, error: 'Foto muito grande (máx 20 MB).' },
          { status: 413 }
        );
      }
    }

    const safeSlug = safeSlugSegment(slug);
    const uploaded = [];
    for (const file of files) {
      const filename = safeFileName(file.name, '.png');
      const dir = path.join(PUBLIC_UPLOADS, uploadOwnerSegment(req), safeSlug, 'photos');
      const buffer = Buffer.from(await file.arrayBuffer());
      await saveFile(dir, filename, buffer);
      const publicPath = `/api/uploads/${uploadOwnerSegment(req)}/${safeSlug}/photos/${filename}`;
      const photo = await addPhoto(slug, { filename, path: publicPath }, getScopedUserId(req));
      uploaded.push(photo);
    }
    return NextResponse.json({ ok: true, uploaded });
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
  const ok = await deletePhoto(slug, id, getScopedUserId(req));
  return NextResponse.json({ ok });
}
