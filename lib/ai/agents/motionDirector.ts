/**
 * AGENTE UNIFICADO: Motion Director
 *
 * Usa o MESMO prompt rico (catálogo completo + few-shot + diretriz) com
 * QUALQUER provider (Claude / GPT-4o / Gemini). Garante que mesmo se o
 * orchestrator cair de Claude pra GPT, o resultado mantém o nível de
 * detalhe (template, fontes, transições, cores, motion completo).
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CoverIntelligenceResult, NovaCenaAIPlan, NovaCenaAsset, NovaCenaFormat, NovaCenaTextPlan } from '../schemas';
import { getStudioCatalogPrompt, AI_MOTION_PLAN_SCHEMA } from '../studioContext';
import { FEW_SHOT_EXAMPLES } from '../promptExamples';
import { CORE_DIRECTIVE } from '../coreDirective';

export type MotionDirectorInput = {
  assets: NovaCenaAsset[];
  visualAnalysis: CoverIntelligenceResult;
  texts?: NovaCenaTextPlan;
  targetFormats: NovaCenaFormat[];
  briefing?: string;
};

async function fetchImageBase64(src: string): Promise<{ base64: string; mime: string }> {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('data URL inválida');
    return { mime: m[1], base64: m[2] };
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Falha ao baixar capa: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') ?? 'image/jpeg';
  return { mime, base64: buf.toString('base64') };
}

function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('IA não retornou JSON válido');
  return JSON.parse(raw.slice(start, end + 1));
}

/** Constrói o prompt RICO compartilhado entre todos providers */
function buildMotionPrompt(input: MotionDirectorInput): string {
  return `Você é o DIRETOR DE ARTE PRINCIPAL do NovaCena Motion.

${CORE_DIRECTIVE}

═══════════════════════════════════════════════════════════════
🎯 SUA MISSÃO
═══════════════════════════════════════════════════════════════

Olhe a capa + análise visual + briefing e MONTE um motion graphic cinematográfico CRIATIVO. Escolha do catálogo abaixo:
- Template
- 5 fontes (uma pra cada elemento)
- Cover motion + size + posição
- 5 transições de texto distintas
- Cores extraídas da paleta da capa (gradientes)
- Glow + BG
- Wiggle, particles, finalFlash
- Strokes

═══════════════════════════════════════════════════════════════
📚 EXEMPLOS (estude o estilo)
═══════════════════════════════════════════════════════════════

${FEW_SHOT_EXAMPLES}

═══════════════════════════════════════════════════════════════
📋 CATÁLOGO DO STUDIO (use IDs EXATOS)
═══════════════════════════════════════════════════════════════

${getStudioCatalogPrompt()}

═══════════════════════════════════════════════════════════════
🎨 ANÁLISE VISUAL DA CAPA
═══════════════════════════════════════════════════════════════

${JSON.stringify(input.visualAnalysis, null, 2)}

═══════════════════════════════════════════════════════════════
📝 TEXTOS DO USUÁRIO
═══════════════════════════════════════════════════════════════

${JSON.stringify(input.texts ?? {}, null, 2)}

Formatos: ${input.targetFormats.join(', ')}
${input.briefing ? `\nBRIEFING:\n${input.briefing}` : ''}

═══════════════════════════════════════════════════════════════
🧠 PROCESSO (antes de retornar JSON)
═══════════════════════════════════════════════════════════════

1. Olhe a capa: que fontes? cores? mood?
2. Que IDs do catálogo CONVERSAM com essas fontes?
3. Verifique Diretriz Mestre.
4. Pergunte-se: "Designer profissional aprovaria?"

═══════════════════════════════════════════════════════════════
📤 SCHEMA OBRIGATÓRIO
═══════════════════════════════════════════════════════════════

${AI_MOTION_PLAN_SCHEMA}

NO RATIONALE: explique 3-5 escolhas e POR QUE.

Retorne APENAS o JSON. Sem texto antes/depois.`;
}

