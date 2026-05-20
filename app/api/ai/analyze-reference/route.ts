import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { analyzeReferenceImage } from '../../../../lib/ai/agents/referenceAnalyzer';

export const runtime = 'nodejs';
export const maxDuration = 60;

const APP_ORIGIN = process.env.NOVACENA_APP_ORIGIN || 'http://localhost:3000';

function toAbsoluteUrl(src: string): string {
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/uploads/')) src = src.replace('/uploads/', '/api/uploads/');
  if (src.startsWith('/')) return `${APP_ORIGIN}${src}`;
  return src;
}

/**
 * POST /api/ai/analyze-reference
 *
 * Aceita 2 modos:
 *  A) multipart/form-data com file: faz upload + analisa
 *  B) JSON { referenceUrl }: usa URL existente
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    let referenceUrl: string;
    let briefing: string | undefined;
    let publicUrl: string;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      briefing = (form.get('briefing') as string) || undefined;

      if (!file) return NextResponse.json({ ok: false, error: 'file ausente' }, { status: 400 });

      // Salva em public/uploads/motion-references/
      const ext = path.extname(file.name) || '.png';
      const filename = `ref-${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'motion-references', filename);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buf);
      publicUrl = `/api/uploads/motion-references/${filename}`;
      referenceUrl = `${APP_ORIGIN}${publicUrl}`;
    } else {
      const body = await req.json().catch(() => ({}));
      const raw = typeof body.referenceUrl === 'string' ? body.referenceUrl : null;
      if (!raw) return NextResponse.json({ ok: false, error: 'referenceUrl é obrigatório' }, { status: 400 });
      referenceUrl = toAbsoluteUrl(raw);
      publicUrl = referenceUrl;
      briefing = typeof body.briefing === 'string' ? body.briefing : undefined;
    }

    // Pra esse MVP: aceitamos PNG/JPG (image). MP4 fica pra próxima etapa
    // (precisa extrair frames via ffmpeg).
    const isVideo = /\.(mp4|mov|webm)$/i.test(referenceUrl);
    if (isVideo) {
      return NextResponse.json({
        ok: false,
        error: 'Vídeo de referência ainda não suportado. Exporte um frame como PNG/JPG.',
      }, { status: 400 });
    }

    const analysis = await analyzeReferenceImage({
      referenceUrl,
      type: 'image',
      briefing,
    });

    return NextResponse.json({
      ok: true,
      referenceUrl: publicUrl,
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 },
    );
  }
}
