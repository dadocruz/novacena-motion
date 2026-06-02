import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, unlink } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
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
const PREVIEW_REQUIRED_SIZE = 100 * 1024 * 1024;
const MAX_BACKGROUND_CLIP_SECONDS = 60;
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
      '-i', input,
      '-map', '0:v:0',
      ...(includeAudio ? ['-map', '0:a?'] : []),
      '-vf', 'scale=360:-2,fps=20,format=yuv420p',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '32',
      ...(includeAudio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']),
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

    if (contentLength > MAX_RAW_SIZE) {
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

    await pipeline(
      Readable.fromWeb(req.body as any),
      createWriteStream(localPath)
    );

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

    // Torna o vídeo seekável no navegador (faststart). Containers MP4/MOV/M4V
    // costumam vir com o índice no fim — o que faz o preview voltar pro zero.
    // WEBM já é streamável, então é pulado. Falha → mantém o original.
    let servedFilename = filename;
    let servedSize = fileStat.size;
    if (['.mp4', '.mov', '.m4v'].includes(ext)) {
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

    const previewIsRequired =
      servedSize > PREVIEW_REQUIRED_SIZE ||
      Number(probe.durationSec || 0) > MAX_BACKGROUND_CLIP_SECONDS + 0.5 ||
      !servedFilename.toLowerCase().endsWith('.mp4');

    if (previewIsRequired && previewFilename === servedFilename) {
      return NextResponse.json(
        {
          ok: false,
          error: 'O bruto foi recebido, mas nao consegui preparar um preview leve para navegar no video. Tente outro arquivo ou reexporte em MP4/H.264.',
          detail: previewResult.error || null,
          sourcePath: publicPath,
          filename: servedFilename,
          size: servedSize,
          ...probe,
        },
        { status: 500 }
      );
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
      ...probe,
    });
  } catch (error) {
    if (localPath) await unlink(localPath).catch(() => {});
    const message = error instanceof Error ? error.message : 'Erro desconhecido no upload.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
