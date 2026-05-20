import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { addOverlay, deleteOverlay, listOverlays } from '../../../lib/storage';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 100 * 1024 * 1024;
const ALLOWED_BLEND_MODES = new Set(['screen', 'overlay', 'lighten', 'soft-light', 'normal']);

function cleanLabel(value: string, fallback: string): string {
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  return clean || fallback;
}

export async function GET() {
  const overlays = await listOverlays();
  return NextResponse.json({ ok: true, overlays });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('overlay');
    const label = (form.get('label') as string) || '';
    const blendMode = (form.get('blendMode') as string) || 'normal';
    const durationSecRaw = Number(form.get('durationSec'));
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { ok: false, error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: 'Arquivo muito grande (máx 100 MB).' },
        { status: 413 }
      );
    }
    const ext = path.extname(file.name).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { ok: false, error: 'Tipo não suportado. Use vídeo (MP4/MOV/WEBM) ou imagem (PNG/JPG/WEBP/SVG).' },
        { status: 400 }
      );
    }
    if (!ALLOWED_BLEND_MODES.has(blendMode)) {
      return NextResponse.json(
        { ok: false, error: `Blend mode inválido: ${blendMode}.` },
        { status: 400 }
      );
    }
    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'overlays');
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(dir, filename, buffer);
    const overlay = await addOverlay({
      label: cleanLabel(label, path.basename(file.name, ext)),
      filename,
      path: `/api/uploads/overlays/${filename}`,
      type: isVideo ? 'video' : 'image',
      blendMode: blendMode as 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal',
      durationSec: Number.isFinite(durationSecRaw) && durationSecRaw > 0 ? durationSecRaw : undefined,
    });
    return NextResponse.json({ ok: true, overlay });
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
  const ok = await deleteOverlay(id);
  return NextResponse.json({ ok });
}
