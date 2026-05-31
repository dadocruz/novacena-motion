import { NextRequest, NextResponse } from 'next/server';
import { analyzeCoverWithAI } from '../../../../lib/ai/coverIntelligence';
import { generateVideoBgRest } from '../../../../lib/ai/agents/videoGenerator';
import type { NovaCenaAsset } from '../../../../lib/ai/schemas';

export const runtime = 'nodejs';
export const maxDuration = 300;

const APP_ORIGIN = process.env.NOVACENA_APP_ORIGIN || 'http://localhost:3000';

function toAbsoluteUrl(src: string): string {
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
  let fixed = src;
  if (fixed.startsWith('/uploads/')) fixed = fixed.replace('/uploads/', '/api/uploads/');
  if (fixed.startsWith('/')) return `${APP_ORIGIN}${fixed}`;
  return fixed;
}

/**
 * POST /api/ai/generate-video-bg
 *
 * Pipeline:
 *  1. Recebe coverUrl + briefing
 *  2. Analisa capa (Gemini/Claude) — extrai mood, paleta
 *  3. Gera vídeo animado via Gemini Veo (Image-to-Video)
 *  4. Salva em public/uploads/ai-videos/
 *  5. Retorna URL pronta pra usar como videoSrc no CinematicBackground
 *
 * Body:
 *  - coverUrl: URL da capa (absoluta, relativa, ou data:)
 *  - briefing?: contexto extra pro estilo
 *  - mood?: força mood específico
 *  - durationSeconds?: 5-8 (default 8)
 *  - aspectRatio?: '9:16' | '16:9' | '1:1' (default '9:16')
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCoverUrl = typeof body.coverUrl === 'string' ? body.coverUrl : null;
    if (!rawCoverUrl) {
      return NextResponse.json({ ok: false, error: 'coverUrl é obrigatório' }, { status: 400 });
    }

    const coverUrl = toAbsoluteUrl(rawCoverUrl);
    const briefing = typeof body.briefing === 'string' ? body.briefing : undefined;
    const moodOverride = typeof body.mood === 'string' ? body.mood : undefined;
    const durationSeconds = Math.min(Math.max(Number(body.durationSeconds) || 8, 5), 8);
    const aspectRatio = (['9:16', '16:9', '1:1'] as const).includes(body.aspectRatio)
      ? body.aspectRatio
      : '9:16';

    const assets: NovaCenaAsset[] = [{ id: 'cover-1', role: 'cover', src: coverUrl }];

    // 1. Analisa a capa
    const visual = await analyzeCoverWithAI({
      providerId: 'auto',
      assets,
      briefing,
    });

    // 2. Gera vídeo via Gemini Veo
    const video = await generateVideoBgRest({
      coverUrl,
      visual,
      briefing,
      moodOverride,
      durationSeconds,
      aspectRatio,
    });

    return NextResponse.json({
      ok: true,
      visual,
      video,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[generate-video-bg]', message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
