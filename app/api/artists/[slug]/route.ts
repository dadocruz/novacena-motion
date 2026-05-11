import { NextRequest, NextResponse } from 'next/server';
import {
  deleteArtist,
  getArtist,
  updateArtist,
} from '../../../../lib/storage';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) {
    return NextResponse.json({ ok: false, error: 'Artista não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, artist });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  try {
    const body = await req.json();
    const updated = await updateArtist(slug, body);
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

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const ok = await deleteArtist(slug);
  return NextResponse.json({ ok });
}
