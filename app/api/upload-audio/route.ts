import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import { mkdir, rm, stat, unlink, writeFile } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { PUBLIC_UPLOADS, safeFileName } from '../../../lib/uploadHelpers';
import { cleanupTransientFiles } from '../../../lib/transientCleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 900;

const AUDIO_DIR = path.join(PUBLIC_UPLOADS, 'audio');
const CHUNKS_DIR = path.join(AUDIO_DIR, '.chunks');
const SOURCES_DIR = path.join(AUDIO_DIR, '.sources');
const MAX_SIZE = 8 * 1024 * 1024 * 1024; // 8GB, igual ao bruto de video.
const CHUNK_SIZE_LIMIT = 12 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.flac',
  '.aif',
  '.aiff',
  '.mp4',
  '.mov',
  '.m4v',
  '.webm',
  '.mpeg',
  '.mpg',
  '.mkv',
  '.avi',
  '.3gp',
  '.3gpp',
]);
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

function isAllowedContentType(contentType: string) {
  if (!contentType || contentType === 'application/octet-stream') return true;
  return contentType.startsWith('audio/') || contentType.startsWith('video/');
}

function cleanUploadId(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 80);
}

function chunkPartName(index: number) {
  return `${String(index).padStart(6, '0')}.part`;
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

async function allChunksReady(chunkDir: string, totalChunks: number) {
  for (let index = 0; index < totalChunks; index += 1) {
    if (!existsSync(path.join(chunkDir, chunkPartName(index)))) return false;
  }
  return true;
}

function runFfprobe(filepath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFPROBE_BIN, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filepath,
    ]);

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 2000) stderr = stderr.slice(-2000);
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe saiu com codigo ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('ffprobe retornou JSON invalido'));
      }
    });
    proc.on('error', reject);
  });
}

async function probeMedia(filepath: string) {
  const data = await runFfprobe(filepath);
  const streams: any[] = data.streams || [];
  const audioStream = streams.find((stream) => stream.codec_type === 'audio');
  const videoStream = streams.find((stream) => stream.codec_type === 'video');
  const format = data.format || {};

  return {
    durationSec:
      Number.parseFloat(format.duration || audioStream?.duration || videoStream?.duration || '0') || 0,
    hasAudio: Boolean(audioStream),
    hasVideo: Boolean(videoStream),
  };
}

function runExtractAudio(input: string, output: string): Promise<{ ok: boolean; error: string }> {
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG_BIN, [
      '-v',
      'error',
      '-fflags',
      '+genpts+discardcorrupt',
      '-err_detect',
      'ignore_err',
      '-analyzeduration',
      '100M',
      '-probesize',
      '100M',
      '-ignore_unknown',
      '-i',
      input,
      '-map',
      '0:a:0',
      '-vn',
      '-sn',
      '-dn',
      '-ac',
      '2',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      '-y',
      output,
    ]);

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 2500) stderr = stderr.slice(-2500);
    });
    proc.on('close', (code) => resolve({ ok: code === 0, error: stderr.trim() }));
    proc.on('error', (error) => resolve({ ok: false, error: error.message }));
  });
}

function makeOutputName(sourceFilename: string) {
  const sourceExt = path.extname(sourceFilename) || '.bin';
  const safeSource = safeFileName(sourceFilename, sourceExt);
  const base = path.basename(safeSource, path.extname(safeSource));
  return `${base}-audio.m4a`;
}

async function normalizeAudio(sourcePath: string, originalName: string) {
  const inputProbe = await probeMedia(sourcePath).catch((error) => {
    throw new Error(`Nao consegui ler esse arquivo. ${error instanceof Error ? error.message : ''}`.trim());
  });

  if (!inputProbe.hasAudio) {
    throw new Error('Esse arquivo nao tem faixa de audio para extrair.');
  }

  await mkdir(AUDIO_DIR, { recursive: true });
  const outputName = makeOutputName(originalName);
  const outputPath = path.join(AUDIO_DIR, outputName);
  await unlink(outputPath).catch(() => {});

  const result = await runExtractAudio(sourcePath, outputPath);
  if (!result.ok) {
    await unlink(outputPath).catch(() => {});
    throw new Error(`Nao consegui preparar o audio desse arquivo. ${result.error}`.trim());
  }

  const outputStat = await stat(outputPath).catch(() => null);
  const outputProbe = await probeMedia(outputPath).catch(() => null);
  if (!outputStat || outputStat.size < 1024 || !outputProbe?.hasAudio || Number(outputProbe.durationSec || 0) <= 0) {
    await unlink(outputPath).catch(() => {});
    throw new Error('A extracao gerou um audio invalido. Tente outro arquivo ou exporte em MP4/WAV/MP3.');
  }

  return {
    audioSrc: `/api/uploads/audio/${outputName}`,
    filename: outputName,
    originalName,
    durationSec: outputProbe.durationSec,
    size: outputStat.size,
    sourceKind: inputProbe.hasVideo ? 'video' : 'audio',
  };
}

