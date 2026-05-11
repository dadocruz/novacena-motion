import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  charStagger,
  easings,
  eased,
  maskReveal,
  scaleInBack,
} from './motionEngine';
import { CinematicBackground } from './CinematicBackground';
import { PremiumCover } from './PremiumCover';
import { PlatformLogo } from './PlatformLogo';
import { DEFAULT_FONTS, findFont } from '../lib/fontCatalog';
import type { TemplateProps } from './types';

const HEADLINE_IN = 18;
const DATE_IN = 38;
const COVER_IN = 54;
const CTA1_IN = 84;
const MID_HIT = 124;
const CTA2_IN = MID_HIT + 4;
const LOGOS_IN = 138;
const FINAL_HIT = 208;
const FINAL_POSTER = 222;

export const AvailableNow: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const accents = [MID_HIT, FINAL_HIT];

  const motion = props.motion ?? {};
  const fontHeadline = findFont(motion.fontHeadline ?? DEFAULT_FONTS.headline);
  const fontDate = findFont(motion.fontDate ?? DEFAULT_FONTS.date);
  const fontCta = findFont(motion.fontCta ?? DEFAULT_FONTS.cta);
  const coverSize = motion.coverSize ?? 510;
  const spinTurns = motion.spinTurns ?? 2;
  const wiggleIntensity = motion.wiggleIntensity ?? 1;
  const particlesEnabled = motion.particlesEnabled ?? true;
  const finalFlashEnabled = motion.finalFlash ?? true;
  const glowColor = motion.glowColor ?? 'rgba(190, 90, 255, 0.28)';

  const headlineMask = maskReveal(frame, HEADLINE_IN, 26);
  const dateAnim = scaleInBack(frame, DATE_IN, 20);
  const datePulse = interpolate(
    frame,
    [DATE_IN, DATE_IN + 12, DATE_IN + 30],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const cta1Text = 'FAÇA O PRÉ-SAVE';
  const cta2Text = props.cta || 'EM TODAS AS PLATAFORMAS DIGITAIS';
  const cta1Char = charStagger(frame, CTA1_IN, 1.2);
  const cta2Char = charStagger(frame, CTA2_IN, 0.9);

  const cta1Opacity = interpolate(frame, [MID_HIT - 12, MID_HIT], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cta2Opacity = interpolate(frame, [CTA2_IN, CTA2_IN + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logosAppear = eased(frame, LOGOS_IN, LOGOS_IN + 24, easings.outCubic);

  const finalFlash = finalFlashEnabled
    ? interpolate(
        frame,
        [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14],
        [0, 0.45, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 0;

  const showAll = frame >= FINAL_POSTER;

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
          padding: '0 72px',
          paddingTop: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ width: '100%', paddingBottom: 20, overflow: 'visible' }}>
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
              ...(showAll ? {} : headlineMask),
            }}
          >
            {props.headline || 'LANÇAMENTO'}
          </div>
        </div>

        {props.releaseDate ? (
          <div
            style={{
              fontFamily: `'${fontDate?.family ?? 'Arial'}', Arial, sans-serif`,
              marginTop: 28,
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
              ...(showAll ? {} : dateAnim),
            }}
          >
            {props.releaseDate}
          </div>
        ) : null}

        <div style={{ marginTop: 70 }}>
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
            fontFamily: `'${fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
            marginTop: 90,
            position: 'relative',
            width: '100%',
            minHeight: 64,
            fontSize: 32,
            lineHeight: 1.12,
            fontWeight: fontCta?.weight ?? 900,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            textShadow: '0 4px 22px rgba(0,0,0,0.92)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, opacity: showAll ? 0 : cta1Opacity }}>
            {cta1Text.split('').map((char, i) => (
              <span key={i} style={cta1Char(i)}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, opacity: showAll ? 1 : cta2Opacity }}>
            {showAll
              ? cta2Text
              : cta2Text.split('').map((char, i) => (
                  <span key={i} style={cta2Char(i)}>
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
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
              delay={LOGOS_IN + idx * 7}
            />
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
