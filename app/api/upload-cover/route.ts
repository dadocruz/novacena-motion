import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { PUBLIC_UPLOADS, safeFileName, saveFile, deleteOldFiles } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 30 * 1024 * 1024; // 30MB
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp'];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('cover');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Nenhuma capa enviada.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();

    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Tipo não suportado: ${ext}. Use PNG/JPG/WEBP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'Máximo 30 MB.' }, { status: 413 });
    }

    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'covers');
    const buffer = Buffer.from(await file.arrayBuffer());

    await deleteOldFiles(dir, filename);
    await saveFile(dir, filename, buffer);

    return NextResponse.json({
      ok: true,
      coverSrc: `/api/uploads/covers/${filename}`,
      filename,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}
