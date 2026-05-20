import { NextRequest, NextResponse } from 'next/server';
import { analyzeCoverWithAI } from '../../../../lib/ai/coverIntelligence';
import { generateBackground } from '../../../../lib/ai/agents/bgGenerator';
import type { NovaCenaAsset } from '../../../../lib/ai/schemas';

export const runtime = 'nodejs';
export const maxDuration = 120;

const APP_ORIGIN = process.env.NOVACENA_APP_ORIGIN || 'http://localhost:3000';

function toAbsoluteUrl(src: string): string {
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
  let fixed = src;
  if (fixed.startsWith('/uploads/')) fixed = fixed.replace('/uploads/', '/api/uploads/');
  if (fixed.startsWith('/')) return `${APP_ORIGIN}${fixed}`;
  return fixed;
}

/**
 * POST /api/ai/generate-bg
 *
 * Pipeline:
 *  1. Recebe coverUrl + briefing
 *  2. Analisa capa (Claude/Gemini) — extrai mood, paleta
 *  3. Gera BG cinematográfico (OpenAI gpt-image-1)
 *  4. Salva em public/uploads/ai-backgrounds/
 *  5. Retorna URL pronta pra usar como bgVideo no Studio
 *
 * Body:
 *  - coverUrl: URL absoluta ou data: da capa
 *  - briefing?: contexto extra
 *  - quality?: 'low'|'medium'|'high' (default medium)
 *  - mood?: força um mood específico
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
    const quality = (body.quality as 'low' | 'medium' | 'high') ?? 'medium';
    const moodOverride = typeof body.mood === 'string' ? body.mood : undefined;

    const assets: NovaCenaAsset[] = [{ id: 'cover-1', role: 'cover', src: coverUrl }];

    // 1. ANALISA a capa (Claude/Gemini fallback chain)
    const visual = await analyzeCoverWithAI({
      providerId: 'auto',
      assets,
      briefing,
    });

    // 2. GERA o BG (OpenAI gpt-image-1)
    const bg = await generateBackground({
      visual,
      briefing,
      quality,
      moodOverride,
    });

    return NextResponse.json({
      ok: true,
      visual,
      bg,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 },
    );
  }
}
