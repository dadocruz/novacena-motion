import { NextRequest, NextResponse } from 'next/server';
import { mkdir, rm, stat, unlink } from 'fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { cleanupTransientFiles } from '../../../../lib/transientCleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 900;

const SOURCES_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'video-sources');
const MAX_RAW_SIZE = 8 * 1024 * 1024 * 1024; // 8GB
const CHUNK_SIZE_LIMIT = 64 * 1024 * 1024;
const PREVIEW_REQUIRED_SIZE = 100 * 1024 * 1024;
const SERVER_PREVIEW_MAX_SIZE = 120 * 1024 * 1024;
const SERVER_PREVIEW_MAX_SECONDS = 90;
const MAX_BACKGROUND_CLIP_SECONDS = 60;
const VERTICAL_PREVIEW_REQUIRED_SECONDS = 45;
const ALLOWED_EXT = ['.mp4', '.mov', '.webm', '.m4v', '.mpeg', '.mpg', '.mkv', '.avi', '.3gp', '.3gpp'];
const FFPROBE_BIN = existsSync('/usr/local/bin/ffprobe')
  ? '/usr/local/bin/ffprobe'
  : existsSync('/usr/bin/ffprobe')
    ? '/usr/bin/ffprobe'
    : 'ffprobe';
const FFMPEG_BIN = existsSync('/usr/local/bin/ffmpeg')
  ? '/usr/local/bin/ffmpeg'
  : existsSync('/usr/bin/ffmpeg')
    ? '/usr/bin/ffmpeg'
    : 'ffmpeg';

// Remux para "faststart" (move o moov atom para o início) por stream copy —
// sem re-encode, rápido. Faz o vídeo ser seekável no navegador (corrige o
// preview de trim que voltava pro zero ao dar play num ponto qualquer).
// Retorna true só se gerou um arquivo válido; qualquer falha cai no fallback.
function remuxFaststart(input: string, output: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG_BIN, [
      '-v', 'error',
      '-i', input,
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y', output,
    ]);
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

function runPreviewFfmpeg(input: string, output: string, includeAudio: boolean): Promise<{ ok: boolean; error: string }> {
  const args = [
      '-v', 'error',
      '-fflags', '+genpts+discardcorrupt',
      '-err_detect', 'ignore_err',
      '-analyzeduration', '100M',
      '-probesize', '100M',
      '-ignore_unknown',
      '-i', input,
      '-map', '0:v:0',
      ...(includeAudio ? ['-map', '0:a:0?'] : []),
      '-sn',
      '-dn',
      '-vf', 'scale=540:-2,fps=24,format=yuv420p',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '25',
      ...(includeAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
      '-movflags', '+faststart',
      '-y', output,
    ];

  return new Promise((resolve) => {
    const proc = spawn(FFMPEG_BIN, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', (code) => resolve({ ok: code === 0, error: stderr.trim() }));
    proc.on('error', (error) => resolve({ ok: false, error: error.message }));
  });
}

async function createPreviewProxy(input: string, output: string) {
  let result = await runPreviewFfmpeg(input, output, true);
  if (result.ok) return { ...result, mode: 'audio' as const };

  await unlink(output).catch(() => {});
  const audioError = result.error;
  result = await runPreviewFfmpeg(input, output, false);
  return {
    ...result,
    mode: 'silent' as const,
    error: result.error || audioError,
  };
}

function durationLooksValid(actualDuration: number, expectedDuration: number) {
  return (
    expectedDuration <= 0 ||
    Math.abs(actualDuration - expectedDuration) <= 1 ||
    actualDuration >= expectedDuration * 0.95
  );
}

function safeFileName(name: string): string {
  const ext = path.extname(name || '.mp4').toLowerCase() || '.mp4';
  const base =
    path
      .basename(name || 'video', ext)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 42) || 'video';
  return `${Date.now()}-${base}${ext}`;
}

function isAllowedContentType(contentType: string): boolean {
  if (!contentType || contentType === 'application/octet-stream') return true;
  return contentType.startsWith('video/');
}

function cleanUploadId(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 80);
}

function chunkPartName(index: number) {
  return `${String(index).padStart(6, '0')}.part`;
}

