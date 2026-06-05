import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { easings, eased, getTextTransition, type TextTransitionId } from './motionEngine';
import { brazuWiggle } from './motionEffects';
import { CinematicBackground } from './CinematicBackground';
import { GlobalTransitionLayer } from './GlobalTransitionLayer';
import { OverlayLayer } from './OverlayLayer';
import { StyledText } from './StyledText';
import { findFont, resolveMotion, ff, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps } from './types';
import { textStrokeStyle, textFillStyle } from './textStroke';

/**
 * ULTRAPASSAMOS (visualizações no YouTube) — CLEAN. BG de vídeo + seu overlay
 * alpha (play buttons / glitch feitos no After) + TEXTOS EDITÁVEIS: prefixo
 * ("ULTRAPASSAMOS"), número, métrica e @canal. Todos arrastáveis. Reaproveita
 * os campos metricPrefix / metricNumber / metricLabel / channelName.
 */

const PREFIX_IN = 12;
const NUMBER_IN = 30;
const LABEL_IN = 64;
const CHANNEL_IN = 86;
const MID_HIT = 120;
const FINAL_HIT_BASE = 208;
const FINAL_POSTER_BASE = 222;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const keepTextOnlyStyle = (style?: React.CSSProperties): React.CSSProperties => {
  if (!style) return {};
  const {
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    width,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    borderRadius,
    background,
    backgroundColor,
    boxShadow,
    overflow,
    whiteSpace,
    textOverflow,
    ...textOnly
  } = style;
  return textOnly;
};

