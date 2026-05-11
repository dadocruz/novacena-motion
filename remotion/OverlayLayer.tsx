import React from 'react';
import { AbsoluteFill, Html5Video, Img, useCurrentFrame } from 'remotion';
import { overlayInstanceOpacity } from './motionEngine';
import type { OverlayPlacement } from './types';

type Props = {
  overlays?: OverlayPlacement[];
};

const FPS = 30;

export const OverlayLayer: React.FC<Props> = ({ overlays }) => {
  const frame = useCurrentFrame();
  if (!overlays || overlays.length === 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {overlays.map((ov) => {
        const startFrame = Math.floor(ov.startSec * FPS);
        const durationFrames = Math.floor(ov.durationSec * FPS);
        const op = overlayInstanceOpacity(frame, startFrame, durationFrames, 8) * ov.opacity;
        if (op <= 0.005) return null;
        return (
          <AbsoluteFill
            key={ov.id}
            style={{
              opacity: op,
              mixBlendMode: ov.blendMode,
            }}
          >
            {ov.type === 'video' ? (
              <Html5Video
                src={ov.src}
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Img
                src={ov.src}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
