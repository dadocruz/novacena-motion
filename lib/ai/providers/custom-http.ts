import type { AIProvider, AnalyzeVisualInput, GeneratePlanInput, ReviewRenderInput } from './types';
import type { CoverIntelligenceResult, NovaCenaAIPlan } from '../schemas';

type CustomHttpProviderOptions = {
  endpoint: string;
  apiKey?: string;
};

async function postJson<T>(endpoint: string, apiKey: string | undefined, body: unknown): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Custom HTTP provider failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export function createCustomHttpProvider(options: CustomHttpProviderOptions): AIProvider {
  return {
    id: 'custom-http',
    label: 'Custom HTTP Provider',

    async analyzeVisual(input: AnalyzeVisualInput): Promise<CoverIntelligenceResult> {
      return postJson<CoverIntelligenceResult>(options.endpoint, options.apiKey, {
        task: 'analyze_visual',
        input,
      });
    },

    async generatePlan(input: GeneratePlanInput): Promise<NovaCenaAIPlan> {
      return postJson<NovaCenaAIPlan>(options.endpoint, options.apiKey, {
        task: 'generate_plan',
        input,
      });
    },

    async reviewRender(input: ReviewRenderInput) {
      return postJson(options.endpoint, options.apiKey, {
        task: 'review_render',
        input,
      });
    },
  };
}
