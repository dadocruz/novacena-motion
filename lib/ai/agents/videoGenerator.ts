import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import type { CoverIntelligenceResult } from '../schemas';

/**
 * AGENTE: Video BG Generator (Gemini Veo)
 *
 * Recebe a capa do single + análise visual e gera um vídeo de fundo
 * animado via Gemini Veo (Image-to-Video). O vídeo é usado como
 * background no CinematicBackground do Remotion.
 *
 * Fluxo: upload imagem → gera vídeo (polling) → salva .mp4 → retorna URL
 */

export type VideoGenInput = {
  coverUrl: string;
  visual: CoverIntelligenceResult;
  briefing?: string;
  moodOverride?: string;
  durationSeconds?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
};

export type VideoGenResult = {
  url: string;
  filename: string;
  promptUsed: string;
  durationSeconds: number;
  provider: 'gemini-veo';
};

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 5 * 60 * 1000;

export async function generateVideoBg(input: VideoGenInput): Promise<VideoGenResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada — Video generator usa Gemini Veo');

  const coverImagePart = await fetchImageAsInlineData(input.coverUrl);
  const prompt = buildVideoPrompt(input.visual, input.moodOverride, input.briefing);
  const durationSeconds = input.durationSeconds ?? 8;
  const aspectRatio = input.aspectRatio ?? '9:16';

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'veo-2.0-generate-001' });

  const response = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        coverImagePart,
      ],
    }],
    generationConfig: {
      responseMimeType: 'video/mp4',
      videoDuration: `${durationSeconds}s`,
      aspectRatio,
    } as any,
  } as any);

  const videoData = extractVideoFromResponse(response);

  if (videoData.operationName) {
    const finalVideo = await pollForVideo(apiKey, videoData.operationName);
    return await saveVideo(finalVideo, prompt, durationSeconds);
  }

  if (videoData.base64) {
    return await saveVideo(videoData.base64, prompt, durationSeconds);
  }

  throw new Error('Gemini Veo não retornou vídeo nem operação para polling');
}

/**
 * Alternativa: usa a REST API diretamente para Veo,
 * caso o SDK não suporte totalmente o modelo de vídeo.
 */
