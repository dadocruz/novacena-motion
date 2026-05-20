import OpenAI from 'openai';
import type { AIProvider, AnalyzeVisualInput, GeneratePlanInput } from './types';
import type { CoverIntelligenceResult, NovaCenaAIPlan } from '../schemas';

/**
 * Provider OpenAI — GPT-4o tem vision excelente e custa menos que Claude pra análise rápida.
 * Bom como fallback e pra alta volume.
 *
 * Env vars:
 *  - OPENAI_API_KEY (obrigatória)
 *  - NOVACENA_OPENAI_MODEL (default: 'gpt-4o')
 */
export function createOpenAIProvider(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no .env');

  const client = new OpenAI({ apiKey });
  const model = process.env.NOVACENA_OPENAI_MODEL || 'gpt-4o';

  /** Baixa imagem (URL ou data:) e converte pra data URL base64 — funciona com localhost. */
  async function toDataUrl(src: string): Promise<string> {
    if (src.startsWith('data:')) return src;
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Falha ao baixar capa: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  }

  async function callGpt(prompt: string, imageSrc?: string): Promise<string> {
    const content: any[] = [{ type: 'text', text: prompt }];
    if (imageSrc) {
      const dataUrl = await toDataUrl(imageSrc);
      content.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } });
    }
    const res = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  return {
    id: 'openai',
    label: 'GPT-4o (OpenAI)',

    async analyzeVisual(input: AnalyzeVisualInput): Promise<CoverIntelligenceResult> {
      const cover = input.assets.find((a) => a.role === 'cover');
      if (!cover) throw new Error('Capa não encontrada nos assets');

      const prompt = `Você é um diretor de arte de motion graphics pra música brasileira.
Analise a capa e retorne JSON com:
- palette (4 cores hex)
- dominantColors (2 cores hex)
- mood (array com 1-3 de: neon, elegant, gospel, youtube, premium, sertanejo, romantic, stage, clean)
- fontMood (string)
- suggestedFonts (3 nomes)
- contrastLevel (low|medium|high)
- hasFaces (bool)
- faceSafetyNotes
- compositionNotes
- designBrief

${input.briefing ? `Briefing: ${input.briefing}` : ''}`;

      const text = await callGpt(prompt, cover.src);
      return JSON.parse(text) as CoverIntelligenceResult;
    },

    async generatePlan(input: GeneratePlanInput): Promise<NovaCenaAIPlan> {
      const visual = input.visualAnalysis;
      const texts = input.texts ?? {};
      const formats = input.targetFormats.length > 0 ? input.targetFormats : ['story', 'square'];

      const prompt = `Gere plano de motion graphics em JSON com:
- templateId (available_now | watch_youtube | milestone | out_now | spotify_print)
- category (spotify_milestone | available_now | pre_save | youtube_watch)
- formats (${JSON.stringify(formats)})
- durationSeconds (8-15)
- assets (use os dados fornecidos)
- texts (headline, title, subtitle, date, cta, number, label, platform)
- style (mood, primaryColor #hex, secondaryColor, backgroundColor, fontMood, suggestedFonts, glowIntensity 0-1, textureIntensity 0-1)
- motion (preset, intensity 0.5-1, coverMotion, textMotion, backgroundMotion)
- numberRenderMode "native_text"
- layouts (array vazio é OK)
- reviewChecklist (3-5 strings)
- notes

ANÁLISE VISUAL: ${JSON.stringify(visual ?? {})}
TEXTOS: ${JSON.stringify(texts)}
${input.briefing ? `BRIEFING: ${input.briefing}` : ''}`;

      const text = await callGpt(prompt);
      const plan = JSON.parse(text) as NovaCenaAIPlan;
      // garante que assets sejam preservados
      plan.assets = input.assets;
      return plan;
    },
  };
}
