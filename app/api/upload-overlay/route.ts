import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { existsSync } from 'fs';
import { mkdir, rm, stat, unlink } from 'fs/promises';
import { addOverlay, deleteOverlay, listOverlays } from '../../../lib/storage';
import { PUBLIC_UPLOADS, safeFileName, saveFile } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
// force-dynamic faz o Next STREAMAR o body (sem bufferizar). Sem isso o
// upload de vídeo era cortado em ~10MB — mesma config do route do BG que
// aceita arquivos grandes.
export const dynamic = 'force-dynamic';
export const maxDuration = 900;

const MAX_SIZE = 500 * 1024 * 1024;
const MAX_SIZE_LABEL = '500 MB';
const CHUNK_SIZE_LIMIT = 12 * 1024 * 1024;
const ALLOWED_BLEND_MODES = new Set(['screen', 'overlay', 'lighten', 'soft-light', 'normal']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v']);
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

function cleanLabel(value: string, fallback: string): string {
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  return clean || fallback;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 2500) stderr = stderr.slice(-2500);
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg saiu com código ${code}`));
    });
  });
}

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(FFPROBE_BIN, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let stdout = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.on('error', () => resolve(0));
    proc.on('close', () => {
      const duration = Number.parseFloat(stdout.trim());
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
    });
  });
}

async function prepareVideoOverlay(dir: string, filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (!['.mov', '.m4v'].includes(ext)) return filename;

  const inputPath = path.join(dir, filename);
  const outputName = filename.replace(/\.(mov|m4v)$/i, '-alpha.webm');
  const outputPath = path.join(dir, outputName);

  const sourceDuration = await probeDuration(inputPath);

  // Alpha em .mov costuma ser ProRes 4444 (yuva444p12le), que o Chrome NÃO
  // decodifica. Transcodamos para WebM VP9 com alpha (yuva420p). A flag
  // -metadata alpha_mode=1 é OBRIGATÓRIA: sem ela o Chrome trata o vídeo como
  // opaco. Downscale p/ 720w + 24fps + realtime deixa o encode leve o
  // suficiente pra COMPLETAR dentro do tempo do request num VPS fraco — antes
  // truncava (gerava só ~2.5s, dando "congelado").
  await runFfmpeg([
    '-y',
    '-i', inputPath,
    '-an',
    '-vf', "format=yuva420p,scale='min(720,iw)':-2,fps=24",
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p',
    '-metadata:s:v:0', 'alpha_mode=1',
    '-auto-alt-ref', '0',
    '-deadline', 'realtime',
    '-cpu-used', '8',
    '-row-mt', '1',
    '-b:v', '0',
    '-crf', '32',
    outputPath,
  ]);

  if (!existsSync(outputPath)) {
    throw new Error('Falha ao converter o overlay alpha para WebM. Tente um arquivo menor/mais curto.');
  }

  // VALIDAÇÃO: se o webm saiu muito mais curto que a fonte, o encode foi
  // cortado (timeout). Não serve um overlay truncado/congelado — falha avisando.
  const outDuration = await probeDuration(outputPath);
  if (sourceDuration > 1 && outDuration > 0 && outDuration < sourceDuration * 0.9) {
    await unlink(outputPath).catch(() => {});
    throw new Error(
      `O overlay alpha foi convertido só parcialmente (${outDuration.toFixed(1)}s de ${sourceDuration.toFixed(1)}s) — o servidor não terminou a tempo. ` +
      `Exporte o overlay mais leve (ex: 720p ou WebM) e tente de novo.`
    );
  }

  await unlink(inputPath).catch(() => {});
  return outputName;
}

async function resolveVideoDuration(dir: string, filename: string, fallback: number) {
  const probed = await probeDuration(path.join(dir, filename));
  if (probed > 0) return probed;
  return Number.isFinite(fallback) && fallback > 0 ? fallback : undefined;
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

export async function GET() {
  const overlays = await listOverlays();
  return NextResponse.json({ ok: true, overlays });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = (req.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const filenameParam = req.nextUrl.searchParams.get('filename') || '';
    const extParam = path.extname(filenameParam).toLowerCase();
    const isChunkedUpload = req.nextUrl.searchParams.get('chunked') === '1';

    if (isChunkedUpload) {
      if (!req.body) {
        return NextResponse.json({ ok: false, error: 'Corpo do upload vazio.' }, { status: 400 });
      }

      const isVideo = VIDEO_EXTENSIONS.has(extParam);
      if (!isVideo) {
        return NextResponse.json(
          { ok: false, error: 'Upload em partes é aceito apenas para vídeos de overlay.' },
          { status: 400 }
        );
      }

      const uploadId = cleanUploadId(req.nextUrl.searchParams.get('uploadId') || '');
      const chunkIndex = Number(req.nextUrl.searchParams.get('chunkIndex'));
      const totalChunks = Number(req.nextUrl.searchParams.get('totalChunks'));
      const totalSize = Number(req.nextUrl.searchParams.get('totalSize') || 0);
      const durationSecRaw = Number(req.nextUrl.searchParams.get('durationSec'));
      const contentLength = Number(req.headers.get('content-length') || 0);

      if (!uploadId || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks <= 0 || chunkIndex < 0 || chunkIndex >= totalChunks) {
        return NextResponse.json({ ok: false, error: 'Upload em partes inválido.' }, { status: 400 });
      }

      if (totalSize > MAX_SIZE) {
        return NextResponse.json(
          { ok: false, error: `Arquivo muito grande (${(totalSize / 1024 / 1024).toFixed(1)} MB). Máximo permitido: ${MAX_SIZE_LABEL}.` },
          { status: 413 }
        );
      }

      if (contentLength > CHUNK_SIZE_LIMIT) {
        return NextResponse.json(
          { ok: false, error: 'Parte do upload grande demais. Recarregue a página e tente novamente.' },
          { status: 413 }
        );
      }

      const dir = path.join(PUBLIC_UPLOADS, 'overlays');
      const chunkDir = path.join(dir, '.chunks', uploadId);
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
          receivedChunks: chunkIndex + 1,
          totalChunks,
        });
      }

      await mkdir(dir, { recursive: true });
      const filename = safeFileName(filenameParam, extParam || '.mp4');
      const finalPath = path.join(dir, filename);
      await assembleChunks(chunkDir, totalChunks, finalPath);
      await rm(chunkDir, { recursive: true, force: true }).catch(() => {});

      if (totalSize > 0) {
        const assembledSize = (await stat(finalPath).catch(() => null))?.size ?? 0;
        if (assembledSize < totalSize * 0.98) {
          await unlink(finalPath).catch(() => {});
          return NextResponse.json(
            {
              ok: false,
              error: `Upload incompleto: recebido ${(assembledSize / 1024 / 1024).toFixed(1)} MB de ${(totalSize / 1024 / 1024).toFixed(1)} MB.`,
            },
            { status: 400 }
          );
        }
      }

      const storedFilename = await prepareVideoOverlay(dir, filename);
      const storedDurationSec = await resolveVideoDuration(dir, storedFilename, durationSecRaw);

      const label = cleanLabel(req.nextUrl.searchParams.get('label') || '', path.basename(filenameParam || filename, extParam || '.mp4'));
      const blendMode = req.nextUrl.searchParams.get('blendMode') || 'screen';
      if (!ALLOWED_BLEND_MODES.has(blendMode)) {
        return NextResponse.json(
          { ok: false, error: `Blend mode inválido: ${blendMode}.` },
          { status: 400 }
        );
      }

      const overlay = await addOverlay({
        label,
        filename: storedFilename,
        path: `/api/uploads/overlays/${storedFilename}`,
        type: 'video',
        blendMode: blendMode as 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal',
        durationSec: typeof storedDurationSec === 'number' && Number.isFinite(storedDurationSec) && storedDurationSec > 0 ? storedDurationSec : undefined,
      });

      return NextResponse.json({ ok: true, overlay });
    }

    if (req.body && contentType && !contentType.includes('multipart/form-data')) {
      const isVideo = VIDEO_EXTENSIONS.has(extParam);
      if (!isVideo) {
        return NextResponse.json(
          { ok: false, error: 'Upload direto só é aceito para vídeos. Use PNG/JPG/WEBP/SVG como elemento.' },
          { status: 400 }
        );
      }

      const contentLength = Number(req.headers.get('content-length') || 0);
      if (contentLength > MAX_SIZE) {
        return NextResponse.json(
          { ok: false, error: `Arquivo muito grande (${(contentLength / 1024 / 1024).toFixed(1)} MB). Máximo permitido: ${MAX_SIZE_LABEL}.` },
          { status: 413 }
        );
      }

      const filename = safeFileName(filenameParam, extParam || '.mp4');
      const dir = path.join(PUBLIC_UPLOADS, 'overlays');
      const durationSecRaw = Number(req.nextUrl.searchParams.get('durationSec'));
      await mkdir(dir, { recursive: true });
      await pipeline(
        Readable.fromWeb(req.body as any),
        createWriteStream(path.join(dir, filename))
      );

      // Upload incompleto? (arquivo pesado cortado pela rede/proxy). Sem isso,
      // o ffmpeg converte fielmente os bytes parciais e gera um overlay
      // truncado que "congela". Falha avisando em vez de servir lixo.
      if (contentLength > 0) {
        const savedSize = (await stat(path.join(dir, filename)).catch(() => null))?.size ?? 0;
        if (savedSize < contentLength * 0.98) {
          await unlink(path.join(dir, filename)).catch(() => {});
          return NextResponse.json(
            {
              ok: false,
              error: `Upload incompleto: recebido ${(savedSize / 1024 / 1024).toFixed(1)} MB de ${(contentLength / 1024 / 1024).toFixed(1)} MB. ` +
                `O arquivo é pesado e a conexão caiu no meio. Tente de novo ou exporte o overlay mais leve (720p/WebM).`,
            },
            { status: 400 }
          );
        }
      }

      const storedFilename = await prepareVideoOverlay(dir, filename);
      const storedDurationSec = await resolveVideoDuration(dir, storedFilename, durationSecRaw);

      const label = cleanLabel(req.nextUrl.searchParams.get('label') || '', path.basename(filenameParam || filename, extParam || '.mp4'));
      const blendMode = req.nextUrl.searchParams.get('blendMode') || 'screen';
      if (!ALLOWED_BLEND_MODES.has(blendMode)) {
        return NextResponse.json(
          { ok: false, error: `Blend mode inválido: ${blendMode}.` },
          { status: 400 }
        );
      }

      const overlay = await addOverlay({
        label,
        filename: storedFilename,
        path: `/api/uploads/overlays/${storedFilename}`,
        type: 'video',
        blendMode: blendMode as 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal',
        durationSec: storedDurationSec,
      });
      return NextResponse.json({ ok: true, overlay });
    }

    const form = await req.formData();
    const file = form.get('overlay');
    const label = (form.get('label') as string) || '';
    const blendMode = (form.get('blendMode') as string) || 'normal';
    const durationSecRaw = Number(form.get('durationSec'));
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { ok: false, error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Arquivo muito grande (máx ${MAX_SIZE_LABEL}).` },
        { status: 413 }
      );
    }
    const ext = path.extname(file.name).toLowerCase();
    const isVideo = VIDEO_EXTENSIONS.has(ext);
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { ok: false, error: 'Tipo não suportado. Use vídeo (MP4/MOV/WEBM) ou imagem (PNG/JPG/WEBP/SVG).' },
        { status: 400 }
      );
    }
    if (!ALLOWED_BLEND_MODES.has(blendMode)) {
      return NextResponse.json(
        { ok: false, error: `Blend mode inválido: ${blendMode}.` },
        { status: 400 }
      );
    }
    const filename = safeFileName(file.name, ext);
    const dir = path.join(PUBLIC_UPLOADS, 'overlays');
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(dir, filename, buffer);
    const storedFilename = isVideo ? await prepareVideoOverlay(dir, filename) : filename;
    const storedDurationSec = isVideo ? await resolveVideoDuration(dir, storedFilename, durationSecRaw) : durationSecRaw;
    const overlay = await addOverlay({
      label: cleanLabel(label, path.basename(file.name, ext)),
      filename: storedFilename,
      path: `/api/uploads/overlays/${storedFilename}`,
      type: isVideo ? 'video' : 'image',
      blendMode: blendMode as 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal',
      durationSec: typeof storedDurationSec === 'number' && Number.isFinite(storedDurationSec) && storedDurationSec > 0 ? storedDurationSec : undefined,
    });
    return NextResponse.json({ ok: true, overlay });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório.' }, { status: 400 });
  const ok = await deleteOverlay(id);
  return NextResponse.json({ ok });
}
