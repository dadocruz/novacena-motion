import React from 'react';
import { Img, useCurrentFrame, interpolate } from 'remotion';
import { easings, eased, elegantWiggle, hitPulse, breathe } from './motionEngine';
import type { CoverMotionId } from './types';

type Props = {
  src?: string;
  /** Tamanho do quadrado da capa em pixels. */
  size?: number;
  /** Frame em que a capa entra. */
  entryFrame?: number;
  /** Frame onde os hits acontecem. */
  accentFrames?: number[];
  /** Tipo de animação de entrada/vida da capa. */
  coverMotion?: CoverMotionId;
  /** Frame em que o giro começa. */
  spinStart?: number;
  /** Frame em que o giro termina. */
  spinEnd?: number;
  /** Número de voltas. */
  spinTurns?: number;
  /** Intensidade do wiggle de posição. */
  wiggleIntensity?: number;
  /** Cor do glow ao redor da capa. */
  glowColor?: string;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function getCoverMotionTransform(args: {
  frame: number;
  entryFrame: number;
  spinStart: number;
  spinEnd: number;
  spinTurns: number;
  wiggleIntensity: number;
  coverMotion: CoverMotionId;
}) {
  const { frame, entryFrame, spinStart, spinEnd, spinTurns, wiggleIntensity, coverMotion } = args;

  const entryT = eased(frame, entryFrame, entryFrame + 22, easings.outBack);
  const softT = eased(frame, entryFrame, entryFrame + 28, easings.outCubic);
  const spinT = eased(frame, spinStart, spinEnd, easings.inOutSine);

  const wig = elegantWiggle(frame, { intensity: wiggleIntensity * 1.05, offset: 200 });
  const breath = breathe(frame, { period: 110, amount: 0.012 });

  let x = wig.x;
  let y = wig.y;
  let rotate = wig.rotate;
  let rotateX = 0;
  let rotateY = 0;
  let scale = breath;
  let perspective = 1400;

  switch (coverMotion) {
    case 'scale_pop': {
      y += (1 - entryT) * 54;
      scale *= 0.72 + entryT * 0.28;
      rotate += (1 - softT) * -4;
      break;
    }

    case 'rotate_y_premium': {
      y += (1 - entryT) * 48;
      scale *= 0.82 + entryT * 0.18;
      rotateY = (1 - entryT) * -18 + Math.sin(frame / 28) * 3;
      perspective = 1500;
      break;
    }

    case 'flip_card': {
      y += (1 - entryT) * 36;
      scale *= 0.80 + entryT * 0.20;
      rotateY = (1 - entryT) * -42 + Math.sin(frame / 24) * 5;
      rotateX = (1 - entryT) * 9;
      perspective = 1700;
      break;
    }

    case 'slide_up_glow': {
      y += (1 - softT) * 170;
      scale *= 0.88 + softT * 0.12;
      rotate += (1 - softT) * 2.5;
      rotateX = (1 - softT) * 6;
      perspective = 1300;
      break;
    }

    case 'vinyl_spin': {
      y += (1 - entryT) * 42;
      scale *= 0.80 + entryT * 0.20;
      rotate += spinT * 180 * Math.max(1, spinTurns * 0.35);
      rotateY = Math.sin(frame / 18) * 4;
      perspective = 1200;
      break;
    }

    default: {
      y += (1 - entryT) * 48;
      scale *= 0.82 + entryT * 0.18;
      rotateY = (1 - entryT) * -18 + Math.sin(frame / 28) * 3;
      break;
    }
  }

  return {
    perspective,
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
  spinStart = 54,
  spinEnd = 218,
  spinTurns = 2,
  wiggleIntensity = 1,
  glowColor = 'rgba(190, 90, 255, 0.24)',
}) => {
  const frame = useCurrentFrame();

  const entryOpacity = eased(frame, entryFrame, entryFrame + 14, easings.outCubic);

  const motion = getCoverMotionTransform({
    frame,
    entryFrame,
    spinStart,
    spinEnd,
    spinTurns,
    wiggleIntensity,
    coverMotion,
  });

  const accentBoost = accentFrames.reduce(
    (acc, f) => acc + hitPulse(frame, f, 16),
    0
  );

  const hitScale = 1 + accentBoost * 0.025;

  const shinePhase = ((frame - entryFrame) % 70) / 70;
  const shineX = -110 + shinePhase * 220;
  const shineOpacity = (() => {
    if (shinePhase < 0.35) return (shinePhase / 0.35) * 0.85;
    if (shinePhase < 0.65) return 0.85;
    return ((1 - shinePhase) / 0.35) * 0.85;
  })();

  const shadowSquish = Math.abs(Math.cos((motion.rotateY * Math.PI) / 180));
  const shadowWidth = size * 0.85 * (0.55 + shadowSquish * 0.45);
  const shadowOpacity = 0.32 + shadowSquish * 0.22;

  const vinylRingOpacity =
    coverMotion === 'vinyl_spin'
      ? interpolate(clamp01(eased(frame, entryFrame + 4, entryFrame + 28, easings.outCubic)), [0, 1], [0, 0.26])
      : 0;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        opacity: entryOpacity,
        perspective: motion.perspective,
        perspectiveOrigin: 'center center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -30,
          marginLeft: -shadowWidth / 2,
          width: shadowWidth,
          height: 24,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.65)',
          filter: 'blur(22px)',
          opacity: shadowOpacity * entryOpacity,
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
          willChange: 'transform',
        }}
      >
        {coverMotion === 'vinyl_spin' ? (
          <VinylBack size={size} opacity={vinylRingOpacity} />
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

const VinylBack: React.FC<{ size: number; opacity: number }> = ({ size, opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: size * 1.08,
        height: size * 1.08,
        left: -size * 0.04,
        top: -size * 0.04,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(255,255,255,0.12) 0 5%, rgba(0,0,0,0.95) 6% 38%, rgba(255,255,255,0.06) 39% 40%, rgba(0,0,0,0.92) 41% 100%)',
        boxShadow: '0 28px 80px rgba(0,0,0,0.72)',
        opacity,
        transform: 'translateZ(-24px)',
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
        boxShadow: `0 28px 70px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.14), 0 0 ${40 + glowIntensity * 80}px ${glowColor}`,
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
            'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.50) 48%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.50) 52%, transparent 62%)',
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
          boxShadow: `inset 0 0 ${30 + glowIntensity * 50}px ${glowColor}`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
