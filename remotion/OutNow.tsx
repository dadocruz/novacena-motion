import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  easings,
  eased,
  loopFloat,
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

const HEADLINE_IN = 14;
const COVER_IN = 46;
const CTA_IN = 88;
const MID_HIT = 122;
const DATE_IN = 130;
const FINAL_HIT = 208;
const FINAL_POSTER = 222;

export const OutNow: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const accents = [MID_HIT, FINAL_HIT];
  const M = resolveMotion(props.motion, 'rgba(255, 140, 60, 0.32)');
  const headlineIn = props.motion?.headlineInFrame ?? HEADLINE_IN;
  const ctaIn = props.motion?.cta1InFrame ?? CTA_IN;
  const dateIn = props.motion?.dateInFrame ?? DATE_IN;

  const txHeadline = (props.motion?.transitionHeadline ?? 'mask_reveal') as TextTransitionId;
  const txDate = (props.motion?.transitionDate ?? 'scale_pop') as TextTransitionId;
  const txCta = (props.motion?.transitionCta1 ?? props.motion?.transitionCta ?? 'split_letters') as TextTransitionId;
  const headlineTransition = getTextTransition(txHeadline)(frame, headlineIn, props.motion?.transitionTuningHeadline);
  const dateTransition = getTextTransition(txDate)(frame, dateIn, props.motion?.transitionTuningDate);
  const ctaTransition = getTextTransition(txCta)(frame, ctaIn, props.motion?.transitionTuningCta1 ?? props.motion?.transitionTuningCta);

  const finalFlash = M.finalFlash
    ? interpolate(
        frame,
        [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14],
        [0, 0.4, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 0;

  const showAll = frame >= FINAL_POSTER;
  const headline = props.headline || 'DISPONÍVEL';
  const cta = props.cta || 'EM TODAS AS PLATAFORMAS DIGITAIS';
  const ctaFont = findFont(
    props.motion?.fontCta1 ?? props.motion?.fontCta ?? DEFAULT_FONTS.cta,
    props.motion?.customFonts ?? []
  ) ?? M.fontCta;
  const ctaStyle = props.motion?.styleCta1 ?? props.motion?.styleCta;
  const ctaStroke = props.motion?.strokeCta1 ?? props.motion?.strokeCta ?? M.strokeCta;
  const headlineWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleHeadline ?? 0.35) * M.wiggleIntensity,
    frequency: 0.74,
    seed: 10,
  });
  const ctaWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleCta1 ?? props.motion?.wiggleCta ?? 0.3) * M.wiggleIntensity,
    frequency: 0.9,
    seed: 130,
  });
  const dateWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleDate ?? 0.25) * M.wiggleIntensity,
    frequency: 0.64,
    seed: 70,
  });
  // Logos flutuando nos cantos (decorativo)
  const floatingLogos = [
    { p: props.platforms[0] || 'Spotify', left: 60, top: 280, off: 0 },
    { p: props.platforms[1] || 'Deezer', left: 880, top: 320, off: 42 },
    { p: props.platforms[2] || 'Apple Music', left: 80, top: 1480, off: 90 },
    { p: props.platforms[3] || 'YouTube Music', left: 860, top: 1520, off: 140 },
  ] as const;

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

      {/* Logos flutuando decorativos */}
      {floatingLogos.map((f, i) => {
        const appear = eased(frame, 30 + i * 4, 30 + i * 4 + 20, easings.outCubic);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: f.left,
              top: f.top,
              opacity: appear * 0.92,
              transform: loopFloat(frame, f.off, 1.1),
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 22px 60px rgba(0,0,0,0.42)',
              }}
            >
              <PlatformLogo name={f.p} size={78} variant="icon" customSrc={M.customLogos?.[f.p]} />
            </div>
          </div>
        );
      })}

      {/* CONTEÚDO PRINCIPAL */}
      <AbsoluteFill
        style={{
          padding: '0 72px',
          paddingTop: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* HEADLINE GIGANTE */}
        <div style={{ width: '100%', paddingBottom: 20, overflow: 'visible' }}>
          <div
            style={{
              fontFamily: ff(M.fontHeadline.family),
              fontSize: 148,
              lineHeight: 0.94,
              fontWeight: M.fontHeadline.weight,
              letterSpacing: -4,
              ...textStrokeStyle(M.strokeHeadline),
              ...(props.motion?.styleHeadline?.useGradient ? {} : textFillStyle(M.strokeHeadline)),
              textShadow: 'none',
              overflow: 'visible',
              ...applyTextStyle(props.motion?.styleHeadline),
              ...userTextTransform(props.motion?.styleHeadline, { transform: headlineWiggle.transform }),
            }}
          >
            <StyledText
              text={headline}
              transition={showAll ? undefined : headlineTransition}
              style={props.motion?.styleHeadline}
              stroke={M.strokeHeadline}
              preserveFontShape={false}
              previewMode={false}
            />
          </div>
        </div>

        {/* CAPA */}
        <div style={{ marginTop: 70 }}>
          <div

            data-cover-position-wrapper

            style={{

              transform: `translate(${props.motion?.coverX ?? 0}px, ${props.motion?.coverY ?? 0}px)`,

              willChange: 'transform',

            }}

          >

          <PremiumCover
            src={props.coverImage}
            size={M.coverSize + 40}
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

        {/* CTA char stagger */}
        <div
          style={{
            fontFamily: ff(ctaFont.family),
            marginTop: 80,
            fontSize: 38,
            fontWeight: ctaFont.weight,
            letterSpacing: 2.6,
            textShadow: 'none',
            ...textStrokeStyle(ctaStroke),
            ...(ctaStyle?.useGradient ? {} : textFillStyle(ctaStroke)),
            ...applyTextStyle(ctaStyle),
            ...userTextTransform(ctaStyle, { transform: ctaWiggle.transform }),
          }}
        >
          <StyledText
            text={cta}
            transition={showAll ? undefined : ctaTransition}
            style={ctaStyle}
            stroke={ctaStroke}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>

        {/* DATA */}
        {props.releaseDate ? (
          <div
            style={{
              fontFamily: ff(M.fontDate.family),
              marginTop: 26,
              fontSize: 28,
              fontWeight: M.fontDate.weight,
              letterSpacing: 2.4,
              opacity: 0.92,
              ...applyTextStyle(props.motion?.styleDate),
              ...userTextTransform(props.motion?.styleDate, { transform: dateWiggle.transform }),
            }}
          >
            <StyledText
              text={`DESDE ${props.releaseDate}`}
              transition={showAll ? undefined : dateTransition}
              style={props.motion?.styleDate}
              stroke={props.motion?.strokeDate}
              preserveFontShape={false}
              previewMode={false}
            />
          </div>
        ) : null}
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
