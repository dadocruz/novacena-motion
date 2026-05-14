import React from 'react';
import { AbsoluteFill } from 'remotion';

export type WatermarkAnchor =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type WatermarkConfig = {
  url?: string;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  rotation?: number;
  anchor?: WatermarkAnchor;
  baseSize?: number;
};

const ANCHOR_TRANSFORM: Record<WatermarkAnchor, string> = {
  'center': 'translate(-50%, -50%)',
  'top-left': 'translate(0, 0)',
  'top-right': 'translate(-100%, 0)',
  'bottom-left': 'translate(0, -100%)',
  'bottom-right': 'translate(-100%, -100%)',
};

export const Watermark: React.FC<WatermarkConfig> = ({
  url,
  x = 4,
  y = 50,
  scale = 1,
  opacity = 0.7,
  rotation = -90,
  anchor = 'center',
  baseSize = 120,
}) => {
  if (!url) return null;
  const anchorTx = ANCHOR_TRANSFORM[anchor] ?? ANCHOR_TRANSFORM['center'];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 50 }}>
      <div
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: `${baseSize * scale}px`,
          height: 'auto',
          opacity,
          transform: `${anchorTx} rotate(${rotation}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <img
          src={url}
          alt="watermark"
          style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default Watermark;
