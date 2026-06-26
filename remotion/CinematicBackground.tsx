import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Video, getRemotionEnvironment, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { easings, eased, elegantWiggle, hitPulse } from './motionEngine';
import type { BackgroundConfig } from './types';

type Props = {
  coverImage?: string;
  /** Frames onde a animação tem "hits" (drops, acentos). Usado pra picos de luz. */
  accentFrames?: number[];
  /** Intensidade geral. 1 = padrão. */
  intensity?: number;
  /** Configuração do background (vídeo, cor, opacidade). */
  background?: BackgroundConfig;
};

// ============================================================
// BOKEH PARTICLES
// ============================================================
// 24 partículas com tamanhos/blurs/velocidades variados.
// Substitui as 46 bolinhas duras do template antigo por algo orgânico.
const BOKEH_PARTICLES = Array.from({ length: 24 }, (_, i) => {
  // Distribuição pseudo-aleatória mas determinística (mesma seed sempre)
  const seed = i * 9301 + 49297;
  const rand = (offset = 0) => ((seed + offset) % 233280) / 233280;
  return {
    x: rand(0) * 1080,
    yBase: rand(100) * 1920,
    size: 4 + rand(200) * 14, // 4–18px
    blur: 2 + rand(300) * 6, // 2–8px blur
    speed: 0.15 + rand(400) * 0.45, // velocidade vertical
    opacity: 0.15 + rand(500) * 0.45, // 0.15–0.60
    phase: rand(600) * Math.PI * 2, // fase pro drift X
    driftX: 18 + rand(700) * 28, // 18–46 amplitude X
  };
});

