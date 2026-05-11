import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  easings,
  eased,
  elegantWiggle,
  getTextTransition,
} from './motionEngine';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { PremiumCover } from './PremiumCover';
import { PlatformLogo } from './PlatformLogo';
import { DEFAULT_FONTS, findFont, applyTextStyle, applyGradientStyle, hasGradient } from '../lib/fontCatalog';
import type { TemplateProps, TextTransitionId } from './types';

const HEADLINE_IN = 18;
const DATE_IN = 38;
const COVER_IN = 54;
const MID_HIT = 124;
const CTA1_IN_DEFAULT = 78;
const CTA2_IN_DEFAULT = MID_HIT + 14;
const LOGOS_IN_DEFAULT = 158;
const FINAL_HIT_BASE = 208;
const FINAL_POSTER_BASE = 222;

export const AvailableNow: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const motion = props.motion ?? {};

  const durationSeconds = motion.durationSeconds ?? 8;
  const durationFrames = durationSeconds * 30;
  const FINAL_HIT = Math.min(FINAL_HIT_BASE, durationFrames - 14);
  const FINAL_POSTER = Math.min(FINAL_POSTER_BASE, durationFrames - 2);
  const accents = [MID_HIT, FINAL_HIT];

  const fontHeadline = findFont(motion.fontHeadline ?? DEFAULT_FONTS.headline);
  const fontDate = findFont(motion.fontDate ?? DEFAULT_FONTS.date);
  const fontCta = findFont(motion.fontCta ?? DEFAULT_FONTS.cta);
  const coverSize = motion.coverSize ?? 510;
  const spinTurns = motion.spinTurns ?? 2;
  const wiggleIntensity = motion.wiggleIntensity ?? 1;
  const wH = motion.wiggleHeadline ?? 0;
  const wD = motion.wiggleDate ?? 0;
  const wC = motion.wiggleCta ?? 0;
  const particlesEnabled = motion.particlesEnabled ?? true;
  const finalFlashEnabled = motion.finalFlash ?? true;
  const glowColor = motion.glowColor ?? 'rgba(190, 90, 255, 0.28)';
  const cta1In = motion.cta1InFrame ?? CTA1_IN_DEFAULT;
  const ctaSwapFrame = motion.ctaSwapFrame ?? MID_HIT;
  const cta2In = motion.cta2InFrame ?? CTA2_IN_DEFAULT;
  const logosIn = motion.logosInFrame ?? LOGOS_IN_DEFAULT;

  const txHeadline: TextTransitionId = motion.transitionHeadline ?? 'mask_reveal';
  const txDate: TextTransitionId = motion.transitionDate ?? 'scale_pop';
  const txCta: TextTransitionId = motion.transitionCta ?? 'split_letters';

  const tH = getTextTransition(txHeadline)(frame, HEADLINE_IN);
  const tD = getTextTransition(txDate)(frame, DATE_IN);
  const tC1 = getTextTransition('split_letters')(frame, cta1In);
  const tC = getTextTransition(txCta)(frame, cta2In);

  // Wiggle individual por elemento (multiplica intensity global)
  const wigH = elegantWiggle(frame, { intensity: wH * wiggleIntensity, offset: 10 });
  const wigD = elegantWiggle(frame, { intensity: wD * wiggleIntensity, offset: 70 });
  const wigC = elegantWiggle(frame, { intensity: wC * wiggleIntensity, offset: 130 });

  const datePulse = interpolate(
    frame,
    [DATE_IN, DATE_IN + 12, DATE_IN + 30],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const cta1Text = props.cta || 'FAÇA O PRÉ-SAVE';
  const cta2Text = props.cta2 || props.cta || 'EM TODAS AS PLATAFORMAS DIGITAIS';

  const cta1Opacity = interpolate(
    frame,
    [ctaSwapFrame - 8, ctaSwapFrame + 10],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const cta2Opacity = interpolate(
    frame,
    [cta2In, cta2In + 22],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const logosAppear = eased(frame, logosIn, logosIn + 24, easings.outCubic);

  const finalFlash = finalFlashEnabled
    ? interpolate(
        frame,
        [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14],
        [0, 0.45, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 0;

  const showAll = frame >= FINAL_POSTER;
  const isStory = props.renderTarget === 'story';

  // Renderiza texto com perChar se a transição precisar
  const renderText = (text: string, tx: typeof tH) => {
    if (!tx.perChar) {
      return text;
    }
    const chars = text.split('');
    return chars.map((c, i) => (
      <span key={i} style={tx.perChar!(i, chars.length)}>
        {c === ' ' ? '\u00A0' : c}
      </span>
    ));
  };

  // Wrappa em <span> com gradiente quando style tem useGradient
  const renderTextWithStyle = (text: string, tx: typeof tH, style?: typeof motion.styleHeadline) => {
    const content = showAll || !tx.perChar ? text : renderText(text, tx);
    if (hasGradient(style)) {
      return <span style={applyGradientStyle(style)}>{content}</span>;
    }
    return content;
  };

  return (
    <AbsoluteFill
      style={{
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <CinematicBackground
        coverImage={props.coverImage}
        accentFrames={accents}
        intensity={particlesEnabled ? 1 : 0}
        background={motion.background}
      />

      <AbsoluteFill
        style={{
          padding: isStory ? '18px 72px 26px' : '18px 72px 18px',
          top: isStory ? 285 : 100,
          height: isStory ? 1350 : 1150,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ width: '100%' }}>
          {/* HEADLINE */}
          <div
            style={{
              width: '100%',
              paddingBottom: 10,
              overflow: 'visible',
              transform: showAll ? undefined : wigH.transform,
            }}
          >
            <div
              style={{
                fontFamily: `'${fontHeadline?.family ?? 'Arial'}', Arial, sans-serif`,
                fontSize: 100,
                lineHeight: 1.04,
                fontWeight: fontHeadline?.weight ?? 900,
                letterSpacing: -2,
                textTransform: 'uppercase',
                textShadow:
                  '0 14px 36px rgba(0,0,0,0.92), 0 0 28px rgba(190,90,255,0.28)',
                overflow: 'visible',
                ...applyTextStyle(motion.styleHeadline),
                ...(showAll ? {} : tH.wrapStyle),
              }}
            >
              {renderTextWithStyle(props.headline || 'LANÇAMENTO', tH, motion.styleHeadline)}
            </div>
          </div>

          {/* DATA */}
          {props.releaseDate ? (
            <div
              style={{
                fontFamily: `'${fontDate?.family ?? 'Arial'}', Arial, sans-serif`,
                marginTop: 10,
                display: 'inline-block',
                padding: '14px 32px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: `0 14px 34px rgba(0,0,0,0.4), 0 0 ${28 + datePulse * 40}px rgba(255,190,90,${0.18 + datePulse * 0.35})`,
                fontSize: 34,
                fontWeight: fontDate?.weight ?? 700,
                letterSpacing: 3.5,
                textTransform: 'uppercase',
                transform: showAll ? undefined : wigD.transform,
                ...applyTextStyle(motion.styleDate),
                ...(showAll ? {} : tD.wrapStyle),
              }}
            >
              {renderTextWithStyle(props.releaseDate, tD, motion.styleDate)}
            </div>
          ) : null}
        </div>

        {/* CAPA PREMIUM */}
        <div style={{ marginTop: 16 }}>
          <PremiumCover
            src={props.coverImage}
            size={coverSize}
            entryFrame={COVER_IN}
            spinStart={COVER_IN + 16}
            spinEnd={FINAL_HIT - 4}
            spinTurns={spinTurns}
            wiggleIntensity={wiggleIntensity}
            accentFrames={accents}
            glowColor={glowColor}
          />
        </div>

        <div
          style={{
            width: '100%',
            marginTop: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* CTA 1 */}
          <div
            style={{
              fontFamily: `'${fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
              width: '100%',
              minHeight: 44,
              fontSize: 30,
              lineHeight: 1.1,
              fontWeight: fontCta?.weight ?? 900,
              letterSpacing: 2.2,
              textTransform: 'uppercase',
              textShadow: '0 4px 22px rgba(0,0,0,0.92)',
              opacity: showAll ? 0 : cta1Opacity,
              transform: showAll ? undefined : wigC.transform,
              ...applyTextStyle(motion.styleCta),
              ...(showAll ? {} : tC1.wrapStyle),
            }}
          >
            {renderTextWithStyle(cta1Text, tC1, motion.styleCta)}
          </div>

          {/* CTA 2 */}
          <div
            style={{
              fontFamily: `'${fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
              width: '100%',
              minHeight: 52,
              fontSize: 32,
              lineHeight: 1.12,
              fontWeight: fontCta?.weight ?? 900,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              textShadow: '0 4px 22px rgba(0,0,0,0.92)',
              opacity: showAll ? 1 : cta2Opacity,
              transform: showAll ? undefined : wigC.transform,
              ...applyTextStyle(motion.styleCta),
              ...(showAll ? {} : tC.wrapStyle),
            }}
          >
            {renderTextWithStyle(cta2Text, tC, motion.styleCta)}
          </div>

          {/* LOGOS */}
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 18,
              flexWrap: 'wrap',
              opacity: showAll ? 1 : logosAppear,
            }}
          >
            {props.platforms.map((p, idx) => (
              <PlatformLogo
                key={p}
                name={p}
                size={68}
                delay={logosIn + idx * 7}
                customSrc={motion.customLogos?.[p]}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>

      {/* OVERLAYS — filmburn, light leak, etc */}
      <OverlayLayer overlays={motion.overlays} />

      {/* FLASH FINAL */}
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
