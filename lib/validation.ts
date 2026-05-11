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
  'collaborator',
]);

export const RenderFormatSchema = z.enum(['story', 'feed']);

export const QualitySchema = z.enum(['low', 'medium', 'high']);

export const PlatformNameSchema = z.enum([
  'Spotify',
  'Deezer',
  'Apple Music',
  'YouTube Music',
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
    coverSize: z.number().min(0.1).max(2).optional(),
    spinTurns: z.number().min(0).max(5).optional(),
    wiggleIntensity: z.number().min(0.5).max(2).optional(),
    particlesEnabled: z.boolean().optional(),
    finalFlash: z.boolean().optional(),
    glowColor: z.string().optional(),
    speed: z.number().min(0.5).max(2).optional(),
    durationSeconds: z.number().min(5).max(120).optional(),
    background: z
      .object({
        overlay: z.number().min(0).max(1),
        blur: z.number().min(0).max(20),
      })
      .optional(),
    transitionHeadline: TextTransitionSchema.optional(),
    transitionDate: TextTransitionSchema.optional(),
    transitionCta: TextTransitionSchema.optional(),
    styleHeadline: z
      .object({
        color: z.string(),
        useGradient: z.boolean().optional(),
        gradientColor1: z.string().optional(),
        gradientColor2: z.string().optional(),
      })
      .optional(),
    styleDate: z.string().optional(),
    styleCta: z.string().optional(),
    cta1InFrame: z.number().min(0).max(360).optional(),
    ctaSwapFrame: z.number().min(0).max(360).optional(),
    cta2InFrame: z.number().min(0).max(360).optional(),
    logosInFrame: z.number().min(0).max(360).optional(),
    customLogos: z.record(z.string()).optional(),
    overlays: z
      .array(
        z.object({
          id: z.string(),
          startFrame: z.number(),
          endFrame: z.number(),
          blendMode: z.enum(['normal', 'screen', 'overlay', 'lighten']),
        })
      )
      .optional(),
  })
  .strict();

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
  releaseDate: z.string().date().optional(),
  channelName: z.string().optional(),
  metricPrefix: z.string().optional(),
  metricNumber: z.number().optional(),
  metricLabel: z.string().optional(),
  platforms: z.array(PlatformNameSchema),
  coverImage: z.string().url().or(z.string().startsWith('data:')),
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
  } catch (error) {
    console.error('Project validation failed:', error);
    return null;
  }
}