/** Adapta o resultado JSON pro schema NovaCenaAIPlan (mantém _fullMotion pro Studio aplicar) */
function adaptToAIPlan(motionPlan: any, input: MotionDirectorInput): NovaCenaAIPlan {
  return {
    templateId: motionPlan.template ?? 'available_now',
    category: 'available_now' as any,
    formats: input.targetFormats as any,
    durationSeconds: motionPlan.durationSeconds ?? 12,
    assets: input.assets,
    texts: {
      headline: motionPlan.headline,
      number: motionPlan.metricNumber,
      label: motionPlan.metricLabel,
      title: motionPlan.metricPrefix,
      cta: motionPlan.cta,
      subtitle: motionPlan.cta2,
      date: motionPlan.releaseDate,
      platform: motionPlan.platforms?.[0],
    },
    style: {
      mood: input.visualAnalysis?.mood?.[0] ?? ('neon' as any),
      primaryColor: motionPlan.motion?.glowColor?.match(/#[0-9a-fA-F]+/)?.[0] ?? input.visualAnalysis?.palette?.[0],
      backgroundColor: motionPlan.motion?.background?.bgColor ?? '#030205',
      glowIntensity: 0.8,
      textureIntensity: 0.5,
    },
    motion: {
      preset: 'custom_reference_motion',
      intensity: motionPlan.motion?.wiggleIntensity ?? 0.8,
      coverMotion: motionPlan.motion?.coverMotion ?? 'zoom_bounce',
      textMotion: motionPlan.motion?.transitionHeadline ?? 'mask_reveal',
      backgroundMotion: 'slow_zoom',
    },
    numberRenderMode: 'native_text',
    layouts: [],
    reviewChecklist: [motionPlan.rationale ?? 'Plano gerado pela IA'],
    notes: motionPlan.rationale,
    _fullMotion: motionPlan,
  } as any;
}

// ─── Implementações por provider ──────────────────────────

async function runAnthropic(input: MotionDirectorInput): Promise<NovaCenaAIPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

  const client = new Anthropic({ apiKey });
  const model = process.env.NOVACENA_CLAUDE_MODEL || 'claude-opus-4-7';
  const cover = input.assets.find((a) => a.role === 'cover');
  const imageData = cover ? await fetchImageBase64(cover.src).catch(() => null) : null;
  const prompt = buildMotionPrompt(input);

  const content: any[] = [];
  if (imageData) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageData.mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: imageData.base64,
      },
    });
  }
  content.push({ type: 'text', text: prompt });

  const msg = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [{ role: 'user', content }],
  });
  const text = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
  return adaptToAIPlan(extractJson(text), input);
}

async function runOpenAI(input: MotionDirectorInput): Promise<NovaCenaAIPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const client = new OpenAI({ apiKey });
  const model = process.env.NOVACENA_OPENAI_MODEL || 'gpt-4o';
  const cover = input.assets.find((a) => a.role === 'cover');
  const imageData = cover ? await fetchImageBase64(cover.src).catch(() => null) : null;
  const prompt = buildMotionPrompt(input);

  const content: any[] = [{ type: 'text', text: prompt }];
  if (imageData) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${imageData.mime};base64,${imageData.base64}`, detail: 'high' },
    });
  }

  const res = await client.chat.completions.create({
    model,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content }],
  });
  const text = res.choices[0]?.message?.content ?? '';
  return adaptToAIPlan(extractJson(text), input);
}

async function runGemini(input: MotionDirectorInput): Promise<NovaCenaAIPlan> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const client = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.NOVACENA_GEMINI_MODEL || 'gemini-2.0-flash';
  const model = client.getGenerativeModel({ model: modelName });
  const cover = input.assets.find((a) => a.role === 'cover');
  const prompt = buildMotionPrompt(input);

  const parts: any[] = [prompt];
  if (cover) {
    const imageData = await fetchImageBase64(cover.src).catch(() => null);
    if (imageData) {
      parts.push({ inlineData: { mimeType: imageData.mime, data: imageData.base64 } });
    }
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();
  return adaptToAIPlan(extractJson(text), input);
}

/**
 * Roda Motion Director com fallback chain (Claude → GPT → Gemini).
 */
export async function runMotionDirector(input: MotionDirectorInput, order: Array<'anthropic' | 'openai' | 'gemini'> = ['anthropic', 'openai', 'gemini']): Promise<{ plan: NovaCenaAIPlan; provider: string }> {
  for (const providerId of order) {
    const envOk =
      (providerId === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)) ||
      (providerId === 'openai' && process.env.OPENAI_API_KEY) ||
      (providerId === 'anthropic' && process.env.ANTHROPIC_API_KEY);
    if (!envOk) continue;

    try {
      let plan: NovaCenaAIPlan;
      if (providerId === 'anthropic') plan = await runAnthropic(input);
      else if (providerId === 'openai') plan = await runOpenAI(input);
      else plan = await runGemini(input);
      return { plan, provider: providerId };
    } catch (e) {
      console.warn(`[MotionDirector] ${providerId} falhou:`, e instanceof Error ? e.message : e);
      continue;
    }
  }
  throw new Error('Nenhum provider conseguiu gerar o motion plan');
}