async function allChunksReady(chunkDir: string, totalChunks: number) {
  for (let index = 0; index < totalChunks; index += 1) {
    if (!existsSync(path.join(chunkDir, chunkPartName(index)))) return false;
  }
  return true;
}

async function assembleChunks(chunkDir: string, totalChunks: number, outputPath: string) {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputPath);
    let index = 0;

    const pipeNext = () => {
      if (index >= totalChunks) {
        output.end();
        return;
      }

      const input = createReadStream(path.join(chunkDir, chunkPartName(index)));
      index += 1;
      input.on('error', reject);
      input.on('end', pipeNext);
      input.pipe(output, { end: false });
    };

    output.on('error', reject);
    output.on('finish', resolve);
    pipeNext();
  });
}

function runFfprobe(filepath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFPROBE_BIN, [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filepath,
    ]);

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe saiu com código ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('ffprobe retornou JSON inválido'));
      }
    });
    proc.on('error', reject);
  });
}

function parseFps(rateString: string | undefined): number | null {
  if (!rateString) return null;
  const [num, den] = rateString.split('/').map(Number);
  if (!num || !den) return null;
  return num / den;
}

async function probeVideo(filepath: string) {
  const data = await runFfprobe(filepath);
  const streams: any[] = data.streams || [];
  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStream = streams.find((s) => s.codec_type === 'audio');
  const format = data.format || {};

  return {
    durationSec: Number.parseFloat(format.duration || videoStream?.duration || audioStream?.duration || '0') || 0,
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    fps: parseFps(videoStream?.avg_frame_rate || videoStream?.r_frame_rate),
    hasAudio: Boolean(audioStream),
    hasVideo: Boolean(videoStream),
  };
}

