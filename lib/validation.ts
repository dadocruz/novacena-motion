import { z } from 'zod';

/**
 * Schemas de validação com Zod
 * Garante type-safety e runtime validation
 */

// Templates
export const TemplateIdSchema = z.enum([
  'available_now',
  'watch_youtube',
  'milestone',
  'out_now',
  'spotify_print',
  'collaborator',
]);

export const RenderFormatSchema = z.enum(['story', 'feed']);

export const QualitySchema = z.enum(['low', 'medium', 'high']);

export const PlatformNameSchema = z.enum([
  'Spotify',
  'Deezer',
  'Apple Music',
  'YouTube Music',
  'Amazon Music',
  'Tidal',
  'YouTube',
]);

export const TextTransitionSchema = z.enum([
  'mask_reveal',
  'blur_focus',
  'split_letters',
  'type_writer',
  'slide_stagger',
  'glitch_rgb',
  'scale_pop',
  'rise_clean',
]);

// Motion Config
export const MotionConfigSchema = z
  .object({
    fontHeadline: z.string().optional(),
    fontDate: z.string().optional(),
    fontCta: z.string().optional(),
    fontCta1: z.string().optional(),
    fontCta2: z.string().optional(),
    coverSize: z.number().min(1).max(2000).optional(),
    coverX: z.number().min(-1000).max(1000).optional(),
    coverY: z.number().min(-1000).max(1000).optional(),
    spinTurns: z.number().min(0).max(5).optional(),
    wiggleIntensity: z.number().min(0).max(10).optional(),
    wiggleFrequency: z.number().min(0).max(20).optional(),
    wiggleSeed: z.number().optional(),
    particlesEnabled: z.boolean().optional(),
    finalFlash: z.boolean().optional(),
    glowColor: z.string().optional(),
    speed: z.number().min(0.1).max(5).optional(),
    durationSeconds: z.number().min(5).max(120).optional(),
    background: z.record(z.string(), z.unknown()).optional(),
    transitionHeadline: TextTransitionSchema.optional(),
    transitionDate: TextTransitionSchema.optional(),
    transitionCta: TextTransitionSchema.optional(),
    transitionCta1: TextTransitionSchema.optional(),
    transitionCta2: TextTransitionSchema.optional(),
    styleHeadline: z
      .object({
        color: z.string(),
        useGradient: z.boolean().optional(),
        gradientColor1: z.string().optional(),
        gradientColor2: z.string().optional(),
      })
      .passthrough()
      .optional(),
    styleDate: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    styleCta: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    styleCta1: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    styleCta2: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    cta1InFrame: z.number().min(0).max(360).optional(),
    ctaSwapFrame: z.number().min(0).max(360).optional(),
    cta2InFrame: z.number().min(0).max(360).optional(),
    logosInFrame: z.number().min(0).max(360).optional(),
    platformLogoSize: z.number().min(1).max(500).optional(),
    platformLogoGap: z.number().min(0).max(500).optional(),
    platformLogoTintEnabled: z.boolean().optional(),
    platformLogoTintColor: z.string().optional(),
    platformLogoWiggle: z.number().min(0).max(10).optional(),
    platformLogoWiggleSpeed: z.number().min(0).max(10).optional(),
    customLogos: z.record(z.string(), z.string()).optional(),
    overlays: z
      .array(
        z.object({
          id: z.string(),
          src: z.string().optional(),
          type: z.enum(['video', 'image']).optional(),
          startSec: z.number().min(0).optional(),
          durationSec: z.number().min(0).optional(),
          opacity: z.number().min(0).max(1).optional(),
          blendMode: z.enum(['normal', 'screen', 'overlay', 'lighten', 'soft-light']).optional(),
          loopMode: z.enum(['normal', 'pingpong']).optional(),
          sourceDurationSec: z.number().min(0).optional(),
          layout: z.enum(['cover', 'element']).optional(),
          x: z.number().optional(),
          y: z.number().optional(),
          scale: z.number().min(0).max(10).optional(),
          rotate: z.number().optional(),
          entryTransition: z.enum(['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-pop', 'bounce-left']).optional(),
          entryDurationFrames: z.number().min(1).max(240).optional(),
          wigglePosition: z.number().min(0).max(300).optional(),
          wiggleRotate: z.number().min(0).max(180).optional(),
          wiggleSpeed: z.number().min(0).max(10).optional(),
          shadowBlur: z.number().min(0).max(200).optional(),
          shadowOpacity: z.number().min(0).max(1).optional(),
          shadowColor: z.string().optional(),
          outlineWidth: z.number().min(0).max(80).optional(),
          outlineColor: z.string().optional(),
          gradientEnabled: z.boolean().optional(),
          gradientFrom: z.string().optional(),
          gradientTo: z.string().optional(),
          gradientOpacity: z.number().min(0).max(1).optional(),
          tintEnabled: z.boolean().optional(),
          tintColor: z.string().optional(),
          tintOpacity: z.number().min(0).max(1).optional(),
          label: z.string().optional(),
          startFrame: z.number().optional(),
          endFrame: z.number().optional(),
        }).passthrough()
      )
      .optional(),
  })
  .passthrough();

