import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const GENRE_PRESETS_FILE = path.join(process.cwd(), 'data', 'genre-presets.json');

export async function GET() {
  try {
    const content = await fs.readFile(GENRE_PRESETS_FILE, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json({ ok: true, presets: data.presets ?? [] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Falha ao carregar presets de gênero' },
      { status: 500 }
    );
  }
}
