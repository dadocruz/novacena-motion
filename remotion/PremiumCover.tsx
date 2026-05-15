import React from 'react';
import { Img, interpolate, useCurrentFrame } from 'remotion';
import { easings, eased, elegantWiggle, hitPulse, breathe } from './motionEngine';

type CoverMotionId =
  | 'zoom_bounce'
  | 'slide_up'
  | 'slide_left'
  | 'slide_right'
  | 'flip_card'
  | 'vinyl_reveal'
  | 'slide_up_glow'
  | 'slide_left_premium'
  | 'slide_right_premium'
  | 'flip_card_premium'
  | 'zoom_bounce_intro'
  | string;

type Props = {
  src?: string;
  size?: number;
  entryFrame?: number;
  accentFrames?: number[];
  spinStart?: number;
  spinEnd?: number;
  spinTurns?: number;
  wiggleIntensity?: number;
  glowColor?: string;
  motionId?: CoverMotionId;
};

function normalizeMotionId(id: CoverMotionId) {
  if (id === 'slide_up_glow') return 'slide_up';
  if (id === 'slide_left_premium') return 'slide_left';
  if (id === 'slide_right_premium') return 'slide_right';
  if (id === 'flip_card_premium') return 'flip_card';
  if (id === 'zoom_bounce_intro') return 'zoom_bounce';
  return id;
}

export const PremiumCover: React.FC<Props> = ({
  src,
  size = 510,
  entryFrame = 0,
  accentFrames = [],
  spinStart = 90,
  spinEnd = 220,
  spinTurns = 2,
  wiggleIntensity = 1,
  glowColor = 'rgba(190, 90, 255, 0.24)',
  motionId = 'zoom_bounce',
}) => {
  const frame = useCurrentFrame();
  const id = normalizeMotionId(motionId);

  // Entrada longa de propósito: fica visível até ~2s em 30fps.
  const entryEnd = entryFrame + 60;
  const t = eased(frame, entryFrame, entryEnd, easings.outBack);
  const softT = eased(frame, entryFrame, entryEnd, easings.outCubic);
  // A capa fica invisível antes do frame de entrada.
  // Assim o frame 0 não mostra a capa antes da animação.
  const opacity = interpolate(
    frame,
    [entryFrame - 1, entryFrame + 10],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  let x = 0;
  let y = 0;
  let scale = 1;
  let rotate = 0;
  let rotateY = 0;

  if (id === 'zoom_bounce') {
    scale = 0.35 + t * 0.65;
    y = (1 - t) * 80;
    rotate = (1 - t) * -5;
  }

  if (id === 'slide_up') {
    y = (1 - t) * 360;
    scale = 0.82 + t * 0.18;
    rotate = (1 - t) * -2;
  }

  if (id === 'slide_left') {
    x = (1 - t) * -420;
    y = (1 - t) * 40;
    scale = 0.84 + t * 0.16;
    rotate = (1 - t) * -14;
  }

  if (id === 'slide_right') {
    x = (1 - t) * 420;
    y = (1 - t) * 40;
    scale = 0.84 + t * 0.16;
    rotate = (1 - t) * 14;
  }

  if (id === 'flip_card') {
    rotateY = (1 - softT) * -125;
    x = (1 - softT) * 70;
    scale = 0.80 + t * 0.20;
  }

  if (id === 'vinyl_reveal') {
    x = (1 - t) * 220;
    y = (1 - t) * 80;
    rotate = (1 - t) * 35;
    rotateY = (1 - softT) * 55;
    scale = 0.78 + t * 0.22;
  }

  // Depois da entrada, entra o giro premium.
  const spinT = eased(frame, spinStart, Math.max(spinStart + 1, spinEnd), easings.inOutSine);
  const spinAngle = spinT * 360 * spinTurns;

  const wig = elegantWiggle(frame, { intensity: wiggleIntensity * 1.1, offset: 200 });
  const accentBoost = accentFrames.reduce((acc, f) => acc + hitPulse(frame, f, 16), 0);
  const hitScale = 1 + accentBoost * 0.025;
  const breath = breathe(frame, { period: 120, amount: 0.01 });

  const totalRotateY = rotateY + spinAngle;
  const shinePhase = ((frame - entryFrame) % 80) / 80;
  const shineX = -120 + shinePhase * 240;
  const shineOpacity = shinePhase < 0.5 ? shinePhase * 1.6 : (1 - shinePhase) * 1.6;

  const transform = [
    `translate(${x + wig.x}px, ${y + wig.y}px)`,
    `rotate(${rotate + wig.rotate}deg)`,
    `rotateY(${totalRotateY}deg)`,
    `scale(${scale * hitScale * breath})`,
  ].join(' ');

  return (
    <div style={{ position: 'relative', width: size, height: size, opacity, perspective: 1400 }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform,
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <Face
          src={src}
          size={size}
          shineX={shineX}
          shineOpacity={shineOpacity}
          glowColor={glowColor}
          glowIntensity={accentBoost}
        />
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
}> = ({ src, size, shineX, shineOpacity, glowColor, glowIntensity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: size * 0.06,
        overflow: 'hidden',
        background: '#111',
        boxShadow: `0 28px 70px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.14), 0 0 ${40 + glowIntensity * 80}px ${glowColor}`,
        backfaceVisibility: 'visible',
        WebkitBackfaceVisibility: 'visible',
      }}
    >
      {src ? (
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
    </div>
  );
};
