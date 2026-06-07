import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { consumeUserTokens, getSaasUserById, SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';
import { cleanupTransientFiles } from '../../../../lib/transientCleanup';
import {
  activateLambdaRenderSlot,
  releaseLambdaRenderSlot,
  reserveLambdaRenderSlot,
} from '../../../../lib/lambdaRenderSlots';

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
  listen_deezer: 'ListenDeezer',
  'listen_deezer:feed': 'ListenDeezerFeed',
  spotify_print: 'SpotifyPrint',
  'spotify_print:feed': 'SpotifyPrintFeed',
};

const LAMBDA_START_RETRY_DELAYS_MS = [2500, 7500, 15000];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLambdaCapacityError(message: string) {
  return /rate exceeded|concurrency|quota|ConcurrentInvocationLimitExceeded|TooManyRequestsException|too many requests/i.test(message);
}

function maxWorkersPerRender(accountConcurrencyLimit: number) {
  const configured = Number(process.env.REMOTION_LAMBDA_MAX_WORKERS_PER_RENDER || 2);
  const accountWorkerLimit = Math.max(1, Math.floor(accountConcurrencyLimit) - 2);
  const appWorkerLimit = Math.max(1, Math.floor(Number.isFinite(configured) ? configured : 2));
  return Math.max(1, Math.min(accountWorkerLimit, appWorkerLimit));
}

async function startRenderWithCapacityRetry(
  renderMediaOnLambda: (options: any) => Promise<{ renderId: string; bucketName: string }>,
  options: Record<string, unknown>,
  totalFrames: number,
  initialFramesPerLambda: number,
) {
  let framesPerLambda = initialFramesPerLambda;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= LAMBDA_START_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await renderMediaOnLambda({
        ...options,
        framesPerLambda,
      });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const canRetry = isLambdaCapacityError(message) && attempt < LAMBDA_START_RETRY_DELAYS_MS.length;
      if (!canRetry) throw error;

      framesPerLambda = Math.max(framesPerLambda, totalFrames);
      await wait(LAMBDA_START_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha ao iniciar render Lambda');
}

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

function cleanUrlPath(value: string) {
  return value.split('?')[0].split('#')[0];
}

function localAssetPathFromUrl(localRelativeUrl: string) {
  const cleanPath = cleanUrlPath(localRelativeUrl);

  if (cleanPath.startsWith('/api/uploads/')) {
    return path.join(process.cwd(), 'public', 'uploads', cleanPath.replace(/^\/api\/uploads\//, ''));
  }

  if (cleanPath.startsWith('/uploads/')) {
    return path.join(process.cwd(), 'public', cleanPath.replace(/^\/+/, ''));
  }

  if (/^\/(?:logos|fonts|images|backgrounds)\//.test(cleanPath)) {
    return path.join(process.cwd(), 'public', cleanPath.replace(/^\/+/, ''));
  }

  return null;
}

function shouldUploadLocalAsset(value: string) {
  const cleanPath = cleanUrlPath(value);
  return (
    cleanPath.startsWith('/api/uploads/') ||
    cleanPath.startsWith('/uploads/') ||
    /^\/(?:logos|fonts|images|backgrounds)\//.test(cleanPath)
  );
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
  const localPath = localAssetPathFromUrl(localRelativeUrl);
  if (!localPath) throw new Error(`Asset local não suportado: ${localRelativeUrl}`);

  await stat(localPath); // throws if file doesn't exist

  const fileBuffer = await readFile(localPath);
  const safeName = localRelativeUrl.replace(/^\/+/, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
  const s3Key = `render-assets/${Date.now()}-${safeName || path.basename(localPath)}`;
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
  if (typeof value === 'string' && shouldUploadLocalAsset(value)) {
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
  let reservationId: string | null = null;

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

    const slot = await reserveLambdaRenderSlot();
    if (!slot.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: 'RENDER_BUSY',
          error: 'Há uma exportação em andamento. Esta exportação entrou em espera automática.',
          retryAfterSec: slot.retryAfterSec,
          activeRenders: slot.activeRenders,
          maxActiveRenders: slot.maxActiveRenders,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(slot.retryAfterSec),
          },
        }
      );
    }
    reservationId = slot.reservationId;

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
    const maxWorkers = maxWorkersPerRender(concurrencyLimit);
    const optimalFramesPerLambda = Math.max(20, Math.ceil(totalFrames / maxWorkers));

    const { renderMediaOnLambda } = await import('@remotion/lambda/client');

    const result = await startRenderWithCapacityRetry(
      renderMediaOnLambda,
      {
        region: region as 'us-east-1',
        functionName,
        serveUrl,
        composition,
        codec: 'h264',
        inputProps: resolvedProps,
        forceBucketName: bucketName,
        maxRetries: 2,
      },
      totalFrames,
      optimalFramesPerLambda,
    );

    await activateLambdaRenderSlot(reservationId, result.renderId, result.bucketName);

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
    if (reservationId) {
      await releaseLambdaRenderSlot({ reservationId }).catch(() => {});
    }
    const message = err instanceof Error ? err.message : 'Erro ao iniciar render Lambda';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
