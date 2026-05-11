import { interpolate, spring } from 'remotion';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function introSpring(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 11, stiffness: 145, mass: 0.72 },
  });
}

export function fade(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

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
  const x = Math.sin(frame * 0.32) * 3.2 * intensity + Math.sin(frame * 0.11) * 2 * intensity;
  const y = Math.cos(frame * 0.26) * 2.4 * intensity;
  const r = Math.sin(frame * 0.18) * 0.7 * intensity;
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
}

export function loopFloat(frame: number, offset = 0, intensity = 1) {
  const y = Math.sin((frame + offset) * 0.05) * 16 * intensity;
  const x = Math.cos((frame + offset) * 0.037) * 8 * intensity;
  const r = Math.sin((frame + offset) * 0.025) * 3 * intensity;
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
}
