import React from 'react';
import { Img, interpolate, useCurrentFrame } from 'remotion';

type PlatformLogoProps = {
  name: string;
  size?: number;
  variant?: 'badge' | 'icon';
  delay?: number;
  customSrc?: string;
};

export const PlatformLogo: React.FC<PlatformLogoProps> = ({
  name,
  size = 58,
  delay = 0,
  customSrc,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const y = interpolate(frame, [delay, delay + 22], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [delay, delay + 20], [0.84, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (!customSrc) return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        borderRadius: 0,
        overflow: 'visible',
      }}
    >
      <Img
        src={customSrc}
        alt={name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          background: 'transparent',
          filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.38))',
        }}
      />
    </div>
  );
};
