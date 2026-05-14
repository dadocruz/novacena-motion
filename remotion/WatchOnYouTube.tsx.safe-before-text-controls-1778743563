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
} from './motionEngine';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { PremiumCover } from './PremiumCover';
import { PlatformLogo } from './PlatformLogo';
import { resolveMotion, ff, applyTextStyle } from '../lib/fontCatalog';
import type { TemplateProps } from './types';

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

  const headlineMask = maskReveal(frame, HEADLINE_IN, 28);
  const channelAnim = scaleInBack(frame, CHANNEL_IN, 20);
  const ctaChar = charStagger(frame, CTA_IN, 1.0);

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
      <FontFaces fonts={props.motion?.customFonts} activeFontIds={[props.motion?.fontHeadline ?? '', props.motion?.fontDate ?? '', props.motion?.fontCta ?? '']} />
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
              textShadow:
                '0 14px 38px rgba(0,0,0,0.92), 0 0 30px rgba(255,30,30,0.32)',
              overflow: 'visible',
              ...applyTextStyle(props.motion?.styleHeadline),
              ...(showAll ? {} : headlineMask),
            }}
          >
            ASSISTA<br />NO YOUTUBE
          </div>
        </div>

        {/* CAPA */}
        <div style={{ marginTop: 60 }}>
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
          }}
        >
          ▶ {channel}
        </div>

        {/* CTA */}
        <div
          style={{
            fontFamily: ff(M.fontCta.family),
            marginTop: 32,
            fontSize: 32,
            fontWeight: M.fontCta.weight,
            letterSpacing: 2.4,
            textShadow: '0 6px 22px rgba(0,0,0,0.92)',
            ...applyTextStyle(props.motion?.styleCta),
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
