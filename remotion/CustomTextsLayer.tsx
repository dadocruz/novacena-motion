import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { findFont, applyTextStyle } from '../lib/fontCatalog';
import { getTextTransition } from './motionEngine';
import { StyledText } from './StyledText';
import { FontFaces } from './FontFaces';
import type { CustomTextLayer, TextTransitionId } from './types';

type FontFaceDef = React.ComponentProps<typeof FontFaces>['fonts'];

// Offset de saída em função de "shown" (1 = visível/neutro, 0 = saiu/deslocado).
function exitOffset(t: CustomTextLayer['transitionOut'], shown: number) {
  const p = Math.min(1, Math.max(0, shown));
  const inv = 1 - p;
  switch (t) {
    case 'fade': return { opacity: p, tx: 0, ty: 0, scale: 1 };
    case 'slide-up': return { opacity: p, tx: 0, ty: -inv * 90, scale: 1 };
    case 'slide-down': return { opacity: p, tx: 0, ty: inv * 90, scale: 1 };
    case 'slide-left': return { opacity: p, tx: -inv * 120, ty: 0, scale: 1 };
    case 'slide-right': return { opacity: p, tx: inv * 120, ty: 0, scale: 1 };
    case 'zoom-pop': return { opacity: p, tx: 0, ty: 0, scale: 0.7 + 0.3 * p };
    default: return { opacity: 1, tx: 0, ty: 0, scale: 1 };
  }
}

const OneCustomText: React.FC<{ ct: CustomTextLayer; sequenceDurationInFrames: number }> = ({
  ct,
  sequenceDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const font = findFont(ct.fontId);
  const userStyle = (ct.style ?? {}) as Record<string, unknown>;

  // Entrada: mesma engine dos roles (transform + opacity no wrapper).
  const transitionId = (ct.transitionIn ?? 'mask_reveal') as TextTransitionId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anim: any = getTextTransition(transitionId)(frame, 0, undefined);

  // Saída independente.
  const exitDur = Math.max(1, ct.exitDurationFrames ?? Math.round(0.4 * fps));
  const hasExit = Boolean(ct.transitionOut && ct.transitionOut !== 'none');
  const exitShown = hasExit
    ? Math.min(1, Math.max(0, (sequenceDurationInFrames - frame) / exitDur))
    : 1;
  const ex = exitOffset(ct.transitionOut, exitShown);

  // Posição/escala livre (arrastável no player).
  const px = ct.x ?? 0;
  const py = ct.y ?? 0;
  const pscale = ct.scale ?? 1;

  const opacity = (anim.opacity ?? 1) * ex.opacity;
  const transform = [
    `translate(${px + ex.tx}px, ${py + ex.ty}px)`,
    `scale(${pscale * ex.scale})`,
    anim.transform ?? '',
  ].filter(Boolean).join(' ');

  return (
    <AbsoluteFill
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6%', pointerEvents: 'none' }}
    >
      <div
        data-novacena-preview-layer={`ctext-${ct.id}`}
        style={{
          display: 'inline-block',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          maxWidth: '100%',
          fontFamily: `'${ct.fontFamily ?? font?.family ?? 'Arial'}', Arial, sans-serif`,
          fontWeight: font?.weight ?? 800,
          fontSize: ct.fontSizePx ?? 96,
          color: '#ffffff',
          lineHeight: 1.05,
          ...applyTextStyle(userStyle),
          opacity,
          transform,
          filter: anim.filter,
        }}
      >
        <StyledText
          text={ct.text || 'TÍTULO'}
          transition={anim}
          style={userStyle}
          stroke={ct.stroke}
          preserveFontShape={false}
          previewMode={false}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Camadas de texto livres — renderizadas em TODOS os templates, acima do resto.
 *  Mesmo motor dos textos do template (fonte do catálogo + StyledText + transições). */
export const CustomTextsLayer: React.FC<{ texts?: CustomTextLayer[]; customFonts?: FontFaceDef }> = ({
  texts = [],
  customFonts,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!texts || texts.length === 0) return null;

  // Ordem de empilhamento: z asc (maior z = mais por cima → renderiza por último).
  const ordered = [...texts].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const activeFontIds = texts.map((t) => t.fontId).filter(Boolean);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <FontFaces fonts={customFonts} activeFontIds={activeFontIds} />
      {ordered.map((ct) => {
        const startFrame = Math.max(0, Math.round((ct.startSec ?? 0) * fps));
        const reqDur = ct.durationSec && ct.durationSec > 0
          ? Math.round(ct.durationSec * fps)
          : durationInFrames - startFrame;
        const seqDur = Math.max(1, Math.min(reqDur, durationInFrames - startFrame));
        return (
          <Sequence key={ct.id} from={startFrame} durationInFrames={seqDur}>
            <OneCustomText ct={ct} sequenceDurationInFrames={seqDur} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default CustomTextsLayer;
