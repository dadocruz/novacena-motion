import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { easings, eased, getTextTransition, type TextTransitionId } from './motionEngine';
import { brazuWiggle } from './motionEffects';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { StyledText } from './StyledText';
import { findFont, resolveMotion, ff, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps } from './types';

/**
 * INSCREVA-SE (YouTube) — CLEAN. Só BG de vídeo + seu overlay alpha (animação
 * feita no After: play buttons, "NO CANAL", glitch etc.) + os TEXTOS EDITÁVEIS
 * (headline + @canal). Nenhuma decoração é desenhada em código — o visual vem do
 * overlay. Os dois textos são arrastáveis (userTextTransform + previewLayerId).
 */

const HEADLINE_IN = 12;
const CHANNEL_IN = 70;
const MID_HIT = 120;
const FINAL_HIT_BASE = 208;
const FINAL_POSTER_BASE = 222;

export const YouTubeSubscribe: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const motion = props.motion ?? {};
  const durationFrames = (motion.durationSeconds ?? 8) * 30;
  const FINAL_HIT = Math.min(FINAL_HIT_BASE, durationFrames - 14);
  const FINAL_POSTER = Math.min(FINAL_POSTER_BASE, durationFrames - 2);
  const accents = [MID_HIT, FINAL_HIT];
  const M = resolveMotion(props.motion, 'rgba(255, 40, 40, 0.34)');
  const isStory = props.renderTarget === 'story';

  const fontHeadline = findFont(motion.fontHeadline ?? 'premium-akhand-light', motion.customFonts ?? []) ?? M.fontHeadline;
  const fontChannel = findFont(motion.fontDate ?? 'premium-akhand-light', motion.customFonts ?? []) ?? M.fontDate;

  const headlineIn = motion.headlineInFrame ?? HEADLINE_IN;
  const channelIn = motion.dateInFrame ?? CHANNEL_IN;
  const txHeadline = (motion.transitionHeadline ?? 'mask_reveal') as TextTransitionId;
  const txChannel = (motion.transitionDate ?? 'scale_pop') as TextTransitionId;
  const tH = getTextTransition(txHeadline)(frame, headlineIn, motion.transitionTuningHeadline);
  const tC = getTextTransition(txChannel)(frame, channelIn, motion.transitionTuningDate);

  const showAll = frame >= FINAL_POSTER;
  const finalFlash = M.finalFlash
    ? interpolate(frame, [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14], [0, 0.4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const headlineWiggle = brazuWiggle(frame, { amplitude: (motion.wiggleHeadline ?? 0.3) * M.wiggleIntensity, frequency: 0.7, seed: 10 });
  const channelWiggle = brazuWiggle(frame, { amplitude: (motion.wiggleDate ?? 0.2) * M.wiggleIntensity, frequency: 0.6, seed: 22 });
  const channelOpacity = eased(frame, channelIn, channelIn + 18, easings.outCubic);

  const channelText = props.channelName || '@SEUCANAL';

  return (
    <AbsoluteFill style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', overflow: 'hidden' }}>
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '']} />
      <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={M.particlesEnabled ? 0.6 : 0} background={M.background} />

      {/* Seu overlay alpha (animação do After) entra aqui, por cima do BG */}
      <OverlayLayer overlays={motion.overlays} />

      {/* Leve escurecimento só no rodapé, p/ legibilidade dos textos */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none' }} />

      {/* Textos editáveis (arrastáveis) */}
      <div style={{ position: 'absolute', left: isStory ? 90 : 80, right: isStory ? 90 : 80, bottom: isStory ? 250 : 150, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: ff(fontHeadline?.family ?? 'Arial'),
            fontSize: isStory ? 116 : 96,
            lineHeight: 0.96,
            fontWeight: fontHeadline?.weight ?? 700,
            letterSpacing: 1,
            color: '#ffffff',
            textTransform: 'uppercase',
            textShadow: '0 10px 30px rgba(0,0,0,0.5)',
            ...applyTextStyle(motion.styleHeadline),
            ...userTextTransform(motion.styleHeadline, { transform: headlineWiggle.transform }),
          }}
        >
          <StyledText
            previewLayerId="ytsub-headline"
            text={props.headline || 'INSCREVA-SE'}
            transition={showAll ? undefined : tH}
            style={motion.styleHeadline}
            stroke={motion.strokeHeadline}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>

        <div
          style={{
            marginTop: isStory ? 26 : 18,
            opacity: showAll ? 1 : channelOpacity,
            fontFamily: ff(fontChannel?.family ?? 'Arial'),
            fontSize: isStory ? 48 : 40,
            fontWeight: fontChannel?.weight ?? 700,
            letterSpacing: 1.5,
            color: '#ffffff',
            textTransform: 'uppercase',
            textShadow: '0 8px 24px rgba(0,0,0,0.5)',
            ...applyTextStyle(motion.styleDate),
            ...userTextTransform(motion.styleDate, { transform: channelWiggle.transform }),
          }}
        >
          <StyledText
            previewLayerId="ytsub-channel"
            text={channelText}
            transition={showAll ? undefined : tC}
            style={motion.styleDate}
            stroke={motion.strokeDate}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>
      </div>

      {M.finalFlash ? <AbsoluteFill style={{ background: '#fff', opacity: finalFlash, pointerEvents: 'none' }} /> : null}
    </AbsoluteFill>
  );
};
