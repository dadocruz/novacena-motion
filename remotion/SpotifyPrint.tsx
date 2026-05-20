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
import { PhoneMockup } from './PhoneMockup';
import { PlatformLogo } from './PlatformLogo';
import { DEFAULT_FONTS, findFont, resolveMotion, ff, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps } from './types';
import { textStrokeStyle, textFillStyle } from './textStroke';

const PREFIX_IN = 14;
const PHONE_IN = 36;
const NUMBER_IN = 78;
const LABEL_IN = 106;
const MID_HIT = 130;
const LOGO_IN = 150;
const FINAL_HIT = 208;
const FINAL_POSTER = 222;

/**
 * Template SpotifyPrint: o "coverImage" enviado pelo usuário é tratado como
 * um screenshot do Spotify e é renderizado DENTRO de um iPhone com motion.
 * Texto típico: ULTRAPASSAMOS / 10.000 MIL / OUVINTES MENSAIS.
 */
export const SpotifyPrint: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const M = resolveMotion(props.motion, 'rgba(30, 215, 96, 0.40)');
  const prefixIn = props.motion?.dateInFrame ?? PREFIX_IN;
  const phoneIn = PHONE_IN;
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
        [0, 0.35, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 0;

  const showAll = frame >= FINAL_POSTER;
  const numberText = props.metricNumber || '10.000';
  const labelText = props.metricLabel || 'OUVINTES MENSAIS';
  const prefixText = props.metricPrefix || 'ULTRAPASSAMOS';
  const labelFont = findFont(
    props.motion?.fontCta1 ?? props.motion?.fontCta ?? DEFAULT_FONTS.cta,
    props.motion?.customFonts ?? []
  ) ?? M.fontCta;
  const labelStyle = props.motion?.styleCta1 ?? props.motion?.styleCta;
  const labelStroke = props.motion?.strokeCta1 ?? props.motion?.strokeCta ?? M.strokeCta;
  const wiggleIntensity = M.wiggleIntensity;
  const prefixWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleDate ?? 0.25) * wiggleIntensity,
    frequency: 0.64,
    seed: 70,
  });
  const numberWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleHeadline ?? 0.35) * wiggleIntensity,
    frequency: 0.74,
    seed: 10,
  });
  const labelWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleCta1 ?? props.motion?.wiggleCta ?? 0.3) * wiggleIntensity,
    frequency: 0.9,
    seed: 130,
  });
  const mergeAnim = (anim: React.CSSProperties, wiggleTransform?: string): React.CSSProperties => {
    if (!wiggleTransform) return anim;
    return {
      ...anim,
      transform: [anim.transform, wiggleTransform].filter(Boolean).join(' '),
    };
  };

  const isStory = props.renderTarget === 'story';
  const phoneCfg = (props.motion as any) ?? {};
  const phoneWidth = phoneCfg.phoneSize ?? (isStory ? 520 : 460);
  const tilt = phoneCfg.phoneTilt ?? -6;
  const phoneMotion = phoneCfg.phoneMotion ?? 'zoom_bounce';
  const phoneSpinTurns = phoneCfg.phoneSpinTurns ?? 0;
  const phoneWiggle = (phoneCfg.phoneWiggle ?? 1) * M.wiggleIntensity;
  const phoneDynamicIsland = phoneCfg.phoneDynamicIsland ?? true;
  const phoneX = phoneCfg.phoneX ?? 0;
  const phoneY = phoneCfg.phoneY ?? 0;
  const spotifyLogoSize = props.motion?.platformLogoSize ?? 72;

  return (
    <AbsoluteFill
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <FontFaces
        fonts={props.motion?.customFonts}
        activeFontIds={[
          props.motion?.fontHeadline ?? '',
          props.motion?.fontDate ?? '',
          props.motion?.fontCta ?? '',
          props.motion?.fontCta1 ?? '',
        ]}
      />
      <CinematicBackground
        coverImage={props.coverImage}
        accentFrames={accents}
        intensity={M.particlesEnabled ? 1 : 0}
        background={M.background}
      />

      <OverlayLayer overlays={props.motion?.overlays} />

      <AbsoluteFill
        style={{
          padding: '0 60px',
          paddingTop: isStory ? 220 : 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* PREFIX — ULTRAPASSAMOS */}
        <div
          style={{
            fontFamily: ff(M.fontDate.family),
            fontSize: 50,
            fontWeight: M.fontDate.weight,
            letterSpacing: 2.5,
            textShadow: 'none',
            ...textStrokeStyle(M.strokeDate),
            ...applyTextStyle(props.motion?.styleDate),
            ...textFillStyle(M.strokeDate),
            ...(showAll ? {} : prefixMask),
            ...userTextTransform(
              props.motion?.styleDate,
              showAll ? { transform: prefixWiggle.transform } : mergeAnim(prefixMask, prefixWiggle.transform)
            ),
          }}
        >
          {prefixText}
        </div>

        {/* NÚMERO GIGANTE */}
        <div
          style={{
            marginTop: 28,
          }}
        >
          <div
            style={{
              fontFamily: ff(M.fontHeadline.family),
              fontSize: 168,
              lineHeight: 0.92,
              fontWeight: M.fontHeadline.weight,
              letterSpacing: -6,
              color: '#fff',
              textShadow: 'none',
              overflow: 'visible',
              ...textStrokeStyle(M.strokeHeadline),
              ...applyTextStyle(props.motion?.styleHeadline),
              ...textFillStyle(M.strokeHeadline),
              ...(showAll ? {} : { opacity: numberAnim.opacity }),
              ...userTextTransform(
                props.motion?.styleHeadline,
                { transform: numberWiggle.transform }
              ),
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
            marginTop: 14,
            fontSize: 42,
            fontWeight: labelFont.weight,
            letterSpacing: 4,
            textShadow: 'none',
            ...textStrokeStyle(labelStroke),
            ...applyTextStyle(labelStyle),
            ...textFillStyle(labelStroke),
            ...(showAll ? {} : labelMask),
            ...userTextTransform(labelStyle, showAll ? { transform: labelWiggle.transform } : mergeAnim(labelMask, labelWiggle.transform)),
          }}
        >
          {labelText}
        </div>

        {/* IPHONE COM O PRINT DO SPOTIFY DENTRO */}
        <div
          data-cover-position-wrapper
          style={{
            marginTop: isStory ? 60 : 30,
            transform: `translate(${phoneX}px, ${phoneY}px)`,
            willChange: 'transform',
          }}
        >
          <PhoneMockup
            src={props.coverImage}
            width={phoneWidth}
            entryFrame={phoneIn}
            wiggleIntensity={phoneWiggle}
            accentFrames={accents}
            glowColor={M.glowColor}
            tilt={tilt}
            spinTurns={phoneSpinTurns}
            spinStart={phoneIn + 16}
            spinEnd={FINAL_HIT - 4}
            motionId={phoneMotion}
            dynamicIsland={phoneDynamicIsland}
          />
        </div>

        {/* LOGO SPOTIFY */}
        <div
          style={{
            marginTop: 36,
            ...(showAll ? {} : logoAnim),
          }}
        >
          <PlatformLogo name="Spotify" size={spotifyLogoSize} customSrc={M.customLogos?.Spotify} />
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
