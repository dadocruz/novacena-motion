import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { GlobalTransitionPlacement } from './types';
import { easings } from './motionEngine';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function progressFor(frame: number, fps: number, transition: GlobalTransitionPlacement) {
  const startFrame = Math.max(0, Math.round((transition.startSec ?? 0) * fps));
  const durationFrames = Math.max(4, Math.round((transition.durationSec ?? 1) * fps));
  const raw = (frame - startFrame) / durationFrames;
  return clamp01(raw);
}

function pulse(t: number) {
  return Math.sin(Math.PI * clamp01(t));
}

const stripeCount = 14;
const glitchStripes = Array.from({ length: stripeCount }, (_, index) => ({
  index,
  top: `${(index / stripeCount) * 100}%`,
  height: `${100 / stripeCount + 0.35}%`,
  offset: (index % 2 === 0 ? 1 : -1) * (22 + (index % 5) * 9),
  delay: (index % 4) * 0.055,
}));

function ZoomBounceEffect({ transition }: { transition: GlobalTransitionPlacement }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = progressFor(frame, fps, transition);
  if (t <= 0 || t >= 1) return null;

  const strength = pulse(t) * (transition.intensity ?? 1);
  const opacity = strength * (transition.opacity ?? 0.72);
  const blur = 2 + strength * 12;
  const scale = 1 + strength * 0.055;
  const flash = interpolate(t, [0, 0.16, 0.56, 1], [0, 0.34, 0.12, 0], {
    easing: easings.outCubic,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: '50% 50%',
        WebkitBackdropFilter: `blur(${blur}px) saturate(${1 + strength * 0.55}) brightness(${1 + strength * 0.18})`,
        backdropFilter: `blur(${blur}px) saturate(${1 + strength * 0.55}) brightness(${1 + strength * 0.18})`,
        background:
          `radial-gradient(circle at 50% 48%, rgba(255,255,255,${0.28 * flash}) 0%, rgba(255,255,255,0) 23%), ` +
          `radial-gradient(circle at 50% 52%, rgba(34,211,238,${0.16 * strength}) 0%, rgba(190,80,255,${0.12 * strength}) 34%, rgba(0,0,0,0) 62%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
}

function SplitHorizontalEffect({ transition }: { transition: GlobalTransitionPlacement }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = progressFor(frame, fps, transition);
  if (t <= 0 || t >= 1) return null;

  const open = easings.inOutCubic(t);
  const strength = pulse(t) * (transition.intensity ?? 1);
  const opacity = (transition.opacity ?? 0.82) * (0.28 + strength * 0.72);
  const strips = 4;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden', opacity }}>
      {Array.from({ length: strips }, (_, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const y = (open - 0.5) * 76 * direction;
        const top = `${(index / strips) * 100}%`;
        const height = `${100 / strips}%`;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: '-6%',
              width: '112%',
              top,
              height,
              transform: `translateY(${y}%) skewY(${direction * (1 - open) * 1.6}deg)`,
              background:
                index % 2 === 0
                  ? 'linear-gradient(90deg, rgba(0,0,0,0.86), rgba(255,255,255,0.18), rgba(0,0,0,0.72))'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.32), rgba(0,0,0,0.72), rgba(255,255,255,0.14))',
              boxShadow: `0 0 ${18 + strength * 40}px rgba(255,255,255,${0.12 + strength * 0.22})`,
              mixBlendMode: index % 2 === 0 ? 'overlay' : 'screen',
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          WebkitBackdropFilter: `blur(${strength * 4}px) contrast(${1 + strength * 0.12})`,
          backdropFilter: `blur(${strength * 4}px) contrast(${1 + strength * 0.12})`,
        }}
      />
    </AbsoluteFill>
  );
}

function GlitchRgbEffect({ transition }: { transition: GlobalTransitionPlacement }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = progressFor(frame, fps, transition);
  if (t <= 0 || t >= 1) return null;

  const burst = pulse(t) * (transition.intensity ?? 1);
  const opacity = burst * (transition.opacity ?? 0.9);
  const jitter = Math.round(Math.sin(frame * 2.31) * 16 * burst);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity,
        mixBlendMode: 'screen',
        WebkitBackdropFilter: `contrast(${1 + burst * 0.35}) saturate(${1 + burst * 0.7})`,
        backdropFilter: `contrast(${1 + burst * 0.35}) saturate(${1 + burst * 0.7})`,
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translateX(${jitter}px)`,
          background: `linear-gradient(90deg, rgba(255,0,80,${0.16 * burst}), rgba(0,255,220,${0.12 * burst}), rgba(30,100,255,${0.13 * burst}))`,
        }}
      />
      {glitchStripes.map((stripe) => {
        const local = clamp01((t - stripe.delay) / 0.52);
        const stripeOpacity = pulse(local) * opacity;
        return (
          <div
            key={stripe.index}
            style={{
              position: 'absolute',
              top: stripe.top,
              left: '-5%',
              width: '110%',
              height: stripe.height,
              transform: `translateX(${stripe.offset * burst}px)`,
              opacity: stripeOpacity,
              background:
                stripe.index % 3 === 0
                  ? 'rgba(255, 34, 102, 0.72)'
                  : stripe.index % 3 === 1
                    ? 'rgba(34, 211, 238, 0.62)'
                    : 'rgba(255,255,255,0.54)',
              filter: `blur(${Math.max(0.2, burst * 1.8)}px)`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          opacity: 0.22 * burst,
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)',
        }}
      />
    </AbsoluteFill>
  );
}

function ExposureBlurEffect({ transition }: { transition: GlobalTransitionPlacement }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = progressFor(frame, fps, transition);
  if (t <= 0 || t >= 1) return null;

  const strength = pulse(t) * (transition.intensity ?? 1);
  const opacity = strength * (transition.opacity ?? 0.7);
  const light = interpolate(t, [0, 0.25, 0.58, 1], [0, 1, 0.36, 0], {
    easing: easings.outQuint,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity,
        WebkitBackdropFilter: `blur(${strength * 18}px) brightness(${1 + light * 0.42}) saturate(${1 + strength * 0.18})`,
        backdropFilter: `blur(${strength * 18}px) brightness(${1 + light * 0.42}) saturate(${1 + strength * 0.18})`,
        background:
          `radial-gradient(circle at 50% 45%, rgba(255,255,255,${0.55 * light}) 0%, rgba(255,255,255,${0.18 * light}) 30%, rgba(255,255,255,0) 62%), ` +
          `linear-gradient(180deg, rgba(0,0,0,${0.22 * strength}) 0%, rgba(255,255,255,${0.16 * light}) 48%, rgba(0,0,0,${0.18 * strength}) 100%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
}

function GlobalTransition({ transition }: { transition: GlobalTransitionPlacement }) {
  if (transition.kind === 'split_horizontal') return <SplitHorizontalEffect transition={transition} />;
  if (transition.kind === 'glitch_rgb') return <GlitchRgbEffect transition={transition} />;
  if (transition.kind === 'exposure_blur') return <ExposureBlurEffect transition={transition} />;
  return <ZoomBounceEffect transition={transition} />;
}

export const GlobalTransitionLayer: React.FC<{ transitions?: GlobalTransitionPlacement[] }> = ({ transitions = [] }) => {
  if (!transitions.length) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden', zIndex: 999 }}>
      {transitions.map((transition) => (
        <GlobalTransition key={transition.id} transition={transition} />
      ))}
    </AbsoluteFill>
  );
};

export default GlobalTransitionLayer;
