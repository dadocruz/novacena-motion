import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import type { CoverIntelligenceResult } from '../schemas';

/**
 * AGENTE: BG Generator
 *
 * Recebe a análise visual da capa + briefing criativo e gera um background
 * vertical 1024×1536 (próximo de 9:16) via OpenAI gpt-image-1.
 *
 * Salva em public/uploads/ai-backgrounds/ e retorna o path acessível.
 *
 * Custo aproximado: $0.063 por imagem (high quality 1024×1536)
 */

export type BgGenerationInput = {
  /** Análise visual da capa (do Visual Analyst) */
  visual: CoverIntelligenceResult;
  /** Briefing extra do user (opcional) */
  briefing?: string;
  /** Mood específico se quiser sobrescrever */
  moodOverride?: string;
  /** Quality: low (~$0.02), medium (~$0.04), high (~$0.063) */
  quality?: 'low' | 'medium' | 'high';
};

export type BgGenerationResult = {
  url: string; // path absoluto que o Studio pode usar
  filename: string;
  promptUsed: string;
  costEstimateUsd: number;
};

const QUALITY_COSTS: Record<string, number> = {
  low: 0.011,
  medium: 0.042,
  high: 0.063,
};

/**
 * Gera o BG. Salva em public/uploads/ai-backgrounds/ e retorna URL.
 */
export async function generateBackground(input: BgGenerationInput): Promise<BgGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada — BG generator usa OpenAI gpt-image-1');

  const client = new OpenAI({ apiKey });
  const v = input.visual;
  const mood = input.moodOverride ?? (v.mood?.[0] ?? 'premium');

  // Constrói prompt cinematográfico baseado na análise da capa
  const prompt = buildBgPrompt(v, mood, input.briefing);

  const quality = input.quality ?? 'medium';

  // Chama OpenAI gpt-image-1
  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',          // vertical, próximo de 9:16
    quality,
    n: 1,
  });

  const imageData = response.data?.[0];
  if (!imageData) throw new Error('OpenAI não retornou imagem');

  // gpt-image-1 retorna base64 (não URL)
  const base64 = imageData.b64_json;
  if (!base64) throw new Error('OpenAI retornou sem dados de imagem');

  // Salva no public/uploads/ai-backgrounds/
  const filename = `bg-${Date.now()}-${randomBytes(4).toString('hex')}.png`;
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'ai-backgrounds', filename);
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));

  return {
    url: `/api/uploads/ai-backgrounds/${filename}`,
    filename,
    promptUsed: prompt,
    costEstimateUsd: QUALITY_COSTS[quality] ?? 0.042,
  };
}

/**
 * Constrói o prompt cinematográfico pra gerar o BG.
 * Inspirado nas direções premium do NovaCena (sem objetos no centro,
 * estética cinematográfica, paleta da capa).
 */
function buildBgPrompt(visual: CoverIntelligenceResult, mood: string, briefing?: string): string {
  const palette = visual.palette?.slice(0, 3).join(', ') ?? '#0a0a14, #1a1a2a, #3a2a4a';
  const dominant = visual.dominantColors?.[0] ?? visual.palette?.[0] ?? '#1a1a2a';

  const moodStyles: Record<string, string> = {
    sertanejo: 'cinematic concert stage with warm bokeh lights, golden amber spotlight haze, dark velvet curtains in soft focus, rural premium atmosphere, hint of stage smoke',
    trap: 'urban neon environment with glowing purple and cyan lights, futuristic glassy reflections, dark wet asphalt vibe, light beams cutting through, cyberpunk aesthetic',
    gospel: 'ethereal heavenly light rays from above, soft cloud-like mist, golden warm glow, divine atmosphere, dust particles floating in beams of light, peaceful',
    pop: 'vibrant gradient backdrop with soft bokeh dots, energetic colorful lighting, glossy modern feel, depth with multiple light sources',
    indie: 'minimalist warm cinematic background, soft film grain, muted neutral palette, dreamy out-of-focus, vintage editorial vibe',
    rock: 'dark moody concert hall with red dramatic spotlights, smoke and atmospheric haze, gritty texture, intense atmosphere',
    funk: 'vibrant party atmosphere with orange and yellow neon, disco-like bokeh, energetic and warm, club lighting',
    eletronica: 'futuristic geometric environment with blue and cyan light beams, holographic reflections, clean modern depth',
    premium: 'sophisticated cinematic environment with golden particle haze, deep navy backdrop, soft spotlight, luxurious feel',
    stage: 'concert stage with dramatic side spotlights, atmospheric haze, audience silhouettes in deep background',
    neon: 'glowing neon environment with electric purple and cyan, light leaks, sci-fi aesthetic',
    elegant: 'editorial moody backdrop with soft gradient and subtle texture, refined cinematic feel',
    clean: 'minimal soft gradient background, subtle vignette, breathable space',
  };

  const moodKey = mood.toLowerCase();
  const moodStyle = moodStyles[moodKey] ?? moodStyles.premium;

  return `Vertical 9:16 cinematic background for a Brazilian music single release motion graphic. ${moodStyle}.

PALETTE: dominant ${dominant}, supporting tones ${palette}.

CRITICAL CONSTRAINTS:
- CENTER 60% of frame must be visually open/empty (low contrast, soft) — a square album cover will be placed there
- Background should frame and enhance, not compete
- NO text, NO logos, NO faces, NO objects in center
- NO solid colors only — must have depth, bokeh, light interplay
- Cinematic depth-of-field, subtle film grain
- Match the aesthetic of premium music release motion designs (think Brazu Motion / cinematic teaser style)

${briefing ? `EXTRA CONTEXT: ${briefing}` : ''}

Style: photorealistic cinematic, premium quality, magazine-grade lighting, vertical aspect ratio.`;
}
