import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  Freeze,
  Loop,
  Video,
  getRemotionEnvironment,
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
  previewQuality?: 'full' | 'light';
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
    previewQuality: item.previewQuality ?? 'full',
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

function hexToHsl(color: string) {
  const hex = color.trim().replace('#', '');
  if (hex.length !== 6) return { h: 0, s: 0, l: 1 };

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / delta + 2;
    if (max === b) h = (r - g) / delta + 4;
    h *= 60;
  }

  return { h, s, l };
}

function alphaMediaTintFilter(color: string) {
  const { h, s, l } = hexToHsl(color);
  const invert = Math.max(0, Math.min(100, l * 95));
  const saturation = Math.max(100, Math.round(650 + s * 2600));
  const brightness = Math.max(55, Math.min(155, Math.round(68 + l * 70)));
  return `brightness(0) saturate(100%) invert(${invert}%) sepia(95%) saturate(${saturation}%) hue-rotate(${Math.round(h - 45)}deg) brightness(${brightness}%)`;
}

function outlineFilter(overlay: OverlayItem) {
  const outlineWidth = Math.max(0, overlay.outlineWidth ?? 0);
  if (outlineWidth <= 0) return [];

  const color = overlay.outlineColor ?? '#ffffff';
  return [
    `drop-shadow(${outlineWidth}px 0 0 ${color})`,
    `drop-shadow(${-outlineWidth}px 0 0 ${color})`,
    `drop-shadow(0 ${outlineWidth}px 0 ${color})`,
    `drop-shadow(0 ${-outlineWidth}px 0 ${color})`,
  ];
}

function coverMediaFilter(overlay: OverlayItem) {
  const filters: string[] = [];
  if (overlay.tintEnabled || overlay.gradientEnabled) {
    filters.push(alphaMediaTintFilter(overlay.gradientEnabled ? (overlay.gradientFrom ?? overlay.tintColor ?? '#ffffff') : (overlay.tintColor ?? '#ffffff')));
  }
  filters.push(...outlineFilter(overlay));
  return filters.join(' ') || undefined;
}

