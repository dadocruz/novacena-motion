import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  Freeze,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
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
  loopMode?: 'normal' | 'pingpong';
  loopEnabled?: boolean;
  sourceDurationSec?: number;
  layout?: 'cover' | 'element';
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  entryTransition?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-pop' | 'bounce-left';
  entryDurationFrames?: number;
  wigglePosition?: number;
  wiggleRotate?: number;
  wiggleSpeed?: number;
  shadowBlur?: number;
  shadowOpacity?: number;
  shadowColor?: string;
  outlineWidth?: number;
  outlineColor?: string;
  gradientEnabled?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientOpacity?: number;
  tintEnabled?: boolean;
  tintColor?: string;
  tintOpacity?: number;
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

function normalizeRenderableSrc(src: string) {
  if (src.startsWith('/api/uploads/')) {
    return src;
  }
  if (src.startsWith('/uploads/')) {
    return staticFile(src.replace(/^\/+/, ''));
  }
  return src;
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
    src: normalizeRenderableSrc(item.src),
    type: item.type ?? (isVideoSrc(item.src) ? 'video' : 'image'),
    startSec: item.startSec ?? 0,
    durationSec: item.durationSec ?? 0,
    opacity: item.opacity ?? 0.45,
    blendMode: item.blendMode ?? 'screen',
    loopMode: item.loopMode ?? 'normal',
    loopEnabled: item.loopEnabled === true,
    sourceDurationSec: item.sourceDurationSec,
    layout: item.layout ?? 'cover',
    x: item.x ?? 0,
    y: item.y ?? 0,
    scale: item.scale ?? 1,
    rotate: item.rotate ?? 0,
    entryTransition: item.entryTransition ?? 'none',
    entryDurationFrames: item.entryDurationFrames ?? 18,
    wigglePosition: item.wigglePosition ?? 0,
    wiggleRotate: item.wiggleRotate ?? 0,
    wiggleSpeed: item.wiggleSpeed ?? 1,
    shadowBlur: item.shadowBlur ?? 0,
    shadowOpacity: item.shadowOpacity ?? 0,
    shadowColor: item.shadowColor ?? '#000000',
    outlineWidth: item.outlineWidth ?? 0,
    outlineColor: item.outlineColor ?? '#ffffff',
    gradientEnabled: item.gradientEnabled ?? false,
    gradientFrom: item.gradientFrom ?? '#1ed760',
    gradientTo: item.gradientTo ?? '#8b5cf6',
    gradientOpacity: item.gradientOpacity ?? 0.35,
    tintEnabled: item.tintEnabled ?? false,
    tintColor: item.tintColor ?? '#ffffff',
    tintOpacity: item.tintOpacity ?? 1,
  };
}

