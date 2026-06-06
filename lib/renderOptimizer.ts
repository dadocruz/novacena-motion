import type { MotionProject } from '../remotion/types';

export interface RenderOptions {
  fps?: number; // 24, 30, 60 (default: 30 para preview, 60 para final)
  codec?: 'vp8' | 'vp9' | 'h264' | 'h265'; // default: vp8
  quality?: 'low' | 'medium' | 'high'; // default: medium
  parallel?: number; // threads (default: 2)
  streaming?: boolean; // render + send while encoding
}

export interface OptimizedRenderProfile {
  name: string;
  fps: number;
  bitrate: string;
  codec: string;
  flags: string[];
}

// Perfis de render pré-otimizados
const RENDER_PROFILES: Record<string, OptimizedRenderProfile> = {
  preview: {
    name: 'Preview Mode',
    fps: 30,
    bitrate: '2500k',
    codec: 'vp8',
    flags: ['--threads', '2', '--fast-init'],
  },
  feed: {
    name: 'Social Feed Export',
    fps: 30,
    bitrate: '5000k',
    codec: 'h264',
    flags: ['--preset', 'fast', '--crf', '23'],
  },
  story: {
    name: 'Story Format',
    fps: 30,
    bitrate: '4000k',
    codec: 'h264',
    flags: ['--preset', 'slow', '--crf', '18'],
  },
  high_quality: {
    name: 'High Quality Master',
    fps: 60,
    bitrate: '10000k',
    codec: 'h265',
    flags: ['--preset', 'veryslow', '--crf', '16'],
  },
};

/**
 * Gera comandos otimizados de render via ffmpeg
 */
export function generateOptimizedRenderCommand(
  template: string,
  format: 'story' | 'feed',
  projectPath: string,
  outputPath: string,
  options: RenderOptions = {}
): string {
  const {
    fps = 30,
    codec = 'vp8',
    quality = 'medium',
    parallel = 2,
    streaming = false,
  } = options;

  // Selecionar codec params
  const codecParams = getCodecParams(codec, quality);

  // Flags de paralelização
  const parallelFlags = ['--threads', Math.min(parallel, 4).toString()];

  // Streaming flags (se habilitado)
  const streamingFlags = streaming ? ['--streaming'] : [];

  // fps otimizado
  const fpsFlag = ['--fps', fps.toString()];

  // Montar comando completo
  const cmd = [
    'remotion',
    'render',
    projectPath,
    template,
    outputPath,
    ...fpsFlag,
    '--codec',
    codec,
    ...codecParams,
    ...parallelFlags,
    ...streamingFlags,
    '--concurrency',
    parallel.toString(),
  ].join(' ');

  return cmd;
}

/**
 * Params de codec otimizados
 */
function getCodecParams(codec: string, quality: 'low' | 'medium' | 'high'): string[] {
  const params: Record<string, Record<string, string[]>> = {
    h264: {
      low: ['--crf', '28', '--preset', 'fast'],
      medium: ['--crf', '23', '--preset', 'medium'],
      high: ['--crf', '18', '--preset', 'slow'],
    },
    h265: {
      low: ['--crf', '32', '--preset', 'fast'],
      medium: ['--crf', '27', '--preset', 'medium'],
      high: ['--crf', '22', '--preset', 'slow'],
    },
    vp8: {
      low: ['--bitrate', '2000k', '--threads', '2'],
      medium: ['--bitrate', '5000k', '--threads', '4'],
      high: ['--bitrate', '10000k', '--threads', '8'],
    },
    vp9: {
      low: ['--bitrate', '2500k', '--speed', '8'],
      medium: ['--bitrate', '6000k', '--speed', '5'],
      high: ['--bitrate', '12000k', '--speed', '0'],
    },
  };

  return params[codec]?.[quality] || params.h264.medium;
}

/**
 * Calc tamanho esperado de arquivo
 */
export function estimateFileSize(
  durationSeconds: number,
  bitrate: string,
  format: 'story' | 'feed'
): { size: string; bytes: number } {
  // Parse bitrate (ex: "5000k" -> 5000000)
  const bitrateMatch = bitrate.match(/(\d+)([km]?)/i);
  if (!bitrateMatch) return { size: 'unknown', bytes: 0 };

  let bitrateBps = parseInt(bitrateMatch[1]);
  if (bitrateMatch[2]?.toLowerCase() === 'k') bitrateBps *= 1000;
  if (bitrateMatch[2]?.toLowerCase() === 'm') bitrateBps *= 1000 * 1000;

  const bytes = (bitrateBps * durationSeconds) / 8;
  const mb = (bytes / (1024 * 1024)).toFixed(1);

  return { size: `${mb}MB`, bytes };
}

/**
 * Sugerir profile baseado no projeto e dispositivo
 */
export function recommendRenderProfile(
  project: MotionProject,
  userDeviceMemory?: number
): OptimizedRenderProfile {
  // Se memory é limitada, usar preview
  if (userDeviceMemory && userDeviceMemory < 4096) {
    return RENDER_PROFILES.preview;
  }

  // Baseado no template
  if (project.type === 'available_now' || project.type === 'out_now' || project.type === 'listen_deezer') {
    return RENDER_PROFILES.story;
  }

  if (project.type === 'milestone') {
    return RENDER_PROFILES.feed;
  }

  // Default
  return RENDER_PROFILES.preview;
}

/**
 * Parallelizar renders (múltiplos formatos simultâneos)
 */
export async function parallelRenderAll(
  template: string,
  projectPath: string,
  outputDir: string,
  formats: ('story' | 'feed')[] = ['story', 'feed']
): Promise<{ format: string; cmd: string }[]> {
  return formats.map(format => ({
    format,
    cmd: generateOptimizedRenderCommand(
      template,
      format,
      projectPath,
      `${outputDir}/${template}-${format}.mp4`,
      { fps: 30, parallel: 2, streaming: true }
    ),
  }));
}

/**
 * Monitorar progresso de render em tempo real
 */
export class RenderProgressTracker {
  private startTime: number = 0;
  private totalFrames: number = 0;
  private fps: number = 30;

  constructor(durationSeconds: number, fps: number = 30) {
    this.totalFrames = durationSeconds * fps;
    this.fps = fps;
  }

  start() {
    this.startTime = Date.now();
  }

  parseOutput(output: string): { progress: number; eta: string; speed: number } {
    // Parse ffmpeg output: "frame= 1234 fps=  45 q=-1.0 Lsize=..."
    const frameMatch = output.match(/frame=\s*(\d+)/);
    const fpsMatch = output.match(/fps=\s*([\d.]+)/);

    if (!frameMatch) {
      return { progress: 0, eta: 'calculating...', speed: 0 };
    }

    const currentFrame = parseInt(frameMatch[1]);
    const speed = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
    const progress = (currentFrame / this.totalFrames) * 100;

    const remainingFrames = this.totalFrames - currentFrame;
    const etaSeconds = speed > 0 ? remainingFrames / speed : 0;
    const eta = this.formatTime(etaSeconds);

    return { progress: Math.min(progress, 99.9), eta, speed };
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}
