import { NextRequest, NextResponse } from 'next/server';
import { orchestrateMotionPlan } from '../../../../lib/ai/orchestrator';
import type { NovaCenaFormat, NovaCenaTextPlan } from '../../../../lib/ai/schemas';

export const runtime = 'nodejs';
export const maxDuration = 90;

const APP_ORIGIN = process.env.NOVACENA_APP_ORIGIN || 'http://localhost:3000';

function toAbsoluteUrl(src: string): string {
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
  let fixed = src;
  if (fixed.startsWith('/uploads/')) fixed = fixed.replace('/uploads/', '/api/uploads/');
  if (fixed.startsWith('/')) return `${APP_ORIGIN}${fixed}`;
  return fixed;
}

/**
 * POST /api/ai/create
 *
 * Endpoint UNIFICADO que usa o ORQUESTRADOR (cascata otimizada Gemini/GPT/Claude).
 *
 * Body:
 *  - coverUrl: capa do single (obrigatório)
 *  - referenceUrl: motion design existente pra replicar estética (opcional)
 *  - referenceAnalysis: texto pre-analisado da referência (opcional, se já tem)
 *  - texts: textos do user
 *  - briefing: contexto extra
 *  - targetFormats: ['story', 'square']
 *  - noCache: ignora cache
 *
 * Retorna:
 *  - visualAnalysis: análise da capa
 *  - plan: motion plan completo
 *  - pipeline: detalhes de cada etapa (provider, custo, duração)
 *  - totalCostEstimateUsd: custo total estimado
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawCoverUrl = typeof body.coverUrl === 'string' ? body.coverUrl : null;
    if (!rawCoverUrl) {
      return NextResponse.json({ ok: false, error: 'coverUrl é obrigatório' }, { status: 400 });
    }
    const coverUrl = toAbsoluteUrl(rawCoverUrl);

    const texts = (body.texts ?? {}) as NovaCenaTextPlan;
    const briefing = typeof body.briefing === 'string' ? body.briefing : undefined;
    const targetFormats = Array.isArray(body.targetFormats) && body.targetFormats.length > 0
      ? (body.targetFormats as NovaCenaFormat[])
      : (['story', 'square'] as NovaCenaFormat[]);
    const noCache = body.noCache === true;

    const referenceUrl = typeof body.referenceUrl === 'string' ? toAbsoluteUrl(body.referenceUrl) : undefined;
    const referenceAnalysis = typeof body.referenceAnalysis === 'string' ? body.referenceAnalysis : undefined;

    const result = await orchestrateMotionPlan({
      coverUrl,
      referenceUrl,
      referenceAnalysis,
      texts,
      briefing,
      targetFormats,
      noCache,
    });

    return NextResponse.json({
      ok: true,
      visualAnalysis: result.visualAnalysis,
      plan: result.plan,
      pipeline: result.pipeline,
      totalCostEstimateUsd: result.totalCostEstimateUsd,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 },
    );
  }
}
