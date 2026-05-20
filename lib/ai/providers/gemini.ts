import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AnalyzeVisualInput, GeneratePlanInput } from './types';
import type { CoverIntelligenceResult, NovaCenaAIPlan } from '../schemas';

/**
 * Provider Gemini — Google Gemini 1.5 Flash é MUITO barato e rápido, ótimo pra alta volume.
 * Gemini Pro é melhor pra criatividade.
 *
 * Env vars:
 *  - GOOGLE_AI_API_KEY (obrigatória)
 *  - NOVACENA_GEMINI_MODEL (default: 'gemini-1.5-flash')
 */
export function createGeminiProvider(): AIProvider {
  // Aceita os 2 nomes mais comuns
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

  function extractJson(text: string): any {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Gemini não retornou JSON válido');
    return JSON.parse(raw.slice(start, end + 1));
  }

  return {
    id: 'gemini',
    label: 'Gemini (Google)',

    async analyzeVisual(input: AnalyzeVisualInput): Promise<CoverIntelligenceResult> {
      const cover = input.assets.find((a) => a.role === 'cover');
      if (!cover) throw new Error('Capa não encontrada nos assets');

      const model = client.getGenerativeModel({ model: modelName });
      const imagePart = await fetchImagePart(cover.src);

      const prompt = `Analise esta capa de single brasileiro e retorne SOMENTE JSON válido:
{
  "palette": ["#hex","#hex","#hex","#hex"],
  "dominantColors": ["#hex","#hex"],
  "mood": ["neon"|"elegant"|"gospel"|"youtube"|"premium"|"sertanejo"|"romantic"|"stage"|"clean"],
  "fontMood": "string",
  "suggestedFonts": ["string","string","string"],
  "contrastLevel": "low"|"medium"|"high",
  "hasFaces": bool,
  "faceSafetyNotes": "string",
  "compositionNotes": "string",
  "designBrief": "string"
}
${input.briefing ? `Briefing: ${input.briefing}` : ''}
Retorne SOMENTE o JSON.`;

      const result = await model.generateContent([prompt, imagePart]);
      return extractJson(result.response.text()) as CoverIntelligenceResult;
    },

    async generatePlan(input: GeneratePlanInput): Promise<NovaCenaAIPlan> {
      const model = client.getGenerativeModel({ model: modelName });

      const prompt = `Gere plano de motion graphics em JSON. Schema:
{
  "templateId": "available_now"|"watch_youtube"|"milestone"|"out_now"|"spotify_print",
  "category": "spotify_milestone"|"available_now"|"pre_save"|"youtube_watch",
  "formats": ${JSON.stringify(input.targetFormats.length > 0 ? input.targetFormats : ['story', 'square'])},
  "durationSeconds": 8-15,
  "texts": {"headline","title","subtitle","date","cta","number","label","platform"},
  "style": {"mood","primaryColor"#hex,"secondaryColor","backgroundColor","fontMood","suggestedFonts":[],"glowIntensity":0-1,"textureIntensity":0-1},
  "motion": {"preset","intensity":0.5-1,"coverMotion","textMotion","backgroundMotion"},
  "numberRenderMode": "native_text",
  "layouts": [],
  "reviewChecklist": ["3 strings"],
  "notes": "string"
}

ANÁLISE: ${JSON.stringify(input.visualAnalysis ?? {})}
TEXTOS: ${JSON.stringify(input.texts ?? {})}
${input.briefing ? `BRIEFING: ${input.briefing}` : ''}
Retorne SOMENTE o JSON.`;

      const result = await model.generateContent(prompt);
      const plan = extractJson(result.response.text()) as NovaCenaAIPlan;
      plan.assets = input.assets;
      return plan;
    },
  };
}