export const YouTubeViews: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const motion = props.motion ?? {};
  const durationFrames = (motion.durationSeconds ?? 8) * 30;
  const FINAL_HIT = Math.min(FINAL_HIT_BASE, durationFrames - 14);
  const FINAL_POSTER = Math.min(FINAL_POSTER_BASE, durationFrames - 2);
  const accents = [MID_HIT, FINAL_HIT];
  const M = resolveMotion(props.motion, 'rgba(255, 40, 40, 0.34)');
  const isStory = props.renderTarget === 'story';

  // Número usa Akhand Black por padrão; prefixo/label/canal usam Bebas Neue.
  const fontNumber = findFont(motion.fontHeadline ?? 'premium-akhand-black', motion.customFonts ?? []) ?? M.fontHeadline;
  const fontPrefix = findFont(motion.fontDate ?? 'premium-bebas-neue', motion.customFonts ?? []) ?? M.fontDate;
  const fontLabel = findFont(motion.fontCta1 ?? motion.fontCta ?? 'premium-bebas-neue', motion.customFonts ?? []) ?? M.fontCta;
  const fontChannel = findFont(motion.fontCta2 ?? 'premium-akhand-light', motion.customFonts ?? []) ?? M.fontCta;

  const prefixIn = motion.dateInFrame ?? PREFIX_IN;
  const numberIn = motion.headlineInFrame ?? NUMBER_IN;
  const labelIn = motion.cta1InFrame ?? LABEL_IN;
  const channelIn = motion.cta2InFrame ?? CHANNEL_IN;

  const txPrefix = (motion.transitionDate ?? 'mask_reveal') as TextTransitionId;
  const txNumber = (motion.transitionHeadline ?? 'scale_pop') as TextTransitionId;
  const txLabel = (motion.transitionCta1 ?? motion.transitionCta ?? 'mask_reveal') as TextTransitionId;
  const txChannel = (motion.transitionCta2 ?? 'scale_pop') as TextTransitionId;
  const tPrefix = getTextTransition(txPrefix)(frame, prefixIn, motion.transitionTuningDate);
  const tNumber = getTextTransition(txNumber)(frame, numberIn, motion.transitionTuningHeadline);
  const tLabel = getTextTransition(txLabel)(frame, labelIn, motion.transitionTuningCta1 ?? motion.transitionTuningCta);
  const tChannel = getTextTransition(txChannel)(frame, channelIn, motion.transitionTuningCta2);

  const showAll = frame >= FINAL_POSTER;
  const finalFlash = M.finalFlash
    ? interpolate(frame, [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14], [0, 0.4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const prefixWiggle = brazuWiggle(frame, {
    amplitude: (motion.wiggleDate ?? 0.25) * M.wiggleIntensity,
    frequency: 0.68,
    seed: 18,
  });
  const numberWiggle = brazuWiggle(frame, {
    amplitude: (motion.wiggleHeadline ?? 0.3) * M.wiggleIntensity,
    frequency: 0.72,
    seed: 20,
  });
  const labelWiggle = brazuWiggle(frame, {
    amplitude: (motion.wiggleCta1 ?? motion.wiggleCta ?? 0.25) * M.wiggleIntensity,
    frequency: 0.76,
    seed: 24,
  });
  const channelWiggle = brazuWiggle(frame, {
    amplitude: (motion.wiggleCta2 ?? motion.wiggleCta ?? 0.2) * M.wiggleIntensity,
    frequency: 0.62,
    seed: 30,
  });
  const channelOpacity = eased(frame, channelIn, channelIn + 18, easings.outCubic);

  const prefixText = props.metricPrefix || 'ULTRAPASSAMOS';
  const numberText = props.metricNumber || '+ 20 MILHÕES';
  const labelText = props.metricLabel || 'DE VISUALIZAÇÕES';
  const channelText = props.channelName || '@SEUCANAL';
  const channelCompactLength = channelText.replace(/\s+/g, '').length;
  const channelFontSize = clamp(620 / Math.max(13, channelCompactLength), isStory ? 34 : 28, isStory ? 54 : 44);
  const channelMaxWidth = clamp(channelCompactLength * channelFontSize * 0.94 + 132, isStory ? 300 : 240, isStory ? 760 : 620);
  const channelTextStyle = keepTextOnlyStyle(applyTextStyle(motion.styleCta2));

  return (
    <AbsoluteFill style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', overflow: 'hidden' }}>
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '', motion.fontCta1 ?? '', motion.fontCta2 ?? '', motion.fontCta ?? '']} />
      <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={M.particlesEnabled ? 0.55 : 0} background={M.background} />

      {/* Seu overlay alpha (animação do After) por cima do BG */}
      <OverlayLayer overlays={motion.overlays} />

      {/* Leve escurecimento topo/rodapé só p/ legibilidade dos textos */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none' }} />

      {/* Bloco de textos editáveis (todos arrastáveis) */}
      <div style={{ position: 'absolute', left: isStory ? 80 : 70, right: isStory ? 80 : 70, top: isStory ? '46%' : '40%', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: ff(fontPrefix?.family ?? 'Arial'),
            fontSize: isStory ? 58 : 48,
            lineHeight: 1,
            fontWeight: fontPrefix?.weight ?? 700,
            letterSpacing: 3,
            color: '#FF1212',
            textTransform: 'uppercase',
            textShadow: '0 6px 20px rgba(0,0,0,0.5)',
            ...applyTextStyle(motion.styleDate),
            ...userTextTransform(motion.styleDate, { transform: prefixWiggle.transform }),
          }}
        >
          <StyledText previewLayerId="ytviews-prefix" text={prefixText} transition={showAll ? undefined : tPrefix} style={motion.styleDate} stroke={motion.strokeDate} preserveFontShape={false} previewMode={false} />
        </div>

        <div
          style={{
            fontFamily: ff(fontNumber?.family ?? 'Arial'),
            fontSize: (numberText.length > 10) ? (isStory ? 150 : 120) : (isStory ? 188 : 150),
            lineHeight: 0.9,
            fontWeight: fontNumber?.weight ?? 900,
            letterSpacing: -1,
            color: '#ffffff',
            textTransform: 'uppercase',
            marginTop: 6,
            textShadow: '0 14px 38px rgba(0,0,0,0.55)',
            ...textStrokeStyle(M.strokeHeadline),
            ...(motion.styleHeadline?.useGradient ? {} : textFillStyle(M.strokeHeadline)),
            ...applyTextStyle(motion.styleHeadline),
            ...userTextTransform(motion.styleHeadline, { transform: numberWiggle.transform }),
          }}
        >
          <StyledText previewLayerId="ytviews-number" text={numberText} transition={showAll ? undefined : tNumber} style={motion.styleHeadline} stroke={M.strokeHeadline} preserveFontShape={false} previewMode={false} />
        </div>

        <div
          style={{
            fontFamily: ff(fontLabel?.family ?? 'Arial'),
            fontSize: isStory ? 52 : 42,
            lineHeight: 1,
            fontWeight: fontLabel?.weight ?? 700,
            letterSpacing: 2,
            color: '#ffffff',
            textTransform: 'uppercase',
            marginTop: 8,
            textShadow: '0 8px 24px rgba(0,0,0,0.5)',
            ...applyTextStyle(motion.styleCta1 ?? motion.styleCta),
            ...userTextTransform(motion.styleCta1 ?? motion.styleCta, { transform: labelWiggle.transform }),
          }}
        >
          <StyledText previewLayerId="ytviews-label" text={labelText} transition={showAll ? undefined : tLabel} style={motion.styleCta1 ?? motion.styleCta} stroke={motion.strokeCta1 ?? motion.strokeCta} preserveFontShape={false} previewMode={false} />
        </div>

        <div
          style={{
            marginTop: isStory ? 24 : 18,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: showAll ? 1 : channelOpacity,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 'fit-content',
              maxWidth: channelMaxWidth,
              minHeight: isStory ? 68 : 58,
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              background: '#FF0000',
              padding: isStory ? '14px 48px' : '12px 38px',
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(255,0,0,0.32)',
              ...userTextTransform(motion.styleCta2, { transform: channelWiggle.transform }),
            }}
          >
            <span
              style={{
                maxWidth: '100%',
                display: 'block',
                color: '#fff',
                fontFamily: ff(fontChannel?.family ?? 'Arial'),
                fontSize: channelFontSize,
                fontWeight: fontChannel?.weight ?? 700,
                letterSpacing: 1.1,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                ...channelTextStyle,
              }}
            >
              <StyledText
                previewLayerId="ytviews-channel"
                text={channelText}
                transition={showAll ? undefined : tChannel}
                style={motion.styleCta2}
                stroke={motion.strokeCta2}
                preserveFontShape={false}
                previewMode={false}
              />
            </span>
          </div>
        </div>
      </div>

      {M.finalFlash ? <AbsoluteFill style={{ background: '#fff', opacity: finalFlash, pointerEvents: 'none' }} /> : null}
      <GlobalTransitionLayer transitions={motion.globalTransitions} />
    </AbsoluteFill>
  );
};
