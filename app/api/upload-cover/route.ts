import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import { PUBLIC_UPLOADS, safeFileName, deleteOldFiles } from '../../../lib/uploadHelpers';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 30 * 1024 * 1024;
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_DIM = 1500;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('cover');

    if (!file || typeof file === 'string')
      return NextResponse.json({ ok: false, error: 'Nenhuma capa enviada.' }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();

    if (!ALLOWED_EXT.includes(ext))
      return NextResponse.json({ ok: false, error: `Tipo não suportado: ${ext}. Use PNG/JPG/WEBP.` }, { status: 400 });

    if (file.size > MAX_SIZE)
      return NextResponse.json({ ok: false, error: 'Máximo 30 MB.' }, { status: 413 });

    const filename = safeFileName(file.name, '.jpg');
    const dir = path.join(PUBLIC_UPLOADS, 'covers');
    const raw = Buffer.from(await file.arrayBuffer());

    // Redimensiona para máx 1500x1500 e converte para JPEG
    const processed = await sharp(raw)
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();

    await deleteOldFiles(dir, filename);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), processed);

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