export async function POST(req: NextRequest) {
  let localPath = '';

  try {
    cleanupTransientFiles().catch(() => {});

    const filenameParam = req.nextUrl.searchParams.get('filename') || 'video.mp4';
    const ext = path.extname(filenameParam).toLowerCase();
    const contentType = (req.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const contentLength = Number(req.headers.get('content-length') || 0);
    const isChunkedUpload = req.nextUrl.searchParams.get('chunked') === '1';

    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Extensão não suportada: ${ext || 'sem extensão'}. Use MP4, MOV, WEBM, M4V, MPEG, MKV, AVI ou 3GP.` },
        { status: 400 }
      );
    }

    if (!isAllowedContentType(contentType)) {
      return NextResponse.json(
        { ok: false, error: `Tipo não suportado: ${contentType}. Use um arquivo de vídeo.` },
        { status: 400 }
      );
    }

    if (!isChunkedUpload && contentLength > MAX_RAW_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Arquivo muito grande (${(contentLength / 1024 / 1024).toFixed(1)} MB). Máximo permitido: 8 GB.` },
        { status: 413 }
      );
    }

    if (!req.body) {
      return NextResponse.json({ ok: false, error: 'Corpo do upload vazio.' }, { status: 400 });
    }

    await mkdir(SOURCES_DIR, { recursive: true });
    const filename = safeFileName(filenameParam);
    localPath = path.join(SOURCES_DIR, filename);

    if (isChunkedUpload) {
      const uploadId = cleanUploadId(req.nextUrl.searchParams.get('uploadId') || '');
      const chunkIndex = Number(req.nextUrl.searchParams.get('chunkIndex'));
      const totalChunks = Number(req.nextUrl.searchParams.get('totalChunks'));
      const totalSize = Number(req.nextUrl.searchParams.get('totalSize') || 0);

      if (
        !uploadId ||
        !Number.isInteger(chunkIndex) ||
        !Number.isInteger(totalChunks) ||
        totalChunks <= 0 ||
        chunkIndex < 0 ||
        chunkIndex >= totalChunks
      ) {
        return NextResponse.json({ ok: false, error: 'Upload em partes inválido.' }, { status: 400 });
      }

      if (totalSize > MAX_RAW_SIZE) {
        return NextResponse.json(
          { ok: false, error: `Arquivo muito grande (${(totalSize / 1024 / 1024).toFixed(1)} MB). Máximo permitido: 8 GB.` },
          { status: 413 }
        );
      }

      if (contentLength > CHUNK_SIZE_LIMIT) {
        return NextResponse.json(
          { ok: false, error: 'Parte do upload grande demais. Recarregue a página e tente novamente.' },
          { status: 413 }
        );
      }

      const chunkDir = path.join(SOURCES_DIR, '.chunks', uploadId);
      await mkdir(chunkDir, { recursive: true });
      const partPath = path.join(chunkDir, chunkPartName(chunkIndex));

      await pipeline(
        Readable.fromWeb(req.body as any),
        createWriteStream(partPath)
      );

      if (contentLength > 0) {
        const partSize = (await stat(partPath).catch(() => null))?.size ?? 0;
        if (partSize < contentLength * 0.98) {
          await unlink(partPath).catch(() => {});
          return NextResponse.json(
            {
              ok: false,
              error: `Upload incompleto nesta parte: recebido ${(partSize / 1024 / 1024).toFixed(1)} MB de ${(contentLength / 1024 / 1024).toFixed(1)} MB.`,
            },
            { status: 400 }
          );
        }
      }

      const ready = await allChunksReady(chunkDir, totalChunks);
      if (!ready) {
        return NextResponse.json({
          ok: true,
          partial: true,
          chunkIndex,
          totalChunks,
        });
      }

      await assembleChunks(chunkDir, totalChunks, localPath);
      await rm(chunkDir, { recursive: true, force: true }).catch(() => {});

      if (totalSize > 0) {
        const assembledSize = (await stat(localPath).catch(() => null))?.size ?? 0;
        if (assembledSize < totalSize * 0.98) {
          await unlink(localPath).catch(() => {});
          return NextResponse.json(
            {
              ok: false,
              error: `Upload incompleto: recebido ${(assembledSize / 1024 / 1024).toFixed(1)} MB de ${(totalSize / 1024 / 1024).toFixed(1)} MB.`,
            },
            { status: 400 }
          );
        }
      }
    } else {
      await pipeline(
        Readable.fromWeb(req.body as any),
        createWriteStream(localPath)
      );
    }

    const fileStat = await stat(localPath);
    if (fileStat.size > MAX_RAW_SIZE) {
      await unlink(localPath).catch(() => {});
      return NextResponse.json(
        { ok: false, error: `Arquivo muito grande (${(fileStat.size / 1024 / 1024).toFixed(1)} MB). Máximo permitido: 8 GB.` },
        { status: 413 }
      );
    }

    const probe = await probeVideo(localPath);
    if (!probe.hasVideo) {
      await unlink(localPath).catch(() => {});
      return NextResponse.json({ ok: false, error: 'O arquivo enviado não tem vídeo.' }, { status: 400 });
    }

    const durationSec = Number(probe.durationSec || 0);
    const isVerticalVideo = Number(probe.height || 0) > Number(probe.width || 0);
    const requiresOptimization =
      fileStat.size > PREVIEW_REQUIRED_SIZE ||
      durationSec >= MAX_BACKGROUND_CLIP_SECONDS - 0.5 ||
      (isVerticalVideo && durationSec >= VERTICAL_PREVIEW_REQUIRED_SECONDS) ||
      ext !== '.mp4';
    const previewIsRequired =
      requiresOptimization ||
      durationSec > MAX_BACKGROUND_CLIP_SECONDS + 0.5;

    // Torna o vídeo seekável no navegador (faststart). Containers MP4/MOV/M4V
    // costumam vir com o índice no fim — o que faz o preview voltar pro zero.
    // Para bruto grande/longa duração, o navegador usa o proxy leve; manter o
    // original evita remux por stream-copy corromper bitstreams H.264 sensíveis.
    // WEBM já é streamável, então é pulado. Falha → mantém o original.
    let servedFilename = filename;
    let servedSize = fileStat.size;
    if (!previewIsRequired && ['.mp4', '.mov', '.m4v'].includes(ext)) {
      const baseName = filename.replace(/\.(mp4|mov|m4v)$/i, '');
      const webFilename = `${baseName}-web.mp4`;
      const webPath = path.join(SOURCES_DIR, webFilename);
      const ok = await remuxFaststart(localPath, webPath).catch(() => false);
      if (ok && existsSync(webPath)) {
        try {
          const webStat = await stat(webPath);
          const webProbe = await probeVideo(webPath).catch(() => null);
          const webDuration = Number(webProbe?.durationSec || 0);
          const expectedDuration = Number(probe.durationSec || 0);
          if (webStat.size > 0 && webProbe?.hasVideo && durationLooksValid(webDuration, expectedDuration)) {
            await unlink(localPath).catch(() => {});
            localPath = webPath; // para limpeza correta em caso de erro posterior
            servedFilename = webFilename;
            servedSize = webStat.size;
          } else {
            await unlink(webPath).catch(() => {});
          }
        } catch {
          await unlink(webPath).catch(() => {});
        }
      } else if (existsSync(webPath)) {
        await unlink(webPath).catch(() => {});
      }
    }

    const publicPath = `/api/uploads/video-sources/${servedFilename}`;
    let previewFilename = servedFilename;
    let previewSize = servedSize;

    const shouldUseBrowserPreview =
      previewIsRequired &&
      (fileStat.size > SERVER_PREVIEW_MAX_SIZE || durationSec > SERVER_PREVIEW_MAX_SECONDS);

    if (shouldUseBrowserPreview) {
      return NextResponse.json({
        ok: true,
        sourcePath: publicPath,
        previewSrc: publicPath,
        videoSrc: publicPath,
        filename: servedFilename,
        previewFilename,
        size: servedSize,
        previewSize,
        type: contentType,
        previewType: contentType,
        previewMode: 'local-original',
        previewFailed: true,
        previewSkipped: true,
        requiresOptimization,
        previewError: 'Preview remoto pulado para concluir o upload sem travar. O navegador usa o arquivo local em qualidade original até o corte.',
        ...probe,
      });
    }

    const previewBaseName = path.basename(servedFilename, path.extname(servedFilename));
    const previewCandidate = `${previewBaseName}-preview.mp4`;
    const previewPath = path.join(SOURCES_DIR, previewCandidate);
    const previewResult = await createPreviewProxy(localPath, previewPath).catch((error) => ({
      ok: false,
      mode: 'failed' as const,
      error: error instanceof Error ? error.message : 'falha desconhecida ao criar preview',
    }));

    if (previewResult.ok && existsSync(previewPath)) {
      try {
        const previewStat = await stat(previewPath);
        const previewProbe = await probeVideo(previewPath).catch(() => null);
        const previewDuration = Number(previewProbe?.durationSec || 0);
        const expectedDuration = Number(probe.durationSec || 0);

        if (previewStat.size > 0 && previewProbe?.hasVideo && durationLooksValid(previewDuration, expectedDuration)) {
          previewFilename = previewCandidate;
          previewSize = previewStat.size;
        } else {
          await unlink(previewPath).catch(() => {});
        }
      } catch {
        await unlink(previewPath).catch(() => {});
      }
    } else if (existsSync(previewPath)) {
      await unlink(previewPath).catch(() => {});
    }

    if (previewIsRequired && previewFilename === servedFilename) {
      return NextResponse.json({
        ok: true,
        sourcePath: publicPath,
        previewSrc: publicPath,
        videoSrc: publicPath,
        filename: servedFilename,
        previewFilename,
        size: servedSize,
        previewSize,
        type: contentType,
        previewType: contentType,
        previewMode: 'local-fallback',
        previewFailed: true,
        requiresOptimization,
        previewError: previewResult.error || null,
        ...probe,
      });
    }

    const previewPublicPath = `/api/uploads/video-sources/${previewFilename}`;
    return NextResponse.json({
      ok: true,
      sourcePath: publicPath,
      previewSrc: previewPublicPath,
      videoSrc: previewPublicPath,
      filename: servedFilename,
      previewFilename,
      size: servedSize,
      previewSize,
      type: contentType,
      previewType: previewFilename.endsWith('.mp4') ? 'video/mp4' : contentType,
      previewMode: previewFilename === servedFilename ? 'source' : previewResult.mode,
      requiresOptimization,
      ...probe,
    });
  } catch (error) {
    if (localPath) await unlink(localPath).catch(() => {});
    const message = error instanceof Error ? error.message : 'Erro desconhecido no upload.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