async function saveAndNormalize(req: NextRequest, sourceName: string, contentLength: number) {
  if (!req.body) {
    return NextResponse.json({ ok: false, error: 'Corpo do upload vazio.' }, { status: 400 });
  }

  await mkdir(SOURCES_DIR, { recursive: true });
  const ext = path.extname(sourceName).toLowerCase() || '.bin';
  const sourceFilename = safeFileName(sourceName, ext);
  const sourcePath = path.join(SOURCES_DIR, sourceFilename);

  await pipeline(Readable.fromWeb(req.body as any), createWriteStream(sourcePath));

  const savedSize = (await stat(sourcePath).catch(() => null))?.size ?? 0;
  if (contentLength > 0 && savedSize < contentLength * 0.98) {
    await unlink(sourcePath).catch(() => {});
    return NextResponse.json(
      {
        ok: false,
        error: `Upload incompleto: recebido ${(savedSize / 1024 / 1024).toFixed(1)} MB de ${(contentLength / 1024 / 1024).toFixed(1)} MB.`,
      },
      { status: 400 }
    );
  }

  try {
    const audio = await normalizeAudio(sourcePath, sourceName);
    return NextResponse.json({ ok: true, ...audio });
  } finally {
    await unlink(sourcePath).catch(() => {});
  }
}

async function handleChunked(req: NextRequest, filenameParam: string) {
  if (!req.body) {
    return NextResponse.json({ ok: false, error: 'Corpo do upload vazio.' }, { status: 400 });
  }

  const uploadId = cleanUploadId(req.nextUrl.searchParams.get('uploadId') || '');
  const chunkIndex = Number(req.nextUrl.searchParams.get('chunkIndex'));
  const totalChunks = Number(req.nextUrl.searchParams.get('totalChunks'));
  const totalSize = Number(req.nextUrl.searchParams.get('totalSize') || 0);
  const contentLength = Number(req.headers.get('content-length') || 0);

  if (!uploadId || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks <= 0 || chunkIndex < 0 || chunkIndex >= totalChunks) {
    return NextResponse.json({ ok: false, error: 'Upload em partes invalido.' }, { status: 400 });
  }

  if (totalSize > MAX_SIZE) {
    return NextResponse.json(
      { ok: false, error: `Arquivo muito grande (${(totalSize / 1024 / 1024).toFixed(1)} MB). Maximo permitido: 8 GB.` },
      { status: 413 }
    );
  }

  if (contentLength > CHUNK_SIZE_LIMIT) {
    return NextResponse.json(
      { ok: false, error: 'Parte do upload grande demais. Recarregue a pagina e tente novamente.' },
      { status: 413 }
    );
  }

  const chunkDir = path.join(CHUNKS_DIR, uploadId);
  await mkdir(chunkDir, { recursive: true });
  const partPath = path.join(chunkDir, chunkPartName(chunkIndex));
  await pipeline(Readable.fromWeb(req.body as any), createWriteStream(partPath));

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
      receivedChunks: chunkIndex + 1,
      totalChunks,
    });
  }

  await mkdir(SOURCES_DIR, { recursive: true });
  const sourceFilename = safeFileName(filenameParam, path.extname(filenameParam).toLowerCase() || '.bin');
  const sourcePath = path.join(SOURCES_DIR, sourceFilename);
  await assembleChunks(chunkDir, totalChunks, sourcePath);
  await rm(chunkDir, { recursive: true, force: true }).catch(() => {});

  const assembledSize = (await stat(sourcePath).catch(() => null))?.size ?? 0;
  if (totalSize > 0 && assembledSize < totalSize * 0.98) {
    await unlink(sourcePath).catch(() => {});
    return NextResponse.json(
      {
        ok: false,
        error: `Upload incompleto: recebido ${(assembledSize / 1024 / 1024).toFixed(1)} MB de ${(totalSize / 1024 / 1024).toFixed(1)} MB.`,
      },
      { status: 400 }
    );
  }

  try {
    const audio = await normalizeAudio(sourcePath, filenameParam);
    return NextResponse.json({ ok: true, ...audio });
  } finally {
    await unlink(sourcePath).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    cleanupTransientFiles().catch(() => {});

    const filenameParam = req.nextUrl.searchParams.get('filename') || 'audio.m4a';
    const ext = path.extname(filenameParam).toLowerCase();
    const contentType = (req.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const contentLength = Number(req.headers.get('content-length') || 0);
    const isChunkedUpload = req.nextUrl.searchParams.get('chunked') === '1';

    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { ok: false, error: `Extensao nao suportada: ${ext || 'sem extensao'}. Use audio ou video comum.` },
        { status: 400 }
      );
    }

    if (!isAllowedContentType(contentType) && !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { ok: false, error: `Tipo nao suportado: ${contentType}. Use audio ou video.` },
        { status: 400 }
      );
    }

    if (isChunkedUpload) {
      return handleChunked(req, filenameParam);
    }

    if (req.body && !contentType.includes('multipart/form-data')) {
      if (contentLength > MAX_SIZE) {
        return NextResponse.json(
          { ok: false, error: `Arquivo muito grande (${(contentLength / 1024 / 1024).toFixed(1)} MB). Maximo permitido: 8 GB.` },
          { status: 413 }
        );
      }
      return saveAndNormalize(req, filenameParam, contentLength);
    }

    const form = await req.formData();
    const file = form.get('audio');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximo permitido: 8 GB.` },
        { status: 413 }
      );
    }
    const fileExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.has(fileExt)) {
      return NextResponse.json({ ok: false, error: `Extensao nao suportada: ${fileExt}.` }, { status: 400 });
    }
    const filename = safeFileName(file.name, fileExt || '.bin');
    const sourcePath = path.join(SOURCES_DIR, filename);
    await mkdir(SOURCES_DIR, { recursive: true });
    await writeFile(sourcePath, Buffer.from(await file.arrayBuffer()));
    try {
      const audio = await normalizeAudio(sourcePath, file.name);
      return NextResponse.json({ ok: true, ...audio });
    } finally {
      await unlink(sourcePath).catch(() => {});
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}
