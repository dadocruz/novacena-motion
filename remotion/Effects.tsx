import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

const particles = Array.from({ length: 54 }, (_, i) => ({
  id: i,
  x: (i * 179) % 1080,
  y: (i * 311) % 1920,
  s: 3 + ((i * 13) % 9),
  d: (i * 17) % 90,
  o: 0.18 + (((i * 7) % 8) / 40),
}));

export const Particles: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => {
        const drift = ((frame + p.d) * (0.65 + (p.id % 5) * 0.11)) % 210;
        const opacity = p.o * intensity * interpolate(Math.sin((frame + p.id) * 0.04), [-1, 1], [0.55, 1]);
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y - drift,
              width: p.s,
              height: p.s,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
              opacity,
              boxShadow: '0 0 18px rgba(255,255,255,0.65)',
              transform: `translateX(${Math.sin((frame + p.id) * 0.035) * 24}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const FilmTexture: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: 0.14,
        mixBlendMode: 'overlay',
        backgroundImage: `radial-gradient(circle at ${frame % 100}% ${(frame * 3) % 100}%, rgba(255,255,255,0.7) 0 1px, transparent 1px), linear-gradient(115deg, rgba(255,255,255,0.08), transparent 38%, rgba(0,0,0,0.2))`,
        backgroundSize: '9px 9px, 100% 100%',
      }}
    />
  );
};

export const LightSweeps: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame % 180, [0, 180], [-680, 1450]);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: -160,
          width: 190,
          height: 2200,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
          transform: 'rotate(19deg)',
          filter: 'blur(14px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 48%, transparent 0%, transparent 35%, rgba(0,0,0,0.58) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
