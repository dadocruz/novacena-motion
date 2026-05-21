import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, unlink } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SOURCES_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'video-sources');
const MAX_RAW_SIZE = 8 * 1024 * 1024 * 1024; // 8GB
const ALLOWED_EXT = ['.mp4', '.mov', '.webm'];
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'application/octet-stream'];
const FFPROBE_BIN = existsSync('/usr/local/bin/ffprobe')
  ? '/usr/local/bin/ffprobe'
  : existsSync('/usr/bin/ffprobe')
    ? '/usr/bin/ffprobe'
    : 'ffprobe';

function safeFileName(name: string): string {
  const ext = path.extname(name || '.mp4').toLowerCase() || '.mp4';
  const base =
    path
      .basename(name || 'video', ext)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 42) || 'video';
  return `${Date.now()}-${base}${ext}`;
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
    const filenameParam = req.nextUrl.searchParams.get('filename') || 'video.mp4';
    const ext = path.extname(filenameParam).toLowerCase();
    const contentType = (req.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    const contentLength = Number(req.headers.get('content-length') || 0);

    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Extensão não suportada: ${ext || 'sem extensão'}. Use MP4, MOV ou WEBM.` },
        { status: 400 }
      );
    }

    if (contentType && !ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { ok: false, error: `Tipo não suportado: ${contentType}. Use MP4, MOV ou WEBM.` },
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

    const publicPath = `/api/uploads/video-sources/${filename}`;
    return NextResponse.json({
      ok: true,
      sourcePath: publicPath,
      videoSrc: publicPath,
      filename,
      size: fileStat.size,
      type: contentType,
      ...probe,
    });
  } catch (error) {
    if (localPath) await unlink(localPath).catch(() => {});
    const message = error instanceof Error ? error.message : 'Erro desconhecido no upload.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
