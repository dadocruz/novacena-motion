import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  charStagger,
  easings,
  eased,
  maskReveal,
  scaleInBack,
  loopFloat,
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

const HEADLINE_IN = 14;
const COVER_IN = 50;
const CHANNEL_IN = 96;
const CTA_IN = 124;
const MID_HIT = 140;
const FINAL_HIT = 208;
const FINAL_POSTER = 222;

export const WatchOnYouTube: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const accents = [MID_HIT, FINAL_HIT];
  const M = resolveMotion(props.motion, 'rgba(255, 40, 40, 0.32)');
  const headlineIn = props.motion?.headlineInFrame ?? HEADLINE_IN;
  const channelIn = props.motion?.dateInFrame ?? CHANNEL_IN;
  const ctaIn = props.motion?.cta1InFrame ?? CTA_IN;

  const previewMode = props.motion?.previewMode === true;
  const headlineMask = previewSafeAnim(maskReveal(frame, headlineIn, 28), previewMode);
  const channelAnim = previewSafeAnim(scaleInBack(frame, channelIn, 20), previewMode);
  const ctaChar = charStagger(frame, ctaIn, 1.0);

  const finalFlash = M.finalFlash
    ? interpolate(
        frame,
        [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14],
        [0, 0.45, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 0;

  const showAll = frame >= FINAL_POSTER;
  const cta = props.cta || 'CLIPE OFICIAL DISPONÍVEL';
  const channel = props.channelName || 'CANAL OFICIAL';
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
  const channelWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleDate ?? 0.25) * M.wiggleIntensity,
    frequency: 0.64,
    seed: 70,
  });
  const ctaWiggle = brazuWiggle(frame, {
    amplitude: (props.motion?.wiggleCta1 ?? props.motion?.wiggleCta ?? 0.3) * M.wiggleIntensity,
    frequency: 0.9,
    seed: 130,
  });
  const mergeAnim = (anim: React.CSSProperties, wiggleTransform?: string): React.CSSProperties => ({
    ...anim,
    transform: [anim.transform, wiggleTransform].filter(Boolean).join(' '),
  });

  // YouTube ícones flutuando
  const floatingYT = [
    { left: 70, top: 290, size: 96, off: 0 },
    { left: 880, top: 340, size: 116, off: 33 },
    { left: 90, top: 1470, size: 86, off: 88 },
    { left: 870, top: 1510, size: 102, off: 130 },
  ];

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

      {/* YT ícones decorativos */}
      {floatingYT.map((f, i) => {
        const appear = eased(frame, 28 + i * 4, 28 + i * 4 + 22, easings.outCubic);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: f.left,
              top: f.top,
              opacity: appear * 0.85,
              transform: loopFloat(frame, f.off, 1.1),
            }}
          >
            <PlatformLogo name="YouTube" size={f.size} variant="icon" customSrc={M.customLogos?.YouTube} />
          </div>
        );
      })}

      <AbsoluteFill
        style={{
          padding: '0 72px',
          paddingTop: 220,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* HEADLINE */}
        <div style={{ width: '100%', paddingBottom: 20, overflow: 'visible' }}>
          <div
            style={{
              fontFamily: ff(M.fontHeadline.family),
              fontSize: 114,
              lineHeight: 1,
              fontWeight: M.fontHeadline.weight,
              letterSpacing: -3.5,
              ...textStrokeStyle(M.strokeHeadline),
              ...(props.motion?.styleHeadline?.useGradient ? {} : textFillStyle(M.strokeHeadline)),
              textShadow: 'none',
              overflow: 'visible',
              ...applyTextStyle(props.motion?.styleHeadline),
              ...(showAll ? {} : headlineMask),
              ...userTextTransform(props.motion?.styleHeadline, showAll ? { transform: headlineWiggle.transform } : mergeAnim(headlineMask, headlineWiggle.transform)),
            }}
          >
            ASSISTA<br />NO YOUTUBE
          </div>
        </div>

        {/* CAPA */}
        <div style={{ marginTop: 60 }}>
          <div

            data-cover-position-wrapper

            style={{

              transform: `translate(${props.motion?.coverX ?? 0}px, ${props.motion?.coverY ?? 0}px)`,

              willChange: 'transform',

            }}

          >

          <PremiumCover
            src={props.coverImage}
            size={M.coverSize + 30}
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

        {/* CANAL PILL */}
        <div
          style={{
            fontFamily: ff(M.fontDate.family),
            marginTop: 50,
            display: 'inline-block',
            padding: '14px 32px',
            borderRadius: 999,
            background: '#FF0000',
            fontSize: 32,
            fontWeight: M.fontDate.weight,
            letterSpacing: 1.6,
            boxShadow: '0 20px 50px rgba(255,0,0,0.36)',
            ...applyTextStyle(props.motion?.styleDate),
            ...(showAll ? {} : channelAnim),
            ...userTextTransform(props.motion?.styleDate, showAll ? { transform: channelWiggle.transform } : mergeAnim(channelAnim, channelWiggle.transform)),
          }}
        >
          ▶ {channel}
        </div>

        {/* CTA */}
        <div
          style={{
            fontFamily: ff(ctaFont.family),
            marginTop: 32,
            fontSize: 32,
            fontWeight: ctaFont.weight,
            letterSpacing: 2.4,
            textShadow: 'none',
            ...textStrokeStyle(ctaStroke),
            ...(ctaStyle?.useGradient ? {} : textFillStyle(ctaStroke)),
            ...applyTextStyle(ctaStyle),
            ...userTextTransform(ctaStyle, { transform: ctaWiggle.transform }),
          }}
        >
          {showAll
            ? cta
            : cta.split('').map((char, i) => (
                <span key={i} style={ctaChar(i)}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
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
