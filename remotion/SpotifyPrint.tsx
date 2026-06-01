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
import { PhoneMockup } from './PhoneMockup';
import { StyledText } from './StyledText';
import { DEFAULT_FONTS, findFont, resolveMotion, ff, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps } from './types';
import { textStrokeStyle, textFillStyle } from './textStroke';

const PREFIX_IN = 14;
const BADGE_IN = 34;
const NUMBER_IN = 54;
const LABEL_IN = 76;
const PHONE_IN = 98;
const MID_HIT = 130;
const LOGO_IN = 6;
const FINAL_HIT = 208;
const FINAL_POSTER = 222;

function fittedFontSize(text: string, maxWidth: number, preferred: number, min: number, ratio = 0.58) {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return preferred;
  return Math.max(min, Math.min(preferred, maxWidth / (clean.length * ratio)));
}

const SpotifyWordmark: React.FC<{ delay: number; compact?: boolean }> = ({ delay, compact = false }) => {
  const frame = useCurrentFrame();
  const anim = scaleInBack(frame, delay, 16);
  const green = '#1ED760';

  return (
    <div
      style={{
        ...anim,
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 10 : 14,
        color: green,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 900,
        fontSize: compact ? 34 : 48,
        lineHeight: 1,
      }}
    >
      <div
        style={{
          width: compact ? 44 : 62,
          height: compact ? 44 : 62,
          borderRadius: '50%',
          background: green,
          position: 'relative',
          boxShadow: '0 0 28px rgba(30, 215, 96, 0.26)',
          flex: '0 0 auto',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: compact ? 10 + i * 1.5 : 14 + i * 2,
              top: compact ? 13 + i * 7 : 18 + i * 9,
              width: compact ? 25 - i * 3 : 35 - i * 4,
              height: compact ? 8 : 10,
              borderTop: `${compact ? 3 : 4}px solid #050706`,
              borderRadius: '50%',
              transform: 'rotate(8deg)',
            }}
          />
        ))}
      </div>
      <span>Spotify</span>
    </div>
  );
};

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
  const badgeAnim = previewSafeAnim(scaleInBack(frame, BADGE_IN, 14), previewMode);
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
  const isStory = props.renderTarget === 'story';
  const phoneCfg = (props.motion as any) ?? {};
  const phoneWidth = phoneCfg.phoneSize ?? (isStory ? 610 : 420);
  const tilt = phoneCfg.phoneTilt ?? -4;
  const phoneMotion = phoneCfg.phoneMotion ?? 'zoom_bounce';
  const phoneSpinTurns = phoneCfg.phoneSpinTurns ?? 0;
  const phoneWiggle = (phoneCfg.phoneWiggle ?? 1) * M.wiggleIntensity;
  const phoneDynamicIsland = phoneCfg.phoneDynamicIsland ?? true;
  const phoneX = phoneCfg.phoneX ?? 0;
  const phoneY = phoneCfg.phoneY ?? 0;
  const canvasW = 1080;
  const safeX = isStory ? 78 : 72;
  const textMaxWidth = canvasW - safeX * 2;
  const prefixSize = fittedFontSize(prefixText, textMaxWidth, isStory ? 102 : 66, isStory ? 58 : 42, 0.56);
  const numberSize = fittedFontSize(numberText, textMaxWidth, isStory ? 138 : 92, isStory ? 72 : 56, 0.58);
  const labelSize = fittedFontSize(labelText, textMaxWidth * 0.84, isStory ? 58 : 40, isStory ? 34 : 28, 0.58);
  const topSafe = isStory ? 132 : 58;
  const phoneTop = isStory ? 760 : 440;
  const phoneLeft = (canvasW - phoneWidth) / 2;
  const textShadow = '0 10px 34px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.28)';

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
          padding: `0 ${safeX}px`,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: topSafe,
            left: safeX,
            right: safeX,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <SpotifyWordmark delay={logoIn} compact={!isStory} />
        </div>

        {/* PREFIX — ULTRAPASSAMOS */}
        <div
          style={{
            position: 'absolute',
            top: isStory ? topSafe + 150 : topSafe + 92,
            left: safeX,
            right: safeX,
            fontFamily: ff(M.fontDate.family),
            fontSize: prefixSize,
            fontWeight: M.fontDate.weight,
            lineHeight: 0.88,
            letterSpacing: 0,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textShadow,
            zIndex: 5,
            ...textStrokeStyle(M.strokeDate),
            ...applyTextStyle(props.motion?.styleDate),
            ...textFillStyle(M.strokeDate),
            ...userTextTransform(props.motion?.styleDate, { transform: prefixWiggle.transform }),
          }}
        >
          <StyledText
            text={prefixText}
            transition={showAll ? undefined : prefixTransition}
            style={props.motion?.styleDate}
            stroke={M.strokeDate}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            top: isStory ? topSafe + 270 : topSafe + 164,
            left: '50%',
            width: isStory ? 310 : 220,
            height: isStory ? 44 : 32,
            marginLeft: isStory ? -155 : -110,
            display: 'grid',
            placeItems: 'center',
            background: '#57ff1f',
            color: '#050706',
            fontFamily: ff(labelFont.family),
            fontSize: isStory ? 34 : 24,
            fontWeight: 900,
            fontStyle: 'italic',
            lineHeight: 1,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            transform: `${badgeAnim.transform ?? ''} rotate(-1deg)`,
            opacity: badgeAnim.opacity,
            zIndex: 6,
            boxShadow: '0 12px 26px rgba(0,0,0,0.20)',
          }}
        >
          A MARCA DE
        </div>

        {/* NÚMERO GIGANTE */}
        <div
          style={{
            position: 'absolute',
            top: isStory ? topSafe + 300 : topSafe + 188,
            left: safeX,
            right: safeX,
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontFamily: ff(M.fontHeadline.family),
              fontSize: numberSize,
              lineHeight: 0.86,
              fontWeight: M.fontHeadline.weight,
              letterSpacing: -2,
              color: '#fff',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              textShadow,
              overflow: 'visible',
              ...textStrokeStyle(M.strokeHeadline),
              ...applyTextStyle(props.motion?.styleHeadline),
              ...textFillStyle(M.strokeHeadline),
              ...userTextTransform(
                props.motion?.styleHeadline,
                { transform: numberWiggle.transform }
              ),
            }}
          >
            <StyledText
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
            position: 'absolute',
            top: isStory ? topSafe + 430 : topSafe + 278,
            left: safeX,
            right: safeX,
            fontFamily: ff(labelFont.family),
            fontSize: labelSize,
            fontWeight: labelFont.weight,
            lineHeight: 0.9,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            whiteSpace: 'pre-line',
            textShadow,
            zIndex: 5,
            ...textStrokeStyle(labelStroke),
            ...applyTextStyle(labelStyle),
            ...textFillStyle(labelStroke),
            ...userTextTransform(labelStyle, { transform: labelWiggle.transform }),
          }}
        >
          <StyledText
            text={labelText}
            transition={showAll ? undefined : labelTransition}
            style={labelStyle}
            stroke={labelStroke}
            preserveFontShape={false}
            previewMode={false}
          />
        </div>

        {/* IPHONE COM O PRINT DO SPOTIFY DENTRO */}
        <div
          data-cover-position-wrapper
          style={{
            position: 'absolute',
            top: phoneTop,
            left: phoneLeft,
            width: phoneWidth,
            transform: `translate(${phoneX}px, ${phoneY}px)`,
            willChange: 'transform',
            zIndex: 4,
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
