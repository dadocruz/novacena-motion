import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { easings, eased, elegantWiggle, hitPulse, breathe } from './motionEngine';

type Props = {
  src?: string;
  /** Tamanho do quadrado da capa em pixels. */
  size?: number;
  /** Frame em que a capa entra (entrada fade+scale). */
  entryFrame?: number;
  /** Frame onde os "hits" acontecem (acentos). */
  accentFrames?: number[];
  /** Frame em que o giro Y começa (pode ser depois da entrada). */
  spinStart?: number;
  /** Frame em que o giro Y termina (capa estabiliza frontal). */
  spinEnd?: number;
  /** Número de voltas (1 = 360°, 2 = 720°). */
  spinTurns?: number;
  /** Intensidade do wiggle de posição. */
  wiggleIntensity?: number;
  /** Cor do glow ao redor da capa (segue identidade do template). */
  glowColor?: string;
};

export const PremiumCover: React.FC<Props> = ({
  src,
  size = 510,
  entryFrame = 40,
  accentFrames = [],
  spinStart = 54,
  spinEnd = 218,
  spinTurns = 2,
  wiggleIntensity = 1,
  glowColor = 'rgba(190, 90, 255, 0.24)',
}) => {
  const frame = useCurrentFrame();

  // ENTRADA: fade + scale + leve Y, com easeOutBack
  const entryT = eased(frame, entryFrame, entryFrame + 22, easings.outBack);
  const entryOpacity = eased(frame, entryFrame, entryFrame + 14, easings.outCubic);
  const entryScale = 0.82 + entryT * 0.18;
  const entryY = (1 - entryT) * 48;

  // GIRO Y: easeInOutSine pra começar e terminar suave
  const spinT = eased(frame, spinStart, spinEnd, easings.inOutSine);
  const spinAngle = spinT * 360 * spinTurns;

  // WIGGLE orgânico
  const wig = elegantWiggle(frame, { intensity: wiggleIntensity * 1.2, offset: 200 });

  // HIT: pulso de escala nos acentos
  const accentBoost = accentFrames.reduce(
    (acc, f) => acc + hitPulse(frame, f, 16),
    0
  );
  const hitScale = 1 + accentBoost * 0.025;

  // BREATHE: respiração contínua de scale
  const breath = breathe(frame, { period: 110, amount: 0.012 });

  // REFLEXO BRILHANTE: varre em loop a cada ~70 frames
  const shinePhase = ((frame - entryFrame) % 70) / 70;
  const shineX = -110 + shinePhase * 220; // -110% a 110%
  const shineOpacity = (() => {
    // Sino: 0 → 0.85 → 0
    if (shinePhase < 0.35) return (shinePhase / 0.35) * 0.85;
    if (shinePhase < 0.65) return 0.85;
    return ((1 - shinePhase) / 0.35) * 0.85;
  })();

  // SOMBRA DINÂMICA: elipse embaixo que muda com o giro (escala X do sin do ângulo)
  const shadowSquish = Math.abs(Math.cos((spinAngle * Math.PI) / 180));
  const shadowWidth = size * 0.85 * (0.55 + shadowSquish * 0.45);
  const shadowOpacity = 0.35 + shadowSquish * 0.2;

  // BORDA GLOW: pulsa nos acentos
  const glowIntensity = accentBoost;

  const transform = `translate(${wig.x}px, ${wig.y + entryY}px) rotate(${wig.rotate}deg) rotateY(${spinAngle}deg) scale(${entryScale * hitScale * breath})`;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        opacity: entryOpacity,
        perspective: 1400,
        perspectiveOrigin: 'center center',
      }}
    >
      {/* SOMBRA DINÂMICA embaixo */}
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

      {/* WRAPPER 3D */}
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
        {/* FACE FRONTAL */}
        <Face
          src={src}
          size={size}
          shineX={shineX}
          shineOpacity={shineOpacity}
          glowColor={glowColor}
          glowIntensity={glowIntensity}
        />

        {/* FACE TRASEIRA — mesma imagem espelhada pra parecer contínuo */}
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
            glowIntensity={glowIntensity}
            mirrored
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// FACE INTERNA (reutilizada pra frente e verso)
// ============================================================
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

      {/* REFLEXO varrendo */}
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

      {/* BORDA INTERNA glow (sutil) */}
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
