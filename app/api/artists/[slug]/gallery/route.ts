import { NextRequest, NextResponse } from 'next/server';
import {
  addGalleryItem,
  deleteGalleryItem,
  listGallery,
} from '../../../../../lib/storage';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const items = await listGallery(slug);
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  try {
    const body = await req.json();
    if (!body.title || !body.template) {
      return NextResponse.json(
        { ok: false, error: 'title e template são obrigatórios.' },
        { status: 400 }
      );
    }
    const item = await addGalleryItem(slug, body);
    return NextResponse.json({ ok: true, item });
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
  const ok = await deleteGalleryItem(slug, id);
  return NextResponse.json({ ok });
}