function hexToRgba(color: string, opacity: number) {
  const clean = color.trim();
  if (clean.startsWith('rgb')) return clean;
  const hex = clean.replace('#', '');
  if (hex.length !== 6) return clean;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function elementEntryStyle(frame: number, overlay: OverlayItem) {
  const duration = Math.max(1, overlay.entryDurationFrames ?? 18);
  const progress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const eased = 1 - Math.pow(1 - progress, 3);

  if (overlay.entryTransition === 'fade' || overlay.entryTransition === 'none') {
    return { opacityMul: overlay.entryTransition === 'fade' ? eased : 1, x: 0, y: 0, scale: 1 };
  }

  if (overlay.entryTransition === 'zoom-pop') {
    const scale = interpolate(frame, [0, duration * 0.55, duration], [0.72, 1.14, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { opacityMul: eased, x: 0, y: 0, scale };
  }

  if (overlay.entryTransition === 'bounce-left') {
    const x = interpolate(frame, [0, duration * 0.55, duration], [-260, 26, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { opacityMul: eased, x, y: 0, scale: 1 };
  }

  const distance = 220;
  const x =
    overlay.entryTransition === 'slide-left' ? -distance * (1 - eased) :
    overlay.entryTransition === 'slide-right' ? distance * (1 - eased) :
    0;
  const y =
    overlay.entryTransition === 'slide-up' ? -distance * (1 - eased) :
    overlay.entryTransition === 'slide-down' ? distance * (1 - eased) :
    0;

  return { opacityMul: eased, x, y, scale: 1 };
}

const ElementImage: React.FC<{ overlay: OverlayItem }> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const entry = elementEntryStyle(frame, overlay);
  const speed = 0.06 * (overlay.wiggleSpeed ?? 1);
  const wiggleX = Math.sin(frame * speed + 1.7) * (overlay.wigglePosition ?? 0);
  const wiggleY = Math.sin(frame * speed * 0.73 + 3.1) * (overlay.wigglePosition ?? 0) * 0.65;
  const wiggleRotate = Math.sin(frame * speed * 0.86 + 0.4) * (overlay.wiggleRotate ?? 0);
  const width = 320;
  const outlineWidth = Math.max(0, overlay.outlineWidth ?? 0);
  const outline = outlineWidth > 0
    ? [
        `drop-shadow(${outlineWidth}px 0 0 ${overlay.outlineColor})`,
        `drop-shadow(${-outlineWidth}px 0 0 ${overlay.outlineColor})`,
        `drop-shadow(0 ${outlineWidth}px 0 ${overlay.outlineColor})`,
        `drop-shadow(0 ${-outlineWidth}px 0 ${overlay.outlineColor})`,
      ]
    : [];
  const shadow = (overlay.shadowOpacity ?? 0) > 0 && (overlay.shadowBlur ?? 0) > 0
    ? [`drop-shadow(0 ${Math.round((overlay.shadowBlur ?? 0) * 0.35)}px ${overlay.shadowBlur}px ${hexToRgba(overlay.shadowColor ?? '#000000', overlay.shadowOpacity ?? 0)})`]
    : [];

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          width,
          transform: `translate(${(overlay.x ?? 0) + entry.x + wiggleX}px, ${(overlay.y ?? 0) + entry.y + wiggleY}px) rotate(${(overlay.rotate ?? 0) + wiggleRotate}deg) scale(${(overlay.scale ?? 1) * entry.scale})`,
          opacity: (overlay.opacity ?? 1) * entry.opacityMul,
          mixBlendMode: normalizeBlendMode(overlay.blendMode),
          pointerEvents: 'none',
        }}
      >
        {overlay.gradientEnabled ? (
          <div
            style={{
              position: 'absolute',
              inset: '-18%',
              borderRadius: '999px',
              background: `radial-gradient(circle, ${hexToRgba(overlay.gradientFrom ?? '#1ed760', overlay.gradientOpacity ?? 0.35)} 0%, ${hexToRgba(overlay.gradientTo ?? '#8b5cf6', (overlay.gradientOpacity ?? 0.35) * 0.7)} 45%, rgba(0,0,0,0) 72%)`,
              filter: 'blur(10px)',
            }}
          />
        ) : null}
        {overlay.tintEnabled ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              background: hexToRgba(overlay.tintColor ?? '#ffffff', overlay.tintOpacity ?? 1),
              WebkitMaskImage: `url(${overlay.src})`,
              maskImage: `url(${overlay.src})`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              filter: [...outline, ...shadow].join(' ') || undefined,
            }}
          />
        ) : (
          <Img
            src={overlay.src}
            style={{
              position: 'relative',
              width: '100%',
              height: 'auto',
              display: 'block',
              filter: [...outline, ...shadow].join(' ') || undefined,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

const FrameControlledVideo: React.FC<{
  src: string;
  sourceDurationInFrames: number;
  loopEnabled: boolean;
  loopMode: 'normal' | 'pingpong';
  style: React.CSSProperties;
}> = ({ src, sourceDurationInFrames, loopEnabled, loopMode, style }) => {
  const frame = useCurrentFrame();
  const lastFrame = Math.max(1, sourceDurationInFrames - 1);
  let mediaFrame = Math.min(frame, lastFrame);

  if (loopEnabled && loopMode === 'normal') {
    mediaFrame = frame % sourceDurationInFrames;
  }

  if (loopEnabled && loopMode === 'pingpong') {
    const cycleDuration = Math.max(2, lastFrame * 2);
    const cycleFrame = frame % cycleDuration;
    mediaFrame = cycleFrame <= lastFrame ? cycleFrame : cycleDuration - cycleFrame;
  }

  return (
    <Freeze frame={mediaFrame}>
      <Video
        src={src}
        muted
        style={style}
      />
    </Freeze>
  );
};

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
        const sourceDurationInFrames =
          overlay.sourceDurationSec && overlay.sourceDurationSec > 0
            ? Math.max(1, Math.round(overlay.sourceDurationSec * fps))
            : sequenceDuration;

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
                <FrameControlledVideo
                  src={overlay.src}
                  sourceDurationInFrames={sourceDurationInFrames}
                  loopEnabled={overlay.loopEnabled === true}
                  loopMode={overlay.loopMode ?? 'normal'}
                  style={commonStyle}
                />
              ) : overlay.layout === 'element' ? (
                <ElementImage overlay={overlay} />
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
