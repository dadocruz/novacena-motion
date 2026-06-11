import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { requireAdmin } from '../../../lib/adminAuth';
import { PUBLIC_UPLOADS, safeFileName } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 120;
// force-dynamic: sem isso o Next bufferiza/trunca uploads grandes (~10MB).
export const dynamic = 'force-dynamic';

const MAX_SIZE = 200 * 1024 * 1024;
const ALLOWED_EXT = ['.mp4', '.webm', '.mov', '.m4v'];

/** POST /api/site-upload — admin: sobe vídeo demo da landing (showcase).
 *  FormData: { video: File }. Salva em public/uploads/site/. */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const form = await req.formData();
    const file = form.get('video');

    if (!file || typeof file === 'string')
      return NextResponse.json({ ok: false, error: 'Nenhum vídeo enviado.' }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext))
      return NextResponse.json({ ok: false, error: `Tipo não suportado: ${ext}. Use MP4/WEBM/MOV.` }, { status: 400 });

    if (file.size > MAX_SIZE)
      return NextResponse.json({ ok: false, error: 'Máximo 200 MB por vídeo.' }, { status: 413 });

    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'site');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      ok: true,
      src: `/api/uploads/site/${filename}`,
      filename,
      size: file.size,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro no upload.' },
      { status: 500 }
    );
  }
}
