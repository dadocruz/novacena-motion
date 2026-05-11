/**
 * Catálogo das 18 fontes premium curadas para o NovaCena Motion.
 * Cada fonte tem nome de exibição, slug usado em CSS, categoria, e arquivo.
 *
 * As fontes são carregadas via @font-face em `app/fonts.css`.
 */

export type FontCategory = 'display' | 'sans' | 'special';

export type FontDef = {
  id: string;
  label: string;
  file: string;
  family: string; // o que vai em `font-family` do CSS
  weight: number; // peso recomendado pra preview/uso
  category: FontCategory;
  /** Dica visual pra ajudar a escolher */
  vibe: string;
  /** Texto curto de demonstração no preview */
  preview?: string;
};

export const FONT_CATALOG: FontDef[] = [
  // ─── DISPLAY (HEADLINES GIGANTES) ───────────────────────────────
  {
    id: 'tusker-super',
    label: 'Tusker Grotesk Super',
    file: 'TuskerGrotesk-8800Super.otf',
    family: 'TuskerGrotesk Super',
    weight: 900,
    category: 'display',
    vibe: 'Editorial / A24',
  },
  {
    id: 'tusker-medium',
    label: 'Tusker Grotesk Medium',
    file: 'TuskerGrotesk-6500Medium.otf',
    family: 'TuskerGrotesk Medium',
    weight: 700,
    category: 'display',
    vibe: 'Editorial / refinado',
  },
  {
    id: 'tusker-thin',
    label: 'Tusker Grotesk Thin',
    file: 'TuskerGrotesk-5500Medium.otf',
    family: 'TuskerGrotesk Thin',
    weight: 500,
    category: 'display',
    vibe: 'Editorial / leve',
  },
  {
    id: 'bebas',
    label: 'Bebas Neue',
    file: 'BebasNeue-Regular.otf',
    family: 'BebasNeue',
    weight: 400,
    category: 'display',
    vibe: 'Clássico / impacto',
  },
  {
    id: 'antonio',
    label: 'Antonio',
    file: 'Antonio-VariableFont_wght.ttf',
    family: 'Antonio',
    weight: 800,
    category: 'display',
    vibe: 'Moderno / versátil',
  },
  {
    id: 'oswald',
    label: 'Oswald',
    file: 'Oswald-VariableFont_wght.ttf',
    family: 'Oswald',
    weight: 700,
    category: 'display',
    vibe: 'Condensada elegante',
  },
  {
    id: 'burbank-big',
    label: 'Burbank Big Black',
    file: 'BurbankBig-Black.otf',
    family: 'BurbankBig',
    weight: 900,
    category: 'display',
    vibe: 'Pop / Fortnite',
  },
  {
    id: 'burbank-cond',
    label: 'Burbank Cond Bold',
    file: 'BurbankBigCond-Bold.otf',
    family: 'BurbankCond',
    weight: 700,
    category: 'display',
    vibe: 'Pop condensada',
  },
  {
    id: 'gobold',
    label: 'Gobold Extra',
    file: 'Gobold-Extra.otf',
    family: 'Gobold',
    weight: 800,
    category: 'display',
    vibe: 'Esportiva / agressiva',
  },
  {
    id: 'interstate-cond',
    label: 'Interstate Black Cond',
    file: 'Interstate-BlackCond.otf',
    family: 'InterstateBlackCond',
    weight: 900,
    category: 'display',
    vibe: 'Display / impacto',
  },
  {
    id: 'panton-black',
    label: 'Panton Black Italic Caps',
    file: 'Panton-BlackitalicCaps.otf',
    family: 'PantonBlackItalic',
    weight: 900,
    category: 'display',
    vibe: 'Itálico premium',
  },
  {
    id: 'bold-vision',
    label: 'Bold Vision',
    file: 'BoldVision-Regular.ttf',
    family: 'BoldVision',
    weight: 700,
    category: 'display',
    vibe: 'Display sofisticado',
  },

  // ─── SANS (UI / SUBS / BADGE) ───────────────────────────────────
  {
    id: 'panton',
    label: 'Panton Regular',
    file: 'Panton-Regular.otf',
    family: 'Panton',
    weight: 400,
    category: 'sans',
    vibe: 'Geometric premium',
  },
  {
    id: 'klein',
    label: 'Klein Text',
    file: 'Klein-Text.ttf',
    family: 'Klein',
    weight: 400,
    category: 'sans',
    vibe: 'Leitura moderna',
  },
  {
    id: 'coco',
    label: 'Coco Regular',
    file: 'Coco-Regular.otf',
    family: 'Coco',
    weight: 400,
    category: 'sans',
    vibe: 'Elegante neutra',
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu Medium',
    file: 'Ubuntu-Medium.ttf',
    family: 'Ubuntu',
    weight: 500,
    category: 'sans',
    vibe: 'Humana versátil',
  },

  // ─── SPECIAL (ACENTOS / ALTERNATIVOS) ───────────────────────────
  {
    id: 'authority-rounded',
    label: 'Authority Rounded',
    file: 'Authority-Rounded.ttf',
    family: 'AuthorityRounded',
    weight: 700,
    category: 'special',
    vibe: 'Arredondada / moderna',
  },
  {
    id: 'toxico',
    label: 'Toxico',
    file: 'Toxico.otf',
    family: 'Toxico',
    weight: 700,
    category: 'special',
    vibe: 'Streetwear / urbana',
  },
];

export const findFont = (id: string): FontDef | undefined =>
  FONT_CATALOG.find((f) => f.id === id);

// Defaults inteligentes pra cada papel no template
export const DEFAULT_FONTS = {
  headline: 'tusker-super',
  date: 'panton',
  cta: 'interstate-cond',
} as const;

// ============================================================
// HELPER PRA TEMPLATES
// ============================================================
import type { MotionConfig } from '../remotion/types';

export type ResolvedMotion = {
  fontHeadline: FontDef;
  fontDate: FontDef;
  fontCta: FontDef;
  coverSize: number;
  spinTurns: number;
  wiggleIntensity: number;
  particlesEnabled: boolean;
  finalFlash: boolean;
  glowColor: string;
  durationSeconds: number;
  durationFrames: number;
  background: NonNullable<MotionConfig['background']>;
};

export function resolveMotion(
  m: MotionConfig | undefined,
  fallbackGlow = 'rgba(190, 90, 255, 0.28)'
): ResolvedMotion {
  const cfg = m ?? {};
  const durationSeconds = cfg.durationSeconds ?? 8;
  return {
    fontHeadline: findFont(cfg.fontHeadline ?? DEFAULT_FONTS.headline) ?? FONT_CATALOG[0],
    fontDate: findFont(cfg.fontDate ?? DEFAULT_FONTS.date) ?? FONT_CATALOG[0],
    fontCta: findFont(cfg.fontCta ?? DEFAULT_FONTS.cta) ?? FONT_CATALOG[0],
    coverSize: cfg.coverSize ?? 510,
    spinTurns: cfg.spinTurns ?? 2,
    wiggleIntensity: cfg.wiggleIntensity ?? 1,
    particlesEnabled: cfg.particlesEnabled ?? true,
    finalFlash: cfg.finalFlash ?? true,
    glowColor: cfg.glowColor ?? fallbackGlow,
    durationSeconds,
    durationFrames: durationSeconds * 30,
    background: cfg.background ?? {},
  };
}

export function ff(family: string): string {
  return `'${family}', Arial, sans-serif`;
}
