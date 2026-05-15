import type { AIProvider } from './providers/types';
import { mockNovaCenaProvider } from './providers/mock';
import { createCustomHttpProvider } from './providers/custom-http';

export type ProviderId = 'mock' | 'custom-http';

export function getAIProvider(providerId: ProviderId): AIProvider {
  if (providerId === 'mock') return mockNovaCenaProvider;

  if (providerId === 'custom-http') {
    const endpoint = process.env.NOVACENA_CUSTOM_AI_ENDPOINT;
    if (!endpoint) {
      throw new Error('NOVACENA_CUSTOM_AI_ENDPOINT não configurado.');
    }

    return createCustomHttpProvider({
      endpoint,
      apiKey: process.env.NOVACENA_CUSTOM_AI_KEY,
    });
  }

  return mockNovaCenaProvider;
}
