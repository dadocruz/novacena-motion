import { NextRequest, NextResponse } from 'next/server';
import { analyzeCoverWithAI } from '../../../../lib/ai/coverIntelligence';
import type { NovaCenaAsset } from '../../../../lib/ai/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const assets = (body.assets ?? []) as NovaCenaAsset[];
    const briefing = typeof body.briefing === 'string' ? body.briefing : undefined;
    const providerId = body.providerId === 'custom-http' ? 'custom-http' : 'mock';

    const result = await analyzeCoverWithAI({
      providerId,
      assets,
      briefing,
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
