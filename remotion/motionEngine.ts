/**
 * NovaCena Motion Engine
 * Helpers de animação premium para todos os templates.
 * Substitui o antigo animations.ts mas mantém compatibilidade (re-exporta o que era usado).
 */

import type React from 'react';
import { interpolate, spring } from 'remotion';
import { inertialPop, staggerProgress } from './motionEffects';
import type { TextTransitionTuning } from './types';

// ============================================================
// EASINGS PROFISSIONAIS
// ============================================================
// Curvas de animação reais usadas em motion design (After Effects/Cavalry)
// Em vez de cair sempre em spring, dá pra escolher a curva certa pra cada elemento.

export const easings = {
  // Sai suave e segura no fim — texto, fade de saída
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  // Mais dramático — entradas de headline
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  // Começa e termina suave — wiggles, idles
  inOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  // Senoidal (mais natural pra giros completos)
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  // Overshoot leve — badges, botões
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  // Elastic suave — logos
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function clampRange(value: number | undefined, min: number, max: number, fallback: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, next));
}

function resolveTuning(tuning?: TextTransitionTuning): Required<TextTransitionTuning> {
  return {
    intensity: clampRange(tuning?.intensity, 0.15, 2.4, 1),
    speed: clampRange(tuning?.speed, 0.35, 2.4, 1),
    stagger: clampRange(tuning?.stagger, 0, 2.4, 1),
  };
}

function tunedDuration(base: number, tuning: Required<TextTransitionTuning>) {
  return Math.max(3, base / tuning.speed);
}

function tunedDelay(base: number, tuning: Required<TextTransitionTuning>) {
  return Math.max(0, (base * tuning.stagger) / Math.sqrt(tuning.speed));
}

function tunedStartScale(baseDelta: number, tuning: Required<TextTransitionTuning>, min = 0.18) {
  return Math.max(min, 1 - baseDelta * tuning.intensity);
}

// Atalho: pega t linear entre dois frames e aplica uma curva
export function eased(
  frame: number,
  start: number,
  end: number,
  curve: (t: number) => number = easings.outCubic
): number {
  const t = clamp01((frame - start) / (end - start));
  return curve(t);
}

// ============================================================
// SPRING TUNADO
// ============================================================
// Os springs do projeto antigo eram OK mas previsíveis.
// Estes presets refletem timings reais de motion.

export function introSpring(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 11, stiffness: 145, mass: 0.72 },
  });
}

// Spring suave — pra elementos sutis, sem overshoot agressivo
export function softSpring(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 110, mass: 0.85 },
  });
}

// ============================================================
// TEXT REVEALS PREMIUM
// ============================================================

/**
 * Mask reveal vertical: o texto aparece como se uma "régua" subisse desbloqueando ele.
 * Combinado com blur que sai (cinemático).
 * O inset usa valores negativos nas laterais e topo pra não cortar textShadow.
 */
export function maskReveal(frame: number, start: number, duration = 22, options?: TextTransitionTuning) {
  const tuning = resolveTuning(options);
  const t = eased(frame, start, start + tunedDuration(duration, tuning), easings.outQuint);
  const reveal = (1 - t) * 100;
  const blur = (1 - t) * 11 * tuning.intensity;
  // Quando a animação completa, remove totalmente o clipPath
  // (senão a borda da máscara continua cortando o textShadow que se estende pra fora)
  const isComplete = t >= 0.999;
  return {
    clipPath: isComplete ? 'none' : `inset(-80px -80px ${reveal}% -80px)`,
    filter: `blur(${blur}px)`,
    opacity: clamp01(t * 2.2),
    transform: `translateY(${(1 - t) * 28 * tuning.intensity}px) scale(${0.96 + 0.04 * t})`,
    transformOrigin: '50% 100%',
  };
}

/**
 * textReveal: blur→focus + slide + scale + fade. Pra headlines fortes.
 */
