import type { NovaCenaAsset, CoverIntelligenceResult } from './schemas';
import { getAIProvider, type ProviderId } from './providerRegistry';

export async function analyzeCoverWithAI(params: {
  providerId?: ProviderId;
  assets: NovaCenaAsset[];
  briefing?: string;
}): Promise<CoverIntelligenceResult> {
  const provider = getAIProvider(params.providerId ?? 'mock');

  if (!provider.analyzeVisual) {
    throw new Error(`Provider ${provider.label} não suporta analyzeVisual.`);
  }

  return provider.analyzeVisual({
    assets: params.assets,
    briefing: params.briefing,
  });
}
