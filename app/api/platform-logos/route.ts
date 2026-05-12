import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { access } from 'fs/promises';
import {
  deletePlatformLogo,
  listPlatformLogos,
  setPlatformLogo,
} from '../../../lib/storage';
import { PUBLIC_UPLOADS, safeFileName, saveFile, deleteOldFiles } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];

export async function GET() {
  const logos = await listPlatformLogos();

  const existing = [];
  for (const logo of logos) {
    const relPath = logo.path
      .replace(/^\/api\/uploads\//, '')
      .replace(/^\/uploads\//, '');
    const filePath = path.join(PUBLIC_UPLOADS, relPath);

    try {
      await access(filePath);
      existing.push({
        ...logo,
        path: logo.path.startsWith('/api/uploads/')
          ? logo.path
          : logo.path.replace('/uploads/', '/api/uploads/'),
      });
    } catch {
      // Ignora logo quebrado para não travar preview/render
    }
  }

  return NextResponse.json({ ok: true, logos: existing });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('logo');
    const platform = (form.get('platform') as string) || '';

    if (!platform) {
      return NextResponse.json({ ok: false, error: 'Plataforma obrigatória.' }, { status: 400 });
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Extensão não suportada: ${ext}. Use PNG/JPG/SVG/WEBP.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'Máximo 5 MB.' }, { status: 413 });
    }
    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'platform-logos');
    const buffer = Buffer.from(await file.arrayBuffer());
    await deleteOldFiles(dir, filename);
    await saveFile(dir, filename, buffer);
    const publicPath = `/api/uploads/platform-logos/${filename}`;
    const logo = await setPlatformLogo(platform, filename, publicPath);
    return NextResponse.json({ ok: true, logo });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');
  if (!platform) return NextResponse.json({ ok: false, error: 'platform obrigatório' }, { status: 400 });
  const ok = await deletePlatformLogo(platform);
  return NextResponse.json({ ok });
}
