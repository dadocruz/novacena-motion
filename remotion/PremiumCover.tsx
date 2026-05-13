import React from 'react';
import { Img, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { easings, eased, elegantWiggle, hitPulse, breathe } from './motionEngine';
import type { CoverMotionId } from './types';

type Props = {
  src?: string;
  size?: number;
  entryFrame?: number;
  accentFrames?: number[];
  coverMotion?: CoverMotionId;
  spinStart?: number;
  spinEnd?: number;
  spinTurns?: number;
  wiggleIntensity?: number;
  glowColor?: string;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function albumShowcaseSpin(frame: number, start: number, end: number, turns: number) {
  const t = eased(frame, start, end, easings.inOutSine);

  // Spin com “keyframes” internos: acelera, segura um pouco a frente, termina suave.
  const intro = eased(frame, start, start + 18, easings.outCubic);
  const settle = eased(frame, end - 24, end, easings.outCubic);

  const degrees = t * 360 * turns;

  const stageTilt =
    Math.sin(t * Math.PI * 2) * 7 +
    Math.sin(t * Math.PI * 4) * 2.5;

  const zLift = Math.sin(t * Math.PI) * 0.055;
  const impact = intro * (1 - settle);

  return {
    rotateY: degrees + stageTilt,
    rotateX: Math.sin(t * Math.PI) * -4,
    scale: 1 + zLift,
    glow: impact * Math.sin(t * Math.PI),
  };
}

function getCoverMotionTransform(args: {
  frame: number;
  fps: number;
  entryFrame: number;
  spinStart: number;
  spinEnd: number;
  spinTurns: number;
  wiggleIntensity: number;
  coverMotion: CoverMotionId;
}) {
  const { frame, fps, entryFrame, spinStart, spinEnd, spinTurns, wiggleIntensity, coverMotion } = args;

  const intro = eased(frame, entryFrame, entryFrame + 54, easings.outCubic);
  const introBack = eased(frame, entryFrame, entryFrame + 46, easings.outBack);
  const settle = eased(frame, entryFrame + 24, entryFrame + 82, easings.outCubic);

  const pop = spring({
    frame: Math.max(0, frame - entryFrame),
    fps,
    config: {
      damping: 11,
      stiffness: 88,
      mass: 0.78,
    },
  });

  const showcase = albumShowcaseSpin(frame, spinStart, spinEnd, Math.max(1, spinTurns));
  const showcaseActive = clamp01(eased(frame, spinStart - 8, spinStart + 10, easings.outCubic));

  const wiggleAmount =
    coverMotion === 'flip_card' ? 0.30 :
    coverMotion === 'zoom_bounce' ? 0.45 :
    0.56;

  const wig = elegantWiggle(frame, { intensity: wiggleIntensity * wiggleAmount, offset: 200 });
  const breath = breathe(frame, { period: 132, amount: 0.006 });

  let x = wig.x;
  let y = wig.y;
  let rotate = wig.rotate;
  let rotateX = 0;
  let rotateY = 0;
  let scale = breath;
  let perspective = 1500;
  let blur = 0;
  let entryGlow = intro;

  switch (coverMotion) {
    case 'zoom_bounce': {
      scale *= 0.42 + pop * 0.62;
      y += (1 - intro) * 24;
      rotate += (1 - intro) * -2.5;
      rotateX = (1 - intro) * 4;
      blur = (1 - intro) * 18;
      perspective = 1200;
      break;
    }

    case 'slide_up_glow': {
      y += (1 - introBack) * 260;
      scale *= 0.82 + introBack * 0.18;
      rotate += (1 - settle) * 1.8;
      rotateX = (1 - intro) * 8;
      rotateY = Math.sin(frame / 46) * 1.2;
      blur = (1 - intro) * 14;
      perspective = 1450;
      break;
    }

    case 'slide_left_premium': {
      x += (1 - introBack) * -360;
      y += (1 - intro) * 34;
      scale *= 0.86 + introBack * 0.14;
      rotate += (1 - introBack) * -8;
      rotateY = (1 - intro) * 18;
      rotateX = (1 - intro) * 4;
      blur = (1 - intro) * 12;
      perspective = 1700;
      break;
    }

    case 'slide_right_premium': {
      x += (1 - introBack) * 360;
      y += (1 - intro) * 34;
      scale *= 0.86 + introBack * 0.14;
      rotate += (1 - introBack) * 8;
      rotateY = (1 - intro) * -18;
      rotateX = (1 - intro) * 4;
      blur = (1 - intro) * 12;
      perspective = 1700;
      break;
    }

    case 'flip_card': {
      y += (1 - intro) * 80;
      scale *= 0.78 + introBack * 0.22;
      rotateY = (1 - introBack) * -72;
      rotateX = (1 - introBack) * 10;
      rotate += (1 - introBack) * -2;
      blur = (1 - intro) * 10;
      perspective = 1900;
      break;
    }

    default: {
      y += (1 - introBack) * 260;
      scale *= 0.82 + introBack * 0.18;
      rotateX = (1 - intro) * 8;
      blur = (1 - intro) * 14;
      break;
    }
  }

  // Apresentação padrão da capa: depois da entrada escolhida,
  // a capa sempre faz 2 giros Y coreografados.
  rotateY += showcase.rotateY;
  rotateX += showcase.rotateX;
  scale *= showcase.scale;

  return {
    perspective,
    blur,
    entryGlow: clamp01(entryGlow),
    showcaseGlow: showcase.glow * showcaseActive,
    transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
    rotateY,
  };
}

export const PremiumCover: React.FC<Props> = ({
  src,
  size = 510,
  entryFrame = 40,
  accentFrames = [],
  coverMotion = 'slide_up_glow',
  spinStart = 88,
  spinEnd = 178,
  spinTurns = 2,
  wiggleIntensity = 1,
  glowColor = 'rgba(190, 90, 255, 0.24)',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const motion = getCoverMotionTransform({
    frame,
    fps,
    entryFrame,
    spinStart,
    spinEnd,
    spinTurns,
    wiggleIntensity,
    coverMotion,
  });

  const entryOpacity = eased(frame, entryFrame, entryFrame + 30, easings.outCubic);

  const accentBoost = accentFrames.reduce(
    (acc, f) => acc + hitPulse(frame, f, 18),
    0
  );

  const hitScale = 1 + accentBoost * 0.022;

  const shinePhase = ((frame - entryFrame + 24) % 92) / 92;
  const shineX = -135 + shinePhase * 270;
  const shineOpacity = (() => {
    if (frame < entryFrame + 20) return 0;
    if (shinePhase < 0.24) return (shinePhase / 0.24) * 0.72;
    if (shinePhase < 0.50) return 0.72;
    return Math.max(0, ((1 - shinePhase) / 0.50) * 0.72);
  })();

  const shadowSquish = Math.abs(Math.cos((motion.rotateY * Math.PI) / 180));
  const shadowWidth = size * 0.82 * (0.58 + shadowSquish * 0.42);
  const shadowOpacity = (0.26 + shadowSquish * 0.23) * entryOpacity;

  const haloOpacity =
    coverMotion === 'slide_up_glow' ? 0.60 :
    coverMotion === 'zoom_bounce' ? 0.48 :
    coverMotion === 'slide_left_premium' || coverMotion === 'slide_right_premium' ? 0.40 :
    0.36;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        opacity: entryOpacity,
        perspective: motion.perspective,
        perspectiveOrigin: 'center center',
        filter: `blur(${motion.blur}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -size * 0.12,
          borderRadius: size * 0.12,
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 62%)`,
          opacity: (haloOpacity + motion.showcaseGlow * 0.22) * entryOpacity,
          filter: 'blur(28px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -32,
          marginLeft: -shadowWidth / 2,
          width: shadowWidth,
          height: 26,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.72)',
          filter: 'blur(22px)',
          opacity: shadowOpacity,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `${motion.transform} scale(${hitScale})`,
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
          willChange: 'transform, filter',
        }}
      >
        <Face
          src={src}
          size={size}
          shineX={shineX}
          shineOpacity={shineOpacity + motion.showcaseGlow * 0.25}
          glowColor={glowColor}
          glowIntensity={accentBoost + motion.showcaseGlow * 1.8}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <Face
            src={src}
            size={size}
            shineX={shineX}
            shineOpacity={shineOpacity + motion.showcaseGlow * 0.25}
            glowColor={glowColor}
            glowIntensity={accentBoost + motion.showcaseGlow * 1.8}
            mirrored
          />
        </div>
      </div>
    </div>
  );
};

const Face: React.FC<{
  src?: string;
  size: number;
  shineX: number;
  shineOpacity: number;
  glowColor: string;
  glowIntensity: number;
  mirrored?: boolean;
}> = ({ src, size, shineX, shineOpacity, glowColor, glowIntensity, mirrored }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: size * 0.06,
        overflow: 'hidden',
        boxShadow: `0 30px 78px rgba(0,0,0,0.76), 0 0 0 1px rgba(255,255,255,0.15), 0 0 ${44 + glowIntensity * 80}px ${glowColor}`,
        background: '#111',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {src ? (
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: mirrored ? 'scaleX(-1)' : undefined,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(115deg, transparent 39%, rgba(255,255,255,0.30) 47%, rgba(255,255,255,0.78) 50%, rgba(255,255,255,0.30) 53%, transparent 61%)',
          transform: `translateX(${shineX}%)`,
          opacity: shineOpacity,
          mixBlendMode: 'screen',
          filter: 'blur(2px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: size * 0.06,
          boxShadow: `inset 0 0 ${28 + glowIntensity * 48}px ${glowColor}`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
