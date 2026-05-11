/**
 * NovaCena Motion Engine
 * Helpers de animação premium para todos os templates.
 * Substitui o antigo animations.ts mas mantém compatibilidade (re-exporta o que era usado).
 */

import { interpolate, spring } from 'remotion';

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
export function maskReveal(frame: number, start: number, duration = 22) {
  const t = eased(frame, start, start + duration, easings.outQuint);
  const reveal = (1 - t) * 100;
  const blur = (1 - t) * 8;
  // Quando a animação completa, remove totalmente o clipPath
  // (senão a borda da máscara continua cortando o textShadow que se estende pra fora)
  const isComplete = t >= 0.999;
  return {
    clipPath: isComplete ? 'none' : `inset(-80px -80px ${reveal}% -80px)`,
    filter: `blur(${blur}px)`,
    opacity: clamp01(t * 2),
    transform: `translateY(${(1 - t) * 16}px)`,
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
