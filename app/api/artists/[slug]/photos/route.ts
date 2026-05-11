import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import {
  addPhoto,
  deletePhoto,
  listPhotos,
} from '../../../../../lib/storage';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 20 * 1024 * 1024;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const photos = await listPhotos(slug);
  return NextResponse.json({ ok: true, photos });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
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
    const uploaded = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) continue;
      const filename = safeFileName(file.name, '.png');
      const dir = path.join(PUBLIC_UPLOADS, 'artists', slug, 'photos');
      const buffer = Buffer.from(await file.arrayBuffer());
      await saveFile(dir, filename, buffer);
      const publicPath = `/uploads/artists/${slug}/photos/${filename}`;
      const photo = await addPhoto(slug, { filename, path: publicPath });
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
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório.' }, { status: 400 });
  const ok = await deletePhoto(slug, id);
  return NextResponse.json({ ok });
}
