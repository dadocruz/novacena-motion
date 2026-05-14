/**
 * Catálogo das 18 fontes premium curadas para o NovaCena Motion.
 * Cada fonte tem nome de exibição, slug usado em CSS, categoria, e arquivo.
 *
 * As fontes são carregadas via @font-face em `app/fonts.css`.
 */

import type React from 'react';

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

export const findFont = (id: string, customFonts: FontDef[] = []): FontDef | undefined =>
  customFonts.find((f) => f.id === id) ?? FONT_CATALOG.find((f) => f.id === id);

/** Converte uma UserFont (storage) em FontDef compatível com o catálogo */
export function userFontToFontDef(uf: {
  id: string;
  label: string;
  family: string;
  filename: string;
  category: 'display' | 'sans' | 'special';
  weight: number;
}): FontDef {
  return {
    id: uf.id,
    label: uf.label,
    file: uf.filename,
    family: uf.family,
    weight: uf.weight,
    category: uf.category,
    vibe: 'Personalizada',
  };
}

// Defaults inteligentes pra cada papel no template
export const DEFAULT_FONTS = {
  headline: 'font_c929e04f15a8',
  date: 'font_55629ee80bef',
  cta: 'font_c929e04f15a8',
} as const;

// ============================================================
// HELPER PRA TEMPLATES
// ============================================================
import type { MotionConfig, TextStroke } from '../remotion/types';
import { DEFAULT_TEXT_STROKE } from '../remotion/types';

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
  customLogos?: Record<string, string>;
  strokeHeadline: TextStroke;
  strokeDate: TextStroke;
  strokeCta: TextStroke;
  textOpacity: number;
};

export function resolveMotion(
  m: MotionConfig | undefined,
  fallbackGlow = 'rgba(190, 90, 255, 0.28)'
): ResolvedMotion {
  const cfg = m ?? {};
  const durationSeconds = cfg.durationSeconds ?? 8;
  return {
    fontHeadline: findFont(cfg.fontHeadline ?? DEFAULT_FONTS.headline, cfg.customFonts ?? []) ?? FONT_CATALOG[0],
    fontDate: findFont(cfg.fontDate ?? DEFAULT_FONTS.date, cfg.customFonts ?? []) ?? FONT_CATALOG[0],
    fontCta: findFont(cfg.fontCta ?? DEFAULT_FONTS.cta, cfg.customFonts ?? []) ?? FONT_CATALOG[0],
    coverSize: cfg.coverSize ?? 510,
    spinTurns: cfg.spinTurns ?? 2,
    wiggleIntensity: cfg.wiggleIntensity ?? 1,
    particlesEnabled: cfg.particlesEnabled ?? true,
    finalFlash: cfg.finalFlash ?? true,
    glowColor: cfg.glowColor ?? fallbackGlow,
    durationSeconds,
    durationFrames: durationSeconds * 30,
    background: cfg.background ?? {},
    customLogos: cfg.customLogos,
    strokeHeadline: cfg.strokeHeadline ?? DEFAULT_TEXT_STROKE,
    strokeDate: cfg.strokeDate ?? DEFAULT_TEXT_STROKE,
    strokeCta: cfg.strokeCta ?? DEFAULT_TEXT_STROKE,
    textOpacity: cfg.textOpacity ?? 1,
  };
}

export function ff(family: string): string {
  return `'${family}', Arial, sans-serif`;
}

// ============================================================
// HELPER PRA TEXT STYLES (cor / gradiente)
// ============================================================
import type { TextStyle } from '../remotion/types';

/**
 * Estilo de cor sólida. Use isso ou GradText (não os dois).
 * Pra gradiente, use `applyGradientStyle` no span interno.
 */

/**
 * Aplica gradiente. Use num SPAN que envolve só o texto (não no container com padding).
 * O background-clip: text só funciona se o elemento "abraça" o texto.
 */