export async function generateVideoBgRest(input: VideoGenInput): Promise<VideoGenResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const coverBase64 = await fetchImageAsBase64(input.coverUrl);
  const prompt = buildVideoPrompt(input.visual, input.moodOverride, input.briefing);
  const durationSeconds = input.durationSeconds ?? 8;
  const aspectRatio = input.aspectRatio ?? '9:16';

  // Veo via REST (generativelanguage.googleapis.com)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`;

  const body = {
    instances: [{
      prompt,
      image: { bytesBase64Encoded: coverBase64.data, mimeType: coverBase64.mimeType },
    }],
    parameters: {
      aspectRatio,
      durationSeconds,
      numberOfVideos: 1,
      personGeneration: 'dont_allow',
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Veo API error ${res.status}: ${err}`);
  }

  const operation = await res.json();
  const operationName: string = operation.name;

  if (!operationName) {
    throw new Error('Veo não retornou operação — resposta inesperada');
  }

  const videoBase64 = await pollOperationRest(apiKey, operationName);
  return await saveVideo(videoBase64, prompt, durationSeconds);
}

// ============================================================
// HELPERS
// ============================================================

async function fetchImageAsInlineData(src: string): Promise<any> {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('data URL inválida');
    return { inlineData: { mimeType: m[1], data: m[2] } };
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Falha ao baixar capa: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') ?? 'image/jpeg';
  return { inlineData: { mimeType: mime, data: buf.toString('base64') } };
}

async function fetchImageAsBase64(src: string): Promise<{ data: string; mimeType: string }> {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('data URL inválida');
    return { data: m[2], mimeType: m[1] };
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Falha ao baixar capa: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') ?? 'image/jpeg';
  return { data: buf.toString('base64'), mimeType: mime };
}

function extractVideoFromResponse(response: any): { base64?: string; operationName?: string } {
  try {
    const candidate = response?.response?.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.inlineData) {
      return { base64: candidate.content.parts[0].inlineData.data };
    }
    if (response?.response?.promptFeedback?.operationName) {
      return { operationName: response.response.promptFeedback.operationName };
    }
  } catch {}
  return {};
}

async function pollForVideo(apiKey: string, operationName: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
  const start = Date.now();

  while (Date.now() - start < MAX_POLL_MS) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(url);
    if (!res.ok) continue;

    const op = await res.json();
    if (op.done) {
      const video = op.response?.generatedVideos?.[0];
      if (video?.video?.bytesBase64Encoded) {
        return video.video.bytesBase64Encoded;
      }
      if (video?.uri) {
        const dl = await fetch(video.uri);
        const buf = Buffer.from(await dl.arrayBuffer());
        return buf.toString('base64');
      }
      throw new Error('Operação concluída mas sem vídeo no resultado');
    }

    if (op.error) {
      throw new Error(`Veo falhou: ${op.error.message ?? JSON.stringify(op.error)}`);
    }
  }

  throw new Error(`Veo timeout: vídeo não ficou pronto em ${MAX_POLL_MS / 1000}s`);
}

async function pollOperationRest(apiKey: string, operationName: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
  const start = Date.now();

  while (Date.now() - start < MAX_POLL_MS) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status >= 500) continue;
      throw new Error(`Poll error ${res.status}: ${await res.text()}`);
    }

    const op = await res.json();
    if (op.done) {
      const videos = op.response?.generatedVideos ?? op.response?.predictions ?? [];
      const first = videos[0];
      if (first?.video?.bytesBase64Encoded) return first.video.bytesBase64Encoded;
      if (first?.bytesBase64Encoded) return first.bytesBase64Encoded;
      if (first?.uri || first?.gcsUri) {
        const dlUrl = first.uri ?? first.gcsUri;
        const dl = await fetch(dlUrl);
        const buf = Buffer.from(await dl.arrayBuffer());
        return buf.toString('base64');
      }
      throw new Error('Operação concluída mas sem vídeo: ' + JSON.stringify(op.response).slice(0, 500));
    }

    if (op.error) {
      throw new Error(`Veo falhou: ${op.error.message ?? JSON.stringify(op.error)}`);
    }
  }

  throw new Error(`Veo timeout: vídeo não ficou pronto em ${MAX_POLL_MS / 1000}s`);
}

async function saveVideo(base64: string, prompt: string, durationSeconds: number): Promise<VideoGenResult> {
  const filename = `veo-${Date.now()}-${randomBytes(4).toString('hex')}.mp4`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'ai-videos');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));

  return {
    url: `/api/uploads/ai-videos/${filename}`,
    filename,
    promptUsed: prompt,
    durationSeconds,
    provider: 'gemini-veo',
  };
}

function buildVideoPrompt(visual: CoverIntelligenceResult, moodOverride?: string, briefing?: string): string {
  const mood = moodOverride ?? (visual.mood?.[0] ?? 'premium');
  const palette = visual.palette?.slice(0, 3).join(', ') ?? '#0a0a14, #1a1a2a, #3a2a4a';
  const dominant = visual.dominantColors?.[0] ?? visual.palette?.[0] ?? '#1a1a2a';

  const moodMotions: Record<string, string> = {
    sertanejo: 'slow golden bokeh lights drifting, warm concert stage haze with subtle smoke flowing upward, amber spotlight gently pulsing',
    trap: 'neon purple and cyan light beams slowly sweeping, wet urban reflections shimmering, dark atmospheric particles drifting',
    gospel: 'ethereal light rays descending from above with gentle flicker, soft golden dust particles floating peacefully, heavenly cloud movement',
    pop: 'vibrant colorful bokeh dots floating and pulsing rhythmically, energetic light leaks moving across frame, glossy reflections',
    indie: 'subtle film grain with dreamy soft-focus light movement, warm vintage light leaks drifting slowly, gentle atmospheric dust',
    rock: 'dramatic red spotlight sweeping through dark smoke, intense haze rolling, gritty moody atmosphere with flickering lights',
    funk: 'warm orange and yellow neon lights pulsing energetically, disco bokeh floating, vibrant party atmosphere movement',
    eletronica: 'futuristic blue holographic light beams scanning, geometric reflections shifting, clean electronic pulse effect',
    premium: 'luxurious golden particles slowly rising, deep navy backdrop with soft spotlight movement, sophisticated light interplay',
    stage: 'concert spotlights sweeping through atmospheric haze, subtle audience silhouettes swaying, dramatic side lighting movement',
    neon: 'electric purple and cyan neon glow pulsing, futuristic light leaks, cyberpunk environment with shifting colors',
    elegant: 'refined soft gradient shifting subtly, minimal particle movement, editorial moody light with gentle transitions',
    romantic: 'soft warm light with floating petals or particles, dreamy pink and gold tones drifting, intimate atmosphere',
    youtube: 'dynamic energetic motion with bold color transitions, attention-grabbing light effects, cinematic sweep',
    clean: 'minimal soft gradient slowly breathing, subtle vignette movement, calm and spacious atmospheric shift',
  };

  const moodKey = mood.toLowerCase();
  const moodMotion = moodMotions[moodKey] ?? moodMotions.premium;

  return `Generate a smooth cinematic animated background video for a Brazilian music single release.

VISUAL DIRECTION: ${moodMotion}

COLOR PALETTE: dominant ${dominant}, supporting ${palette}

CRITICAL RULES:
- This is an IMAGE-TO-VIDEO animation: use the provided album cover image as the PRIMARY visual element
- Animate the cover art with subtle cinematic motion: slow zoom, gentle parallax, soft breathing effect
- Add atmospheric elements AROUND and BEHIND the cover (bokeh, particles, light rays)
- Keep the center area with the cover art as the focal point
- Smooth, looping-friendly motion — no abrupt cuts
- Premium quality, cinematic depth-of-field
- Vertical 9:16 format optimized for Instagram Stories/Reels
- NO text overlays, NO watermarks

${briefing ? `CONTEXT: ${briefing}` : ''}

Style: premium music promotion motion design, cinematic, editorial quality.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