export function textReveal(
  frame: number,
  start: number,
  options?: { duration?: number; slide?: number; scaleFrom?: number; blurAmount?: number }
) {
  const duration = options?.duration ?? 24;
  const slide = options?.slide ?? 28;
  const scaleFrom = options?.scaleFrom ?? 0.92;
  const blurAmount = options?.blurAmount ?? 12;

  const t = eased(frame, start, start + duration, easings.outQuint);
  return {
    opacity: clamp01(t * 1.4),
    transform: `translateY(${(1 - t) * slide}px) scale(${scaleFrom + (1 - scaleFrom) * t})`,
    filter: `blur(${(1 - t) * blurAmount}px)`,
  };
}

/**
 * charStagger: cada caractere entra em sequência. Devolve uma função
 * que recebe o índice do caractere e devolve o estilo daquele char.
 * Usa-se com .split('') no JSX.
 */
export function charStagger(frame: number, start: number, charDelay = 1.5) {
  return (charIndex: number) => {
    const charStart = start + charIndex * charDelay;
    const t = eased(frame, charStart, charStart + 10, easings.outCubic);
    return {
      display: 'inline-block' as const,
      opacity: t,
      transform: `translateY(${(1 - t) * 12}px) scale(${0.88 + 0.12 * t})`,
      filter: `blur(${(1 - t) * 4}px)`,
    };
  };
}

/**
 * scaleInBack: scale com overshoot suave (easeOutBack). Pra badges, ícones, botões.
 */
export function scaleInBack(frame: number, start: number, duration = 18) {
  const t = eased(frame, start, start + duration, easings.outBack);
  return {
    opacity: clamp01(eased(frame, start, start + 8, easings.outCubic)),
    transform: `scale(${0.6 + 0.4 * t})`,
  };
}

// ============================================================
// WIGGLES ORGÂNICOS
// ============================================================

/**
 * elegantWiggle: wiggle com 3 harmônicos sobrepostos (parece Perlin noise, não senoide).
 * Muito mais natural que sin() puro.
 */
export function elegantWiggle(
  frame: number,
  options?: { intensity?: number; offset?: number }
) {
  const intensity = options?.intensity ?? 1;
  const offset = options?.offset ?? 0;
  const f = frame + offset;

  const x =
    Math.sin(f * 0.041) * 3.2 +
    Math.sin(f * 0.107) * 1.4 +
    Math.sin(f * 0.231) * 0.6;
  const y =
    Math.cos(f * 0.038) * 2.8 +
    Math.cos(f * 0.119) * 1.2 +
    Math.cos(f * 0.247) * 0.5;
  const r =
    Math.sin(f * 0.029) * 0.35 + Math.sin(f * 0.083) * 0.18;

  return {
    x: x * intensity,
    y: y * intensity,
    rotate: r * intensity,
    transform: `translate(${x * intensity}px, ${y * intensity}px) rotate(${r * intensity}deg)`,
  };
}

/**
 * breathe: respiração de scale e opacity pra elementos em idle.
 */
export function breathe(frame: number, options?: { period?: number; amount?: number }) {
  const period = options?.period ?? 90; // frames pra um ciclo
  const amount = options?.amount ?? 0.018;
  const t = (Math.sin((frame / period) * Math.PI * 2) + 1) / 2;
  return 1 + t * amount;
}

/**
 * loopFloat: deriva orgânica pra elementos flutuantes (logos, ícones de fundo).
 */
export function loopFloat(frame: number, offset = 0, intensity = 1) {
  const y = Math.sin((frame + offset) * 0.048) * 14 * intensity;
  const x = Math.cos((frame + offset) * 0.035) * 7 * intensity;
  const r = Math.sin((frame + offset) * 0.024) * 2.4 * intensity;
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
}

// ============================================================
// HIT / PULSE
// ============================================================

/**
 * hitPulse: pico de intensidade (0→1→0) centrado num frame.
 * Útil pra acentos de música (drop, hit).
 */