export function applyGradientStyle(style?: TextStyle): React.CSSProperties {
  if (!style?.useGradient || !style.gradientColor1 || !style.gradientColor2) {
    return {};
  }
  const angle = style.gradientAngle ?? 120;
  return {
    display: 'inline-block',
    backgroundImage: `linear-gradient(${angle}deg, ${style.gradientColor1}, ${style.gradientColor2})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };
}

/**
 * Retorna `true` se o style tem gradiente ativo (precisa wrappar em span).
 */
export function hasGradient(style?: TextStyle): boolean {
  return !!(style?.useGradient && style.gradientColor1 && style.gradientColor2);
}



export const userTextTransform = (style?: any, animStyle?: any) => {
  const x = Number(style?.offsetX ?? 0);
  const y = Number(style?.offsetY ?? 0);
  const s = Number(style?.scale ?? 1);

  const animTransform =
    typeof animStyle?.transform === 'string'
      ? animStyle.transform
      : '';

  if (x === 0 && y === 0 && s === 1) {
    return animTransform
      ? { transform: animTransform, transformOrigin: 'center center' }
      : {};
  }

  return {
    transform: `${animTransform} translate(${x}px, ${y}px) scale(${s})`.trim(),
    transformOrigin: 'center center',
  };
};

export const applyTextStyle = (style?: any) => {
  if (!style) return {};

  const out: Record<string, any> = {};

  if (style.color) out.color = style.color;
  if (style.opacity !== undefined) out.opacity = style.opacity;

  if (style.letterSpacing !== undefined) {
    out.letterSpacing =
      typeof style.letterSpacing === 'number'
        ? `${style.letterSpacing}px`
        : style.letterSpacing;
  }

  if (style.lineHeight !== undefined) {
    out.lineHeight = style.lineHeight;
  }

  if (style.fontFamily) {
    out.fontFamily = `'${style.fontFamily}', Arial, sans-serif`;
  }

  // BRILHO / SOMBRA EXTERNA
  const glowColor =
    style.glowColor ||
    style.shadowColor ||
    style.outerGlowColor ||
    style.textShadowColor ||
    style.brightnessColor ||
    style.neonColor;

  const glow =
    style.glow ??
    style.shadow ??
    style.outerGlow ??
    style.textGlow ??
    style.brightness ??
    style.neon ??
    0;

  const glowOpacity =
    style.glowOpacity ??
    style.shadowOpacity ??
    style.outerGlowOpacity ??
    1;

  if (glowColor && Number(glow) > 0) {
    const g = Number(glow);
    out.textShadow = [
      `0 0 ${Math.max(2, g * 0.45)}px ${glowColor}`,
      `0 0 ${Math.max(6, g * 0.9)}px ${glowColor}`,
      `0 0 ${Math.max(12, g * 1.6)}px ${glowColor}`,
    ].join(', ');
    out.filter = `drop-shadow(0 0 ${Math.max(2, g * 0.7)}px ${glowColor})`;
    out.opacity = out.opacity ?? glowOpacity;
  }

  // BRILHO / CONTORNO INTERNO OU BORDA DE TEXTO
  const strokeColor =
    style.strokeColor ||
    style.innerGlowColor ||
    style.innerColor ||
    style.contourColor ||
    style.outlineColor;

  const strokeWidth =
    style.strokeWidth ??
    style.innerGlow ??
    style.innerGlowWidth ??
    style.contourWidth ??
    style.outlineWidth ??
    0;

  if (strokeColor && Number(strokeWidth) > 0) {
    const w = Number(strokeWidth);
    out.WebkitTextStroke = `${w}px ${strokeColor}`;
    out.textShadow = out.textShadow
      ? `${out.textShadow}, 0 0 ${Math.max(2, w * 2)}px ${strokeColor}`
      : `0 0 ${Math.max(2, w * 2)}px ${strokeColor}`;
  }

  // Se o painel salvar shadow diretamente, respeita também.
  if (style.textShadow) {
    out.textShadow = style.textShadow;
  }

  if (style.filter) {
    out.filter = style.filter;
  }

  return out;
};

