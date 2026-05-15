import type { NovaCenaAsset, NovaCenaAIPlan, NovaCenaFormat, NovaCenaTextPlan } from './schemas';
import type { CoverIntelligenceResult } from './schemas';
import { getAIProvider, type ProviderId } from './providerRegistry';

export async function generateMotionPlanWithAI(params: {
  providerId?: ProviderId;
  visualAnalysis?: CoverIntelligenceResult;
  assets: NovaCenaAsset[];
  texts?: NovaCenaTextPlan;
  targetFormats: NovaCenaFormat[];
  briefing?: string;
}): Promise<NovaCenaAIPlan> {
  const provider = getAIProvider(params.providerId ?? 'mock');

  if (!provider.generatePlan) {
    throw new Error(`Provider ${provider.label} não suporta generatePlan.`);
  }

  return provider.generatePlan({
    visualAnalysis: params.visualAnalysis,
    assets: params.assets,
    texts: params.texts,
    targetFormats: params.targetFormats,
    briefing: params.briefing,
  });
}
