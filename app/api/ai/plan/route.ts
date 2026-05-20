import { NextRequest, NextResponse } from 'next/server';
import { generateMotionPlanWithAI } from '../../../../lib/ai/motionPlanner';
import type {
  CoverIntelligenceResult,
  NovaCenaAsset,
  NovaCenaFormat,
  NovaCenaTextPlan,
} from '../../../../lib/ai/schemas';
import type { ProviderId } from '../../../../lib/ai/providerRegistry';

export const runtime = 'nodejs';
export const maxDuration = 60;

function normalizeFormats(value: unknown): NovaCenaFormat[] {
  if (!Array.isArray(value)) return ['story', 'square'];

  const allowed = new Set(['story', 'square', 'youtube']);
  const formats = value.filter((item): item is NovaCenaFormat => {
    return typeof item === 'string' && allowed.has(item);
  });

  return formats.length > 0 ? formats : ['story', 'square'];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const assets = (body.assets ?? []) as NovaCenaAsset[];
    const texts = (body.texts ?? {}) as NovaCenaTextPlan;
    const visualAnalysis = body.visualAnalysis as CoverIntelligenceResult | undefined;
    const targetFormats = normalizeFormats(body.targetFormats);
    const briefing = typeof body.briefing === 'string' ? body.briefing : undefined;
    const providerId = (body.providerId ?? 'auto') as ProviderId;
    const noCache = body.noCache === true;

    const plan = await generateMotionPlanWithAI({
      providerId,
      visualAnalysis,
      assets,
      texts,
      targetFormats,
      briefing,
      noCache,
    });

    return NextResponse.json({
      ok: true,
      providerId,
      plan,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano IA.',
      },
      { status: 500 }
    );
  }
}
