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

/**
 * INSCREVA-SE (YouTube) — CLEAN. Só BG de vídeo + seu overlay alpha (animação
 * feita no After: play buttons, "NO CANAL", glitch etc.) + os TEXTOS EDITÁVEIS
 * (headline + @canal). Nenhuma decoração é desenhada em código — o visual vem do
 * overlay. Os dois textos são arrastáveis (userTextTransform + previewLayerId).
 */

const HEADLINE_IN = 12;
const TEXT1_IN = 52;
const CHANNEL_IN = 70;
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
  const fontText1 = findFont(motion.fontCta1 ?? motion.fontCta ?? 'premium-akhand-light', motion.customFonts ?? []) ?? M.fontCta;
  const fontChannel = findFont(motion.fontDate ?? 'premium-akhand-light', motion.customFonts ?? []) ?? M.fontDate;

  const headlineIn = motion.headlineInFrame ?? HEADLINE_IN;
  const text1In = motion.cta1InFrame ?? TEXT1_IN;
  const channelIn = motion.dateInFrame ?? CHANNEL_IN;
  const txHeadline = (motion.transitionHeadline ?? 'mask_reveal') as TextTransitionId;
  const txText1 = (motion.transitionCta1 ?? motion.transitionCta ?? 'rise_clean') as TextTransitionId;
  const txChannel = (motion.transitionDate ?? 'scale_pop') as TextTransitionId;
  const tH = getTextTransition(txHeadline)(frame, headlineIn, motion.transitionTuningHeadline);
  const tText1 = getTextTransition(txText1)(frame, text1In, motion.transitionTuningCta1 ?? motion.transitionTuningCta);
  const tC = getTextTransition(txChannel)(frame, channelIn, motion.transitionTuningDate);

  const showAll = frame >= FINAL_POSTER;
  const finalFlash = M.finalFlash
    ? interpolate(frame, [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14], [0, 0.4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const headlineWiggle = brazuWiggle(frame, { amplitude: (motion.wiggleHeadline ?? 0.3) * M.wiggleIntensity, frequency: 0.7, seed: 10 });
  const text1Wiggle = brazuWiggle(frame, { amplitude: (motion.wiggleCta1 ?? motion.wiggleCta ?? 0.25) * M.wiggleIntensity, frequency: 0.74, seed: 16 });
  const channelWiggle = brazuWiggle(frame, { amplitude: (motion.wiggleDate ?? 0.2) * M.wiggleIntensity, frequency: 0.6, seed: 22 });
  const text1Opacity = eased(frame, text1In, text1In + 16, easings.outCubic);
  const channelOpacity = eased(frame, channelIn, channelIn + 18, easings.outCubic);

  const text1 = props.cta || 'NO CANAL';
  const channelText = props.channelName || '@SEUCANAL';
  const channelCompactLength = channelText.replace(/\s+/g, '').length;
  const channelFontSize = clamp(620 / Math.max(13, channelCompactLength), isStory ? 34 : 28, isStory ? 54 : 44);
  const channelMaxWidth = clamp(channelCompactLength * channelFontSize * 0.94 + 132, isStory ? 300 : 240, isStory ? 760 : 620);
  const channelTextStyle = keepTextOnlyStyle(applyTextStyle(motion.styleDate));

  return (
    <AbsoluteFill style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', overflow: 'hidden' }}>
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontCta1 ?? motion.fontCta ?? '', motion.fontDate ?? '']} />
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
            marginTop: isStory ? 18 : 14,
            opacity: showAll ? 1 : text1Opacity,
            fontFamily: ff(fontText1?.family ?? 'Arial'),
            fontSize: isStory ? 76 : 58,
            lineHeight: 0.96,
            fontWeight: fontText1?.weight ?? 700,
            letterSpacing: 0.5,
            color: '#ffffff',
            textTransform: 'uppercase',
            textShadow: '0 8px 24px rgba(0,0,0,0.5)',
            ...applyTextStyle(motion.styleCta1 ?? motion.styleCta),
            ...userTextTransform(motion.styleCta1 ?? motion.styleCta, { transform: text1Wiggle.transform }),
          }}
        >
          <StyledText
            previewLayerId="ytsub-text1"
            text={text1}
            transition={showAll ? undefined : tText1}
            style={motion.styleCta1 ?? motion.styleCta}
            stroke={motion.strokeCta1 ?? motion.strokeCta}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>

        <div
          style={{
            marginTop: isStory ? 22 : 16,
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
              ...userTextTransform(motion.styleDate, { transform: channelWiggle.transform }),
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
                previewLayerId="ytsub-channel"
                text={channelText}
                transition={showAll ? undefined : tC}
                style={motion.styleDate}
                stroke={motion.strokeDate}
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
