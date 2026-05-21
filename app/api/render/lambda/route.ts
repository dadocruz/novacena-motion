import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const COMPOSITION_MAP: Record<string, string> = {
  available_now: 'AvailableNow',
  'available_now:feed': 'AvailableNowFeed',
  watch_youtube: 'WatchOnYouTube',
  'watch_youtube:feed': 'WatchOnYouTubeFeed',
  milestone: 'Milestone',
  'milestone:feed': 'MilestoneFeed',
  out_now: 'OutNow',
  'out_now:feed': 'OutNowFeed',
  spotify_print: 'SpotifyPrint',
  'spotify_print:feed': 'SpotifyPrintFeed',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { template, target = 'story', inputProps } = body as {
      template: string;
      target?: 'story' | 'feed';
      inputProps?: Record<string, unknown>;
    };

    const compositionKey = target === 'feed' ? `${template}:feed` : template;
    const composition = COMPOSITION_MAP[compositionKey];
    if (!composition) {
      return NextResponse.json(
        { ok: false, error: `Template desconhecido: ${compositionKey}` },
        { status: 400 }
      );
    }

    const region = process.env.REMOTION_AWS_REGION || 'us-east-1';
    const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_LAMBDA_SERVE_URL;
    const bucketName = process.env.REMOTION_LAMBDA_BUCKET_NAME;

    if (!functionName || !serveUrl) {
      return NextResponse.json(
        { ok: false, error: 'Lambda não configurada. Defina REMOTION_LAMBDA_FUNCTION_NAME e REMOTION_LAMBDA_SERVE_URL.' },
        { status: 500 }
      );
    }

    const { renderMediaOnLambda } = await import('@remotion/lambda/client');

    const result = await renderMediaOnLambda({
      region: region as 'us-east-1',
      functionName,
      serveUrl,
      composition,
      codec: 'h264',
      inputProps: inputProps ?? {},
      ...(bucketName ? { forceBucketName: bucketName } : {}),
    });

    return NextResponse.json({
      ok: true,
      renderId: result.renderId,
      bucketName: result.bucketName,
      composition,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao iniciar render Lambda';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
