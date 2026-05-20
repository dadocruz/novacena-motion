/**
 * ORQUESTRADOR INTELIGENTE de IAs
 *
 * Distribui trabalho entre Claude / GPT / Gemini de forma otimizada
 * pra GASTAR O MÍNIMO e usar cada IA no que faz melhor:
 *
 *  TRIAGEM RÁPIDA (paleta, mood básico, faces):
 *    → Gemini Flash ($0.001/req) — barato e rápido
 *
 *  EXTRAÇÃO DETALHADA (fontes, layout, posicionamento):
 *    → GPT-4o ($0.005/req) — vision excelente
 *
 *  DECISÃO CRIATIVA FINAL (motion plan completo, raciocínio):
 *    → Claude Opus ($0.02-0.05/req) — melhor raciocínio
 *
 *  GERAÇÃO DE IMAGEM (BG, tipografia):
 *    → OpenAI gpt-image-1 ($0.04-0.06/img)
 *
 * Custo total típico (1 motion plan):
 *   - Sem orquestração (só Claude): ~$0.08-0.12
 *   - Com cascata otimizada:        ~$0.025-0.04  (60-70% economia)
 *
 * Cache em arquivo (.ai-cache/) evita pagar 2× pela mesma capa.
 */

import type { NovaCenaAsset, CoverIntelligenceResult, NovaCenaAIPlan, NovaCenaTextPlan, NovaCenaFormat } from './schemas';
import { getAIProvider } from './providerRegistry';
import { getCached, setCached } from './cache';
import { runMotionDirector } from './agents/motionDirector';

export type OrchestratorInput = {
  /** Capa do single */
  coverUrl: string;
  /** Referência de motion (PNG/JPG de outro motion design pra copiar estilo) */
  referenceUrl?: string;
  /** Análise textual da referência (se já analisada) */
  referenceAnalysis?: string;
  /** Textos do usuário */
  texts?: NovaCenaTextPlan;
  /** Briefing extra */
  briefing?: string;
  /** Formatos alvo */
  targetFormats?: NovaCenaFormat[];
  /** Força ignorar cache (default false) */
  noCache?: boolean;
};

export type OrchestratorResult = {
  visualAnalysis: CoverIntelligenceResult;
  plan: NovaCenaAIPlan;
  pipeline: PipelineStep[];
  totalCostEstimateUsd: number;
};

export type PipelineStep = {
  stage: string;
  provider: string;
  durationMs: number;
  costEstimateUsd: number;
  cached: boolean;
  ok: boolean;
};

// Estimativas de custo por chamada (em USD)
const COSTS = {
  'gemini': 0.001,    // Gemini Flash — análise visual
  'openai': 0.005,    // GPT-4o vision — extração
  'anthropic': 0.03,  // Claude Opus — decisão final
  'mock': 0,
};

/**
 * Pipeline em CASCATA: cada etapa pega o que a anterior fez.
 * Usa o provider mais barato disponível em cada etapa.
 */
