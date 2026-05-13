import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  Loop,
  useVideoConfig,
} from 'remotion';

export type OverlayBlendMode = 'screen' | 'overlay' | 'lighten' | 'soft' | 'soft-light' | 'normal';

export type OverlayItem = {
  src: string;
  type?: 'image' | 'video';
  startSec?: number;
  durationSec?: number;
  opacity?: number;
  blendMode?: OverlayBlendMode;
};

type Props = {
  overlays?: Array<string | OverlayItem>;
};

function isVideoSrc(src: string) {
  return /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(src);
}

function normalizeBlendMode(mode?: OverlayBlendMode): React.CSSProperties['mixBlendMode'] {
  if (mode === 'normal') return 'normal';
  if (mode === 'soft' || mode === 'soft-light') return 'soft-light';
  if (mode === 'lighten') return 'lighten';
  if (mode === 'overlay') return 'overlay';
  return 'screen';
}

function normalizeOverlay(item: string | OverlayItem): OverlayItem {
  if (typeof item === 'string') {
    return {
      src: item,
      type: isVideoSrc(item) ? 'video' : 'image',
      startSec: 0,
      durationSec: 0,
      opacity: 0.45,
      blendMode: 'screen',
    };
  }

  return {
    ...item,
    type: item.type ?? (isVideoSrc(item.src) ? 'video' : 'image'),
    startSec: item.startSec ?? 0,
    durationSec: item.durationSec ?? 0,
    opacity: item.opacity ?? 0.45,
    blendMode: item.blendMode ?? 'screen',
  };
}

export const OverlayLayer: React.FC<Props> = ({ overlays = [] }) => {
  const { fps, durationInFrames } = useVideoConfig();

  const normalized = overlays
    .map(normalizeOverlay)
    .filter((item) => Boolean(item.src));

  if (normalized.length === 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {normalized.map((overlay, index) => {
        const startFrame = Math.max(0, Math.round((overlay.startSec ?? 0) * fps));

        // Regra nova:
        // - imagem sem duração: fica até o fim
        // - vídeo pode ter duração livre
        // - duração <= 0 também fica até o fim
        const requestedDuration =
          overlay.durationSec && overlay.durationSec > 0
            ? Math.round(overlay.durationSec * fps)
            : durationInFrames - startFrame;

        const sequenceDuration = Math.max(1, Math.min(requestedDuration, durationInFrames - startFrame));

        const commonStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: overlay.opacity,
          mixBlendMode: normalizeBlendMode(overlay.blendMode),
          pointerEvents: 'none',
        };

        return (
          <Sequence
            key={`${overlay.src}-${index}`}
            from={startFrame}
            durationInFrames={sequenceDuration}
          >
            <AbsoluteFill>
              {overlay.type === 'video' ? (
                <Loop durationInFrames={sequenceDuration}>
                  <OffthreadVideo
                    src={overlay.src}
                    muted
                    style={commonStyle}
                  />
                </Loop>
              ) : (
                <Img
                  src={overlay.src}
                  style={commonStyle}
                />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
