import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FFPROBE_BIN = existsSync('/usr/local/bin/ffprobe')
  ? '/usr/local/bin/ffprobe'
  : existsSync('/opt/homebrew/bin/ffprobe')
    ? '/opt/homebrew/bin/ffprobe'
    : 'ffprobe';
const MAX_PROBE_SIZE = 500 * 1024 * 1024;
const ALLOWED_MEDIA_EXT = ['.mp4', '.mov', '.webm', '.mp3', '.wav', '.m4a', '.aac', '.ogg'];

type ProbeResult = {
  ok: true;
  durationSec: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  bitrate: number | null;
  sizeBytes: number;
  hasVideo: boolean;
  hasAudio: boolean;
};

type ProbeError = { ok: false; error: string };

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
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error('ffprobe returned invalid JSON'));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

function parseFps(rateString: string | undefined): number | null {
  if (!rateString) return null;
  const [num, den] = rateString.split('/').map(Number);
  if (!num || !den) return null;
  return num / den;
}

export async function POST(req: NextRequest): Promise<NextResponse<ProbeResult | ProbeError>> {
  const tmpDir = path.join(os.tmpdir(), 'novacena-probe');
  let tmpPath = '';

  try {
    if (!existsSync(tmpDir)) {
      await mkdir(tmpDir, { recursive: true });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const sizeBytes = file.size;
    if (sizeBytes > MAX_PROBE_SIZE) {
      return NextResponse.json({ ok: false, error: 'Arquivo maior que 500MB' }, { status: 413 });
    }

    const ext = (file as any).name ? path.extname((file as any).name).toLowerCase() : '';
    if (!ALLOWED_MEDIA_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Extensão não suportada: ${ext || 'sem extensão'}.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    tmpPath = path.join(tmpDir, `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    await writeFile(tmpPath, buffer);

    const data = await runFfprobe(tmpPath);

    const streams: any[] = data.streams || [];
    const videoStream = streams.find((s) => s.codec_type === 'video');
    const audioStream = streams.find((s) => s.codec_type === 'audio');
    const format = data.format || {};

    const durationSec = parseFloat(format.duration || videoStream?.duration || audioStream?.duration || '0');
    const bitrate = format.bit_rate ? parseInt(format.bit_rate, 10) : null;

    const result: ProbeResult = {
      ok: true,
      durationSec,
      width: videoStream?.width ?? null,
      height: videoStream?.height ?? null,
      fps: parseFps(videoStream?.avg_frame_rate || videoStream?.r_frame_rate),
      videoCodec: videoStream?.codec_name ?? null,
      audioCodec: audioStream?.codec_name ?? null,
      bitrate,
      sizeBytes,
      hasVideo: !!videoStream,
      hasAudio: !!audioStream,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro ao analisar arquivo' },
      { status: 500 }
    );
  } finally {
    if (tmpPath && existsSync(tmpPath)) {
      try { await unlink(tmpPath); } catch {}
    }
  }
}
