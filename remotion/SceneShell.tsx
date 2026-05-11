import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { MediaLayer } from './MediaLayer';
import { FilmTexture, LightSweeps, Particles } from './Effects';
import type { MediaConfig, RenderTarget } from './types';

export const resolveAsset = (path: string) =>
  path.startsWith('http') ? path : staticFile(path.replace(/^\//, ''));

export const SceneShell: React.FC<{
  media: MediaConfig;
  renderTarget: RenderTarget;
  children: React.ReactNode;
  tint?: string;
}> = ({ media, renderTarget, children, tint = 'rgba(130,40,255,0.23)' }) => {
  const frame = useCurrentFrame();
  const top = renderTarget === 'story' ? 285 : 0;
  const bgScale = interpolate(frame, [0, 240], [1.02, 1.1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050309', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${bgScale})` }}>
        <MediaLayer media={media} />
      </div>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.36), ${tint} 48%, rgba(0,0,0,0.72))`,
        }}
      />
      <Particles intensity={1.05} />
      <LightSweeps />
      <FilmTexture />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top,
          width: 1080,
          height: 1350,
          padding: '74px 70px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const CoverCard: React.FC<{
  src: string;
  size?: number;
  radius?: number;
  children?: React.ReactNode;
}> = ({ src, size = 560, radius = 28, children }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      overflow: 'hidden',
      position: 'relative',
      background: '#111',
      boxShadow: '0 35px 90px rgba(0,0,0,0.65), 0 0 0 2px rgba(255,255,255,0.09)',
    }}
  >
    <Img src={resolveAsset(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    {children}
  </div>
);
