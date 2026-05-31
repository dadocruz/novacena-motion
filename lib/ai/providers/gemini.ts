import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { AIProvider, AnalyzeVisualInput, GeneratePlanInput } from './types';
import type { CoverIntelligenceResult, NovaCenaAIPlan } from '../schemas';

/**
 * Provider Gemini — usa responseSchema nativo para JSON garantido.
 *
 * Env vars:
 *  - GEMINI_API_KEY ou GOOGLE_AI_API_KEY (obrigatória)
 *  - NOVACENA_GEMINI_MODEL (default: 'gemini-2.0-flash')
 */

const COVER_INTELLIGENCE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    palette: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    dominantColors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    mood: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    fontMood: { type: SchemaType.STRING },
    suggestedFonts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    contrastLevel: { type: SchemaType.STRING },
    hasFaces: { type: SchemaType.BOOLEAN },
    faceSafetyNotes: { type: SchemaType.STRING },
    compositionNotes: { type: SchemaType.STRING },
    designBrief: { type: SchemaType.STRING },
  },
  required: ['palette', 'dominantColors', 'mood', 'fontMood', 'suggestedFonts', 'contrastLevel', 'compositionNotes', 'designBrief'],
} as const;

const PLAN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    templateId: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    formats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    durationSeconds: { type: SchemaType.NUMBER },
    texts: {
      type: SchemaType.OBJECT,
      properties: {
        headline: { type: SchemaType.STRING },
        title: { type: SchemaType.STRING },
        subtitle: { type: SchemaType.STRING },
        date: { type: SchemaType.STRING },
        cta: { type: SchemaType.STRING },
        handle: { type: SchemaType.STRING },
        number: { type: SchemaType.STRING },
        label: { type: SchemaType.STRING },
        platform: { type: SchemaType.STRING },
      },
    },
    style: {
      type: SchemaType.OBJECT,
      properties: {
        mood: { type: SchemaType.STRING },
        primaryColor: { type: SchemaType.STRING },
        secondaryColor: { type: SchemaType.STRING },
        backgroundColor: { type: SchemaType.STRING },
        fontMood: { type: SchemaType.STRING },
        suggestedFonts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        glowIntensity: { type: SchemaType.NUMBER },
        textureIntensity: { type: SchemaType.NUMBER },
      },
      required: ['mood', 'primaryColor'],
    },
    motion: {
      type: SchemaType.OBJECT,
      properties: {
        preset: { type: SchemaType.STRING },
        intensity: { type: SchemaType.NUMBER },
        coverMotion: { type: SchemaType.STRING },
        textMotion: { type: SchemaType.STRING },
        backgroundMotion: { type: SchemaType.STRING },
      },
      required: ['preset', 'intensity', 'coverMotion', 'textMotion', 'backgroundMotion'],
    },
    numberRenderMode: { type: SchemaType.STRING },
    reviewChecklist: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    notes: { type: SchemaType.STRING },
  },
  required: ['templateId', 'category', 'formats', 'durationSeconds', 'texts', 'style', 'motion', 'reviewChecklist'],
} as const;

export function createGeminiProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY (ou GOOGLE_AI_API_KEY) não configurada no .env');

  const client = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.NOVACENA_GEMINI_MODEL || 'gemini-2.0-flash';

  async function fetchImagePart(src: string): Promise<any> {
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

  return {
    id: 'gemini',
    label: 'Gemini (Google)',

    async analyzeVisual(input: AnalyzeVisualInput): Promise<CoverIntelligenceResult> {
      const cover = input.assets.find((a) => a.role === 'cover');
      if (!cover) throw new Error('Capa não encontrada nos assets');

      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: COVER_INTELLIGENCE_SCHEMA,
        } as any,
      });

      const imagePart = await fetchImagePart(cover.src);

      const prompt = `Analise esta capa de single brasileiro e retorne a análise visual completa.

Campos esperados:
- palette: 4 cores hex dominantes
- dominantColors: 2 cores hex mais fortes
- mood: array com moods aplicáveis (neon, elegant, gospel, youtube, premium, sertanejo, romantic, stage, clean)
- fontMood: descrição do estilo tipográfico ideal
- suggestedFonts: 3 famílias de fonte sugeridas
- contrastLevel: low, medium ou high
- hasFaces: se tem rostos visíveis
- faceSafetyNotes: observações sobre posicionamento de rosto
- compositionNotes: análise da composição visual
- designBrief: briefing criativo para motion design

${input.briefing ? `Briefing do artista: ${input.briefing}` : ''}`;

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text();
      return JSON.parse(text) as CoverIntelligenceResult;
    },

    async generatePlan(input: GeneratePlanInput): Promise<NovaCenaAIPlan> {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: PLAN_SCHEMA,
        } as any,
      });

      const prompt = `Gere um plano de motion graphics para divulgação musical brasileira.

ANÁLISE VISUAL: ${JSON.stringify(input.visualAnalysis ?? {})}
TEXTOS DISPONÍVEIS: ${JSON.stringify(input.texts ?? {})}
FORMATOS: ${JSON.stringify(input.targetFormats.length > 0 ? input.targetFormats : ['story', 'square'])}
${input.briefing ? `BRIEFING: ${input.briefing}` : ''}

Regras:
- templateId: available_now, watch_youtube, milestone, out_now, ou spotify_print
- category: spotify_milestone, available_now, pre_save, youtube_watch
- durationSeconds: entre 8 e 15
- style.mood: neon, elegant, gospel, youtube, premium, sertanejo, romantic, stage, clean
- motion.preset: spotify_milestone_neon_bounce, youtube_icons_card_reveal, available_now_slow_elegant, pre_save_platform_orbit, custom_reference_motion
- motion.intensity: 0.5 a 1.0
- motion.coverMotion: scale_bounce, parallax_float, slow_zoom, slide_up_bounce
- motion.textMotion: tracking_reveal, split_letters, bounce_in, fade_up
- motion.backgroundMotion: slow_zoom, video_loop, blur_zoom, light_sweep
- reviewChecklist: 3 itens de checagem
- texts: preencha com copy criativa em pt-BR para o contexto musical`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const plan = JSON.parse(text) as NovaCenaAIPlan;
      plan.assets = input.assets;
      plan.layouts = [];
      return plan;
    },
  };
}
