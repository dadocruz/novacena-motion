import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Img,
  staticFile,
  useVideoConfig,
} from 'remotion';
import type { MediaConfig } from './types';

type Props = {
  media: MediaConfig;
};

/**
 * Resolve o src do vídeo:
 * - Se clipFile existe, usa ele (já cortado por FFmpeg).
 * - Senão, usa o file original e o componente respeita startTime/duration via startFrom.
 */
function resolveVideoSrc(media: MediaConfig): {
  src: string;
  startFrom?: number;
  endAt?: number;
} {
  const path = media.clipFile ?? media.file;
  const src = path.startsWith('http')
    ? path
    : staticFile(path.replace(/^\//, ''));

  // Se usamos clipFile, ele já está cortado — não precisa de startFrom.
  if (media.clipFile) {
    return { src };
  }

  // Caso contrário, calcular startFrom/endAt em frames a partir do startTime/duration em segundos.
  // (frames serão convertidos no componente que chama, usando fps)
  return {
    src,
    startFrom: media.startTime,
    endAt:
      media.startTime !== undefined && media.duration !== undefined
        ? media.startTime + media.duration
        : undefined,
  };
}

export const MediaLayer: React.FC<Props> = ({ media }) => {
  const { fps } = useVideoConfig();
  const resolved = resolveVideoSrc(media);

  // Converter segundos -> frames quando estamos usando file original
  const startFromFrames =
    resolved.startFrom !== undefined
      ? Math.round(resolved.startFrom * fps)
      : undefined;
  const endAtFrames =
    resolved.endAt !== undefined
      ? Math.round(resolved.endAt * fps)
      : undefined;

  // ----- IMAGEM (fallback quando media.type === 'image') -----
  if (media.type === 'image') {
    return renderImage(resolved.src, media.framingMode);
  }

  // ----- VÍDEO -----
  switch (media.framingMode) {
    case 'cover_crop':
      // Vídeo preenche todo o canvas, corta as laterais
      return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
          <OffthreadVideo
            src={resolved.src}
            startFrom={startFromFrames}
            endAt={endAtFrames}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      );

    case 'contain_blur':
      // Vídeo inteiro centralizado + mesmo vídeo desfocado no fundo
      return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
          {/* Camada de fundo: vídeo ampliado e desfocado */}
          <AbsoluteFill>
            <OffthreadVideo
              src={resolved.src}
              startFrom={startFromFrames}
              endAt={endAtFrames}
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(40px) brightness(0.5) saturate(1.1)',
                transform: 'scale(1.2)',
              }}
            />
          </AbsoluteFill>
          {/* Camada principal: vídeo inteiro contido */}
          <AbsoluteFill
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <OffthreadVideo
              src={resolved.src}
              startFrom={startFromFrames}
              endAt={endAtFrames}
              muted
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      );

    case 'background_blur':
      // Vídeo só como fundo desfocado e escurecido — textos/capa ficam por cima
      return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
          <OffthreadVideo
            src={resolved.src}
            startFrom={startFromFrames}
            endAt={endAtFrames}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(50px) brightness(0.4) saturate(1.15)',
              transform: 'scale(1.25)',
            }}
          />
          {/* Vinheta extra pra dar profundidade */}
          <AbsoluteFill
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </AbsoluteFill>
      );

    case 'smart_crop':
      // Não implementado no MVP — fallback para cover_crop com aviso visual
      return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
          <OffthreadVideo
            src={resolved.src}
            startFrom={startFromFrames}
            endAt={endAtFrames}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      );

    default:
      return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  }
};

function renderImage(src: string, framingMode: MediaConfig['framingMode']) {
  if (framingMode === 'background_blur' || framingMode === 'contain_blur') {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(40px) brightness(0.4) saturate(1.1)',
            transform: 'scale(1.2)',
          }}
        />
      </AbsoluteFill>
    );
  }
  // cover_crop / smart_crop
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Img
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </AbsoluteFill>
  );
}
