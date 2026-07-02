import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSaasUserById, SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';
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

const LEGACY_COMPOSITION_FALLBACKS: Record<string, string[]> = {
  youtube_subscribe: ['WatchOnYouTube'],
  'youtube_subscribe:feed': ['WatchOnYouTubeFeed'],
  youtube_views: ['Milestone', 'WatchOnYouTube'],
  'youtube_views:feed': ['MilestoneFeed', 'WatchOnYouTubeFeed'],
  listen_deezer: ['OutNow'],
  'listen_deezer:feed': ['OutNowFeed'],
};

const LAMBDA_START_RETRY_DELAYS_MS = [2500, 7500, 15000];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLambdaCapacityError(message: string) {
  return /rate exceeded|concurrency|quota|ConcurrentInvocationLimitExceeded|TooManyRequestsException|too many requests/i.test(message);
}

function isMissingCompositionError(message: string) {
  return /Could not find composition with ID|No composition with id|Composition .* not found/i.test(message);
}

function compositionCandidatesFor(compositionKey: string) {
  const primary = COMPOSITION_MAP[compositionKey];
  if (!primary) return [];
  return [primary, ...(LEGACY_COMPOSITION_FALLBACKS[compositionKey] ?? [])]
    .filter((composition, index, list) => list.indexOf(composition) === index);
}

const lambdaCompositionCache = new Map<string, { ids: Set<string>; expiresAt: number }>();
const LAMBDA_COMPOSITION_CACHE_TTL_MS = 5 * 60 * 1000;

async function getAvailableLambdaCompositionIds(
  getCompositionsOnLambda: (options: Record<string, unknown>) => Promise<Array<{ id: string }>>,
  options: {
    region: string;
    functionName: string;
    serveUrl: string;
    bucketName: string;
  },
) {
  const cacheKey = `${options.region}|${options.functionName}|${options.serveUrl}|${options.bucketName}`;
  const cached = lambdaCompositionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.ids;

  try {
    const compositions = await getCompositionsOnLambda({
      region: options.region,
      functionName: options.functionName,
      serveUrl: options.serveUrl,
      inputProps: {},
      forceBucketName: options.bucketName,
      timeoutInMilliseconds: 45000,
      logLevel: 'warn',
    });
    const ids = new Set(compositions.map((composition) => composition.id));
    lambdaCompositionCache.set(cacheKey, {
      ids,
      expiresAt: Date.now() + LAMBDA_COMPOSITION_CACHE_TTL_MS,
    });
    return ids;
  } catch (error) {
    console.warn('[render:lambda] Não consegui listar composições da Lambda; tentando render direto.', error);
    return null;
  }
}

function supportedCompositionCandidates(candidates: string[], availableIds: Set<string> | null) {
  if (!availableIds) return candidates;
  const supported = candidates.filter((candidate) => availableIds.has(candidate));
  return supported.length > 0 ? supported : candidates;
}

