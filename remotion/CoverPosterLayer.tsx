import React from 'react';
import { AbsoluteFill, Img, Sequence, useVideoConfig } from 'remotion';

export type PosterConfig = {
  enabled?: boolean;
  /** 'composition' = a capa é segurada por frames DENTRO da composição (render
   *  Lambda). 'ffmpeg' = poster feito por pós-processo no desktop → aqui NÃO faz
   *  nada (evita capa dobrada). */
  mode?: 'composition' | 'ffmpeg';
  /** Segundos que a capa fica segurada no começo (e no fim, se outro). */
  holdSec?: number;
  outroEnabled?: boolean;
  /** URL da capa a exibir. */
  cover?: string;
};

const CoverFull: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill style={{ background: '#000', zIndex: 9999 }}>
    {/* Fundo borrado pra preencher o quadro sem barras pretas */}
    <Img
      src={src}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.55)', transform: 'scale(1.15)' }}
    />
    {/* Capa nítida e inteira, centralizada */}
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Img src={src} style={{ maxWidth: '86%', maxHeight: '86%', objectFit: 'contain', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Segura a capa nos frames iniciais (e opcionalmente finais) do vídeo, pra que
 *  o 1º frame do export seja a capa (thumbnail Insta/YouTube). Renderizada em
 *  TODOS os templates, ACIMA de tudo. Só age no modo 'composition' (Lambda);
 *  no desktop o poster é feito por ffmpeg e este componente fica inerte. */
export const CoverPosterLayer: React.FC<{ poster?: PosterConfig }> = ({ poster }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!poster?.enabled || poster.mode !== 'composition' || !poster.cover) return null;

  const holdFrames = Math.max(1, Math.round((poster.holdSec ?? 1) * fps));
  const intro = Math.min(holdFrames, durationInFrames);
  const outro = poster.outroEnabled ? Math.min(holdFrames, durationInFrames) : 0;

  return (
    <>
      <Sequence from={0} durationInFrames={intro} style={{ zIndex: 9999 }}>
        <CoverFull src={poster.cover} />
      </Sequence>
      {outro > 0 && (
        <Sequence from={Math.max(0, durationInFrames - outro)} durationInFrames={outro} style={{ zIndex: 9999 }}>
          <CoverFull src={poster.cover} />
        </Sequence>
      )}
    </>
  );
};

export default CoverPosterLayer;
