import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { access } from 'fs/promises';
import {
  PUBLIC_UPLOADS,
  safeFileName,
  saveFile,
  deleteOldFiles,
} from '../../../lib/uploadHelpers';
import {
  listPlatformLogos,
  setPlatformLogo,
  type CustomPlatformLogo,
} from '../../../lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = ['.png', '.svg', '.webp', '.jpg', '.jpeg'];
const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
const ALLOWED_PLATFORMS = new Set(['Spotify', 'Deezer', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Tidal']);

const DEFAULT_PLATFORM_LOGOS: CustomPlatformLogo[] = [
  {
    platform: 'Spotify',
    path: '/logos/platforms/round-white/SPOTIFY.png',
    filename: 'SPOTIFY.png',
    uploadedAt: 'factory',
  },
  {
    platform: 'Deezer',
    path: '/logos/platforms/round-white/DEEZER.png',
    filename: 'DEEZER.png',
    uploadedAt: 'factory',
  },
  {
    platform: 'Apple Music',
    path: '/logos/platforms/round-white/APPLE.png',
    filename: 'APPLE.png',
    uploadedAt: 'factory',
  },
  {
    platform: 'YouTube Music',
    path: '/logos/platforms/round-white/YOUTUBE.png',
    filename: 'YOUTUBE.png',
    uploadedAt: 'factory',
  },
  {
    platform: 'Amazon Music',
    path: '/logos/platforms/round-white/AMAZON.png',
    filename: 'AMAZON.png',
    uploadedAt: 'factory',
  },
  {
    platform: 'Tidal',
    path: '/logos/platforms/round-white/TIDAL.png',
    filename: 'TIDAL.png',
    uploadedAt: 'factory',
  },
];

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

function logoFilePath(publicPath: string): string {
  const normalized = normalizeLogoPath(publicPath);
  if (normalized.startsWith('/api/uploads/') || normalized.startsWith('/uploads/')) {
    const relPath = normalized
      .replace(/^\/api\/uploads\//, '')
      .replace(/^\/uploads\//, '');
    return path.join(PUBLIC_UPLOADS, relPath);
  }
  return path.join(process.cwd(), 'public', normalized.replace(/^\/+/, ''));
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
  const existing = new Map<string, CustomPlatformLogo>();

  for (const logo of DEFAULT_PLATFORM_LOGOS) {
    const normalized = normalizeLogoPath(logo.path);
    try {
      await access(logoFilePath(normalized));
      existing.set(logo.platform, {
        ...logo,
        path: normalized,
      });
    } catch {
      // Logo de fábrica não encontrado no build atual: segue sem travar.
    }
  }

  for (const logo of logos) {
    const normalized = normalizeLogoPath(logo.path);

    try {
      await access(logoFilePath(normalized));
      existing.set(logo.platform, {
        ...logo,
        path: normalized,
      });
    } catch {
      // Logo apontado no JSON mas arquivo não existe: mantém o padrão.
      // Assim o render não trava com 404 nem erro de asset.
    }
  }

  return NextResponse.json({ ok: true, logos: Array.from(existing.values()) });
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
    const platformName = platform.trim();
    if (!ALLOWED_PLATFORMS.has(platformName)) {
      return NextResponse.json(
        { ok: false, error: `Plataforma inválida: ${platformName || 'vazia'}.` },
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
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `Tipo não suportado: ${file.type}. Use PNG/SVG/WEBP/JPG.` },
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

    const logo = await setPlatformLogo(platformName, filename, logoPath);

    return NextResponse.json({
      ok: true,
      logo,
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
