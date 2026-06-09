import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import {join, basename} from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { updateOverlayPreset } from '../../../lib/storage';
import { verifySessionToken, SAAS_COOKIE_NAME } from '../../../lib/saasUsers';

function isSaasModeRender() {
  return process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
    process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
}

const execAsync = promisify(exec);
const DEFAULT_APP_ORIGIN = process.env.NOVACENA_APP_ORIGIN || 'http://localhost:3000';
const LAMBDA_POLL_INTERVAL_MS = 5000;
const LAMBDA_MAX_WAIT_MS = Number(process.env.REMOTION_LAMBDA_MAX_WAIT_MS || 15 * 60 * 1000);
const LAMBDA_FRAMES_PER_LAMBDA = Number(process.env.REMOTION_LAMBDA_FRAMES_PER_LAMBDA || 999);
const LAMBDA_TARGET_CHUNKS = Number(process.env.REMOTION_LAMBDA_TARGET_CHUNKS || 4);
const LAMBDA_REQUIRED =
  process.env.RENDER_PROVIDER === 'lambda' ||
  (process.env.NODE_ENV === 'production' && process.env.RENDER_PROVIDER !== 'local');

function shQuote(value: string) {
  return JSON.stringify(value);
}

function toAppAssetUrl(value: string, appOrigin = DEFAULT_APP_ORIGIN) {
  if (!value) return value;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) return value;

  let fixed = value;
  if (fixed.startsWith('/uploads/')) fixed = fixed.replace('/uploads/', '/api/uploads/');
  if (fixed.startsWith('/')) return `${appOrigin}${fixed}`;

  return fixed;
}

function activeFontIdsFromMotion(motion: any) {
  return new Set(
    [
      motion?.fontHeadline,
      motion?.fontDate,
      motion?.fontCta,
      motion?.fontCta1,
      motion?.fontCta2,
    ].filter((id): id is string => typeof id === 'string' && id.length > 0)
  );
}


export const runtime = 'nodejs';
export const maxDuration = 900;

const RenderRequestSchema = z.object({
  project: z.object({
    type: z.enum(['available_now', 'watch_youtube', 'youtube_subscribe', 'youtube_views', 'milestone', 'out_now', 'listen_deezer', 'spotify_print', 'collaborator']),
    artistName: z.string().min(1),
    songTitle: z.string().min(1),
    formats: z.array(z.enum(['story', 'feed'])),
  }),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  streaming: z.boolean().optional().default(false),
});

const ScriptRenderSchema = z.object({
  script: z.string().min(1),
});

const ALLOWED_RENDER_SCRIPTS = new Set([
  'render:available',
  'render:available:feed',
  'render:youtube',
  'render:youtube:feed',
  'render:youtubesubscribe',
  'render:youtubesubscribe:feed',
  'render:youtubeviews',
  'render:youtubeviews:feed',
  'render:milestone',
  'render:milestone:feed',
  'render:outnow',
  'render:outnow:feed',
  'render:deezer',
  'render:deezer:feed',
  'render:spotifyprint',
  'render:spotifyprint:feed',
  'render:all',
  'render:all:v2',
]);

const renderQueue: Map<string, any> = new Map();

