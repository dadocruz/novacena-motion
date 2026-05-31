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
const SAFE_TOP = 285;
const SAFE_BOTTOM = 1635;
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

export const WatchOnYouTube: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const accents = [MID_HIT, FINAL_HIT];
  const M = resolveMotion(props.motion, 'rgba(255, 40, 40, 0.32)');
  const headlineIn = props.motion?.headlineInFrame ?? HEADLINE_IN;
  const channelIn = props.motion?.dateInFrame ?? CHANNEL_IN;
  const ctaIn = props.motion?.cta1InFrame ?? CTA_IN;

  const headlineMask = maskReveal(frame, headlineIn, 28);
  const channelAnim = scaleInBack(frame, channelIn, 20);
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
  const cta = props.cta ?? '';
  const hasCta = cta.trim().length > 0;
  const channel = props.channelName || 'CANAL OFICIAL';
  const channelCompactLength = channel.replace(/\s+/g, '').length;
  const channelFontSize = clamp(640 / Math.max(16, channelCompactLength), 25, 36);
  const coverSize = clamp(props.motion?.coverSize ?? 520, 420, 660);
  const coverTop = clamp(620 + (props.motion?.coverY ?? 0), SAFE_TOP + 230, SAFE_BOTTOM - coverSize - 250);
  const coverLeftOffset = clamp(props.motion?.coverX ?? 0, -220, 220);
  const channelTop = clamp(coverTop + coverSize + 34, SAFE_TOP + 720, SAFE_BOTTOM - 220);
  const ctaTop = clamp(channelTop + 84, SAFE_TOP + 840, SAFE_BOTTOM - 110);
  const channelMaxWidth = clamp(channelCompactLength * channelFontSize * 1.08 + 168, 420, 860);
  const channelTextStyle = keepTextOnlyStyle(applyTextStyle(props.motion?.styleDate));
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

  // YouTube ícones flutuando (posicionados nas bordas, com rotação)
  const floatingYT = [
    { left: 60, top: 310, size: 110, off: 0, rotate: -15 },
    { left: 860, top: 360, size: 130, off: 33, rotate: 12 },
    { left: 70, top: 1440, size: 100, off: 88, rotate: 18 },
    { left: 850, top: 1500, size: 120, off: 130, rotate: -10 },
  ];

  const renderYTIcons = (startFrame: number) =>
    floatingYT.map((f, i) => {
      const appear = eased(frame, startFrame + i * 4, startFrame + i * 4 + 22, easings.outCubic);
      return (
      <div
          key={i}
          style={{
            position: 'absolute',
            left: f.left,
            top: f.top,
            opacity: appear * 0.85,
            transform: `${loopFloat(frame, f.off, 1.1)} rotate(${f.rotate}deg)`,
          }}
        >
          <PlatformLogo name="YouTube" size={f.size} variant="icon" customSrc={M.customLogos?.YouTube} />
        </div>
      );
    });

  const channelPill = (
    <div
      style={{
        position: 'absolute',
        top: channelTop,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 96px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 'fit-content',
          maxWidth: channelMaxWidth,
          minHeight: 70,
          boxSizing: 'border-box',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          background: '#FF0000',
          padding: '17px 58px',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(255,0,0,0.32)',
          ...channelAnim,
          ...userTextTransform(props.motion?.styleDate, mergeAnim(channelAnim, channelWiggle.transform)),
        }}
      >
        <span
          style={{
            maxWidth: '100%',
            display: 'block',
            color: '#fff',
            fontFamily: ff(M.fontDate.family),
            fontSize: channelFontSize,
            fontWeight: M.fontDate.weight,
            letterSpacing: 1.2,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            ...channelTextStyle,
          }}
        >
          {channel}
        </span>
      </div>
    </div>
  );

  if (props.motion?.layoutPreset === 'novacena_youtube_card') {
    return (
      <AbsoluteFill style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', overflow: 'hidden' }}>
        <FontFaces fonts={props.motion?.customFonts} activeFontIds={[props.motion?.fontHeadline ?? '', props.motion?.fontDate ?? '', props.motion?.fontCta ?? '', props.motion?.fontCta1 ?? '']} />
        <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={M.particlesEnabled ? 0.72 : 0} background={M.background} />
        <OverlayLayer overlays={props.motion?.overlays} />
        {renderYTIcons(20)}
        <div
          style={{
            position: 'absolute',
            top: 330,
            left: 96,
            right: 96,
            textAlign: 'center',
            fontFamily: ff(M.fontHeadline.family),
            fontSize: 88,
            lineHeight: 0.95,
            fontWeight: M.fontHeadline.weight,
            letterSpacing: 2,
            color: '#d8f4f0',
            textShadow: '0 4px 0 rgba(0,0,0,0.28), 0 18px 46px rgba(0,0,0,0.46)',
            textTransform: 'uppercase',
            ...textStrokeStyle(M.strokeHeadline),
            ...(props.motion?.styleHeadline?.useGradient ? {} : textFillStyle(M.strokeHeadline)),
            ...applyTextStyle(props.motion?.styleHeadline),
            ...(showAll ? {} : headlineMask),
            ...userTextTransform(props.motion?.styleHeadline, showAll ? { transform: headlineWiggle.transform } : mergeAnim(headlineMask, headlineWiggle.transform)),
          }}
        >
          ASSISTA NO<br />YOUTUBE
        </div>
        <div data-cover-position-wrapper style={{ position: 'absolute', top: coverTop, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translateX(${coverLeftOffset}px)` }}>
          <PremiumCover
            src={props.coverImage}
            size={coverSize}
            entryFrame={COVER_IN}
            spinStart={COVER_IN + 14}
            spinEnd={FINAL_HIT - 4}
            spinTurns={M.spinTurns}
            wiggleIntensity={M.wiggleIntensity}
            accentFrames={accents}
            glowColor={M.glowColor}
          />
        </div>
        {channelPill}
        {hasCta && (
          <div
            style={{
              position: 'absolute',
              top: ctaTop,
              left: 96,
              right: 96,
              textAlign: 'center',
              fontFamily: ff(ctaFont.family),
              fontSize: 30,
              fontWeight: ctaFont.weight,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              ...textStrokeStyle(ctaStroke),
              ...(ctaStyle?.useGradient ? {} : textFillStyle(ctaStroke)),
              ...applyTextStyle(ctaStyle),
              ...userTextTransform(ctaStyle, { transform: ctaWiggle.transform }),
            }}
          >
            {cta}
          </div>
        )}
        <AbsoluteFill style={{ background: '#fff', opacity: finalFlash, pointerEvents: 'none' }} />
      </AbsoluteFill>
    );
  }

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
      <OverlayLayer overlays={props.motion?.overlays} />

      {renderYTIcons(28)}

      {/* HEADLINE — safe zone y:330 */}
      <div
        style={{
          position: 'absolute',
          top: 330,
          left: 96,
          right: 96,
          textAlign: 'center',
          fontFamily: ff(M.fontHeadline.family),
          fontSize: 88,
          lineHeight: 0.95,
          fontWeight: M.fontHeadline.weight,
          letterSpacing: 2,
          color: '#d8f4f0',
          textShadow: '0 4px 0 rgba(0,0,0,0.28), 0 18px 46px rgba(0,0,0,0.46)',
          textTransform: 'uppercase',
          ...textStrokeStyle(M.strokeHeadline),
          ...(props.motion?.styleHeadline?.useGradient ? {} : textFillStyle(M.strokeHeadline)),
          ...applyTextStyle(props.motion?.styleHeadline),
          ...(showAll ? {} : headlineMask),
          ...userTextTransform(props.motion?.styleHeadline, showAll ? { transform: headlineWiggle.transform } : mergeAnim(headlineMask, headlineWiggle.transform)),
        }}
      >
        ASSISTA NO<br />YOUTUBE
      </div>

      {/* CAPA — centralizada */}
      <div data-cover-position-wrapper style={{ position: 'absolute', top: coverTop, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translateX(${coverLeftOffset}px)` }}>
        <PremiumCover
          src={props.coverImage}
          size={coverSize}
          entryFrame={COVER_IN}
          spinStart={COVER_IN + 14}
          spinEnd={FINAL_HIT - 4}
          spinTurns={M.spinTurns}
          wiggleIntensity={M.wiggleIntensity}
          accentFrames={accents}
          glowColor={M.glowColor}
        />
      </div>

      {channelPill}

      {/* CTA */}
      {hasCta && (
        <div
          style={{
            position: 'absolute',
            top: ctaTop,
            left: 96,
            right: 96,
            textAlign: 'center',
            fontFamily: ff(ctaFont.family),
            fontSize: 30,
            fontWeight: ctaFont.weight,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
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
                  {char === ' ' ? ' ' : char}
                </span>
              ))}
        </div>
      )}

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
