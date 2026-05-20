import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  charStagger,
  easings,
  eased,
  maskReveal,
  scaleInBack,
  previewSafeAnim,
} from './motionEngine';
import { brazuWiggle } from './motionEffects';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { PremiumCover } from './PremiumCover';
import { PlatformLogo } from './PlatformLogo';
import { DEFAULT_FONTS, findFont, resolveMotion, ff, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps } from './types';
import { textStrokeStyle, textFillStyle } from './textStroke';

const PREFIX_IN = 14;
const COVER_IN = 40;
const NUMBER_IN = 78;
const LABEL_IN = 106;
const MID_HIT = 130;
const LOGO_IN = 150;
const FINAL_HIT = 208;
const FINAL_POSTER = 222;

export const Milestone: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const M = resolveMotion(props.motion, 'rgba(60, 220, 130, 0.32)');
  const prefixIn = props.motion?.dateInFrame ?? PREFIX_IN;
  const numberIn = props.motion?.headlineInFrame ?? NUMBER_IN;
  const labelIn = props.motion?.cta1InFrame ?? LABEL_IN;
  const logoIn = props.motion?.logosInFrame ?? LOGO_IN;
  const accents = [numberIn, MID_HIT, FINAL_HIT];

  const previewMode = props.motion?.previewMode === true;
  const prefixMask = previewSafeAnim(maskReveal(frame, prefixIn, 24), previewMode);
  const numberAnim = previewSafeAnim(scaleInBack(frame, numberIn, 26), previewMode);
  const numberChar = charStagger(frame, numberIn + 4, 1.4);
  const labelMask = previewSafeAnim(maskReveal(frame, labelIn, 22), previewMode);
  const logoAnim = previewSafeAnim(scaleInBack(frame, logoIn, 18), previewMode);

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
  const mergeAnim = (anim: React.CSSProperties, wiggleTransform?: string): React.CSSProperties => ({
    ...anim,
    transform: [anim.transform, wiggleTransform].filter(Boolean).join(' '),
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
            ...(showAll ? {} : prefixMask),
              ...userTextTransform(props.motion?.styleDate, showAll ? { transform: prefixWiggle.transform } : mergeAnim(prefixMask, prefixWiggle.transform)),
          }}
        >
          {prefixText}
        </div>

        {/* CAPA */}
        <div style={{ marginTop: 50 }}>
          <div

            data-cover-position-wrapper

            style={{

              transform: `translate(${props.motion?.coverX ?? 0}px, ${props.motion?.coverY ?? 0}px)`,

              willChange: 'transform',

            }}

          >

          <PremiumCover
            src={props.coverImage}
            size={Math.min(M.coverSize, 460)}
            entryFrame={COVER_IN}
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
              ...(showAll ? {} : { opacity: numberAnim.opacity }),
              ...userTextTransform(props.motion?.styleHeadline, { transform: numberWiggle.transform }),
            }}
          >
            {showAll
              ? numberText
              : numberText.split('').map((char, i) => (
                  <span key={i} style={numberChar(i)}>
                    {char}
                  </span>
                ))}
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
            ...(showAll ? {} : labelMask),
            ...userTextTransform(labelStyle, showAll ? { transform: labelWiggle.transform } : mergeAnim(labelMask, labelWiggle.transform)),
          }}
        >
          {labelText}
        </div>

        {/* LOGO SPOTIFY */}
        <div
          style={{
            marginTop: 56,
            ...(showAll ? {} : logoAnim),
          }}
        >
          <PlatformLogo name="Spotify" size={84} customSrc={M.customLogos?.Spotify} />
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