const CoverImage: React.FC<{ overlay: OverlayItem; style: React.CSSProperties }> = ({ overlay, style }) => {
  const baseOpacity = typeof style.opacity === 'number' ? style.opacity : 1;

  if (overlay.tintEnabled || overlay.gradientEnabled) {
    const background = overlay.gradientEnabled
      ? `linear-gradient(135deg, ${hexToRgba(overlay.gradientFrom ?? '#ffffff', 1)} 0%, ${hexToRgba(overlay.gradientTo ?? '#ff4f73', 1)} 100%)`
      : hexToRgba(overlay.tintColor ?? '#ffffff', 1);

    return (
      <AbsoluteFill
        style={{
          ...style,
          background,
          opacity: baseOpacity * (overlay.gradientEnabled ? (overlay.gradientOpacity ?? 0.75) : (overlay.tintOpacity ?? 1)),
          WebkitMaskImage: `url(${overlay.src})`,
          maskImage: `url(${overlay.src})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'cover',
          maskSize: 'cover',
          filter: outlineFilter(overlay).join(' ') || undefined,
        }}
      />
    );
  }

  return (
    <Img
      src={overlay.src}
      style={{
        ...style,
        filter: outlineFilter(overlay).join(' ') || undefined,
      }}
    />
  );
};

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
  previewQuality?: 'full' | 'light';
}> = ({ src, sourceDurationInFrames, loopEnabled, loopMode, style, previewQuality = 'full' }) => {
  const frame = useCurrentFrame();
  const lastFrame = Math.max(1, sourceDurationInFrames - 1);

  // PREVIEW (Player): reprodução nativa, suave. Frame-controlar via <Freeze>
  // força um seek por frame e TRAVA o editor. Aqui o vídeo toca em tempo real;
  // o pingpong vira loop normal só no preview (o render faz o pingpong exato).
  if (!getRemotionEnvironment().isRendering) {
    const previewStyle = previewQuality === 'light'
      ? {
          ...style,
          filter: undefined,
          boxShadow: undefined,
          willChange: 'auto',
        }
      : style;
    const nativeVideo = (
      <Video
        src={src}
        muted
        pauseWhenBuffering={false}
        onError={() => undefined}
        style={previewStyle}
      />
    );
    return loopEnabled ? (
      <Loop durationInFrames={Math.max(2, sourceDurationInFrames)}>{nativeVideo}</Loop>
    ) : (
      nativeVideo
    );
  }

  // RENDER: frame-exato (inclui pingpong real).
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

// Vídeo overlay com tint/degradê. Sem gradiente => 1 cópia (leve).
// Com gradiente => 2 cópias recoloridas (from/to) mascaradas por linear-gradients
// opostos: gera um degradê REAL que respeita o alpha do vídeo, sem ficar chapado.
const CoverVideoTinted: React.FC<{
  overlay: OverlayItem;
  sourceDurationInFrames: number;
  baseStyle: React.CSSProperties;
}> = ({ overlay, sourceDurationInFrames, baseStyle }) => {
  const common = {
    src: overlay.src,
    sourceDurationInFrames,
    loopEnabled: overlay.loopEnabled === true,
    loopMode: overlay.loopMode ?? 'normal',
    previewQuality: overlay.previewQuality ?? 'full',
  } as const;

  if (!overlay.gradientEnabled || (!getRemotionEnvironment().isRendering && overlay.previewQuality === 'light')) {
    return (
      <FrameControlledVideo
        {...common}
        style={{
          ...baseStyle,
          filter: overlay.previewQuality === 'light' ? undefined : coverMediaFilter(overlay),
        }}
      />
    );
  }

  // opacity e mixBlendMode vão no wrapper para o degradê compor como uma unidade
  // (e não dobrar a opacidade na zona de transição das duas cópias).
  const { opacity, mixBlendMode, ...mediaStyle } = baseStyle;
  const from = overlay.gradientFrom ?? '#1ed760';
  const to = overlay.gradientTo ?? '#8b5cf6';
  const maskFrom = 'linear-gradient(135deg, #000 0%, #000 30%, rgba(0,0,0,0) 78%)';
  const maskTo = 'linear-gradient(135deg, rgba(0,0,0,0) 22%, #000 70%, #000 100%)';
  const outline = outlineFilter(overlay).join(' ');

  const copyStyle = (color: string, mask: string, withOutline: boolean): React.CSSProperties => ({
    ...mediaStyle,
    position: 'absolute',
    inset: 0,
    filter: [alphaMediaTintFilter(color), withOutline ? outline : ''].filter(Boolean).join(' ') || undefined,
    WebkitMaskImage: mask,
    maskImage: mask,
  });

  return (
    <AbsoluteFill style={{ opacity, mixBlendMode }}>
      <FrameControlledVideo {...common} style={copyStyle(from, maskFrom, false)} />
      <FrameControlledVideo {...common} style={copyStyle(to, maskTo, Boolean(outline))} />
    </AbsoluteFill>
  );
};

export const OverlayLayer: React.FC<Props> = ({ overlays = [] }) => {
  const { fps, durationInFrames } = useVideoConfig();

  const normalized = overlays
    .map(normalizeOverlay)
    .filter((item) => Boolean(item.src));

  if (normalized.length === 0) return null;
  const lightPreviewVideoCount = normalized.filter((item) => item.type === 'video' && item.previewQuality === 'light').length;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {normalized.map((overlay, index) => {
        const isRendering = getRemotionEnvironment().isRendering;
        const lightPreviewVideoIndex = normalized
          .slice(0, index)
          .filter((item) => item.type === 'video' && item.previewQuality === 'light')
          .length;
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
          opacity: overlay.type === 'video' && (overlay.tintEnabled || overlay.gradientEnabled)
            ? (overlay.opacity ?? 1) * (overlay.gradientEnabled ? (overlay.gradientOpacity ?? 0.75) : (overlay.tintOpacity ?? 1))
            : overlay.opacity,
          mixBlendMode: normalizeBlendMode(overlay.blendMode),
          pointerEvents: 'none',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          willChange: overlay.previewQuality === 'light' ? 'opacity' : undefined,
        };

        // Posição/escala para vídeo e cover image (o ElementImage já trata a sua).
        const px = overlay.x ?? 0;
        const py = overlay.y ?? 0;
        const pscale = overlay.scale ?? 1;
        const protate = overlay.rotate ?? 0;
        const coverTransform =
          px === 0 && py === 0 && pscale === 1 && protate === 0
            ? undefined
            : `translate(${px}px, ${py}px) rotate(${protate}deg) scale(${pscale})`;

        return (
          <Sequence
            key={`${overlay.src}-${index}`}
            from={startFrame}
            durationInFrames={sequenceDuration}
          >
            <AbsoluteFill style={overlay.layout === 'element' ? undefined : { transform: coverTransform }}>
              {overlay.type === 'video' && !isRendering && overlay.previewQuality === 'light' && lightPreviewVideoCount > 1 && lightPreviewVideoIndex > 0 ? (
                <AbsoluteFill
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    opacity: Math.min(0.22, overlay.opacity ?? 0.2),
                    mixBlendMode: normalizeBlendMode(overlay.blendMode),
                  }}
                />
              ) : overlay.type === 'video' ? (
                <CoverVideoTinted
                  overlay={overlay}
                  sourceDurationInFrames={sourceDurationInFrames}
                  baseStyle={commonStyle}
                />
              ) : overlay.layout === 'element' ? (
                <ElementImage overlay={overlay} />
              ) : (
                <CoverImage overlay={overlay} style={commonStyle} />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
