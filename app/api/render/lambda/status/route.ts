import { NextRequest, NextResponse } from 'next/server';
import { heartbeatLambdaRenderSlot, releaseLambdaRenderSlot } from '../../../../../lib/lambdaRenderSlots';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const renderId = searchParams.get('renderId');
  const bucket = searchParams.get('bucketName');

  if (!renderId || !bucket) {
    return NextResponse.json(
      { ok: false, error: 'renderId e bucketName são obrigatórios.' },
      { status: 400 }
    );
  }

  const region = process.env.REMOTION_AWS_REGION || 'us-east-1';
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;

  if (!functionName) {
    return NextResponse.json(
      { ok: false, error: 'REMOTION_LAMBDA_FUNCTION_NAME não definida.' },
      { status: 500 }
    );
  }

  try {
    const { getRenderProgress } = await import('@remotion/lambda/client');

    const progress = await getRenderProgress({
      renderId,
      bucketName: bucket,
      functionName,
      region: region as 'us-east-1',
    });

    if (progress.done || progress.fatalErrorEncountered) {
      await releaseLambdaRenderSlot({ renderId, bucketName: bucket }).catch(() => {});
    } else {
      await heartbeatLambdaRenderSlot(renderId, bucket).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      done: progress.done,
      progress: Math.round((progress.overallProgress ?? 0) * 100),
      outputFile: progress.outputFile ?? null,
      fatalErrorEncountered: progress.fatalErrorEncountered,
      errors: (progress.errors ?? []).map((e: { message: string } | string) =>
        typeof e === 'string' ? e : e.message
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar progresso';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