function getLambdaConfig() {
  const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_LAMBDA_SERVE_URL;

  if (!functionName || !serveUrl) return null;
  return { region, functionName, serveUrl };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLambdaRateLimitError(message: string) {
  return /rate exceeded|concurrency limit|ConcurrentInvocationLimitExceeded|TooManyRequestsException/i.test(message);
}

function friendlyLambdaError(message: string) {
  if (!isLambdaRateLimitError(message)) return message;

  return [
    'A AWS bloqueou o render por limite de concorrência da conta Lambda.',
    `O app está reduzindo a quantidade de Lambdas com framesPerLambda mínimo de ${LAMBDA_FRAMES_PER_LAMBDA} e alvo de até ${LAMBDA_TARGET_CHUNKS} chunks, então este limite precisa ser aumentado na AWS ou o vídeo precisa usar ainda menos segmentos.`,
    'Rode na VPS: npx remotion lambda quotas',
    'Depois solicite aumento em Service Quotas > AWS Lambda > Concurrent executions, ou tente REMOTION_LAMBDA_FRAMES_PER_LAMBDA=9999 para vídeos curtos.',
  ].join('\n');
}

function getEffectiveFramesPerLambda(renderProps: any) {
  const durationSecondsRaw = Number(renderProps?.durationSeconds ?? 8);
  const durationSeconds = Number.isFinite(durationSecondsRaw) && durationSecondsRaw > 0
    ? durationSecondsRaw
    : 8;
  const targetChunks = Number.isFinite(LAMBDA_TARGET_CHUNKS) && LAMBDA_TARGET_CHUNKS > 0
    ? Math.max(1, Math.floor(LAMBDA_TARGET_CHUNKS))
    : 4;
  const estimatedFrames = Math.max(1, Math.ceil(durationSeconds * 30));

  return Math.max(
    LAMBDA_FRAMES_PER_LAMBDA,
    Math.ceil(estimatedFrames / targetChunks)
  );
}

async function pathToDataUrl(urlPath: string): Promise<string | null> {
  try {
    let cleanPath = urlPath;
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      const u = new URL(cleanPath);
      cleanPath = u.pathname;
    }
    if (cleanPath.startsWith('/api/uploads/')) {
      cleanPath = cleanPath.replace('/api/uploads/', '/uploads/');
    }
    if (!cleanPath.startsWith('/uploads/')) {
      return null;
    }
    const filePath = join(process.cwd(), 'public', cleanPath);
    const buf = await readFile(filePath);
    const ext = (filePath.split('.').pop() || 'png').toLowerCase();
    const mime =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'svg' ? 'image/svg+xml' :
      ext === 'webp' ? 'image/webp' :
      'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Em modo SaaS, exige sessão válida: evita abuso de render/CPU por quem não
    // está logado (a thumbnail composta e o export sempre vêm de usuário logado).
    if (isSaasModeRender()) {
      const session = verifySessionToken(request.cookies.get(SAAS_COOKIE_NAME)?.value);
      if (!session) {
        return NextResponse.json({ ok: false, error: 'Acesso não autorizado.' }, { status: 401 });
      }
    }

    const body = await request.json();
    const appOrigin = process.env.NOVACENA_APP_ORIGIN || request.nextUrl.origin || DEFAULT_APP_ORIGIN;

    if (body && typeof body === 'object' && 'script' in body) {
      const parsed = ScriptRenderSchema.parse(body);
      const script = parsed.script.trim();
      const props = body.props ?? null;
      const forceLocal = body.forceLocal === true;

      if (!ALLOWED_RENDER_SCRIPTS.has(script)) {
        return NextResponse.json(
          { ok: false, error: `Script não permitido: ${script}` },
          { status: 400 }
        );
      }

      const scriptToComposition: Record<string, { id: string; out: string; target: string }> = {
        'render:available':      { id: 'AvailableNow',       out: 'out/available-now-story.mp4', target: 'story' },
        'render:available:feed': { id: 'AvailableNowFeed',   out: 'out/available-now-feed.mp4',  target: 'feed'  },
        'render:youtube':        { id: 'WatchOnYouTube',     out: 'out/youtube-story.mp4',       target: 'story' },
        'render:youtube:feed':   { id: 'WatchOnYouTubeFeed', out: 'out/youtube-feed.mp4',        target: 'feed'  },
        'render:youtubesubscribe':      { id: 'YouTubeSubscribe',     out: 'out/youtube-subscribe-story.mp4', target: 'story' },
        'render:youtubesubscribe:feed': { id: 'YouTubeSubscribeFeed', out: 'out/youtube-subscribe-feed.mp4',  target: 'feed'  },
        'render:youtubeviews':      { id: 'YouTubeViews',     out: 'out/youtube-views-story.mp4', target: 'story' },
        'render:youtubeviews:feed': { id: 'YouTubeViewsFeed', out: 'out/youtube-views-feed.mp4',  target: 'feed'  },
        'render:milestone':      { id: 'Milestone',          out: 'out/milestone-story.mp4',     target: 'story' },
        'render:milestone:feed': { id: 'MilestoneFeed',      out: 'out/milestone-feed.mp4',      target: 'feed'  },
        'render:outnow':         { id: 'OutNow',             out: 'out/out-now-story.mp4',       target: 'story' },
        'render:outnow:feed':    { id: 'OutNowFeed',         out: 'out/out-now-feed.mp4',        target: 'feed'  },
        'render:deezer':         { id: 'ListenDeezer',       out: 'out/deezer-story.mp4',        target: 'story' },
        'render:deezer:feed':    { id: 'ListenDeezerFeed',   out: 'out/deezer-feed.mp4',         target: 'feed'  },
        'render:spotifyprint':      { id: 'SpotifyPrint',     out: 'out/spotify-print-story.mp4', target: 'story' },
        'render:spotifyprint:feed': { id: 'SpotifyPrintFeed', out: 'out/spotify-print-feed.mp4',  target: 'feed'  },
      };

      const comp = scriptToComposition[script];

      if (props && comp) {
        await mkdir('out', { recursive: true });

        const renderProps = JSON.parse(JSON.stringify(props));

        // Cover é pequena o suficiente para embutir. Isso evita falhas
        // intermitentes da Lambda ao baixar imagem via Traefik/VPS.
        if (renderProps?.coverImage && typeof renderProps.coverImage === 'string' && renderProps.coverImage.startsWith('/')) {
          renderProps.coverImage = await pathToDataUrl(renderProps.coverImage) || toAppAssetUrl(renderProps.coverImage, appOrigin);
        }

        // Audio/Video de fundo → continua HTTP (arquivos grandes)
        const bg = renderProps?.motion?.background;
        if (bg?.audioSrc && typeof bg.audioSrc === 'string' && bg.audioSrc.startsWith('/')) {
          bg.audioSrc = toAppAssetUrl(bg.audioSrc, appOrigin);
        }
        if (bg?.videoSrc && typeof bg.videoSrc === 'string' && bg.videoSrc.startsWith('/')) {
          bg.videoSrc = toAppAssetUrl(bg.videoSrc, appOrigin);
        }

        // Normaliza logos customizados dentro de motion.customLogos.
        // O frontend envia customLogos dentro de motion, não na raiz.
        if (renderProps?.motion?.customLogos && typeof renderProps.motion.customLogos === 'object') {
          for (const key of Object.keys(renderProps.motion.customLogos)) {
            const val = renderProps.motion.customLogos[key];

            if (typeof val === 'string') {
              renderProps.motion.customLogos[key] = toAppAssetUrl(val, appOrigin);
            }
          }
        }

        // Normaliza overlays — cada um tem um .src apontando pra /api/uploads/overlays/...
        // Sem isso, o Remotion render tenta baixar do próprio servidor (porta 3001) e dá 404.
        if (renderProps?.motion?.overlays && Array.isArray(renderProps.motion.overlays)) {
          renderProps.motion.overlays = renderProps.motion.overlays.map((overlay: any) => {
            if (overlay && typeof overlay.src === 'string') {
              return { ...overlay, src: toAppAssetUrl(overlay.src, appOrigin) };
            }
            return overlay;
          });
        }

        // CAMADA EXTRA: varre o JSON inteiro procurando qualquer string que ainda começa
        // com /uploads/ ou /api/uploads/ (asset relativo que escapou das normalizações
        // específicas acima). Converte tudo pra URL absoluta automaticamente.
        function normalizeRelativeAssets(obj: any): any {
          if (obj == null) return obj;
          if (typeof obj === 'string') {
            if (obj.startsWith('/uploads/') || obj.startsWith('/api/uploads/')) {
              return toAppAssetUrl(obj, appOrigin);
            }
            return obj;
          }
          if (Array.isArray(obj)) {
            return obj.map(normalizeRelativeAssets);
          }
          if (typeof obj === 'object') {
            const out: any = Array.isArray(obj) ? [] : {};
            for (const key of Object.keys(obj)) {
              out[key] = normalizeRelativeAssets(obj[key]);
            }
            return out;
          }
          return obj;
        }
        Object.assign(renderProps, normalizeRelativeAssets(renderProps));


        if (renderProps?.motion?.customFonts && Array.isArray(renderProps.motion.customFonts)) {
          const activeFontIds = activeFontIdsFromMotion(renderProps.motion);
          const activeCustomFonts = renderProps.motion.customFonts.filter((font: any) => {
            if (!font || typeof font.id !== 'string' || typeof font.file !== 'string') return false;
            return activeFontIds.size === 0 || activeFontIds.has(font.id);
          });

          const userFontsDir = join(process.cwd(), 'public', 'uploads', 'user-fonts');
          renderProps.motion.customFonts = [];

          for (const font of activeCustomFonts) {
            if (!font || typeof font.file !== 'string' || !font.file) continue;
            if (font.file.startsWith('data:')) {
              renderProps.motion.customFonts.push(font);
              continue;
            }

            try {
              const filename = font.file.replace(/^\/+/, '').split('/').pop();
              if (!filename) continue;

              const fontPath = join(userFontsDir, filename);
              const buffer = await readFile(fontPath);
              const ext = (filename.split('.').pop() || '').toLowerCase();

              const mime =
                ext === 'otf' ? 'font/otf' :
                ext === 'ttf' ? 'font/ttf' :
                ext === 'woff2' ? 'font/woff2' :
                ext === 'woff' ? 'font/woff' :
                'application/octet-stream';

              renderProps.motion.customFonts.push({
                ...font,
                file: `data:${mime};base64,${buffer.toString('base64')}`,
              });
            } catch (error) {
              console.warn('[render] Não consegui embutir fonte custom:', font.file, error);
            }
          }
        }

        renderProps.renderTarget = comp.target;

        // FIX E2BIG: escreve props num arquivo temp em vez de passar via --props='...'
        // O macOS limita argumentos da linha de comando a ~262KB, base64 estoura isso.
        const tmpFile = join(tmpdir(), `novacena-render-${randomBytes(8).toString('hex')}.json`);
        await writeFile(tmpFile, JSON.stringify(renderProps), 'utf-8');

        // ── THUMBNAIL COMPOSTA (preset de overlay) ──────────────────────────
        // Reaproveita TODA a normalização de assets + a composition acima e roda
        // apenas 1 still no frame escolhido. Retorna cedo, sem tocar no fluxo de
        // render de vídeo. Usado pela biblioteca de overlays (job em background).
        if (body?.stillOnly) {
          try {
            const fps = 30;
            const durSec = Number(renderProps?.durationSeconds ?? 8) || 8;
            const maxFrame = Math.max(0, Math.round(durSec * fps) - 1);
            const reqFrame = Math.round(Number(body.stillFrameSec ?? 0) * fps);
            const frame = Math.max(0, Math.min(maxFrame, Number.isFinite(reqFrame) ? reqFrame : 0));

            const pngPath = join(tmpdir(), `novacena-thumb-${randomBytes(6).toString('hex')}.png`);
            const stillCmd = `npx remotion still remotion-entry/index.ts ${comp.id} ${pngPath} --props=${tmpFile} --frame=${frame}`;
            await execAsync(stillCmd, { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 100 });

            const thumbsDir = join(process.cwd(), 'public', 'uploads', 'overlay-thumbs');
            await mkdir(thumbsDir, { recursive: true });
            const safeId = String(body.stillPresetId || randomBytes(6).toString('hex')).replace(/[^a-z0-9_-]/gi, '');
            const thumbName = `${safeId}-${Date.now()}.jpg`;
            const pngBuf = await readFile(pngPath);
            const jpg = await sharp(pngBuf).resize({ width: 420 }).jpeg({ quality: 80 }).toBuffer();
            await writeFile(join(thumbsDir, thumbName), jpg);
            await unlink(pngPath).catch(() => {});
            await unlink(tmpFile).catch(() => {});

            const thumbnail = `/api/uploads/overlay-thumbs/${thumbName}`;
            if (body.stillPresetId) {
              await updateOverlayPreset(String(body.stillPresetId), { thumbnail }).catch(() => {});
            }
            return NextResponse.json({ ok: true, thumbnail });
          } catch (err) {
            await unlink(tmpFile).catch(() => {});
            return NextResponse.json(
              { ok: false, error: err instanceof Error ? err.message : 'Falha ao gerar thumbnail.' },
              { status: 500 }
            );
          }
        }

        const outputFileForRender = comp.out.replace(/\.mp4$/, `-${Date.now()}.mp4`);

        const posterCfg = renderProps?.posterFrame;
        const posterEnabled = Boolean(posterCfg?.enabled);
        const posterHoldSecRaw = Number(posterCfg?.holdSec ?? 1);
        const posterHoldSec = Number.isFinite(posterHoldSecRaw) && posterHoldSecRaw > 0 ? Math.min(posterHoldSecRaw, 5) : 1;
        const posterFrameSecRaw = Number(posterCfg?.frameSec ?? 0);
        const posterFrameSec = Number.isFinite(posterFrameSecRaw) && posterFrameSecRaw >= 0 ? posterFrameSecRaw : 0;
        const posterOutroEnabled = posterCfg?.outroEnabled !== false;

        const normalOutputFile = posterEnabled
          ? outputFileForRender.replace(/\.mp4$/, `.normal.mp4`)
          : outputFileForRender;

        const lambdaConfig = forceLocal ? null : getLambdaConfig();
        if (posterEnabled && lambdaConfig) {
          await unlink(tmpFile).catch(() => {});
          return NextResponse.json(
            {
              ok: false,
              error: 'Desative "Renderizar capa no início" para renderizar no Lambda. Essa opção ainda usa pós-processamento local.',
              provider: 'lambda',
            },
            { status: 400 }
          );
        }

        if (!forceLocal && !lambdaConfig && LAMBDA_REQUIRED) {
          await unlink(tmpFile).catch(() => {});
          return NextResponse.json(
            {
              ok: false,
              error: 'Render Lambda não configurado no servidor. Verifique REMOTION_LAMBDA_FUNCTION_NAME e REMOTION_LAMBDA_SERVE_URL antes de renderizar.',
              provider: 'none',
            },
            { status: 503 }
          );
        }

        if (lambdaConfig && !posterEnabled) {
          const startedAt = Date.now();
          const framesPerLambda = getEffectiveFramesPerLambda(renderProps);
          console.log('[render:lambda] starting', {
            composition: comp.id,
            target: comp.target,
            region: lambdaConfig.region,
            appOrigin,
            framesPerLambda,
            targetChunks: LAMBDA_TARGET_CHUNKS,
          });

          try {
            const lambdaModule = await new Function('specifier', 'return import(specifier)')('@remotion/lambda');
            const { getRenderProgress, renderMediaOnLambda } = lambdaModule;
            const render = await renderMediaOnLambda({
              region: lambdaConfig.region,
              functionName: lambdaConfig.functionName,
              serveUrl: lambdaConfig.serveUrl,
              composition: comp.id,
              codec: 'h264',
              imageFormat: 'jpeg',
              framesPerLambda,
              concurrencyPerLambda: 1,
              maxRetries: 2,
              privacy: 'public',
              inputProps: renderProps,
            });

            let lastLoggedProgress = -1;
            while (Date.now() - startedAt < LAMBDA_MAX_WAIT_MS) {
              await wait(LAMBDA_POLL_INTERVAL_MS);

              const progress = await getRenderProgress({
                renderId: render.renderId,
                bucketName: render.bucketName,
                functionName: lambdaConfig.functionName,
                region: lambdaConfig.region,
              });

              const pct = Math.round(progress.overallProgress * 100);
              if (pct !== lastLoggedProgress) {
                lastLoggedProgress = pct;
                console.log('[render:lambda] progress', {
                  renderId: render.renderId,
                  composition: comp.id,
                  progress: pct,
                  done: progress.done,
                });
              }

              if (progress.fatalErrorEncountered) {
                const rawErrorMessage = progress.errors?.[0]?.message || 'Falha fatal no render Lambda';
                console.error('[render:lambda] fatal', {
                  renderId: render.renderId,
                  errors: progress.errors,
                });
                await unlink(tmpFile).catch(() => {});
                return NextResponse.json(
                  {
                    ok: false,
                    error: friendlyLambdaError(rawErrorMessage),
                    output: JSON.stringify(progress.errors ?? [], null, 2),
                    provider: 'lambda',
                    renderId: render.renderId,
                  },
                  { status: 500 }
                );
              }

              if (progress.done) {
                const seconds = Math.round((Date.now() - startedAt) / 1000);
                const output = [
                  `Render Lambda finalizado em ${seconds}s`,
                  `renderId: ${render.renderId}`,
                  `bucket: ${render.bucketName}`,
                  `arquivo: ${progress.outputFile}`,
                ].join('\n');

                console.log('[render:lambda] done', {
                  renderId: render.renderId,
                  seconds,
                  outputFile: progress.outputFile,
                });

                await unlink(tmpFile).catch(() => {});
                return NextResponse.json({
                  ok: true,
                  output,
                  outputFile: progress.outputFile,
                  provider: 'lambda',
                  renderId: render.renderId,
                  bucketName: render.bucketName,
                });
              }
            }

            await unlink(tmpFile).catch(() => {});
            return NextResponse.json(
              {
                ok: false,
                error: `Render Lambda excedeu ${Math.round(LAMBDA_MAX_WAIT_MS / 1000)}s aguardando conclusão.`,
                output: `renderId: ${render.renderId}\nbucket: ${render.bucketName}`,
                provider: 'lambda',
                renderId: render.renderId,
                bucketName: render.bucketName,
              },
              { status: 504 }
            );
          } catch (err: any) {
            console.error('[render:lambda] error', err);
            const rawErrorMessage = err instanceof Error ? err.message : 'Falha no render Lambda';
            await unlink(tmpFile).catch(() => {});
            return NextResponse.json(
              {
                ok: false,
                error: friendlyLambdaError(rawErrorMessage),
                output: err?.stack || String(err),
                provider: 'lambda',
              },
              { status: 500 }
            );
          }
        }

        // DEBUG: salva props ao lado do mp4 para inspecao
        try {
          const debugFile = outputFileForRender.replace(/\.mp4$/, '.props.json');
          await writeFile(debugFile, JSON.stringify(renderProps, null, 2), 'utf-8');
        } catch {}

        const cmd = `npx remotion render remotion-entry/index.ts ${comp.id} ${normalOutputFile} --props=${tmpFile}`;

        try {
          const { stdout, stderr } = await execAsync(cmd, {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 100,
          });

          let output = [stdout, stderr].filter(Boolean).join('\n');

          if (posterEnabled) {
            const fps = 30;
            const durationSecondsForPoster = Number(renderProps?.durationSeconds ?? 8);
            const safeDurationSeconds = Number.isFinite(durationSecondsForPoster) && durationSecondsForPoster > 0
              ? durationSecondsForPoster
              : 8;

            const maxFrame = Math.max(0, Math.round(safeDurationSeconds * fps) - 1);
            const posterFrame = Math.max(0, Math.min(maxFrame, Math.round(posterFrameSec * fps)));

            const posterPng = outputFileForRender.replace(/\.mp4$/, `-poster-${posterFrame}f.png`);

            // Gera o still do poster
            const stillCmd = `npx remotion still remotion-entry/index.ts ${comp.id} ${posterPng} --props=${tmpFile} --frame=${posterFrame}`;
            const { stdout: stillStdout, stderr: stillStderr } = await execAsync(stillCmd, {
              cwd: process.cwd(),
              maxBuffer: 1024 * 1024 * 100,
            });

            output += '\n' + [stillStdout, stillStderr].filter(Boolean).join('\n');

            // Probe o vídeo principal pra usar EXATAMENTE os mesmos parâmetros no poster.
            // Sem isso, o concat com -c copy quebra timestamps e o vídeo final fica em câmera lenta.
            let mainWidth = 1080;
            let mainHeight = 1920;
            let mainAudioRate = 48000;
            let mainAudioChannels = 2;
            try {
              const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 ${shQuote(normalOutputFile)}`;
              const { stdout: probeOut } = await execAsync(probeCmd, { cwd: process.cwd() });
              const [w, h] = probeOut.trim().split(',').map((s) => parseInt(s, 10));
              if (Number.isFinite(w) && w > 0) mainWidth = w;
              if (Number.isFinite(h) && h > 0) mainHeight = h;
            } catch {}
            try {
              const probeACmd = `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate,channels -of csv=p=0 ${shQuote(normalOutputFile)}`;
              const { stdout: probeAOut } = await execAsync(probeACmd, { cwd: process.cwd() });
              const [sr, ch] = probeAOut.trim().split(',').map((s) => parseInt(s, 10));
              if (Number.isFinite(sr) && sr > 0) mainAudioRate = sr;
              if (Number.isFinite(ch) && ch > 0) mainAudioChannels = ch;
            } catch {}

            // Usa o concat FILTER (não demuxer) com re-encode de TUDO usando os mesmos
            // parâmetros. Concat filter trabalha no nível decodificado, eliminando drift
            // de PTS/DTS que o -c copy causa quando streams têm timebase diferente.
            const channelLayout = mainAudioChannels >= 2 ? 'stereo' : 'mono';
            const introDuration = posterHoldSec;
            const outroDuration = posterOutroEnabled ? posterHoldSec : 0;

            // Constrói filter complex: cada entrada é normalizada (formato, fps, sar)
            // e os 3 segmentos são concatenados.
            const videoFilters: string[] = [];
            const audioFilters: string[] = [];
            const inputs: string[] = [];

            // INPUT 0: poster intro (still loopado)
            inputs.push(`-loop 1 -framerate ${fps} -t ${introDuration} -i ${shQuote(posterPng)}`);
            // INPUT 1: silêncio do intro
            inputs.push(`-f lavfi -t ${introDuration} -i anullsrc=channel_layout=${channelLayout}:sample_rate=${mainAudioRate}`);
            // INPUT 2: vídeo principal
            inputs.push(`-i ${shQuote(normalOutputFile)}`);
            // INPUTs 3+4: outro (opcional)
            if (posterOutroEnabled) {
              inputs.push(`-loop 1 -framerate ${fps} -t ${outroDuration} -i ${shQuote(posterPng)}`);
              inputs.push(`-f lavfi -t ${outroDuration} -i anullsrc=channel_layout=${channelLayout}:sample_rate=${mainAudioRate}`);
            }

            // Normaliza cada vídeo (scale, fps, format, sar)
            const normalize = (idx: number, label: string) =>
              `[${idx}:v]scale=${mainWidth}:${mainHeight}:force_original_aspect_ratio=decrease,pad=${mainWidth}:${mainHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p[${label}]`;
            const normalizeAudio = (idx: number, label: string) =>
              `[${idx}:a]aresample=${mainAudioRate},aformat=channel_layouts=${channelLayout}[${label}]`;

            videoFilters.push(normalize(0, 'vintro'));
            audioFilters.push(`[1:a]aresample=${mainAudioRate}[aintro]`);
            videoFilters.push(normalize(2, 'vmain'));
            audioFilters.push(normalizeAudio(2, 'amain'));

            let videoConcat: string;
            let audioConcat: string;

            if (posterOutroEnabled) {
              videoFilters.push(normalize(3, 'voutro'));
              audioFilters.push(`[4:a]aresample=${mainAudioRate}[aoutro]`);
              videoConcat = `[vintro][vmain][voutro]concat=n=3:v=1:a=0[vout]`;
              audioConcat = `[aintro][amain][aoutro]concat=n=3:v=0:a=1[aout]`;
            } else {
              videoConcat = `[vintro][vmain]concat=n=2:v=1:a=0[vout]`;
              audioConcat = `[aintro][amain]concat=n=2:v=0:a=1[aout]`;
            }

            const filterComplex = [
              ...videoFilters,
              ...audioFilters,
              videoConcat,
              audioConcat,
            ].join(';');

            const concatCmd = [
              'ffmpeg -y',
              ...inputs,
              `-filter_complex ${shQuote(filterComplex)}`,
              '-map "[vout]"',
              '-map "[aout]"',
              '-c:v libx264',
              '-preset fast',
              '-crf 18',
              `-r ${fps}`,
              '-pix_fmt yuv420p',
              '-c:a aac',
              '-b:a 192k',
              `-ar ${mainAudioRate}`,
              '-movflags +faststart',
              shQuote(outputFileForRender),
            ].join(' ');

            const { stdout: ffStdout, stderr: ffStderr } = await execAsync(concatCmd, {
              cwd: process.cwd(),
              maxBuffer: 1024 * 1024 * 200,
            });

            output += '\n' + [ffStdout, ffStderr].filter(Boolean).join('\n');
            output += `\nPoster salvo: ${posterPng}`;
            output += `\nVideo final com poster: ${outputFileForRender}`;
            output += `\nProbe: ${mainWidth}x${mainHeight} · audio ${mainAudioRate}Hz/${channelLayout}`;

            await unlink(normalOutputFile).catch(() => {});
          }

          await unlink(tmpFile).catch(() => {});
          return NextResponse.json({ ok: true, output, outputFile: outputFileForRender });
        } catch (err: any) {
          await unlink(tmpFile).catch(() => {});
          const output = [err?.stdout, err?.stderr].filter(Boolean).join('\n');
          return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Falha no render', output }, { status: 500 });
        }
      }

      try {
        const { stdout, stderr } = await execAsync(`npm run ${script}`, {
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10,
        });
        const output = [stdout, stderr].filter(Boolean).join('\n');
        return NextResponse.json({ ok: true, output });
      } catch (err: any) {
        const output = [err?.stdout, err?.stderr].filter(Boolean).join('\n');
        return NextResponse.json(
          { ok: false, error: err instanceof Error ? err.message : 'Falha no render', output },
          { status: 500 }
        );
      }
    }

    const validated = RenderRequestSchema.parse(body);
    const jobId = `render-${validated.project.type}-${Date.now()}`;
    const job = {
      id: jobId,
      ...validated,
      status: 'queued' as const,
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };
    renderQueue.set(jobId, job);
    return NextResponse.json(
      { success: true, jobId, message: `${validated.project.formats.length} render(s) enfileirado(s)` },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validação falhou', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao processar request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const listAll = request.nextUrl.searchParams.get('list');

  if (listAll === 'true') {
    const jobs = Array.from(renderQueue.values());
    return NextResponse.json({
      total: jobs.length,
      queued: jobs.filter((j) => j.status === 'queued').length,
      active: jobs.filter((j) => j.status === 'rendering').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      jobs: jobs.slice(-20),
    });
  }

  if (!jobId) {
    return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 });
  }
  const job = renderQueue.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ job });
}

export async function DELETE(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 });
  }
  const job = renderQueue.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
  }
  if (job.status === 'completed') {
    return NextResponse.json({ error: 'Não pode cancelar um render completo' }, { status: 400 });
  }
  renderQueue.delete(jobId);
  return NextResponse.json({ success: true, message: 'Render cancelado' });
}