export function hitPulse(frame: number, center: number, spread = 16) {
  return interpolate(frame, [center - spread, center, center + spread], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// ============================================================
// BIBLIOTECA DE TRANSIÇÕES DE TEXTO PROFISSIONAIS
// ============================================================
// Cada transição é identificada por um ID e expõe uma API consistente.
// `getTextTransition(id)` devolve uma função que, dado frame/start, retorna:
//   - wrapStyle: estilos aplicáveis ao container do texto
//   - perChar: função opcional pra estilizar cada caractere (split em <span/>)
// Se `perChar` for `undefined`, o texto é renderizado inteiro.

export type TextTransitionId =
  | 'mask_reveal'
  | 'blur_focus'
  | 'split_letters'
  | 'type_writer'
  | 'slide_stagger'
  | 'glitch_rgb'
  | 'scale_pop'
  | 'rise_clean';

export type TextTransitionStyle = {
  wrapStyle: React.CSSProperties;
  split?: 'char' | 'word';
  perChar?: (i: number, total: number) => React.CSSProperties;
};

type TextTransitionFn = (
  frame: number,
  start: number,
  options?: TextTransitionTuning
) => TextTransitionStyle;

/**
 * blur_focus: vem completamente desfocado e foca, com sutil scale+slide.
 * Cinematográfico, super elegante. Bom pra headlines longas.
 */
function tBlurFocus(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  const tuning = resolveTuning(options);
  const t = eased(frame, start, start + tunedDuration(26, tuning), easings.outQuint);
  const scaleFrom = tunedStartScale(0.16, tuning, 0.58);
  return {
    wrapStyle: {
      opacity: clamp01(t * 1.65),
      filter: `blur(${(1 - t) * 24 * tuning.intensity}px) brightness(${0.76 + 0.24 * t})`,
      transform: `scale(${scaleFrom + (1 - scaleFrom) * t}) translateY(${(1 - t) * 22 * tuning.intensity}px)`,
      transformOrigin: '50% 50%',
    },
  };
}

/**
 * split_letters: letras caem de cima (cada uma em momento diferente) com
 * rotação leve e blur, formando a palavra. Vibe Spotify Wrapped.
 */
function tSplitLetters(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  const tuning = resolveTuning(options);
  const scaleFrom = tunedStartScale(0.54, tuning);
  return {
    wrapStyle: {},
    split: 'char',
    perChar: (i: number, total: number) => {
      const t = staggerProgress(frame, start, i, total, {
        duration: tunedDuration(19, tuning),
        totalDelay: Math.min(42, tunedDelay(24, tuning)),
        curve: easings.outBack,
      });
      return {
        display: 'inline-block',
        opacity: clamp01(t * 1.7),
        transform: `translateY(${(1 - t) * -68 * tuning.intensity}px) rotate(${(1 - t) * -15 * tuning.intensity}deg) scale(${scaleFrom + (1 - scaleFrom) * t})`,
        filter: t >= 0.995 ? 'none' : `blur(${(1 - t) * 6 * tuning.intensity}px)`,
        transformOrigin: '50% 100%',
      };
    },
  };
}

/**
 * type_writer: digitando letra por letra. Sem cursor (cursor distrai).
 * Aparece e ganha leve overshoot. Bom pra CTAs.
 */
function tTypeWriter(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  const tuning = resolveTuning(options);
  const scaleFrom = tunedStartScale(0.54, tuning);
  return {
    wrapStyle: {},
    split: 'char',
    perChar: (i: number) => {
      const charStart = start + i * tunedDelay(1.6, tuning);
      const t = eased(frame, charStart, charStart + tunedDuration(7, tuning), easings.outBack);
      return {
        display: 'inline-block',
        opacity: t < 0.1 ? 0 : 1,
        transform: `translateY(${(1 - t) * 16 * tuning.intensity}px) scale(${scaleFrom + (1 - scaleFrom) * t})`,
        filter: t >= 0.995 ? 'none' : `blur(${(1 - t) * 2.4 * tuning.intensity}px)`,
        transformOrigin: '50% 80%',
      };
    },
  };
}

/**
 * slide_stagger: cada palavra entra de um lado alternado.
 * Vibe editorial moderna.
 */
function tSlideStagger(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  const tuning = resolveTuning(options);
  const scaleFrom = tunedStartScale(0.14, tuning, 0.5);
  return {
    wrapStyle: {},
    split: 'word',
    perChar: (i: number, total: number) => {
      const t = staggerProgress(frame, start, i, total, {
        duration: tunedDuration(20, tuning),
        totalDelay: Math.max(0, Math.min(46, tunedDelay(total * 5.06, tuning))),
        curve: easings.outQuint,
      });
      const direction = i % 2 === 0 ? -1 : 1;
      return {
        display: 'inline-block',
        opacity: clamp01(t * 1.55),
        transform: `translate(${(1 - t) * 58 * tuning.intensity * direction}px, ${(1 - t) * 18 * tuning.intensity}px) rotate(${(1 - t) * 5 * tuning.intensity * direction}deg) scale(${scaleFrom + (1 - scaleFrom) * t})`,
        filter: t >= 0.995 ? 'none' : `blur(${(1 - t) * 4 * tuning.intensity}px)`,
        transformOrigin: '50% 50%',
      };
    },
  };
}

/**
 * glitch_rgb: aparece com RGB split rápido (3 frames) depois estabiliza.
 * Forte, brutalist, urbano. Use com moderação.
 */
function tGlitchRGB(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  const tuning = resolveTuning(options);
  const t = eased(frame, start, start + tunedDuration(18, tuning), easings.outCubic);
  // Glitch ativo no início, vai diminuindo
  const glitch = (1 - t) * 10 * tuning.intensity;
  return {
    wrapStyle: {
      opacity: clamp01(t * 1.6),
      textShadow:
        glitch > 0.4
          ? `${glitch}px 0 0 rgba(255,0,80,0.92), -${glitch}px 0 0 rgba(0,255,200,0.82), 0 ${glitch * 0.4}px 0 rgba(255,255,255,0.28)`
          : undefined,
      transform: `translateY(${(1 - t) * 14 * tuning.intensity}px) skewX(${(1 - t) * -4 * tuning.intensity}deg)`,
    },
  };
}

/**
 * scale_pop: scale com overshoot. Bom pra números, badges, datas.
 */
function tScalePop(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  const tuning = resolveTuning(options);
  const base = eased(frame, start, start + tunedDuration(20, tuning), easings.outCubic);
  const scaleFrom = tunedStartScale(0.66, tuning);
  const t = inertialPop(base, { overshoot: 0.34 * tuning.intensity, waves: 1.32, decay: 2.25 });
  return {
    wrapStyle: {
      opacity: clamp01(eased(frame, start, start + tunedDuration(6, tuning), easings.outCubic) * 1.8),
      transform: `scale(${scaleFrom + (1 - scaleFrom) * t}) rotate(${(1 - base) * -2.5 * tuning.intensity}deg)`,
      filter: base >= 0.995 ? 'none' : `blur(${(1 - base) * 3.5 * tuning.intensity}px)`,
      transformOrigin: '50% 50%',
    },
  };
}

/**
 * rise_clean: simples, profissional — slide up com fade. Sem firulas.
 * Bom como default conservador.
 */
function tRiseClean(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  const tuning = resolveTuning(options);
  const t = eased(frame, start, start + tunedDuration(18, tuning), easings.outCubic);
  const scaleFrom = tunedStartScale(0.06, tuning, 0.72);
  return {
    wrapStyle: {
      opacity: clamp01(t * 1.45),
      transform: `translateY(${(1 - t) * 34 * tuning.intensity}px) scale(${scaleFrom + (1 - scaleFrom) * t})`,
      filter: t >= 0.995 ? 'none' : `blur(${(1 - t) * 3 * tuning.intensity}px)`,
      transformOrigin: '50% 100%',
    },
  };
}

/**
 * mask_reveal: usa a função maskReveal existente. Mantido pra compat.
 */
function tMaskReveal(frame: number, start: number, options?: TextTransitionTuning): TextTransitionStyle {
  return { wrapStyle: maskReveal(frame, start, 26, options) };
}

export function getTextTransition(
  id: TextTransitionId
): TextTransitionFn {
  switch (id) {
    case 'blur_focus':
      return tBlurFocus;
    case 'split_letters':
      return tSplitLetters;
    case 'type_writer':
      return tTypeWriter;
    case 'slide_stagger':
      return tSlideStagger;
    case 'glitch_rgb':
      return tGlitchRGB;
    case 'scale_pop':
      return tScalePop;
    case 'rise_clean':
      return tRiseClean;
    case 'mask_reveal':
    default:
      return tMaskReveal;
  }
}

/** Catálogo de transições com nomes pra exibir na UI */
export const TEXT_TRANSITIONS: Array<{
  id: TextTransitionId;
  label: string;
  description: string;
}> = [
  { id: 'mask_reveal', label: 'Mask Reveal', description: 'Régua sobe revelando' },
  { id: 'blur_focus', label: 'Blur Focus', description: 'Vem desfocado e foca' },
  { id: 'split_letters', label: 'Split Letters', description: 'Letras caem de cima' },
  { id: 'type_writer', label: 'Type Writer', description: 'Digita letra por letra' },
  { id: 'slide_stagger', label: 'Slide Stagger', description: 'Letras entram de lados alternados' },
  { id: 'scale_pop', label: 'Scale Pop', description: 'Cresce com overshoot' },
  { id: 'glitch_rgb', label: 'Glitch RGB', description: 'Aparece com split RGB' },
  { id: 'rise_clean', label: 'Rise Clean', description: 'Sobe limpo (default)' },
];

// ============================================================
// OVERLAY TIMELINE — instâncias posicionáveis no tempo
// ============================================================
// Cada overlay pode ser colocado em N momentos do vídeo.
// Esta função calcula a opacidade de uma instância no frame atual.

export function overlayInstanceOpacity(
  frame: number,
  startFrame: number,
  durationFrames: number,
  fadeFrames = 8
): number {
  if (frame < startFrame || frame > startFrame + durationFrames) return 0;
  const local = frame - startFrame;
  const fadeIn = Math.min(1, local / fadeFrames);
  const fadeOut = Math.min(1, (durationFrames - local) / fadeFrames);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

// ============================================================
// COMPAT — re-exportações pra não quebrar templates antigos
// ============================================================

export const fade = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export function fadeUp(frame: number, start: number, distance = 55) {
  const p = fade(frame, start, start + 18);
  return {
    opacity: p,
    transform: `translateY(${interpolate(p, [0, 1], [distance, 0])}px)`,
  };
}

export function popIn(frame: number, fps: number, delay: number, from = 0.6) {
  const p = introSpring(frame, fps, delay);
  const overshoot = Math.sin(clamp01(p) * Math.PI) * 0.035;
  return {
    opacity: interpolate(p, [0, 0.45, 1], [0, 1, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    scale: interpolate(p, [0, 1], [from, 1]) + overshoot,
  };
}

export function wiggle(frame: number, intensity = 1) {
  const w = elegantWiggle(frame, { intensity });
  return w.transform;
}

/**
 * Garante opacity mínima visível no preview (sem afetar render final).
 * Aplica em qualquer animação que tem opacity 0→1 (mask, char, scale, etc.)
 * pra evitar "texto sumindo" durante o play do Studio.
 *
 * Uso:
 *   ...previewSafeAnim(headlineMask, previewMode, showAll)
 *
 * No render real (previewMode=false), passa direto.
 * No Studio preview (previewMode=true e !showAll), força opacity mínima 0.28.
 */
export function previewSafeAnim<T extends { opacity?: number }>(
  anim: T,
  previewMode = false,
  showAll = false
): T {
  if (!previewMode || showAll) return anim;
  if (!anim || typeof anim.opacity !== 'number') return anim;
  if (anim.opacity >= 0.28) return anim;
  return { ...anim, opacity: 0.28 };
}
