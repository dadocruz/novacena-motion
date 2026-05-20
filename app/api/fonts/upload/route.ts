import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { addUserFont, listUserFonts, deleteUserFont } from '../../../../lib/storage';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_EXT = ['.ttf', '.otf', '.woff', '.woff2'];
const ALLOWED_CATEGORIES = new Set(['display', 'sans', 'special']);

function cleanLabel(value: string, fallback: string): string {
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  return clean || fallback;
}

export async function GET() {
  const fonts = await listUserFonts();
  return NextResponse.json({ ok: true, fonts });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('font');
    const label = (form.get('label') as string) || '';
    const categoryRaw = (form.get('category') as string) || 'display';
    const weight = parseInt((form.get('weight') as string) || '700', 10);

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { ok: false, error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Extensão não suportada: ${ext}. Use TTF/OTF/WOFF.` },
        { status: 400 }
      );
    }
    if (!ALLOWED_CATEGORIES.has(categoryRaw)) {
      return NextResponse.json(
        { ok: false, error: `Categoria inválida: ${categoryRaw}.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: 'Arquivo muito grande (máx 8 MB).' },
        { status: 413 }
      );
    }

    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'user-fonts');
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(dir, filename, buffer);

    // family CSS = derivado do nome do arquivo, sem extensão e sem caracteres especiais
    const family = `user_${path
      .basename(filename, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')}`;

    const font = await addUserFont({
      label: cleanLabel(label, path.basename(file.name, ext)),
      filename,
      family,
      category: categoryRaw as 'display' | 'sans' | 'special',
      weight: Number.isFinite(weight) ? Math.max(100, Math.min(900, weight)) : 700,
    });

    return NextResponse.json({ ok: true, font });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório.' }, { status: 400 });
  const ok = await deleteUserFont(id);
  return NextResponse.json({ ok });
}