// Media Config
export const MediaConfigSchema = z.object({
  audioFile: z.instanceof(File).optional(),
  audioPath: z.string().optional(),
  videoFile: z.instanceof(File).optional(),
  videoPath: z.string().optional(),
});

// Format Config
export const FormatConfigSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  safeArea: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

// Motion Project (Main DTO)
export const MotionProjectSchema = z.object({
  type: TemplateIdSchema,
  artistName: z.string().min(1, 'Artist name is required'),
  songTitle: z.string().min(1, 'Song title is required'),
  headline: z.string().optional(),
  cta: z.string().optional(),
  cta2: z.string().optional(),
  releaseDate: z.string().optional(),
  channelName: z.string().optional(),
  metricPrefix: z.string().optional(),
  metricNumber: z.union([z.number(), z.string()]).optional(),
  metricLabel: z.string().optional(),
  platforms: z.array(PlatformNameSchema),
  coverImage: z.string().min(1),
  media: MediaConfigSchema.optional(),
  format: FormatConfigSchema,
  motion: MotionConfigSchema.optional(),
});

// Render Job
export const RenderJobSchema = z.object({
  id: z.string(),
  template: z.string(),
  format: RenderFormatSchema,
  status: z.enum(['queued', 'rendering', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  error: z.string().optional(),
  outputPath: z.string().optional(),
});

// Preset
export const PresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  config: MotionConfigSchema,
  thumbnail: z.string().optional(),
  createdAt: z.number(),
});

// Render Request
export const RenderRequestSchema = z.object({
  project: MotionProjectSchema.pick({
    type: true,
    artistName: true,
    songTitle: true,
  }).extend({
    formats: z.array(RenderFormatSchema),
  }),
  quality: QualitySchema.optional(),
  streaming: z.boolean().optional(),
});

// Bulk Render Request
export const BulkRenderRequestSchema = z.object({
  projects: z.array(
    z.object({
      artistName: z.string(),
      songTitle: z.string(),
      templates: z.array(TemplateIdSchema),
      formats: z.array(RenderFormatSchema).optional(),
    })
  ),
  quality: QualitySchema.optional(),
});

// Types export para usar em TypeScript
export type MotionProject = z.infer<typeof MotionProjectSchema>;
export type MotionConfig = z.infer<typeof MotionConfigSchema>;
export type RenderJob = z.infer<typeof RenderJobSchema>;
export type Preset = z.infer<typeof PresetSchema>;
export type RenderRequest = z.infer<typeof RenderRequestSchema>;
export type BulkRenderRequest = z.infer<typeof BulkRenderRequestSchema>;
export type TemplateId = z.infer<typeof TemplateIdSchema>;
export type RenderFormat = z.infer<typeof RenderFormatSchema>;
export type Quality = z.infer<typeof QualitySchema>;

/**
 * Função helper: Validar e corrigir projeto
 */
export function validateProject(data: unknown): MotionProject {
  return MotionProjectSchema.parse(data);
}

/**
 * Função helper: Validar projeto com fallback
 */
export function validateProjectSafe(data: unknown): MotionProject | null {
  try {
    return MotionProjectSchema.parse(data);
  } catch {
    return null;
  }
}
