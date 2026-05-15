import type {
  CoverIntelligenceResult,
  NovaCenaAIPlan,
  NovaCenaAsset,
  NovaCenaFormat,
  NovaCenaTextPlan,
} from '../schemas';

export type AnalyzeVisualInput = {
  assets: NovaCenaAsset[];
  briefing?: string;
};

export type GeneratePlanInput = {
  visualAnalysis?: CoverIntelligenceResult;
  assets: NovaCenaAsset[];
  texts?: NovaCenaTextPlan;
  targetFormats: NovaCenaFormat[];
  briefing?: string;
};

export type ReviewRenderInput = {
  renderPreviewSrc: string;
  plan: NovaCenaAIPlan;
};

export type ReviewRenderOutput = {
  approved: boolean;
  score: number;
  issues: string[];
  suggestedFixes: string[];
};

export type AIProvider = {
  id: string;
  label: string;
  analyzeVisual?: (input: AnalyzeVisualInput) => Promise<CoverIntelligenceResult>;
  generatePlan?: (input: GeneratePlanInput) => Promise<NovaCenaAIPlan>;
  reviewRender?: (input: ReviewRenderInput) => Promise<ReviewRenderOutput>;
};
