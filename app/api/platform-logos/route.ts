import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { access } from 'fs/promises';
import {
  PUBLIC_UPLOADS,
  safeFileName,
  saveFile,
  deleteOldFiles,
} from '../../../lib/uploadHelpers';
import { listPlatformLogos, savePlatformLogo } from '../../../lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = ['.png', '.svg', '.webp', '.jpg', '.jpeg'];

/**
 * Normaliza o path de um logo:
 * - Se começa com /uploads/ → vira /api/uploads/
 * - Senão, mantém igual.
 *
 * Garante que tanto entries antigas no JSON (sem /api/) quanto novas funcionem.
 */
function normalizeLogoPath(p: string): string {
  if (!p) return p;
  if (p.startsWith('/uploads/')) {
    return p.replace('/uploads/', '/api/uploads/');
  }
  return p;
}

/**
 * GET /api/platform-logos
 *
 * Retorna a lista de logos custom, normalizando paths antigos e
 * filtrando logos cujo arquivo não existe mais no disco (evita
 * abortar o render por causa de logo quebrado).
 */
export async function GET() {
  const logos = await listPlatformLogos();
  const existing: typeof logos = [];

  for (const logo of logos) {
    const normalized = normalizeLogoPath(logo.path);

    // Resolve o path real no disco a partir da URL normalizada
    const relPath = normalized
      .replace(/^\/api\/uploads\//, '')
      .replace(/^\/uploads\//, '');
    const filePath = path.join(PUBLIC_UPLOADS, relPath);

    try {
      await access(filePath);
      existing.push({
        ...logo,
        path: normalized,
      });
    } catch {
      // Logo apontado no JSON mas arquivo não existe: ignora silenciosamente.
      // Assim o render não trava com 404 nem erro de asset.
    }
  }

  return NextResponse.json({ ok: true, logos: existing });
}

/**
 * POST /api/platform-logos
 * Upload de novo logo customizado.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('logo');
    const platform = form.get('platform');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { ok: false, error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    if (!platform || typeof platform !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Plataforma não especificada.' },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Tipo não suportado: ${ext}. Use PNG/SVG/WEBP/JPG.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: 'Máximo 10 MB.' },
        { status: 413 }
      );
    }

    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'platform-logos');
    const buffer = Buffer.from(await file.arrayBuffer());

    // Limpa logos antigos da mesma plataforma para não acumular lixo
    await deleteOldFiles(dir, filename);
    await saveFile(dir, filename, buffer);

    const logoPath = `/api/uploads/platform-logos/${filename}`;

    await savePlatformLogo({
      platform,
      path: logoPath,
      filename,
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      logo: { platform, path: logoPath, filename },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Falha no upload',
      },
      { status: 500 }
    );
  }
}
