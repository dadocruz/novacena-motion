import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { z } from 'zod';
import { cleanupTransientFiles } from '../../../../lib/transientCleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 900;

const FFMPEG_BIN = existsSync('/usr/local/bin/ffmpeg')
  ? '/usr/local/bin/ffmpeg'
  : existsSync('/usr/bin/ffmpeg')
    ? '/usr/bin/ffmpeg'
    : 'ffmpeg';
const FFPROBE_BIN = existsSync('/usr/local/bin/ffprobe')
  ? '/usr/local/bin/ffprobe'
  : existsSync('/usr/bin/ffprobe')
    ? '/usr/bin/ffprobe'
    : 'ffprobe';
const SOURCE_PARTS = ['public', 'uploads', 'video-sources'] as const;
const VIDEO_PARTS = ['public', 'uploads', 'videos'] as const;

const TrimSchema = z.object({
  sourcePath: z.string().min(1),
  previewPath: z.string().optional().default(''),
  startSec: z.number().min(0).default(0),
  durationSec: z.number().min(1).max(60).default(40),
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

async function probeVideo(filepath: string) {
  const data = await runFfprobe(filepath);
  const streams: any[] = data.streams || [];
  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStream = streams.find((s) => s.codec_type === 'audio');
  const format = data.format || {};

  return {
    durationSec: Number.parseFloat(format.duration || videoStream?.duration || audioStream?.duration || '0') || 0,
    hasVideo: Boolean(videoStream),
    hasAudio: Boolean(audioStream),
  };
}

async function validateTrimmedOutput(outputPath: string, expectedDuration: number, requireAudio: boolean) {
  const outputStat = await stat(outputPath);
  const outputProbe = await probeVideo(outputPath).catch(() => null);
  const outputDuration = Number(outputProbe?.durationSec || 0);
  const durationOk = outputDuration >= Math.max(0.5, expectedDuration * 0.7);
  const audioOk = !requireAudio || Boolean(outputProbe?.hasAudio);
  if (outputStat.size < 64 * 1024 || !outputProbe?.hasVideo || !durationOk || !audioOk) {
    throw new Error(
      `Corte gerou arquivo inválido (${(outputStat.size / 1024 / 1024).toFixed(2)} MB, ${outputDuration.toFixed(1)}s${requireAudio && !outputProbe?.hasAudio ? ', sem áudio' : ''}).`
    );
  }
  return { outputStat, outputDuration, hasAudio: Boolean(outputProbe?.hasAudio) };
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

type TrimSeekMode = 'fast' | 'near';
type TrimAudioMode = 'aac' | 'none';

function formatSeconds(value: number) {
  return Math.max(0, value).toFixed(3).replace(/\.?0+$/, '');
}

function briefError(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 650);
}

function trimArgs(
  filePath: string,
  outputPath: string,
  startSec: number,
  durationSec: number,
  vf: string,
  seekMode: TrimSeekMode,
  audioMode: TrimAudioMode
) {
  const preSeek = seekMode === 'near' ? Math.max(0, startSec - 3) : startSec;
  const postSeek = seekMode === 'near' ? Math.max(0, startSec - preSeek) : 0;
  const inputArgs = [
    '-hide_banner',
    '-v', 'error',
    '-fflags', '+genpts+discardcorrupt',
    '-err_detect', 'ignore_err',
    '-analyzeduration', '50M',
    '-probesize', '50M',
    '-ignore_unknown',
    '-i', filePath,
  ];
  const audioArgs =
    audioMode === 'none'
      ? ['-an']
      : ['-c:a', 'aac', '-b:a', '160k', '-af', 'aresample=async=1:first_pts=0', '-shortest'];

  return [
    '-nostdin',
    '-y',
    ...(preSeek > 0 ? ['-ss', formatSeconds(preSeek)] : []),
    ...inputArgs,
    ...(postSeek > 0 ? ['-ss', formatSeconds(postSeek)] : []),
    '-t', formatSeconds(durationSec),
    '-map', '0:v:0',
    ...(audioMode !== 'none' ? ['-map', '0:a:0?'] : []),
    '-sn',
    '-dn',
    '-map_metadata', '-1',
    '-map_chapters', '-1',
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    ...audioArgs,
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    '-max_muxing_queue_size', '2048',
    outputPath,
  ];
}

export async function POST(req: NextRequest) {
  try {
    cleanupTransientFiles().catch(() => {});

    const body = await req.json();
    const parsed = TrimSchema.parse(body);
    let sourceInfo: ReturnType<typeof sourcePathToFile>;
    try {
      sourceInfo = sourcePathToFile(parsed.sourcePath);
    } catch (sourceError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'O bruto precisa estar salvo no servidor para cortar. Reenvie o vídeo e clique em Cortar/otimizar de novo.',
          detail: briefError(sourceError),
          canRetryWithReupload: true,
        },
        { status: 400 }
      );
    }

    const { filename, filePath } = sourceInfo;

    await stat(filePath).catch(() => {
      throw new Error('O bruto desse vídeo não está mais no servidor. Reenvie o vídeo e clique em Cortar/otimizar de novo.');
    });
    const sourceProbe = await probeVideo(filePath);
    const videosDir = path.join(/*turbopackIgnore: true*/ process.cwd(), ...VIDEO_PARTS);
    await mkdir(videosDir, { recursive: true });

    const width = 1080;
    const height = parsed.target === 'feed' ? 1350 : 1920;
    const sourceDuration = Number(sourceProbe.durationSec || 0);
    const safeStartSec =
      sourceDuration > parsed.durationSec
        ? Math.min(parsed.startSec, Math.max(0, sourceDuration - parsed.durationSec))
        : Math.max(0, Math.min(parsed.startSec, sourceDuration || parsed.startSec));
    const safeDurationSec =
      sourceDuration > 0
        ? Math.max(0.5, Math.min(parsed.durationSec, Math.max(0.5, sourceDuration - safeStartSec)))
        : parsed.durationSec;
    const outputName = `${Date.now()}-${safeOutputBase(filename)}-${parsed.target}-${Math.round(safeDurationSec)}s.mp4`;
    const outputPath = path.join(/*turbopackIgnore: true*/ process.cwd(), ...VIDEO_PARTS, outputName);

    const vf = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      'setsar=1',
      'fps=30',
      'format=yuv420p',
    ].join(',');

    const audioModes: TrimAudioMode[] = sourceProbe.hasAudio ? ['aac'] : [];
    const attempts = [
      ...audioModes.map((audioMode) => ({ label: `rápido ${audioMode}`, seekMode: 'fast' as const, audioMode })),
      ...audioModes.map((audioMode) => ({ label: `preciso curto ${audioMode}`, seekMode: 'near' as const, audioMode })),
      { label: 'rápido sem áudio', seekMode: 'fast' as const, audioMode: 'none' as const },
      { label: 'preciso curto sem áudio', seekMode: 'near' as const, audioMode: 'none' as const },
    ];

    let validation: Awaited<ReturnType<typeof validateTrimmedOutput>> | null = null;
    let usedAttempt = '';
    const attemptErrors: string[] = [];
    for (const attempt of attempts) {
      await unlink(outputPath).catch(() => {});
      try {
        await run(
          FFMPEG_BIN,
          trimArgs(filePath, outputPath, safeStartSec, safeDurationSec, vf, attempt.seekMode, attempt.audioMode)
        );
        validation = await validateTrimmedOutput(outputPath, safeDurationSec, sourceProbe.hasAudio && attempt.audioMode !== 'none');
        usedAttempt = attempt.label;
        break;
      } catch (attemptError) {
        attemptErrors.push(`${attempt.label}: ${briefError(attemptError)}`);
      }
    }

    if (!validation) {
      await unlink(outputPath).catch(() => {});
      throw new Error(
        `Não consegui gerar um clipe válido desse bruto. Tentativas: ${attemptErrors.slice(0, 4).join(' | ')}`
      );
    }

    if (parsed.deleteSource) {
      await unlink(filePath).catch(() => {});
      if (parsed.previewPath && parsed.previewPath !== parsed.sourcePath) {
        try {
          const preview = sourcePathToFile(parsed.previewPath);
          if (preview.filePath !== filePath) {
            await unlink(preview.filePath).catch(() => {});
          }
        } catch {
          // Preview path is best-effort cleanup only; the cut already succeeded.
        }
      }
    }

    return NextResponse.json({
      ok: true,
      videoSrc: `/api/uploads/videos/${outputName}`,
      filename: outputName,
      durationSec: validation.outputDuration || safeDurationSec,
      trimStartSec: safeStartSec,
      width,
      height,
      size: validation.outputStat.size,
      hasAudio: validation.hasAudio,
      sourceHasAudio: sourceProbe.hasAudio,
      audioWarning: sourceProbe.hasAudio && !validation.hasAudio ? 'O vídeo de origem tinha áudio, mas o trecho otimizado saiu sem áudio detectável.' : '',
      trimMode: usedAttempt,
      deletedSource: parsed.deleteSource,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Dados inválidos.', details: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Erro ao cortar vídeo.';
    const sourceMissing = /não está mais no servidor|bruto.*servidor|reenvie/i.test(message);
    return NextResponse.json(
      { ok: false, error: message, canRetryWithReupload: sourceMissing },
      { status: sourceMissing ? 404 : 500 }
    );
  }
}
