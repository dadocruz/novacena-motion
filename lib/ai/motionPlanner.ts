import type { NovaCenaAsset, NovaCenaAIPlan, NovaCenaFormat, NovaCenaTextPlan } from './schemas';
import type { CoverIntelligenceResult } from './schemas';
import { getAIProvider, type ProviderId } from './providerRegistry';
import { getCached, setCached } from './cache';

export async function generateMotionPlanWithAI(params: {
  providerId?: ProviderId;
  visualAnalysis?: CoverIntelligenceResult;
  assets: NovaCenaAsset[];
  texts?: NovaCenaTextPlan;
  targetFormats: NovaCenaFormat[];
  briefing?: string;
  noCache?: boolean;
}): Promise<NovaCenaAIPlan> {
  const providerId = params.providerId ?? 'auto';
  const provider = getAIProvider(providerId);

  if (!provider.generatePlan) {
    throw new Error(`Provider ${provider.label} não suporta generatePlan.`);
  }

  const cacheKey = {
    visualAnalysis: params.visualAnalysis,
    assets: params.assets,
    texts: params.texts,
    targetFormats: params.targetFormats,
    briefing: params.briefing,
  };

  if (!params.noCache) {
    const cached = await getCached<NovaCenaAIPlan>(provider.id, 'generatePlan', cacheKey);
    if (cached) return cached;
  }

  const result = await provider.generatePlan({
    visualAnalysis: params.visualAnalysis,
    assets: params.assets,
    texts: params.texts,
    targetFormats: params.targetFormats,
    briefing: params.briefing,
  });

  if (!params.noCache) {
    await setCached(provider.id, 'generatePlan', cacheKey, result);
  }

  return result;
}
