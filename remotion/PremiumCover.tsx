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

  const longT = eased(frame, entryFrame, entryFrame + 48, easings.outCubic);
  const softT = eased(frame, entryFrame, entryFrame + 62, easings.outCubic);
  const cardT = eased(frame, entryFrame, entryFrame + 54, easings.outBack);
  const spinT = eased(frame, spinStart, spinEnd, easings.inOutSine);

  const pop = spring({
    frame: Math.max(0, frame - entryFrame),
    fps,
    config: {
      damping: 13,
      stiffness: 95,
      mass: 0.85,
    },
  });

  const wigBase =
    coverMotion === 'vinyl_spin' ? 0.35 :
    coverMotion === 'flip_card' ? 0.55 :
    coverMotion === 'rotate_y_premium' ? 0.65 :
    0.85;

  const wig = elegantWiggle(frame, { intensity: wiggleIntensity * wigBase, offset: 200 });
  const breath = breathe(frame, { period: 120, amount: 0.009 });

  let x = wig.x;
  let y = wig.y;
  let rotate = wig.rotate;
  let rotateX = 0;
  let rotateY = 0;
  let scale = breath;
  let perspective = 1500;
  let blur = 0;

  switch (coverMotion) {
    case 'scale_pop': {
      const overshoot = 0.68 + pop * 0.34;
      y += (1 - softT) * 78;
      scale *= overshoot;
      rotate += (1 - longT) * -3.5;
      rotateX = (1 - longT) * 5;
      blur = (1 - longT) * 10;
      perspective = 1300;
      break;
    }

    case 'rotate_y_premium': {
      y += (1 - softT) * 54;
      scale *= 0.82 + longT * 0.18;
      rotateY = (1 - longT) * -26 + Math.sin(frame / 34) * 4;
      rotateX = (1 - longT) * 6 + Math.sin(frame / 47) * 1.2;
      rotate += Math.sin(frame / 60) * 0.6;
      blur = (1 - longT) * 8;
      perspective = 1700;
      break;
    }

    case 'flip_card': {
      y += (1 - cardT) * 70;
      scale *= 0.76 + cardT * 0.24;
      rotateY = (1 - cardT) * -68 + Math.sin(frame / 28) * 4;
      rotateX = (1 - cardT) * 11;
      rotate += (1 - cardT) * -2;
      blur = (1 - cardT) * 7;
      perspective = 1850;
      break;
    }

    case 'slide_up_glow': {
      y += (1 - softT) * 210;
      scale *= 0.84 + softT * 0.16;
      rotate += (1 - softT) * 1.6;
      rotateX = (1 - softT) * 7 + Math.sin(frame / 52) * 0.8;
      rotateY = Math.sin(frame / 38) * 2.4;
      blur = (1 - softT) * 14;
      perspective = 1450;
      break;
    }

    case 'vinyl_spin': {
      y += (1 - longT) * 50;
      scale *= 0.82 + longT * 0.18;
      rotate += spinT * 126 * Math.max(1, spinTurns * 0.45);
      rotateY = Math.sin(frame / 26) * 3.2;
      rotateX = Math.sin(frame / 42) * 1.4;
      blur = (1 - longT) * 7;
      perspective = 1350;
      break;
    }

    default: {
      y += (1 - softT) * 210;
      scale *= 0.84 + softT * 0.16;
      rotateX = (1 - softT) * 7;
      rotateY = Math.sin(frame / 38) * 2.4;
      blur = (1 - softT) * 14;
      break;
    }
  }

  return {
    perspective,
    blur,
    entryProgress: clamp01(softT),
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

  const entryOpacity = eased(frame, entryFrame, entryFrame + 28, easings.outCubic);

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

  const accentBoost = accentFrames.reduce(
    (acc, f) => acc + hitPulse(frame, f, 18),
    0
  );

  const hitScale = 1 + accentBoost * 0.022;

  const shinePhase = ((frame - entryFrame + 18) % 96) / 96;
  const shineX = -130 + shinePhase * 260;
  const shineOpacity = (() => {
    if (frame < entryFrame + 18) return 0;
    if (shinePhase < 0.28) return (shinePhase / 0.28) * 0.72;
    if (shinePhase < 0.55) return 0.72;
    return Math.max(0, ((1 - shinePhase) / 0.45) * 0.72);
  })();

  const shadowSquish = Math.abs(Math.cos((motion.rotateY * Math.PI) / 180));
  const shadowWidth = size * 0.82 * (0.58 + shadowSquish * 0.42);
  const shadowOpacity = (0.28 + shadowSquish * 0.24) * entryOpacity;

  const vinylOpacity =
    coverMotion === 'vinyl_spin'
      ? interpolate(motion.entryProgress, [0, 1], [0, 0.34])
      : 0;

  const haloOpacity =
    coverMotion === 'slide_up_glow' ? 0.58 :
    coverMotion === 'scale_pop' ? 0.40 :
    coverMotion === 'vinyl_spin' ? 0.46 :
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
        {coverMotion === 'vinyl_spin' ? (
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
        width: size * 1.18,
        height: size * 1.18,
        left: -size * 0.09,
        top: -size * 0.09,
        borderRadius: '50%',
        background:
          'repeating-radial-gradient(circle, rgba(255,255,255,0.10) 0 1px, rgba(0,0,0,0.92) 2px 8px), radial-gradient(circle, rgba(255,255,255,0.16) 0 5%, rgba(0,0,0,0.95) 6% 38%, rgba(255,255,255,0.08) 39% 40%, rgba(0,0,0,0.92) 41% 100%)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.78)',
        opacity,
        transform: `translateZ(-28px) rotate(${frame * 0.9}deg)`,
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
            'linear-gradient(115deg, transparent 39%, rgba(255,255,255,0.32) 47%, rgba(255,255,255,0.82) 50%, rgba(255,255,255,0.32) 53%, transparent 61%)',
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
