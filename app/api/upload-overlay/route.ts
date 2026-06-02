import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { addOverlay, deleteOverlay, listOverlays } from '../../../lib/storage';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_SIZE = 500 * 1024 * 1024;
const MAX_SIZE_LABEL = '500 MB';
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
    const contentType = (req.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const filenameParam = req.nextUrl.searchParams.get('filename') || '';
    const extParam = path.extname(filenameParam).toLowerCase();

    if (req.body && contentType && !contentType.includes('multipart/form-data')) {
      const isVideo = ['.mp4', '.mov', '.webm', '.m4v'].includes(extParam);
      if (!isVideo) {
        return NextResponse.json(
          { ok: false, error: 'Upload direto só é aceito para vídeos. Use PNG/JPG/WEBP/SVG como elemento.' },
          { status: 400 }
        );
      }

      const contentLength = Number(req.headers.get('content-length') || 0);
      if (contentLength > MAX_SIZE) {
        return NextResponse.json(
          { ok: false, error: `Arquivo muito grande (${(contentLength / 1024 / 1024).toFixed(1)} MB). Máximo permitido: ${MAX_SIZE_LABEL}.` },
          { status: 413 }
        );
      }

      const filename = safeFileName(filenameParam, extParam || '.mp4');
      const dir = path.join(PUBLIC_UPLOADS, 'overlays');
      await import('fs/promises').then(({ mkdir }) => mkdir(dir, { recursive: true }));
      await pipeline(
        Readable.fromWeb(req.body as any),
        createWriteStream(path.join(dir, filename))
      );

      const label = cleanLabel(req.nextUrl.searchParams.get('label') || '', path.basename(filenameParam || filename, extParam || '.mp4'));
      const blendMode = req.nextUrl.searchParams.get('blendMode') || 'screen';
      const durationSecRaw = Number(req.nextUrl.searchParams.get('durationSec'));
      if (!ALLOWED_BLEND_MODES.has(blendMode)) {
        return NextResponse.json(
          { ok: false, error: `Blend mode inválido: ${blendMode}.` },
          { status: 400 }
        );
      }

      const overlay = await addOverlay({
        label,
        filename,
        path: `/api/uploads/overlays/${filename}`,
        type: 'video',
        blendMode: blendMode as 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal',
        durationSec: Number.isFinite(durationSecRaw) && durationSecRaw > 0 ? durationSecRaw : undefined,
      });
      return NextResponse.json({ ok: true, overlay });
    }

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
        { ok: false, error: `Arquivo muito grande (máx ${MAX_SIZE_LABEL}).` },
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
