import React from 'react';
import {
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { PlatformName } from './types';

type Props = {
  name: PlatformName;
  size?: number;
  variant?: 'badge' | 'icon';
  delay?: number;
  /** Caminho de logo customizado. Quando definido, sobrescreve o SVG inline. */
  customSrc?: string;
};

const COLORS: Record<PlatformName, string> = {
  Spotify: '#1DB954',
  Deezer: '#A238FF',
  'Apple Music': '#FA243C',
  'YouTube Music': '#FF0000',
  YouTube: '#FF0000',
};

export const PlatformLogo: React.FC<Props> = ({
  name,
  size = 72,
  delay = 0,
  customSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - delay;

  const entrance = spring({
    frame: localFrame,
    fps,
    config: { damping: 13, mass: 0.65, stiffness: 135 },
  });

  const opacity = interpolate(localFrame, [0, 8, 18], [0, 0.65, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flipY = interpolate(localFrame, [0, 18], [75, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotateZ = interpolate(localFrame, [0, 18], [-7, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(localFrame, [0, 18], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        opacity,
        transform: `
          perspective(700px)
          translateY(${translateY}px)
          rotateY(${flipY}deg)
          rotateZ(${rotateZ}deg)
          scale(${0.82 + entrance * 0.18})
        `,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: Math.round(size * 0.8),
          height: Math.round(size * 0.3),
          borderRadius: 999,
          background: COLORS[name],
          filter: `blur(${Math.round(size * 0.22)}px)`,
          opacity: 0.32,
          transform: 'translateY(6px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          filter: `
            drop-shadow(0 2px 2px rgba(0,0,0,0.42))
            drop-shadow(0 8px 14px rgba(0,0,0,0.32))
          `,
        }}
      >
        {customSrc ? (
          <Img
            src={customSrc}
            style={{
              width: size,
              height: size,
              objectFit: 'contain',
            }}
          />
        ) : (
          <PlatformSvg name={name} size={size} />
        )}
      </div>
    </div>
  );
};

const PlatformSvg: React.FC<{ name: PlatformName; size: number }> = ({
  name,
  size,
}) => {
  if (name === 'Spotify') {
    return (
      <svg width={size} height={size} viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg">
        <circle cx="84" cy="84" r="84" fill="#1DB954" />
        <path
          d="M124.84 116.46c-1.65 2.7-5.18 3.55-7.88 1.9-21.59-13.19-48.78-16.18-80.81-8.86-3.08.7-6.15-1.22-6.86-4.3-.7-3.08 1.22-6.16 4.3-6.86 35.04-8 65.1-4.55 89.31 10.24 2.7 1.66 3.55 5.18 1.94 7.88zm10.86-23.4c-2.08 3.37-6.5 4.44-9.87 2.36-24.7-15.18-62.36-19.58-91.55-10.72-3.79 1.14-7.8-.99-8.95-4.78-1.13-3.79 1-7.78 4.78-8.93 33.4-10.13 74.86-5.22 103.2 12.18 3.37 2.08 4.44 6.5 2.39 9.89zm.93-24.36c-29.62-17.6-78.5-19.22-106.78-10.64-4.55 1.38-9.36-1.19-10.74-5.74-1.38-4.55 1.19-9.36 5.74-10.75 32.46-9.86 86.43-7.95 120.54 12.3 4.1 2.43 5.45 7.73 3.02 11.82-2.42 4.1-7.73 5.45-11.78 3.01z"
          fill="#fff"
        />
      </svg>
    );
  }

  if (name === 'Apple Music') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="am-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FC4664" />
            <stop offset="100%" stopColor="#FA253C" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#am-grad)" />
        <path
          d="M67.5 24.6c0-.9-.5-1.4-1.4-1.2L38 28.7c-1 .2-1.5.8-1.5 1.8v36.6c-1.7-.9-3.9-1.4-6.3-1.4-6.8 0-12.3 4.5-12.3 10s5.5 10 12.3 10c6.8 0 12.3-4.5 12.3-10V35.7l21.2-3.8v25.7c-1.7-.9-3.9-1.4-6.3-1.4-6.8 0-12.3 4.5-12.3 10s5.5 10 12.3 10c6.8 0 12.3-4.5 12.3-10V24.6z"
          fill="#fff"
        />
      </svg>
    );
  }

  if (name === 'Deezer') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#000" />
        <rect x="60" y="28" width="14" height="10" rx="1.5" fill="#9B59FF" />
        <rect x="78" y="28" width="14" height="10" rx="1.5" fill="#9B59FF" />
        <rect x="42" y="42" width="14" height="10" rx="1.5" fill="#FF6E51" />
        <rect x="60" y="42" width="14" height="10" rx="1.5" fill="#FF7AD1" />
        <rect x="78" y="42" width="14" height="10" rx="1.5" fill="#5BBFFF" />
        <rect x="8" y="56" width="14" height="10" rx="1.5" fill="#9B59FF" />
        <rect x="26" y="56" width="14" height="10" rx="1.5" fill="#FF6E51" />
        <rect x="44" y="56" width="14" height="10" rx="1.5" fill="#FFCC44" />
        <rect x="62" y="56" width="14" height="10" rx="1.5" fill="#5BBFFF" />
        <rect x="80" y="56" width="14" height="10" rx="1.5" fill="#9B59FF" />
        <rect x="8" y="70" width="14" height="10" rx="1.5" fill="#FF6E51" />
        <rect x="26" y="70" width="14" height="10" rx="1.5" fill="#FFCC44" />
        <rect x="44" y="70" width="14" height="10" rx="1.5" fill="#5BBFFF" />
        <rect x="62" y="70" width="14" height="10" rx="1.5" fill="#9B59FF" />
        <rect x="80" y="70" width="14" height="10" rx="1.5" fill="#FF6E51" />
      </svg>
    );
  }

  if (name === 'YouTube Music') {
    return (
      <svg width={size} height={size} viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
        <circle cx="96" cy="96" r="96" fill="#fff" />
        <circle cx="96" cy="96" r="76" fill="none" stroke="#FF0000" strokeWidth="14" />
        <path d="M78 70v52l44-26z" fill="#FF0000" />
      </svg>
    );
  }

  if (name === 'YouTube') {
    return (
      <svg width={size} height={size * 0.7} viewBox="0 0 90 64" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M87.84 9.97c-1.04-3.85-4.06-6.88-7.92-7.92C72.92.05 45 .05 45 .05S17.08.05 10.08 2.05c-3.85 1.04-6.88 4.07-7.92 7.92C.16 16.97.16 32 .16 32s0 15.03 2 22.03c1.04 3.85 4.06 6.88 7.92 7.92 7 2 34.92 2 34.92 2s27.92 0 34.92-2c3.85-1.04 6.88-4.07 7.92-7.92 2-7 2-22.03 2-22.03s0-15.03-2-22.03z"
          fill="#FF0000"
        />
        <path d="M36 46l24-14-24-14z" fill="#fff" />
      </svg>
    );
  }

  return null;
};
