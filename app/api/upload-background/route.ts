import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../lib/uploadHelpers';
import { cleanupTransientFiles } from '../../../lib/transientCleanup';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 80 * 1024 * 1024;
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    cleanupTransientFiles().catch(() => {});

    const form = await req.formData();
    const file = form.get('background');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Nenhuma imagem enviada.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'Imagem muito grande (máx 80 MB).' }, { status: 413 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json({ ok: false, error: 'Tipo não suportado. Use PNG, JPG ou WEBP.' }, { status: 400 });
    }

    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: `Tipo não suportado: ${file.type}.` }, { status: 400 });
    }

    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'backgrounds');
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(dir, filename, buffer);

    return NextResponse.json({
      ok: true,
      backgroundSrc: `/api/uploads/backgrounds/${filename}`,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido no upload.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
