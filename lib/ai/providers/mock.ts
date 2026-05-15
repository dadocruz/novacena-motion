import type { AIProvider, AnalyzeVisualInput, GeneratePlanInput } from './types';
import type { CoverIntelligenceResult, NovaCenaAIPlan } from '../schemas';

export const mockNovaCenaProvider: AIProvider = {
  id: 'mock',
  label: 'Mock NovaCena AI',

  async analyzeVisual(input: AnalyzeVisualInput): Promise<CoverIntelligenceResult> {
    return {
      palette: ['#00F0C8', '#101020', '#2B1B4A', '#FFFFFF'],
      dominantColors: ['#00F0C8', '#101020'],
      mood: ['neon', 'stage', 'premium'],
      fontMood: 'bold condensed neon / impact display',
      suggestedFonts: ['Anton', 'Bebas Neue', 'Oswald'],
      contrastLevel: 'high',
      hasFaces: true,
      faceSafetyNotes: 'Preservar rostos dentro da capa e evitar textos sobre olhos/boca.',
      compositionNotes: 'Template de marco de plays com número gigante e capa central em motion.',
      designBrief:
        'Criar story/feed de milestone Spotify com número gigante neon, capa em destaque, fundo escuro de palco e motion com bounce/wiggle controlado.',
    };
  },

  async generatePlan(input: GeneratePlanInput): Promise<NovaCenaAIPlan> {
    const visual = input.visualAnalysis;

    return {
      templateId: 'spotify_milestone_neon',
      category: 'spotify_milestone',
      formats: input.targetFormats,
      durationSeconds: 12,
      assets: input.assets,
      texts: {
        headline: input.texts?.headline ?? 'ULTRAPASSAMOS',
        number: input.texts?.number ?? '250.000',
        label: input.texts?.label ?? 'PLAYS',
        platform: input.texts?.platform ?? 'Spotify',
        title: input.texts?.title ?? 'AH PRONTO',
      },
      style: {
        mood: 'neon',
        primaryColor: visual?.palette?.[0] ?? '#00F0C8',
        secondaryColor: visual?.palette?.[2] ?? '#2B1B4A',
        backgroundColor: '#080812',
        fontMood: visual?.fontMood ?? 'bold condensed neon',
        suggestedFonts: visual?.suggestedFonts ?? ['Anton', 'Bebas Neue'],
        glowIntensity: 0.85,
        textureIntensity: 0.55,
      },
      motion: {
        preset: 'spotify_milestone_neon_bounce',
        intensity: 0.82,
        coverMotion: 'scale_bounce',
        textMotion: 'bounce_in',
        backgroundMotion: 'slow_zoom',
      },
      numberRenderMode: 'native_text',
      layouts: [
        {
          format: 'story',
          width: 1080,
          height: 1920,
          safeZone: { top: 140, right: 70, bottom: 170, left: 70 },
          boxes: {
            logo: { x: 540, y: 250, width: 180, height: 120, anchor: 'center' },
            headline: { x: 540, y: 420, width: 820, height: 80, anchor: 'center' },
            number: { x: 540, y: 570, width: 900, height: 210, anchor: 'center' },
            label: { x: 540, y: 760, width: 700, height: 120, anchor: 'center' },
            cover: { x: 540, y: 1110, width: 650, height: 650, anchor: 'center' },
            platform: { x: 540, y: 1640, width: 220, height: 80, anchor: 'center' }
          }
        },
        {
          format: 'square',
          width: 1080,
          height: 1080,
          safeZone: { top: 70, right: 70, bottom: 70, left: 70 },
          boxes: {
            logo: { x: 540, y: 90, width: 150, height: 80, anchor: 'center' },
            headline: { x: 540, y: 185, width: 760, height: 60, anchor: 'center' },
            number: { x: 540, y: 305, width: 860, height: 170, anchor: 'center' },
            label: { x: 540, y: 455, width: 650, height: 90, anchor: 'center' },
            cover: { x: 540, y: 735, width: 460, height: 460, anchor: 'center' },
            platform: { x: 540, y: 1010, width: 180, height: 50, anchor: 'center' }
          }
        }
      ],
      reviewChecklist: [
        'Número grande está legível e impactante?',
        'Capa está preservada e sem cortes ruins?',
        'Story respeita safe zone superior e inferior?',
        'Feed 1x1 mantém a mesma força visual?',
        'Texto e plataforma aparecem com clareza?'
      ],
      notes: 'Provider mock inicial para validar o pipeline sem gastar tokens.',
    };
  },
};
