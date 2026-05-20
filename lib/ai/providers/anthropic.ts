import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AnalyzeVisualInput, GeneratePlanInput } from './types';
import type { CoverIntelligenceResult, NovaCenaAIPlan } from '../schemas';
import { getStudioCatalogPrompt, AI_MOTION_PLAN_SCHEMA } from '../studioContext';
import { FEW_SHOT_EXAMPLES } from '../promptExamples';
import { CORE_DIRECTIVE } from '../coreDirective';

/**
 * Provider Claude — usa Claude Sonnet com vision pra DIRIGIR motion graphics
 * a partir da capa. Faz escolhas reais (fontes, transições, cores, layout)
 * com base no catálogo real do Studio NovaCena.
 */
export function createAnthropicProvider(): AIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no .env');

  const client = new Anthropic({ apiKey });
  // Default = Opus 4.7 (mais inteligente, melhor raciocínio criativo)
  const model = process.env.NOVACENA_CLAUDE_MODEL || 'claude-opus-4-7';

  async function callClaude(prompt: string, imageBase64?: string, mimeType?: string, maxTokens = 8000) {
    const content: any[] = [];
    if (imageBase64 && mimeType) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: imageBase64 },
      });
    }
    content.push({ type: 'text', text: prompt });

    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    });
    return msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');
  }

  function extractJson(text: string): any {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Claude não retornou JSON válido');
    return JSON.parse(raw.slice(start, end + 1));
  }

  async function fetchImageAsBase64(src: string): Promise<{ base64: string; mime: string }> {
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

  return {
    id: 'anthropic',
    label: 'Claude (Anthropic)',

    async analyzeVisual(input: AnalyzeVisualInput): Promise<CoverIntelligenceResult> {
      const cover = input.assets.find((a) => a.role === 'cover');
      if (!cover) throw new Error('Capa não encontrada nos assets');

      const { base64, mime } = await fetchImageAsBase64(cover.src);

      const prompt = `Você é o diretor de arte do NovaCena Motion. Analise a capa com olho de DESIGNER.

Quero que você OLHE COM ATENÇÃO e identifique:
1. As FONTES usadas (logo, título, subtítulo) — são serif? sans? condensed/expanded? italic? texturizadas/desenhadas à mão? bold/light?
2. A paleta — quais são as 4 cores principais? Em ordem de dominância?
3. O MOOD geral — sertanejo? trap/urban? gospel/etéreo? pop vibrante? indie minimalista? rock pesado? funk neon?
4. A vibe — clean ou agressiva? premium ou jovem? quente ou fria? cinematográfica ou comercial?
5. O CONTEXTO — é capa de lançamento? milestone? clipe?

Retorne JSON com esses dados detalhados:
{
  "palette": ["#hex","#hex","#hex","#hex"],
  "dominantColors": ["#hex","#hex"],
  "mood": ["sertanejo"|"trap"|"gospel"|"pop"|"indie"|"rock"|"funk"|"eletronica"|"premium"|"stage"|"clean"|"neon"|"elegant"|"romantic"|"youtube"],
  "fontMood": "DESCRIÇÃO DETALHADA das fontes vistas (ex: 'serif clássico dourado bold + sans condensado fino')",
  "suggestedFonts": ["nome de fonte similar 1","nome 2","nome 3"],
  "contrastLevel": "low"|"medium"|"high",
  "hasFaces": true|false,
  "faceSafetyNotes": "string",
  "compositionNotes": "DESCRIÇÃO RICA em PT (cover central? rosto? texto? iluminação?)",
  "designBrief": "2-3 frases em PT explicando o que o motion deveria comunicar baseado nessa capa específica"
}

${input.briefing ? `Briefing: ${input.briefing}` : ''}

CRÍTICO: descreva o que VÊ na capa, não generalize. Se as fontes da capa são serif elegante, fale isso. Se as cores dominantes são quentes/dourado, fale isso.

Retorne APENAS o JSON.`;

      const text = await callClaude(prompt, base64, mime, 2500);
      return extractJson(text) as CoverIntelligenceResult;
    },

    async generatePlan(input: GeneratePlanInput): Promise<NovaCenaAIPlan> {
      const visual = input.visualAnalysis;
      const texts = input.texts ?? {};
      const formats = input.targetFormats.length > 0 ? input.targetFormats : ['story', 'square'];

      // Re-baixa a capa pra dar contexto visual junto com o plan
      const cover = input.assets.find((a) => a.role === 'cover');
      const imageData = cover ? await fetchImageAsBase64(cover.src).catch(() => null) : null;

      const catalog = getStudioCatalogPrompt();

      const prompt = `Você é o DIRETOR DE ARTE PRINCIPAL do NovaCena Motion — ferramenta de motion graphics premium pra artistas brasileiros.

${CORE_DIRECTIVE}

═══════════════════════════════════════════════════════════════
🎯 SUA MISSÃO
═══════════════════════════════════════════════════════════════

A partir da capa + análise visual + briefing, MONTE um motion graphic CINEMATOGRÁFICO completo (não genérico, não agressivo por default — siga a Diretriz Mestre acima) escolhendo:
- Template apropriado (available_now / milestone / out_now / watch_youtube / spotify_print)
- 5 fontes diferentes (uma pra cada elemento: headline, date, cta, cta1, cta2)
- Cover motion que COMBINE com o mood
- 5 transições de texto diferentes (uma pra cada elemento)
- Cores ESPECÍFICAS extraídas da paleta da capa (não cores genéricas)
- Gradientes nos textos pra dar destaque (apenas se a capa pede — não em indie)
- Glow color extraído da capa (versão rgba da primaryColor)
- Background color (versão escura da paleta, nunca #000000 puro)
- Wiggle, particles, finalFlash, spinTurns SEGUINDO as regras de mood
- Strokes (contornos) quando reforçam o mood (trap/funk/milestone)

═══════════════════════════════════════════════════════════════
📚 EXEMPLOS DE DECISÕES CRIATIVAS (estude o estilo)
═══════════════════════════════════════════════════════════════

${FEW_SHOT_EXAMPLES}

═══════════════════════════════════════════════════════════════
📋 CATÁLOGO DO STUDIO (use IDs EXATOS — não invente nomes)
═══════════════════════════════════════════════════════════════

${catalog}

═══════════════════════════════════════════════════════════════
🎨 ANÁLISE VISUAL DA CAPA ATUAL
═══════════════════════════════════════════════════════════════

${JSON.stringify(visual ?? {}, null, 2)}

═══════════════════════════════════════════════════════════════
📝 TEXTOS DO USUÁRIO (mantenha se vierem bons, melhore se forem fracos)
═══════════════════════════════════════════════════════════════

${JSON.stringify(texts, null, 2)}

Formatos alvo: ${formats.join(', ')}
${input.briefing ? `Briefing: ${input.briefing}` : ''}

═══════════════════════════════════════════════════════════════
🧠 PROCESSO MENTAL (faça antes de retornar JSON)
═══════════════════════════════════════════════════════════════

ETAPA 1 — Olhe a capa:
  • Que fontes a capa USA? (serif/sans/condensado/expandido/decorativo)
  • Que cores dominam? (extraia 3-4 hex)
  • Tem acabamento metálico/dourado? Brilho? Profundidade 3D?
  • Mood: sertanejo premium? trap urbano? gospel etéreo? indie minimal?

ETAPA 2 — Mapeie pra catálogo:
  • Fontes da capa → quais do catálogo CONVERSAM esteticamente?
  • Cores → qual escolher como primary? Qual gradient combina?
  • Mood → qual coverMotion / transições / particles / flash?

ETAPA 3 — Verifique a Diretriz Mestre:
  • Tom cinematográfico ou agressivo? (segue mood do passo 1)
  • Sem tremor exagerado? Sem efeitos poluentes?
  • Particles e flash usados COM critério?
  • Headline preservou texto do user OU melhorou com cópia genérica em PT?
  • cta2 "EM TODAS AS PLATAFORMAS DIGITAIS" em UMA linha?

ETAPA 4 — Antes de finalizar, pergunte-se:
  "Se Dado (designer profissional brasileiro) visse esse motion, ele aprovaria?
   Ou diria 'genérico, sem alma, parece template clichê'?"
   Se a resposta é a segunda, RECOMECE.

═══════════════════════════════════════════════════════════════
📤 SCHEMA DE RETORNO
═══════════════════════════════════════════════════════════════

${AI_MOTION_PLAN_SCHEMA}

NO RATIONALE: explique 3-5 escolhas específicas suas e POR QUE.

Retorne APENAS o JSON. Sem prefácio, sem markdown, sem comentário.`;

      const text = imageData
        ? await callClaude(prompt, imageData.base64, imageData.mime, 8000)
        : await callClaude(prompt, undefined, undefined, 8000);
      const motionPlan = extractJson(text);

      // Adapta pro schema NovaCenaAIPlan (legado) — guarda o motion completo
      return {
        templateId: motionPlan.template ?? 'available_now',
        category: 'available_now' as any,
        formats: formats as any,
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
          mood: visual?.mood?.[0] ?? ('neon' as any),
          primaryColor: motionPlan.motion?.glowColor?.match(/#[0-9a-fA-F]+/)?.[0] ?? visual?.palette?.[0],
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
        // PAYLOAD COMPLETO do motion — vai pra UI aplicar
        _fullMotion: motionPlan,
      } as any;
    },
  };
}