const BokehLayer: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {BOKEH_PARTICLES.map((p, idx) => {
        const y = (p.yBase - frame * p.speed * 1.4) % 2100;
        const x = p.x + Math.sin(frame * 0.018 + p.phase) * p.driftX;
        // Cintilação suave
        const twinkle = 0.85 + Math.sin(frame * 0.04 + p.phase * 2) * 0.15;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: 999,
              background: 'rgba(255, 240, 220, 0.95)',
              filter: `blur(${p.blur}px)`,
              opacity: p.opacity * twinkle * intensity,
              boxShadow: `0 0 ${p.size * 1.4}px rgba(255, 220, 180, 0.65)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================================
// ATMOSPHERIC DUST
// ============================================================
// Pontinhos micro de profundidade (camada de trás).
const DUST_PARTICLES = Array.from({ length: 42 }, (_, i) => {
  const seed = i * 7919 + 1031;
  const rand = (o = 0) => ((seed + o) % 233280) / 233280;
  return {
    x: rand(0) * 1080,
    yBase: rand(100) * 1920,
    size: 1 + rand(200) * 2,
    speed: 0.08 + rand(300) * 0.16,
    opacity: 0.08 + rand(400) * 0.18,
    phase: rand(500) * Math.PI * 2,
  };
});

const DustLayer: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {DUST_PARTICLES.map((p, idx) => {
        const y = (p.yBase - frame * p.speed) % 2000;
        const x = p.x + Math.sin(frame * 0.013 + p.phase) * 14;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.9)',
              opacity: p.opacity * intensity * 0.7,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const CinematicBackground: React.FC<Props> = ({
  coverImage,
  accentFrames = [],
  intensity = 1,
  background,
}) => {
  const frame = useCurrentFrame();
  const isRendering = getRemotionEnvironment().isRendering;

  // Background config (com defaults)
  const bg = background ?? {};
  const lightPreview = !isRendering && bg.previewQuality === 'light';
  const videoSrc = bg.videoSrc;
  const videoStartFrame = bg.videoStartFrame ?? 0;
  const videoOpacity = bg.videoOpacity ?? 1;
  const bgColor = bg.bgColor ?? '#030205';
  const videoBlur = bg.videoBlur ?? 22;
  const videoSaturation = bg.videoSaturation ?? 1.15;

  // Audio config
  const audioSrc = bg.audioSrc;
  const audioStartFrame = Math.floor((bg.audioStartSec ?? 0) * 30);
  const audioVolumeBase = bg.audioVolume ?? 0.8;
  const audioFadeInFrames = Math.floor((bg.audioFadeInSec ?? 0.5) * 30);
  const audioFadeOutFrames = Math.floor((bg.audioFadeOutSec ?? 1) * 30);
  // Audio do BG vem LIGADO por padrao. Toggle na UI = mute (useVideoAudio=false).
  const useVideoAudio = bg.audioSrc ? false : (bg.useVideoAudio ?? true);
  const { durationInFrames, width: compW, height: compH } = useVideoConfig();

  // Calculo do volume com fade in/out (callback p/ Audio/Video evitar warning)
  const calcVolume = (f: number) => {
    const fadeIn = audioFadeInFrames > 0
      ? interpolate(f, [0, audioFadeInFrames], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        })
      : 1;
    const fadeOut = audioFadeOutFrames > 0
      ? interpolate(
          f,
          [durationInFrames - audioFadeOutFrames, durationInFrames],
          [1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      : 1;
    return audioVolumeBase * fadeIn * fadeOut;
  };
  const audioVolume = calcVolume(frame);

  // Ken Burns
  const kbProgress = eased(frame, 0, 240, easings.inOutCubic);
  const kbZoom = 1.16 + kbProgress * 0.06;

  const drift = elegantWiggle(frame, { intensity: 1.4 });
  const accentBoost = accentFrames.reduce(
    (acc, f) => acc + hitPulse(frame, f, 20),
    0
  );
  // Reenquadramento manual do BG (pan + zoom) — pra não cortar a cabeça dos
  // cantores no feed. O pan é feito por TRANSFORM TRANSLATE (não objectPosition),
  // porque o clip otimizado já vem no tamanho EXATO do quadro (1080×1350) e aí
  // objectFit:cover não tem o que recortar → objectPosition viraria no-op. O
  // translate usa o overflow do zoom (Ken Burns + zoom do usuário) e é limitado
  // a esse overflow pra nunca aparecer borda preta.
  const userOffsetX = Math.max(-50, Math.min(50, bg.bgOffsetX ?? 0));
  const userOffsetY = Math.max(-50, Math.min(50, bg.bgOffsetY ?? 0));
  const userZoom = Math.max(1, Math.min(4, bg.bgZoom ?? 1));

  // Pra a Posição aparecer de verdade num clip já no tamanho do quadro, a escala
  // precisa de overflow >= deslocamento pedido. Aumentamos a escala o suficiente
  // (auto-boost) quando o pan passa do overflow já existente. Assim −X% sempre
  // move (e o slider de Zoom soma por cima, se quiser mais).
  const reqFrac = Math.max(Math.abs(userOffsetX), Math.abs(userOffsetY)) / 100;
  const panBoost = 1 + 2 * reqFrac;
  const bgZoom = Math.max((kbZoom + accentBoost * 0.02) * userZoom, panBoost);

  // Translate pré-escala (o CSS multiplica pela escala): retorna o deslocamento
  // já dividido pela escala e limitado ao overflow disponível.
  const panTranslate = (scale: number) => {
    const maxX = Math.max(0, (scale - 1) / 2) * compW;
    const maxY = Math.max(0, (scale - 1) / 2) * compH;
    const wantX = -(userOffsetX / 100) * compW; // offset<0 → mostra a esquerda
    const wantY = -(userOffsetY / 100) * compH; // offset<0 → mostra o topo (cabeças)
    const sx = Math.max(-maxX, Math.min(maxX, wantX));
    const sy = Math.max(-maxY, Math.min(maxY, wantY));
    return { x: sx / scale, y: sy / scale };
  };
  const previewZoom = (lightPreview ? Math.max(1.08 * userZoom, panBoost) : bgZoom);
  const previewDrift = lightPreview ? { x: 0, y: 0 } : drift;
  const renderVideoFilter = `blur(${videoBlur}px) saturate(${videoSaturation}) brightness(0.92)`;
  const previewVideoFilter = `blur(${Math.min(videoBlur, 8)}px) saturate(${videoSaturation}) brightness(0.92)`;
  const lightPreviewBlur = Math.min(18, videoBlur * 0.32);
  const lightPreviewVideoFilter = `blur(${lightPreviewBlur}px) saturate(${videoSaturation}) brightness(0.94)`;
  const stillPreviewFilter = lightPreview
    ? `blur(${Math.min(videoBlur, 8)}px) saturate(${videoSaturation}) brightness(0.94)`
    : `blur(${videoBlur}px) saturate(${videoSaturation}) brightness(0.92)`;

  // Light leak diagonal varrendo (loop infinito)
  const leakPhase = (frame % 200) / 200;
  const leakX = -800 + leakPhase * 2000;

  // Burn: pico de luz nos accent frames
  const burnOpacity = Math.min(accentBoost * 0.35, 0.55);

  return (
    <AbsoluteFill style={{ background: bgColor, overflow: 'hidden' }}>
      {/* ÁUDIO SEPARADO (quando o user subiu um MP3 dedicado) */}
      {audioSrc && !useVideoAudio ? (
        <Audio
          src={audioSrc}
          startFrom={audioStartFrame}
          volume={(f) => calcVolume(f)}
        />
      ) : null}

      {/* CAMADA 0: Vídeo OU Imagem BG (se fornecido) */}
      {videoSrc && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(videoSrc) ? (
        // BG é IMAGEM (ex: gerada pela IA via gpt-image-1) → renderiza com <Img> + Ken Burns
        <AbsoluteFill style={{ opacity: videoOpacity }}>
          <Img
            src={videoSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: stillPreviewFilter,
              transform: lightPreview
                ? `scale(${1.05 * userZoom}) translate(${panTranslate(1.05 * userZoom).x}px, ${panTranslate(1.05 * userZoom).y}px)`
                : `scale(${previewZoom}) translate(${previewDrift.x * 0.6 + panTranslate(previewZoom).x}px, ${previewDrift.y * 0.6 + panTranslate(previewZoom).y}px)`,
            }}
          />
        </AbsoluteFill>
      ) : videoSrc ? (
        <AbsoluteFill style={{ opacity: videoOpacity }}>
          {/* No render usa OffthreadVideo (frame-exato via ffmpeg). No preview do
              Player usa <Video> HTML5 nativo — OffthreadVideo no preview faz seek
              frame-a-frame e TRAVA com vídeo pesado. */}
          {getRemotionEnvironment().isRendering ? (
            <OffthreadVideo
              src={videoSrc}
              startFrom={videoStartFrame}
              muted={!useVideoAudio}
              volume={useVideoAudio ? (f) => calcVolume(f) : 0}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: renderVideoFilter,
                transform: `scale(${bgZoom}) translate(${drift.x * 0.6 + panTranslate(bgZoom).x}px, ${drift.y * 0.6 + panTranslate(bgZoom).y}px)`,
              }}
            />
          ) : (
            <Video
              src={videoSrc}
              startFrom={videoStartFrame}
              muted={!useVideoAudio}
              volume={useVideoAudio ? (f) => calcVolume(f) : 0}
              pauseWhenBuffering={false}
              onError={() => undefined}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                // Blur capado no preview: custo de GPU cresce com o raio² e
                // blur grande num vídeo 1080×1920 a 30fps trava o editor.
                // O render usa o blur cheio (branch OffthreadVideo acima).
                filter: lightPreview ? lightPreviewVideoFilter : previewVideoFilter,
                transform: lightPreview
                  ? `scale(${previewZoom}) translate(${panTranslate(previewZoom).x}px, ${panTranslate(previewZoom).y}px) translateZ(0)`
                  : `scale(${previewZoom}) translate(${previewDrift.x * 0.6 + panTranslate(previewZoom).x}px, ${previewDrift.y * 0.6 + panTranslate(previewZoom).y}px) translateZ(0)`,
                backfaceVisibility: 'hidden',
                willChange: 'auto',
              }}
            />
          )}
        </AbsoluteFill>
      ) : coverImage ? (
        <Img
          src={coverImage}
          style={{
            position: 'absolute',
            left: '-34%',
            top: '-18%',
            width: '168%',
            height: '136%',
            objectFit: 'cover',
            objectPosition: 'center center',
            transform: lightPreview
              ? 'scale(1.08)'
              : `translate(${drift.x * 1.2}px, ${drift.y * 1.2}px) scale(${bgZoom})`,
            filter: lightPreview
              ? 'blur(10px) saturate(1.12) contrast(1.05) brightness(0.94)'
              : 'blur(34px) saturate(1.22) contrast(1.12) brightness(0.92)',
            opacity: 0.94,
          }}
        />
      ) : null}

      {/* Camada 1: Vinheta cinematográfica (radial darkening nas bordas) */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 0%, transparent 38%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Camada 2: Gradiente vertical (escurece topo e base) */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.30) 65%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Camada 3: Color grade (roxo no topo, laranja na base — identidade NovaCena) */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(155, 78, 255, 0.28), transparent 42%), radial-gradient(circle at 50% 82%, rgba(255, 162, 64, 0.22), transparent 45%)',
          mixBlendMode: 'screen',
          opacity: 0.92,
        }}
      />

      {/* Camada 4: Light leak diagonal (varre em loop) */}
      {!lightPreview ? (
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.10) 47%, rgba(180, 120, 255, 0.08) 53%, transparent 70%)',
            transform: `translateX(${leakX}px) rotate(20deg)`,
            filter: 'blur(28px)',
            opacity: 0.4 * intensity,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}

      {/* Camada 5: Burn de hit (pico de luz nos accents) */}
      {!lightPreview && burnOpacity > 0.02 ? (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(circle at 34% 42%, rgba(255, 138, 50, 0.78), transparent 22%), linear-gradient(90deg, transparent, rgba(255, 215, 130, 0.42), transparent)',
            mixBlendMode: 'screen',
            opacity: burnOpacity,
            filter: 'blur(28px)',
          }}
        />
      ) : null}

      {/* Camada 6: Atmospheric dust (trás dos bokeh) */}
      {!lightPreview ? <DustLayer intensity={intensity} /> : null}

      {/* Camada 7: Bokeh principal */}
      {!lightPreview ? <BokehLayer intensity={intensity} /> : null}

      {/* Camada 8: Film grain animado */}
      {!lightPreview ? (
        <AbsoluteFill
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.18) 0 0.8px, transparent 1.4px)',
            backgroundSize: '38px 38px',
            backgroundPosition: `${frame * 0.28}px ${frame * -0.22}px`,
            opacity: 0.10,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}

      {/* Camada 9: Sheen overlay sutil (acabamento) */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(118deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          opacity: lightPreview ? 0.25 : 0.7,
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};
