import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VIDEOS_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos');

// Limite de 200MB pra vídeos de fundo (40s em qualidade boa)
const MAX_SIZE = 200 * 1024 * 1024;

function safeFileName(name: string): string {
  const ext = path.extname(name || '.mp4').toLowerCase() || '.mp4';
  const base =
    path
      .basename(name || 'video', ext)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 42) || 'video';
  return `${Date.now()}-${base}${ext}`;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('video');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { ok: false, error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo permitido: 200 MB.`,
        },
        { status: 413 }
      );
    }

    // Validação básica de tipo
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Tipo não suportado: ${file.type}. Use MP4, MOV ou WEBM.`,
        },
        { status: 400 }
      );
    }

    await mkdir(VIDEOS_DIR, { recursive: true });
    const filename = safeFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const localPath = path.join(VIDEOS_DIR, filename);
    await writeFile(localPath, buffer);

    const publicPath = `/uploads/videos/${filename}`;

    return NextResponse.json({
      ok: true,
      videoSrc: publicPath,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido no upload.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
