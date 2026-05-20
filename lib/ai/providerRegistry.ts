import type { AIProvider } from './providers/types';
import { mockNovaCenaProvider } from './providers/mock';
import { createCustomHttpProvider } from './providers/custom-http';
import { createAnthropicProvider } from './providers/anthropic';
import { createOpenAIProvider } from './providers/openai';
import { createGeminiProvider } from './providers/gemini';

export type ProviderId =
  | 'mock'
  | 'custom-http'
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'auto';

/** Retorna um provider específico ou lança erro se a env var estiver faltando. */
export function getAIProvider(providerId: ProviderId): AIProvider {
  if (providerId === 'mock') return mockNovaCenaProvider;

  if (providerId === 'anthropic') return createAnthropicProvider();
  if (providerId === 'openai') return createOpenAIProvider();
  if (providerId === 'gemini') return createGeminiProvider();

  if (providerId === 'custom-http') {
    const endpoint = process.env.NOVACENA_CUSTOM_AI_ENDPOINT;
    if (!endpoint) throw new Error('NOVACENA_CUSTOM_AI_ENDPOINT não configurado.');
    return createCustomHttpProvider({
      endpoint,
      apiKey: process.env.NOVACENA_CUSTOM_AI_KEY,
    });
  }

  if (providerId === 'auto') return getAutoProvider();
  return mockNovaCenaProvider;
}

/**
 * Auto provider — escolhe automaticamente o melhor provider disponível.
 * Ordem de preferência:
 *   1. Anthropic Claude (melhor pra criatividade + raciocínio)
 *   2. OpenAI GPT-4o (excelente vision + barato)
 *   3. Gemini Flash (mais barato, rápido)
 *   4. Mock (fallback final pra dev)
 */
export function getAutoProvider(): AIProvider {
  // Monta lista de IDs disponíveis (com env var setada)
  const availableIds: ProviderId[] = [];
  if (process.env.ANTHROPIC_API_KEY) availableIds.push('anthropic');
  if (process.env.OPENAI_API_KEY) availableIds.push('openai');
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) availableIds.push('gemini');

  if (availableIds.length === 0) return mockNovaCenaProvider;
  if (availableIds.length === 1) return getAIProvider(availableIds[0]);

  // 2+ providers: usa fallback chain — se Claude der erro (créditos, 429, 500),
  // tenta GPT. Se GPT der erro, tenta Gemini. Garante alta disponibilidade.
  return createFallbackProvider(availableIds);
}

/**
 * Fallback wrapper — chama um array de providers em ordem, retorna o primeiro que funcionar.
 * Útil pra alta disponibilidade: se Claude estiver com 429/500, tenta GPT, depois Gemini.
 */
export function createFallbackProvider(providerIds: ProviderId[]): AIProvider {
  const providers = providerIds.map((id) => {
    try {
      return getAIProvider(id);
    } catch {
      return null;
    }
  }).filter((p): p is AIProvider => p !== null);

  if (providers.length === 0) return mockNovaCenaProvider;
  if (providers.length === 1) return providers[0];

  return {
    id: 'fallback',
    label: `Fallback chain (${providers.map((p) => p.id).join(' → ')})`,

    async analyzeVisual(input) {
      let lastErr: unknown;
      for (const p of providers) {
        if (!p.analyzeVisual) continue;
        try {
          return await p.analyzeVisual(input);
        } catch (e) {
          lastErr = e;
          console.warn(`[AI] ${p.id} falhou no analyzeVisual:`, e instanceof Error ? e.message : e);
        }
      }
      throw lastErr ?? new Error('Todos os providers falharam no analyzeVisual');
    },

    async generatePlan(input) {
      let lastErr: unknown;
      for (const p of providers) {
        if (!p.generatePlan) continue;
        try {
          return await p.generatePlan(input);
        } catch (e) {
          lastErr = e;
          console.warn(`[AI] ${p.id} falhou no generatePlan:`, e instanceof Error ? e.message : e);
        }
      }
      throw lastErr ?? new Error('Todos os providers falharam no generatePlan');
    },
  };
}

/** Lista providers que têm env vars configuradas */
export function listAvailableProviders(): { id: ProviderId; label: string; available: boolean }[] {
  return [
    { id: 'anthropic', label: 'Claude (Anthropic)', available: !!process.env.ANTHROPIC_API_KEY },
    { id: 'openai', label: 'GPT-4o (OpenAI)', available: !!process.env.OPENAI_API_KEY },
    { id: 'gemini', label: 'Gemini (Google)', available: !!(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY) },
    { id: 'mock', label: 'Mock (dev)', available: true },
  ];
}
