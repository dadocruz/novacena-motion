import React from 'react';
import { Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
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
  const long = eased(frame, entryFrame, entryFrame + 78, easings.outCubic);
  const spinT = eased(frame, spinStart, spinEnd, easings.inOutSine);

  const pop = spring({
    frame: Math.max(0, frame - entryFrame),
    fps,
    config: {
      damping: 11,
      stiffness: 88,
      mass: 0.78,
    },
  });

  const wiggleAmount =
    coverMotion === 'vinyl_reveal' ? 0.28 :
    coverMotion === 'flip_card' ? 0.35 :
    coverMotion === 'zoom_bounce' ? 0.50 :
    0.62;

  const wig = elegantWiggle(frame, { intensity: wiggleIntensity * wiggleAmount, offset: 200 });
  const breath = breathe(frame, { period: 132, amount: 0.007 });

  let x = wig.x;
  let y = wig.y;
  let rotate = wig.rotate;
  let rotateX = 0;
  let rotateY = 0;
  let scale = breath;
  let perspective = 1500;
  let blur = 0;
  let opacityBoost = intro;

  switch (coverMotion) {
    case 'zoom_bounce': {
      // Intro estilo trailer: vem da câmera, dá overshoot e assenta.
      scale *= 0.42 + pop * 0.62;
      y += (1 - intro) * 24;
      rotate += (1 - intro) * -2.5;
      rotateX = (1 - intro) * 4;
      blur = (1 - intro) * 18;
      perspective = 1200;
      break;
    }

    case 'slide_up_glow': {
      // Entrada elegante vinda de baixo com brilho.
      y += (1 - introBack) * 260;
      scale *= 0.82 + introBack * 0.18;
      rotate += (1 - settle) * 1.8;
      rotateX = (1 - intro) * 8 + Math.sin(frame / 54) * 0.8;
      rotateY = Math.sin(frame / 46) * 1.5;
      blur = (1 - intro) * 14;
      perspective = 1450;
      break;
    }

    case 'slide_left_premium': {
      // Vem da esquerda, como card premium entrando no palco.
      x += (1 - introBack) * -360;
      y += (1 - intro) * 34;
      scale *= 0.86 + introBack * 0.14;
      rotate += (1 - introBack) * -8;
      rotateY = (1 - intro) * 18 + Math.sin(frame / 50) * 1.4;
      rotateX = (1 - intro) * 4;
      blur = (1 - intro) * 12;
      perspective = 1700;
      break;
    }

    case 'slide_right_premium': {
      // Vem da direita, bom para variações de template.
      x += (1 - introBack) * 360;
      y += (1 - intro) * 34;
      scale *= 0.86 + introBack * 0.14;
      rotate += (1 - introBack) * 8;
      rotateY = (1 - intro) * -18 + Math.sin(frame / 50) * 1.4;
      rotateX = (1 - intro) * 4;
      blur = (1 - intro) * 12;
      perspective = 1700;
      break;
    }

    case 'flip_card': {
      // Flip curto e chique, sem ficar rodando eternamente.
      y += (1 - intro) * 80;
      scale *= 0.78 + introBack * 0.22;
      rotateY = (1 - introBack) * -72 + Math.sin(frame / 42) * 1.2;
      rotateX = (1 - introBack) * 10;
      rotate += (1 - introBack) * -2;
      blur = (1 - intro) * 10;
      perspective = 1900;
      break;
    }

    case 'vinyl_reveal': {
      // Disco atrás com rotação musical controlada.
      y += (1 - intro) * 46;
      scale *= 0.82 + introBack * 0.18;
      rotate += spinT * 48 * Math.max(1, spinTurns * 0.25);
      rotateY = Math.sin(frame / 38) * 1.6;
      rotateX = Math.sin(frame / 58) * 1.0;
      blur = (1 - intro) * 8;
      perspective = 1350;
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

  return {
    perspective,
    blur,
    opacityBoost: clamp01(opacityBoost),
    entryProgress: clamp01(intro),
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
  spinStart = 62,
  spinEnd = 238,
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

  const shinePhase = ((frame - entryFrame + 24) % 110) / 110;
  const shineX = -135 + shinePhase * 270;
  const shineOpacity = (() => {
    if (frame < entryFrame + 20) return 0;
    if (shinePhase < 0.24) return (shinePhase / 0.24) * 0.68;
    if (shinePhase < 0.50) return 0.68;
    return Math.max(0, ((1 - shinePhase) / 0.50) * 0.68);
  })();

  const shadowSquish = Math.abs(Math.cos((motion.rotateY * Math.PI) / 180));
  const shadowWidth = size * 0.82 * (0.58 + shadowSquish * 0.42);
  const shadowOpacity = (0.26 + shadowSquish * 0.23) * entryOpacity;

  const vinylOpacity =
    coverMotion === 'vinyl_reveal'
      ? interpolate(motion.entryProgress, [0, 1], [0, 0.38])
      : 0;

  const haloOpacity =
    coverMotion === 'slide_up_glow' ? 0.60 :
    coverMotion === 'zoom_bounce' ? 0.46 :
    coverMotion === 'vinyl_reveal' ? 0.46 :
    coverMotion === 'slide_left_premium' || coverMotion === 'slide_right_premium' ? 0.38 :
    0.34;

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
          opacity: haloOpacity * entryOpacity,
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
        {coverMotion === 'vinyl_reveal' ? (
          <VinylBack size={size} opacity={vinylOpacity} frame={frame} />
        ) : null}

        <Face
          src={src}
          size={size}
          shineX={shineX}
          shineOpacity={shineOpacity}
          glowColor={glowColor}
          glowIntensity={accentBoost}
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
            shineOpacity={shineOpacity}
            glowColor={glowColor}
            glowIntensity={accentBoost}
            mirrored
          />
        </div>
      </div>
    </div>
  );
};

const VinylBack: React.FC<{ size: number; opacity: number; frame: number }> = ({ size, opacity, frame }) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: size * 1.22,
        height: size * 1.22,
        left: -size * 0.11,
        top: -size * 0.11,
        borderRadius: '50%',
        background:
          'repeating-radial-gradient(circle, rgba(255,255,255,0.10) 0 1px, rgba(0,0,0,0.92) 2px 8px), radial-gradient(circle, rgba(255,255,255,0.16) 0 5%, rgba(0,0,0,0.95) 6% 38%, rgba(255,255,255,0.08) 39% 40%, rgba(0,0,0,0.92) 41% 100%)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.78)',
        opacity,
        transform: `translateZ(-32px) rotate(${frame * 0.72}deg)`,
        pointerEvents: 'none',
      }}
    />
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
