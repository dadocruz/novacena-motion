import React from 'react';
import { Img, interpolate, useCurrentFrame } from 'remotion';
import { easings, eased, elegantWiggle, hitPulse, breathe } from './motionEngine';

export type PhoneMotionId =
  | 'zoom_bounce'
  | 'slide_up'
  | 'slide_left'
  | 'slide_right'
  | 'slide_down'
  | 'flip_card'
  | 'tilt_in_left'
  | 'tilt_in_right'
  | 'drop_in'
  | 'stamp'
  | 'diagonal_tl'
  | 'diagonal_tr';

type Props = {
  /** Screenshot que vai dentro da tela. */
  src?: string;
  /** Largura total do mockup em px. */
  width?: number;
  /** Frame de entrada. */
  entryFrame?: number;
  /** Intensidade do wiggle (0 = parado). */
  wiggleIntensity?: number;
  /** Frames de pulso/acento. */
  accentFrames?: number[];
  /** Cor do glow em volta do celular. */
  glowColor?: string;
  /** Inclinação base final em graus (-15 a 15). */
  tilt?: number;
  /** Voltas extra durante o spin (rotateY contínuo). */
  spinTurns?: number;
  /** Frame onde inicia o spin. */
  spinStart?: number;
  /** Frame onde termina o spin. */
  spinEnd?: number;
  /** Preset de entrada do celular. */
  motionId?: PhoneMotionId;
  /** Cor da moldura. */
  frameColor?: string;
  /** Dynamic Island (true) ou notch clássico (false). */
  dynamicIsland?: boolean;
};

/**
 * Mockup de iPhone com 12 presets de entrada diferentes.
 * Inspirado nos motions Brazu de "Spotify Milestone".
 */
