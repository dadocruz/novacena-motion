import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { consumeUserTokens, getSaasUserById, SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';
import { cleanupTransientFiles } from '../../../../lib/transientCleanup';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SAAS_MODE =
  process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
  process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';

const COMPOSITION_MAP: Record<string, string> = {
  available_now: 'AvailableNow',
  'available_now:feed': 'AvailableNowFeed',
  watch_youtube: 'WatchOnYouTube',
  'watch_youtube:feed': 'WatchOnYouTubeFeed',
  youtube_subscribe: 'YouTubeSubscribe',
  'youtube_subscribe:feed': 'YouTubeSubscribeFeed',
  youtube_views: 'YouTubeViews',
  'youtube_views:feed': 'YouTubeViewsFeed',
  milestone: 'Milestone',
  'milestone:feed': 'MilestoneFeed',
  out_now: 'OutNow',
  'out_now:feed': 'OutNowFeed',
  spotify_print: 'SpotifyPrint',
  'spotify_print:feed': 'SpotifyPrintFeed',
};

function lookupContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return types[ext] || 'application/octet-stream';
}

/**
 * Upload local media file to S3 so Lambda workers can access it.
 * Returns the public S3 URL.
 */
async function uploadLocalAssetToS3(
  localRelativeUrl: string,
  bucketName: string,
  region: string,
): Promise<string> {
  // Convert API URL to local file path
  // e.g. "/api/uploads/videos/1234-file.mp4" → "public/uploads/videos/1234-file.mp4"
  // e.g. "/api/uploads/video-sources/1234-file.mp4" → "public/uploads/video-sources/1234-file.mp4"
  const urlPath = localRelativeUrl.replace(/^\/api\/uploads\//, '');
  const localPath = path.join(process.cwd(), 'public', 'uploads', urlPath);

  await stat(localPath); // throws if file doesn't exist

  const fileBuffer = await readFile(localPath);
  const s3Key = `render-assets/${Date.now()}-${path.basename(localPath)}`;
  const contentType = lookupContentType(localPath);

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: contentType,
  }));

  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
}

/** S3 URL cache to avoid re-uploading the same file multiple times in one request */
const uploadCache = new Map<string, string>();

/**
 * Recursively walk any object/array and replace local /api/uploads/ URLs
 * with public S3 URLs. Uploads files on first encounter, caches for reuse.
 */
async function resolveLocalAssets(
  value: unknown,
  bucketName: string,
  region: string,
): Promise<unknown> {
  if (typeof value === 'string' && value.startsWith('/api/uploads/')) {
    if (uploadCache.has(value)) return uploadCache.get(value)!;
    try {
      const s3Url = await uploadLocalAssetToS3(value, bucketName, region);
      uploadCache.set(value, s3Url);
      return s3Url;
    } catch {
      // File doesn't exist locally — leave the URL as-is
      return value;
    }
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => resolveLocalAssets(item, bucketName, region)));
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      resolved[key] = await resolveLocalAssets(val, bucketName, region);
    }
    return resolved;
  }

  return value;
}

export async function POST(req: NextRequest) {
  try {
    cleanupTransientFiles().catch(() => {});

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

    if (!bucketName) {
      return NextResponse.json(
        { ok: false, error: 'REMOTION_LAMBDA_BUCKET_NAME não definida.' },
        { status: 500 }
      );
    }

    let saasUserId: string | null = null;
    if (SAAS_MODE) {
      const session = verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
      if (!session) {
        return NextResponse.json(
          { ok: false, error: 'Entre na sua conta para exportar.' },
          { status: 401 }
        );
      }
      const user = await getSaasUserById(session.sub);
      if (!user) {
        return NextResponse.json(
          { ok: false, error: 'Conta não encontrada. Entre novamente.' },
          { status: 401 }
        );
      }
      if (user.tokens < 1) {
        return NextResponse.json(
          { ok: false, error: 'Seu render de demonstração já foi usado. Compre um pacote em Planos e Renders para continuar exportando.' },
          { status: 402 }
        );
      }
      saasUserId = user.id;
    }

    // Upload local assets to S3 so Lambda workers can access them
    uploadCache.clear();
    const resolvedProps = inputProps
      ? (await resolveLocalAssets(inputProps, bucketName, region)) as Record<string, unknown>
      : {};

    // Calculate optimal framesPerLambda based on video duration and concurrency limit
    const durationSec = Number(
      (resolvedProps as any)?.durationSeconds ?? 40
    );
    const totalFrames = Math.ceil(durationSec * 30);
    const concurrencyLimit = Number(process.env.REMOTION_LAMBDA_CONCURRENCY ?? 10);
    // Reserve 2 slots for orchestrator + encoding, rest for render workers
    const maxWorkers = Math.max(2, concurrencyLimit - 2);
    const optimalFramesPerLambda = Math.max(20, Math.ceil(totalFrames / maxWorkers));

    const { renderMediaOnLambda } = await import('@remotion/lambda/client');

    const result = await renderMediaOnLambda({
      region: region as 'us-east-1',
      functionName,
      serveUrl,
      composition,
      codec: 'h264',
      inputProps: resolvedProps,
      forceBucketName: bucketName,
      maxRetries: 2,
      framesPerLambda: optimalFramesPerLambda,
    });

    if (saasUserId) {
      await consumeUserTokens(saasUserId, 1);
    }

    cleanupTransientFiles().catch(() => {});

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
