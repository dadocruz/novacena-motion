import { NextRequest, NextResponse } from 'next/server';
import { analyzeCoverWithAI } from '../../../../lib/ai/coverIntelligence';
import type { NovaCenaAsset } from '../../../../lib/ai/schemas';
import type { ProviderId } from '../../../../lib/ai/providerRegistry';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const assets = (body.assets ?? []) as NovaCenaAsset[];
    const briefing = typeof body.briefing === 'string' ? body.briefing : undefined;
    const providerId = (body.providerId ?? 'auto') as ProviderId;
    const noCache = body.noCache === true;

    if (!assets.length) {
      return NextResponse.json(
        { ok: false, error: 'Envie pelo menos 1 asset com role "cover".' },
        { status: 400 },
      );
    }

    const result = await analyzeCoverWithAI({
      providerId,
      assets,
      briefing,
      noCache,
    });

    return NextResponse.json({
      ok: true,
      providerId,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao analisar assets.',
      },
      { status: 500 }
    );
  }
}
