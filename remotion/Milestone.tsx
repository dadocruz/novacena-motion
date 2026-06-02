import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  scaleInBack,
  previewSafeAnim,
  getTextTransition,
  type TextTransitionId,
} from './motionEngine';
import { brazuWiggle } from './motionEffects';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { PremiumCover } from './PremiumCover';
import { PlatformLogo } from './PlatformLogo';
import { StyledText } from './StyledText';
import { DEFAULT_FONTS, findFont, resolveMotion, ff, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps } from './types';
import { textStrokeStyle, textFillStyle } from './textStroke';

const PREFIX_IN = 14;
const COVER_IN = 40;
const NUMBER_IN = 78;
const LABEL_IN = 106;
const MID_HIT = 130;
const LOGO_IN = 150;
const FINAL_HIT_BASE = 208;
const FINAL_POSTER_BASE = 222;

export const Milestone: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const durationFrames = (props.motion?.durationSeconds ?? 8) * 30;
  const FINAL_HIT = Math.min(FINAL_HIT_BASE, durationFrames - 14);
  const FINAL_POSTER = Math.min(FINAL_POSTER_BASE, durationFrames - 2);
  const M = resolveMotion(props.motion, 'rgba(60, 220, 130, 0.32)');
  const prefixIn = props.motion?.dateInFrame ?? PREFIX_IN;
  const numberIn = props.motion?.headlineInFrame ?? NUMBER_IN;
  const labelIn = props.motion?.cta1InFrame ?? LABEL_IN;
  const logoIn = props.motion?.logosInFrame ?? LOGO_IN;
  const accents = [numberIn, MID_HIT, FINAL_HIT];

  const previewMode = props.motion?.previewMode === true;
  const logoAnim = previewSafeAnim(scaleInBack(frame, logoIn, 18), previewMode);
  const txPrefix = (props.motion?.transitionDate ?? 'mask_reveal') as TextTransitionId;
  const txNumber = (props.motion?.transitionHeadline ?? 'scale_pop') as TextTransitionId;
  const txLabel = (props.motion?.transitionCta1 ?? props.motion?.transitionCta ?? 'mask_reveal') as TextTransitionId;
  const prefixTransition = getTextTransition(txPrefix)(frame, prefixIn, props.motion?.transitionTuningDate);
  const numberTransition = getTextTransition(txNumber)(frame, numberIn, props.motion?.transitionTuningHeadline);
  const labelTransition = getTextTransition(txLabel)(frame, labelIn, props.motion?.transitionTuningCta1 ?? props.motion?.transitionTuningCta);

  const finalFlash = M.finalFlash
    ? interpolate(
        frame,
        [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14],
        [0, 0.45, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 0;

  // Pulso de glow no número quando entra
  const numberGlow = interpolate(
    frame,
    [numberIn, numberIn + 14, numberIn + 40],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const showAll = frame >= FINAL_POSTER;
  const numberText = props.metricNumber || '100.000';
  const labelText = props.metricLabel || 'OUVINTES';
  const prefixText = props.metricPrefix || 'ULTRAPASSAMOS';
  const spotifyLogoSize = Math.round(props.motion?.milestoneLogoSize ?? 84);
  const labelFont = findFont(
    props.motion?.fontCta1 ?? props.motion?.fontCta ?? DEFAULT_FONTS.cta,
    props.motion?.customFonts ?? []
  ) ?? M.fontCta;
  const labelStyle = props.motion?.styleCta1 ?? props.motion?.styleCta;
  const labelStroke = props.motion?.strokeCta1 ?? props.motion?.strokeCta ?? M.strokeCta;
  const prefixWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleDate ?? 0.25) * M.wiggleIntensity,
    frequency: 0.64,
    seed: 70,
  });
  const numberWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleHeadline ?? 0.35) * M.wiggleIntensity,
    frequency: 0.74,
    seed: 10,
  });
  const labelWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleCta1 ?? props.motion?.wiggleCta ?? 0.3) * M.wiggleIntensity,
    frequency: 0.9,
    seed: 130,
  });
  return (
    <AbsoluteFill
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <FontFaces fonts={props.motion?.customFonts} activeFontIds={[props.motion?.fontHeadline ?? '', props.motion?.fontDate ?? '', props.motion?.fontCta ?? '', props.motion?.fontCta1 ?? '']} />
      <CinematicBackground
        coverImage={props.coverImage}
        accentFrames={accents}
        intensity={M.particlesEnabled ? 1 : 0}
        background={M.background}
      />

      {/* OVERLAY / TEXTURA — acima do BG e abaixo de capa/textos/logos */}
      <OverlayLayer overlays={props.motion?.overlays} />

      <AbsoluteFill
        style={{
          padding: '0 60px',
          paddingTop: 240,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* PREFIX */}
        <div
          style={{
            fontFamily: ff(M.fontDate.family),
            fontSize: 50,
            fontWeight: M.fontDate.weight,
            letterSpacing: 2.5,
            ...textStrokeStyle(M.strokeDate),
              ...(props.motion?.styleDate?.useGradient ? {} : textFillStyle(M.strokeDate)),
              textShadow: 'none',
            ...applyTextStyle(props.motion?.styleDate),
              ...userTextTransform(props.motion?.styleDate, { transform: prefixWiggle.transform }),
          }}
        >
          <StyledText
            previewLayerId="milestone-date"
            text={prefixText}
            transition={showAll ? undefined : prefixTransition}
            style={props.motion?.styleDate}
            stroke={M.strokeDate}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>

        {/* CAPA */}
        <div style={{ marginTop: 50 }}>
          <div

            data-cover-position-wrapper
            data-novacena-preview-layer="milestone-cover"

            style={{

              transform: `translate(${props.motion?.coverX ?? 0}px, ${props.motion?.coverY ?? 0}px)`,

              willChange: 'transform',

            }}

          >

          <PremiumCover
            src={props.coverImage}
            size={Math.min(M.coverSize, 460)}
            entryFrame={COVER_IN}
            motionId={props.motion?.coverMotion ?? 'zoom_bounce'}
            spinStart={COVER_IN + 14}
            spinEnd={FINAL_HIT - 4}
            spinTurns={M.spinTurns}
            wiggleIntensity={M.wiggleIntensity}
            accentFrames={accents}
            glowColor={M.glowColor}
          />

          </div>
        </div>

        {/* NÚMERO GIGANTE */}
        <div
          style={{
            marginTop: 60,
          }}
        >
          <div
            style={{
              fontFamily: ff(M.fontHeadline.family),
              fontSize: 156,
              lineHeight: 0.92,
              fontWeight: M.fontHeadline.weight,
              letterSpacing: -6,
              color: '#fff',
              textShadow: 'none',
              overflow: 'visible',
              ...textStrokeStyle(M.strokeHeadline),
              ...(props.motion?.styleHeadline?.useGradient ? {} : textFillStyle(M.strokeHeadline)),
              ...applyTextStyle(props.motion?.styleHeadline),
              ...userTextTransform(props.motion?.styleHeadline, { transform: numberWiggle.transform }),
            }}
          >
            <StyledText
              previewLayerId="milestone-number"
              text={numberText}
              transition={showAll ? undefined : numberTransition}
              style={props.motion?.styleHeadline}
              stroke={M.strokeHeadline}
              preserveFontShape={false}
              previewMode={false}
            />
          </div>
        </div>

        {/* LABEL */}
        <div
          style={{
            fontFamily: ff(labelFont.family),
            marginTop: 18,
            fontSize: 48,
            fontWeight: labelFont.weight,
            letterSpacing: 4,
            textShadow: 'none',
            ...textStrokeStyle(labelStroke),
            ...(labelStyle?.useGradient ? {} : textFillStyle(labelStroke)),
            ...applyTextStyle(labelStyle),
            ...userTextTransform(labelStyle, { transform: labelWiggle.transform }),
          }}
        >
          <StyledText
            previewLayerId="milestone-label"
            text={labelText}
            transition={showAll ? undefined : labelTransition}
            style={labelStyle}
            stroke={labelStroke}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>

        {/* LOGO SPOTIFY */}
        <div
          data-novacena-preview-layer="milestone-logo"
          style={{
            marginTop: 56,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: spotifyLogoSize,
            height: spotifyLogoSize,
            transform: `translate(${props.motion?.milestoneLogoX ?? 0}px, ${props.motion?.milestoneLogoY ?? 0}px)`,
            willChange: 'transform',
            ...(showAll ? {} : logoAnim),
          }}
        >
          <PlatformLogo
            name="Spotify"
            size={spotifyLogoSize}
            customSrc={M.customLogos?.Spotify}
            tintEnabled={M.platformLogoTintEnabled}
            tintColor={M.platformLogoTintColor}
          />
        </div>
      </AbsoluteFill>
<AbsoluteFill
        style={{
          background: '#fff',
          opacity: finalFlash,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
