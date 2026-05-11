import { NextRequest, NextResponse } from 'next/server';
import { createArtist, listArtists } from '../../../lib/storage';

export const runtime = 'nodejs';

export async function GET() {
  const artists = await listArtists();
  return NextResponse.json({ ok: true, artists });
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json(
        { ok: false, error: 'Nome do artista é obrigatório.' },
        { status: 400 }
      );
    }
    const artist = await createArtist(name.trim());
    return NextResponse.json({ ok: true, artist });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}
