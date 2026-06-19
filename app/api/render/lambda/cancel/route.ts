import { NextRequest, NextResponse } from 'next/server';
import { releaseLambdaRenderSlot } from '../../../../../lib/lambdaRenderSlots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/render/lambda/cancel — libera o slot da fila quando o usuário
 *  cancela um export (ex.: clicou sem querer). Os lambdas já disparados
 *  terminam sozinhos, mas a fila é liberada na hora pra um novo render.
 *  Tenta também apagar o output parcial do S3 (best-effort). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const renderId = typeof body.renderId === 'string' ? body.renderId : undefined;
  const bucketName = typeof body.bucketName === 'string' ? body.bucketName : undefined;

  if (!renderId || !bucketName) {
    return NextResponse.json({ ok: false, error: 'renderId e bucketName são obrigatórios.' }, { status: 400 });
  }

  await releaseLambdaRenderSlot({ renderId, bucketName }).catch(() => {});

  // Best-effort: tenta apagar o render no S3 (não bloqueia o cancelamento).
  try {
    const region = process.env.REMOTION_AWS_REGION || 'us-east-1';
    const { deleteRender } = await import('@remotion/lambda/client');
    await deleteRender({
      renderId,
      bucketName,
      region: region as 'us-east-1',
    }).catch(() => {});
  } catch {
    /* cleanup é opcional — o cancelamento já liberou a fila */
  }

  return NextResponse.json({ ok: true });
}
