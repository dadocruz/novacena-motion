import type { NovaCenaAsset, CoverIntelligenceResult } from './schemas';
import { getAIProvider, type ProviderId } from './providerRegistry';
import { getCached, setCached } from './cache';

export async function analyzeCoverWithAI(params: {
  providerId?: ProviderId;
  assets: NovaCenaAsset[];
  briefing?: string;
  /** Se true, ignora cache (default false). */
  noCache?: boolean;
}): Promise<CoverIntelligenceResult> {
  const providerId = params.providerId ?? 'auto';
  const provider = getAIProvider(providerId);

  if (!provider.analyzeVisual) {
    throw new Error(`Provider ${provider.label} não suporta analyzeVisual.`);
  }

  const cacheKey = { assets: params.assets, briefing: params.briefing };

  if (!params.noCache) {
    const cached = await getCached<CoverIntelligenceResult>(
      provider.id,
      'analyzeVisual',
      cacheKey,
    );
    if (cached) return cached;
  }

  const result = await provider.analyzeVisual({
    assets: params.assets,
    briefing: params.briefing,
  });

  if (!params.noCache) {
    await setCached(provider.id, 'analyzeVisual', cacheKey, result);
  }

  return result;
}
