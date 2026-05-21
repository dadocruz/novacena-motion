import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FFMPEG_BIN = existsSync('/usr/local/bin/ffmpeg')
  ? '/usr/local/bin/ffmpeg'
  : existsSync('/usr/bin/ffmpeg')
    ? '/usr/bin/ffmpeg'
    : 'ffmpeg';
const SOURCE_PARTS = ['public', 'uploads', 'video-sources'] as const;
const VIDEO_PARTS = ['public', 'uploads', 'videos'] as const;

const TrimSchema = z.object({
  sourcePath: z.string().min(1),
  startSec: z.number().min(0).default(0),
  durationSec: z.number().min(1).max(40).default(40),
  target: z.enum(['story', 'feed']).default('story'),
  deleteSource: z.boolean().optional().default(true),
});

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `${command} saiu com código ${code}`));
        return;
      }
      resolve();
    });
    proc.on('error', reject);
  });
}

function sourcePathToFile(sourcePath: string) {
  const normalized = sourcePath.replace(/^https?:\/\/[^/]+/, '');
  if (!normalized.startsWith('/api/uploads/video-sources/')) {
    throw new Error('sourcePath inválido.');
  }

  const filename = decodeURIComponent(normalized.replace('/api/uploads/video-sources/', ''));
  const sourcesDir = path.join(/*turbopackIgnore: true*/ process.cwd(), ...SOURCE_PARTS);
  const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), ...SOURCE_PARTS, filename);
  if (!filePath.startsWith(sourcesDir)) {
    throw new Error('sourcePath fora da pasta permitida.');
  }

  return { filename, filePath };
}

function safeOutputBase(name: string) {
  const ext = path.extname(name);
  const base = path.basename(name, ext).replace(/^[0-9]+-/, '');
  return base.replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 42) || 'clip';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TrimSchema.parse(body);
    const { filename, filePath } = sourcePathToFile(parsed.sourcePath);

    await stat(filePath);
    const videosDir = path.join(/*turbopackIgnore: true*/ process.cwd(), ...VIDEO_PARTS);
    await mkdir(videosDir, { recursive: true });

    const width = 1080;
    const height = parsed.target === 'feed' ? 1350 : 1920;
    const outputName = `${Date.now()}-${safeOutputBase(filename)}-${parsed.target}-${Math.round(parsed.durationSec)}s.mp4`;
    const outputPath = path.join(/*turbopackIgnore: true*/ process.cwd(), ...VIDEO_PARTS, outputName);

    const vf = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      'setsar=1',
      'fps=30',
      'format=yuv420p',
    ].join(',');

    await run(FFMPEG_BIN, [
      '-y',
      '-ss', String(parsed.startSec),
      '-i', filePath,
      '-t', String(parsed.durationSec),
      '-map', '0:v:0',
      '-map', '0:a?',
      '-vf', vf,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '20',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    if (parsed.deleteSource) {
      await unlink(filePath).catch(() => {});
    }

    const outputStat = await stat(outputPath);
    return NextResponse.json({
      ok: true,
      videoSrc: `/api/uploads/videos/${outputName}`,
      filename: outputName,
      durationSec: parsed.durationSec,
      width,
      height,
      size: outputStat.size,
      deletedSource: parsed.deleteSource,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Dados inválidos.', details: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Erro ao cortar vídeo.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
