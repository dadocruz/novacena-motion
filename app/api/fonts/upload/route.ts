import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { addUserFont, listUserFonts, deleteUserFont } from '../../../../lib/storage';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_EXT = ['.ttf', '.otf', '.woff', '.woff2'];

export async function GET() {
  const fonts = await listUserFonts();
  return NextResponse.json({ ok: true, fonts });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('font');
    const label = (form.get('label') as string) || '';
    const category = ((form.get('category') as string) || 'display') as
      | 'display'
      | 'sans'
      | 'special';
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
      label: label || path.basename(file.name, ext),
      filename,
      family,
      category,
      weight: isFinite(weight) ? weight : 700,
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
