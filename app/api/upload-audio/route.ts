import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXT = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('audio');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo.' }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Tipo não suportado: ${ext}. Use MP3/WAV/M4A.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'Máx 50 MB.' }, { status: 413 });
    }
    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'audio');
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(dir, filename, buffer);
    return NextResponse.json({
      ok: true,
      audioSrc: `/uploads/audio/${filename}`,
      filename,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}