export const PhoneMockup: React.FC<Props> = ({
  src,
  width = 540,
  entryFrame = 0,
  wiggleIntensity = 1,
  accentFrames = [],
  glowColor = 'rgba(30, 215, 96, 0.40)',
  tilt = -6,
  spinTurns = 0,
  spinStart = 90,
  spinEnd = 220,
  motionId = 'zoom_bounce',
  frameColor = '#1a1a1c',
  dynamicIsland = true,
}) => {
  const frame = useCurrentFrame();
  const height = width * 2.165;

  // Entrada
  const entryEnd = entryFrame + 60;
  const t = eased(frame, entryFrame, entryEnd, easings.outBack);
  const softT = eased(frame, entryFrame, entryEnd, easings.outCubic);

  const opacity = interpolate(
    frame,
    [entryFrame - 1, entryFrame + 12],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Calcula transform de entrada conforme o preset
  let x = 0;
  let y = 0;
  let scale = 1;
  let rotate = tilt; // base sempre é o tilt final
  let rotateY = 0;

  switch (motionId) {
    case 'zoom_bounce':
      scale = 0.4 + t * 0.6;
      y = (1 - softT) * 100;
      rotate = (1 - t) * (tilt + 14) + tilt;
      break;

    case 'slide_up':
      scale = 0.85 + softT * 0.15;
      y = (1 - softT) * 600;
      rotate = (1 - t) * (tilt - 6) + tilt;
      break;

    case 'slide_down':
      scale = 0.85 + softT * 0.15;
      y = (1 - softT) * -600;
      rotate = (1 - t) * (tilt + 6) + tilt;
      break;

    case 'slide_left':
      x = (1 - softT) * -800;
      scale = 0.9 + softT * 0.1;
      rotate = (1 - t) * (tilt - 12) + tilt;
      break;

    case 'slide_right':
      x = (1 - softT) * 800;
      scale = 0.9 + softT * 0.1;
      rotate = (1 - t) * (tilt + 12) + tilt;
      break;

    case 'diagonal_tl':
      x = (1 - softT) * -500;
      y = (1 - softT) * -500;
      scale = 0.7 + softT * 0.3;
      rotate = (1 - t) * (tilt - 20) + tilt;
      break;

    case 'diagonal_tr':
      x = (1 - softT) * 500;
      y = (1 - softT) * -500;
      scale = 0.7 + softT * 0.3;
      rotate = (1 - t) * (tilt + 20) + tilt;
      break;

    case 'flip_card':
      rotateY = (1 - t) * 92;
      scale = 0.92 + t * 0.08;
      rotate = tilt;
      break;

    case 'tilt_in_left':
      scale = 0.78 + t * 0.22;
      x = (1 - softT) * -180;
      rotate = (1 - t) * (tilt - 30) + tilt;
      break;

    case 'tilt_in_right':
      scale = 0.78 + t * 0.22;
      x = (1 - softT) * 180;
      rotate = (1 - t) * (tilt + 30) + tilt;
      break;

    case 'drop_in': {
      const bounce = eased(frame, entryFrame, entryFrame + 36, easings.outBack);
      y = (1 - bounce) * -900;
      scale = 0.94 + bounce * 0.06;
      rotate = (1 - bounce) * (tilt - 8) + tilt;
      break;
    }

    case 'stamp': {
      const punch = eased(frame, entryFrame, entryFrame + 20, easings.outBack);
      scale = 0.3 + punch * 0.85;
      const settle = eased(frame, entryFrame + 20, entryFrame + 60, easings.outCubic);
      scale = scale + settle * (1 - scale);
      rotate = (1 - punch) * (tilt - 4) + tilt;
      break;
    }
  }

  // Spin contínuo (rotateY) entre spinStart e spinEnd
  const spinProgress = interpolate(
    frame,
    [spinStart, spinEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const spinAngle = spinProgress * spinTurns * 360;

  // Wiggle, hits, respiração
  const wig = elegantWiggle(frame, { intensity: wiggleIntensity * 0.85, offset: 320 });
  const accentBoost = accentFrames.reduce((acc, f) => acc + hitPulse(frame, f, 16), 0);
  const hitScale = 1 + accentBoost * 0.022;
  const breath = breathe(frame, { period: 140, amount: 0.008 });

  const totalRotateY = rotateY + spinAngle;

  const transform = [
    `translate(${x + wig.x}px, ${y + wig.y}px)`,
    `rotate(${rotate + wig.rotate}deg)`,
    `rotateY(${totalRotateY}deg)`,
    `scale(${scale * hitScale * breath})`,
  ].join(' ');

  const screenBorderRadius = width * 0.115;
  const frameBorderRadius = width * 0.135;
  const screenInset = width * 0.02;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        opacity,
        transform,
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
        perspective: 1600,
        willChange: 'transform',
        filter: `drop-shadow(0 28px 70px rgba(0,0,0,0.65)) drop-shadow(0 0 ${
          60 + accentBoost * 80
        }px ${glowColor})`,
      }}
    >
      {/* Moldura externa */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: frameBorderRadius,
          background: `linear-gradient(160deg, ${frameColor} 0%, #2a2a2e 35%, ${frameColor} 70%, #0e0e10 100%)`,
          boxShadow:
            'inset 0 0 0 2px rgba(255,255,255,0.10), inset 0 0 18px rgba(0,0,0,0.6)',
        }}
      />

      {/* Botões laterais */}
      <div style={{ position: 'absolute', left: -3, top: '22%', width: 5, height: '5%', borderRadius: 2, background: 'linear-gradient(90deg, #0a0a0b, #2a2a2e)' }} />
      <div style={{ position: 'absolute', left: -3, top: '32%', width: 5, height: '8%', borderRadius: 2, background: 'linear-gradient(90deg, #0a0a0b, #2a2a2e)' }} />
      <div style={{ position: 'absolute', left: -3, top: '44%', width: 5, height: '8%', borderRadius: 2, background: 'linear-gradient(90deg, #0a0a0b, #2a2a2e)' }} />
      <div style={{ position: 'absolute', right: -3, top: '30%', width: 5, height: '12%', borderRadius: 2, background: 'linear-gradient(270deg, #0a0a0b, #2a2a2e)' }} />

      {/* Tela */}
      <div
        style={{
          position: 'absolute',
          inset: screenInset,
          borderRadius: screenBorderRadius,
          overflow: 'hidden',
          background: '#000',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {src ? (
          <Img
            src={src}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.35)',
              fontSize: width * 0.05,
              fontFamily: 'Arial, sans-serif',
              textAlign: 'center', padding: 24,
            }}
          >
            Envie um print do Spotify
          </div>
        )}

        {dynamicIsland ? (
          <div
            style={{
              position: 'absolute', top: width * 0.025, left: '50%',
              transform: 'translateX(-50%)',
              width: width * 0.31, height: width * 0.065,
              borderRadius: 9999, background: '#000',
              boxShadow: 'inset 0 0 6px rgba(255,255,255,0.04)',
              zIndex: 2,
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute', top: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: width * 0.5, height: width * 0.06,
              borderBottomLeftRadius: width * 0.04,
              borderBottomRightRadius: width * 0.04,
              background: '#000', zIndex: 2,
            }}
          />
        )}

        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.04) 100%)',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute', top: 0, left: '8%', right: '8%',
          height: 2, borderRadius: 2,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)',
        }}
      />
    </div>
  );
};