function maxWorkersPerRender(accountConcurrencyLimit: number) {
  // Folga abaixo do limite da conta. Com limite 10 e folga 2 → 8 workers (8 +
  // orquestrador = 9 ≤ 10). Chunks MENORES = cada chunk cabe no timeout de 900s
  // da Lambda, essencial pra vídeo longo (50s+) — com 6 workers o chunk ficava
  // com ~265 frames e estourava os 900s (render morria ~90% com "timeout").
  // Seguro porque a fila serializa 1 render por vez (NOVACENA_MAX_ACTIVE=1).
  // Quando a AWS aprovar a quota (5000), escala sozinho. Ajustável por env.
  const headroom = Math.max(2, Number(process.env.REMOTION_LAMBDA_CONCURRENCY_HEADROOM || 2));
  const accountWorkerLimit = Math.max(1, Math.floor(accountConcurrencyLimit) - headroom);
  const configured = Number(process.env.REMOTION_LAMBDA_MAX_WORKERS_PER_RENDER || accountWorkerLimit);
  const appWorkerLimit = Math.max(1, Math.floor(Number.isFinite(configured) ? configured : accountWorkerLimit));
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

      // Capacidade estourou (muitos lambdas concorrentes): reduz a concorrência
      // dobrando o chunk — mas NUNCA joga tudo num lambda só (totalFrames), que
      // garantiria timeout. Limitado a metade do total pra manter ≥2 chunks.
      framesPerLambda = Math.min(Math.ceil(totalFrames / 2), framesPerLambda * 2);
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
    '.otf': 'font/otf',
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
    const { template, target = 'story', inputProps, downloadName } = body as {
      template: string;
      target?: 'story' | 'feed';
      inputProps?: Record<string, unknown>;
      downloadName?: string;
    };

    // Nome do arquivo no download (Content-Disposition no S3). Sanitiza pra um
    // nome de arquivo seguro mantendo espaços/hífen; sempre termina em .mp4.
    const safeDownloadName = (() => {
      const raw = typeof downloadName === 'string' ? downloadName.trim() : '';
      if (!raw) return undefined;
      const cleaned = raw.replace(/[\\/:*?"<>|\r\n]+/g, '').slice(0, 200);
      if (!cleaned) return undefined;
      return /\.mp4$/i.test(cleaned) ? cleaned : `${cleaned}.mp4`;
    })();

    const compositionKey = target === 'feed' ? `${template}:feed` : template;
    const compositionCandidates = compositionCandidatesFor(compositionKey);
    if (compositionCandidates.length === 0) {
      return NextResponse.json(
        { ok: false, error: `Template desconhecido: ${compositionKey}` },
        { status: 400 }
      );
    }
    const primaryComposition = compositionCandidates[0];

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
          { ok: false, error: 'Sua conta ainda não tem renders. Assine um plano em Planos e Renders para exportar — montar e assistir o preview continua grátis.' },
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
    // O nº de chunks = totalFrames / framesPerLambda NUNCA pode passar do limite
    // de concorrência da conta (10) — senão estoura ConcurrentInvocationLimit e
    // o render morre com "ocupado". Por isso dividimos por maxWorkers (=8), o que
    // garante ≤8 chunks simultâneos. A função Lambda é de 900s, então cada chunk
    // (mesmo grande, ex. 225 frames em vídeo de 60s) cabe folgado no timeout.
    const optimalFramesPerLambda = Math.max(20, Math.ceil(totalFrames / maxWorkers));

    const { getCompositionsOnLambda, renderMediaOnLambda } = await import('@remotion/lambda/client');
    const availableCompositionIds = await getAvailableLambdaCompositionIds(
      getCompositionsOnLambda as unknown as (options: Record<string, unknown>) => Promise<Array<{ id: string }>>,
      { region, functionName, serveUrl, bucketName },
    );
    const renderCompositionCandidates = supportedCompositionCandidates(compositionCandidates, availableCompositionIds);

    // POSTER / CAPA: renderiza um STILL REAL do frame escolhido (com overlay,
    // textos, logos — tudo, igual o preview) e injeta como imagem da capa. É bem
    // mais confiável que congelar a composição: OffthreadVideo (overlay de vídeo)
    // NÃO renderiza dentro de Freeze aninhado/Sequence, então a capa saía sem o
    // overlay. O still é um render normal de 1 frame → pega tudo certo.
    const posterCfg = (resolvedProps as Record<string, any>)?.poster;
    if (posterCfg?.enabled && posterCfg?.mode === 'composition' && !posterCfg?.stillUrl && renderCompositionCandidates[0]) {
      try {
        const holdSec = Number(posterCfg.holdSec) || 1;
        const outroSec = posterCfg.outroEnabled ? holdSec : 0;
        const baseDurationSec = Math.max(1, durationSec - holdSec - outroSec);
        const baseFrames = Math.ceil(baseDurationSec * 30);
        const posterFrame = Math.max(0, Math.min(baseFrames - 1, Math.round((Number(posterCfg.frameSec) || 0) * 30)));
        // Props da still: composição BASE no frame escolhido, SEM poster (sem
        // freeze nem extensão de duração) → render normal daquele frame.
        const stillProps = {
          ...resolvedProps,
          durationSeconds: baseDurationSec,
          poster: { ...posterCfg, enabled: false },
          motion: { ...(resolvedProps as Record<string, any>).motion, poster: { ...posterCfg, enabled: false } },
        };
        const { renderStillOnLambda } = await import('@remotion/lambda/client');
        const stillRes = await renderStillOnLambda({
          region: region as 'us-east-1',
          functionName,
          serveUrl,
          composition: renderCompositionCandidates[0],
          inputProps: stillProps,
          imageFormat: 'png',
          frame: posterFrame,
          forceBucketName: bucketName,
          privacy: 'public',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any) as { url?: string };
        if (stillRes?.url) {
          (resolvedProps as Record<string, any>).poster = { ...posterCfg, stillUrl: stillRes.url };
          if ((resolvedProps as Record<string, any>).motion) {
            (resolvedProps as Record<string, any>).motion.poster = { ...posterCfg, stillUrl: stillRes.url };
          }
        }
      } catch (stillError) {
        // Se a still falhar, segue sem ela (fallback: freeze da composição).
        console.error('[render/lambda] poster still failed', stillError);
      }
    }

    let result: { renderId: string; bucketName: string } | null = null;
    let composition = primaryComposition;
    let fallbackFrom: string | undefined;
    let lastMissingCompositionError: unknown = null;

    for (const candidate of renderCompositionCandidates) {
      try {
        result = await startRenderWithCapacityRetry(
          renderMediaOnLambda,
          {
            region: region as 'us-east-1',
            functionName,
            serveUrl,
            composition: candidate,
            codec: 'h264',
            inputProps: resolvedProps,
            forceBucketName: bucketName,
            maxRetries: 2,
            // Timeout do delayRender POR FRAME (padrão 30s é baixo). Overlays de
            // vídeo no render fazem seek pesado (<Freeze><Video>) e alguns frames
            // passam de 30s → render morria ~60% com "timeout". 120s dá folga; a
            // função Lambda é de 900s, então o chunk inteiro ainda cabe.
            timeoutInMilliseconds: Number(process.env.REMOTION_LAMBDA_FRAME_TIMEOUT_MS || 120000),
            // Nomenclatura padrão: o S3 serve o arquivo já com o nome certo
            // (FEED - LANÇAMENTO - ARTISTA - SINGLE.mp4) no download — funciona
            // em cross-origin, ao contrário do atributo download no <a>.
            ...(safeDownloadName
              ? { downloadBehavior: { type: 'download' as const, fileName: safeDownloadName } }
              : {}),
          },
          totalFrames,
          optimalFramesPerLambda,
        );
        composition = candidate;
        fallbackFrom = candidate === primaryComposition ? undefined : primaryComposition;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isMissingCompositionError(message) && candidate !== renderCompositionCandidates[renderCompositionCandidates.length - 1]) {
          lastMissingCompositionError = error;
          continue;
        }
        throw error;
      }
    }

    if (!result) {
      throw lastMissingCompositionError instanceof Error
        ? lastMissingCompositionError
        : new Error(`Não foi possível iniciar o render da composição ${primaryComposition}`);
    }

    await activateLambdaRenderSlot(reservationId, result.renderId, result.bucketName, saasUserId);

    cleanupTransientFiles().catch(() => {});

    return NextResponse.json({
      ok: true,
      renderId: result.renderId,
      bucketName: result.bucketName,
      composition,
      fallbackFrom,
    });
  } catch (err) {
    if (reservationId) {
      await releaseLambdaRenderSlot({ reservationId }).catch(() => {});
    }
    const message = err instanceof Error ? err.message : 'Erro ao iniciar render Lambda';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
