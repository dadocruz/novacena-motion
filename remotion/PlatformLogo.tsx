import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';

type PlatformLogoProps = {
  name: string;
  size?: number;
  variant?: 'badge' | 'icon';
  delay?: number;
  customSrc?: string;
  index?: number;
  pulseAmount?: number;
  pulseSpeed?: number;
};

export const PlatformLogo: React.FC<PlatformLogoProps> = ({
  name,
  size = 58,
  variant,
  delay = 0,
  customSrc,
  index = 0,
  pulseAmount = 0.06,
  pulseSpeed = 1,
}) => {
  const frame = useCurrentFrame();
  const src = (() => {
    if (!customSrc) return undefined;
    if (customSrc.startsWith('/api/uploads/')) {
      return staticFile(customSrc.replace('/api/uploads/', 'uploads/'));
    }
    if (customSrc.startsWith('/uploads/')) {
      return staticFile(customSrc.replace(/^\/+/, ''));
    }
    return customSrc;
  })();

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const y = interpolate(frame, [delay, delay + 22], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [delay, delay + 8, delay + 16, delay + 24], [0.72, 1.2, 0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const idle = interpolate(frame, [delay + 16, delay + 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const phase = index * 1.65 + name.length * 0.23;
  const speed = 0.075 * pulseSpeed;
  const pulse =
    Math.sin((frame - delay) * speed + phase) * pulseAmount +
    Math.sin((frame - delay) * speed * 0.47 + phase * 0.7) * pulseAmount * 0.42;
  const breatheScale = 1 + pulse * idle;
  const rotate = Math.sin((frame - delay) * speed * 0.78 + phase) * 1.25 * idle;

  if (!src) return null;

  const isCustomWordmark = Boolean(customSrc) && variant !== 'icon';
  const boxWidth = isCustomWordmark ? Math.round(size * 2.8) : size;
  const boxHeight = size;

  return (
    <div
      style={{
        width: boxWidth,
        height: boxHeight,
        opacity,
        transform: `translateY(${y}px) rotate(${rotate}deg) scale(${scale * breatheScale})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        borderRadius: 0,
        overflow: 'hidden',
        lineHeight: 0,
      }}
    >
      <Img
        src={src}
        alt={name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          background: 'transparent',
          verticalAlign: 'top',
        }}
      />
    </div>
  );
};
