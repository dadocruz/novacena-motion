export type WiggleOptions = {
  amplitude?: number;
  frequency?: number;
  rotation?: number;
  seed?: number;
};

export type StaggerOptions = {
  duration?: number;
  totalDelay?: number;
  reverse?: boolean;
  curve?: (t: number) => number;
};

const TAU = Math.PI * 2;

export const clamp01Effect = (value: number) => Math.max(0, Math.min(1, value));

export function staggerProgress(
  frame: number,
  start: number,
  index: number,
  total: number,
  options: StaggerOptions = {}
) {
  const duration = options.duration ?? 14;
  const totalDelay = options.totalDelay ?? 18;
  const safeTotal = Math.max(1, total);
  const orderIndex = options.reverse ? safeTotal - index - 1 : index;
  const delay = safeTotal <= 1 ? 0 : (totalDelay / (safeTotal - 1)) * orderIndex;
  const raw = clamp01Effect((frame - start - delay) / duration);

  return options.curve ? options.curve(raw) : raw;
}

export function inertialPop(
  progress: number,
  options: { overshoot?: number; waves?: number; decay?: number } = {}
) {
  const t = clamp01Effect(progress);
  const overshoot = options.overshoot ?? 0.16;
  const waves = options.waves ?? 1.15;
  const decay = options.decay ?? 2.8;
  // O envelope (1 - t) força o "ring" a ZERAR exatamente em t=1. Sem isso, com
  // waves não-inteiro sin(π·waves)≠0 deixava um resíduo (~0.03) no fim → a escala
  // parava em ~0.97 e, quando a transição terminava (vira sem-transição = escala
  // 1), o texto DAVA UM PULO/oscilação. Agora converge limpo pra 1.
  const ring = Math.sin(t * Math.PI * waves) * Math.exp(-decay * t) * (1 - t);

  return t + ring * overshoot;
}

export function brazuWiggle(
  frame: number,
  options: WiggleOptions = {}
) {
  const amplitude = options.amplitude ?? 1;
  const frequency = Math.max(0.01, options.frequency ?? 1);
  const rotation = options.rotation ?? 0.16;
  const seed = options.seed ?? 0;
  const t = (frame / 30) * frequency;
  const phase = seed * 0.731;

  const x =
    Math.sin(t * TAU + phase) * 0.64 +
    Math.sin(t * TAU * 2.17 + phase + 1.4) * 0.26 +
    Math.sin(t * TAU * 4.03 + phase + 2.1) * 0.1;
  const y =
    Math.cos(t * TAU * 0.93 + phase + 0.7) * 0.62 +
    Math.cos(t * TAU * 2.31 + phase + 2.3) * 0.27 +
    Math.cos(t * TAU * 3.71 + phase) * 0.11;
  const r =
    Math.sin(t * TAU * 0.71 + phase + 1.1) * rotation +
    Math.sin(t * TAU * 1.63 + phase) * rotation * 0.45;

  const px = x * amplitude * 6;
  const py = y * amplitude * 5;
  const deg = r * amplitude;

  return {
    x: px,
    y: py,
    rotate: deg,
    transform: `translate(${px}px, ${py}px) rotate(${deg}deg)`,
  };
}