export async function orchestrateMotionPlan(input: OrchestratorInput): Promise<OrchestratorResult> {
  const assets: NovaCenaAsset[] = [{ id: 'cover-1', role: 'cover', src: input.coverUrl }];
  const formats = input.targetFormats?.length ? input.targetFormats : (['story', 'square'] as NovaCenaFormat[]);
  const pipeline: PipelineStep[] = [];

  // ═══════════════════════════════════════════════════════════
  // ETAPA 1: TRIAGEM VISUAL (Gemini Flash se disponível, senão Claude)
  // ═══════════════════════════════════════════════════════════
  let visualAnalysis: CoverIntelligenceResult;
  const cacheKey1 = { coverUrl: input.coverUrl, briefing: input.briefing, stage: 'analyze' };

  if (!input.noCache) {
    const cached = await getCached<CoverIntelligenceResult>('orchestrator', 'analyze', cacheKey1);
    if (cached) {
      visualAnalysis = cached;
      pipeline.push({ stage: 'analyze', provider: 'cache', durationMs: 0, costEstimateUsd: 0, cached: true, ok: true });
    } else {
      visualAnalysis = await runAnalyzeStage(assets, input.briefing, pipeline);
      await setCached('orchestrator', 'analyze', cacheKey1, visualAnalysis);
    }
  } else {
    visualAnalysis = await runAnalyzeStage(assets, input.briefing, pipeline);
  }

  // ═══════════════════════════════════════════════════════════
  // ETAPA 2: DECISÃO CRIATIVA FINAL (Claude — único que sabe raciocinar bem)
  // ═══════════════════════════════════════════════════════════
  // Constrói briefing enriquecido COM referência se houver
  let enrichedBriefing = input.briefing ?? '';
  if (input.referenceAnalysis) {
    enrichedBriefing += `\n\n🎬 REFERÊNCIA DE MOTION ENVIADA PELO USUÁRIO:\n${input.referenceAnalysis}\n\nReplique a estética e estrutura dessa referência adaptando para a capa atual.`;
  }

  const cacheKey2 = {
    coverUrl: input.coverUrl,
    texts: input.texts,
    briefing: enrichedBriefing,
    visualAnalysis,
    targetFormats: formats,
    stage: 'plan',
  };

  let plan: NovaCenaAIPlan;
  if (!input.noCache) {
    const cached = await getCached<NovaCenaAIPlan>('orchestrator', 'plan', cacheKey2);
    if (cached) {
      plan = cached;
      pipeline.push({ stage: 'plan', provider: 'cache', durationMs: 0, costEstimateUsd: 0, cached: true, ok: true });
    } else {
      plan = await runPlanStage(assets, input.texts, formats, enrichedBriefing, visualAnalysis, pipeline);
      await setCached('orchestrator', 'plan', cacheKey2, plan);
    }
  } else {
    plan = await runPlanStage(assets, input.texts, formats, enrichedBriefing, visualAnalysis, pipeline);
  }

  const totalCost = pipeline.reduce((sum, s) => sum + s.costEstimateUsd, 0);

  return { visualAnalysis, plan, pipeline, totalCostEstimateUsd: totalCost };
}

/**
 * ETAPA 1: tenta Gemini primeiro (barato), fallback Claude/GPT.
 */
async function runAnalyzeStage(assets: NovaCenaAsset[], briefing: string | undefined, pipeline: PipelineStep[]): Promise<CoverIntelligenceResult> {
  const order: Array<'gemini' | 'openai' | 'anthropic'> = ['gemini', 'openai', 'anthropic'];

  for (const providerId of order) {
    const envOk =
      (providerId === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)) ||
      (providerId === 'openai' && process.env.OPENAI_API_KEY) ||
      (providerId === 'anthropic' && process.env.ANTHROPIC_API_KEY);
    if (!envOk) continue;

    const start = Date.now();
    try {
      const provider = getAIProvider(providerId);
      if (!provider.analyzeVisual) continue;
      const result = await provider.analyzeVisual({ assets, briefing });
      pipeline.push({
        stage: 'analyze',
        provider: providerId,
        durationMs: Date.now() - start,
        costEstimateUsd: COSTS[providerId] ?? 0,
        cached: false,
        ok: true,
      });
      return result;
    } catch (e) {
      pipeline.push({
        stage: 'analyze',
        provider: providerId,
        durationMs: Date.now() - start,
        costEstimateUsd: 0,
        cached: false,
        ok: false,
      });
      console.warn(`[Orchestrator] ${providerId} falhou na análise:`, e instanceof Error ? e.message : e);
      continue;
    }
  }
  throw new Error('Nenhum provider conseguiu analisar a capa');
}

/**
 * ETAPA 2: decisão criativa via MotionDirector (mesmo prompt rico em qualquer provider).
 * Fallback chain Claude → GPT → Gemini.
 */
async function runPlanStage(
  assets: NovaCenaAsset[],
  texts: NovaCenaTextPlan | undefined,
  formats: NovaCenaFormat[],
  briefing: string,
  visualAnalysis: CoverIntelligenceResult,
  pipeline: PipelineStep[],
): Promise<NovaCenaAIPlan> {
  const start = Date.now();
  try {
    const { plan, provider } = await runMotionDirector({
      assets,
      visualAnalysis,
      texts,
      targetFormats: formats,
      briefing,
    });
    pipeline.push({
      stage: 'plan',
      provider,
      durationMs: Date.now() - start,
      costEstimateUsd: COSTS[provider as keyof typeof COSTS] ?? 0.02,
      cached: false,
      ok: true,
    });
    return plan;
  } catch (e) {
    pipeline.push({
      stage: 'plan',
      provider: 'all-failed',
      durationMs: Date.now() - start,
      costEstimateUsd: 0,
      cached: false,
      ok: false,
    });
    throw e;
  }
}
