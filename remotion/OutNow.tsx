import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { easings, eased, getTextTransition } from './motionEngine';
import { brazuWiggle } from './motionEffects';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { PremiumCover } from './PremiumCover';
import { PlatformLogo } from './PlatformLogo';
import { DEFAULT_FONTS, findFont, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps, TextTransitionId } from './types';
import { StyledText } from './StyledText';

/**
 * DISPONÍVEL — mesmo layout do PRÉ-SAVE (AvailableNow) mas:
 *   - sem data de lançamento
 *   - sem CTA1 "FAÇA O PRÉ-SAVE" — a música já saiu
 *   - headline default: "DISPONÍVEL"
 *   - CTA2 default: "EM TODAS AS PLATAFORMAS DIGITAIS"
 */

const HEADLINE_IN = 0;
const COVER_IN = 54;
const MID_HIT = 124;
const CTA_IN_DEFAULT = 78;
const LOGOS_IN_DEFAULT = 130;
const FINAL_HIT_BASE = 208;
const FINAL_POSTER_BASE = 222;

export const OutNow: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const motion = props.motion ?? {};
  const durationSeconds = motion.durationSeconds ?? 8;
  const durationFrames = durationSeconds * 30;
  const FINAL_HIT = Math.min(FINAL_HIT_BASE, durationFrames - 14);
  const FINAL_POSTER = Math.min(FINAL_POSTER_BASE, durationFrames - 2);
  const accents = [MID_HIT, FINAL_HIT];

  const fontHeadline = findFont(motion.fontHeadline ?? DEFAULT_FONTS.headline, motion.customFonts ?? []);
  const fontCta = findFont(motion.fontCta ?? DEFAULT_FONTS.cta, motion.customFonts ?? []);
  // Usa fontCta2 para "EM TODAS AS PLATAFORMAS DIGITAIS" — mesmo slot que o PRÉ-SAVE
  const fontCta2Id = motion.fontCta2 && motion.fontCta2 !== DEFAULT_FONTS.cta ? motion.fontCta2 : motion.fontCta ?? DEFAULT_FONTS.cta;
  const fontCta2 = findFont(fontCta2Id, motion.customFonts ?? []);

  const coverSize = motion.coverSize ?? 510;
  const spinTurns = motion.spinTurns ?? 2;
  const wiggleIntensity = motion.wiggleIntensity ?? 1;
  const wH = motion.wiggleHeadline ?? 0.35;
  const wC2 = motion.wiggleCta2 ?? motion.wiggleCta ?? 0.25;
  const particlesEnabled = motion.particlesEnabled ?? true;
  const finalFlashEnabled = motion.finalFlash ?? true;
  const glowColor = motion.glowColor ?? 'rgba(190, 90, 255, 0.28)';
  const ctaIn = motion.cta1InFrame ?? CTA_IN_DEFAULT;
  const logosIn = motion.logosInFrame ?? LOGOS_IN_DEFAULT;
  const headlineIn = motion.headlineInFrame ?? HEADLINE_IN;

  const txHeadline: TextTransitionId = (motion.transitionHeadline ?? (motion as any).trHeadline ?? 'mask_reveal') as TextTransitionId;
  const txCta2 = (motion.transitionCta2 ?? (motion as any).trCta2 ?? motion.transitionCta ?? (motion as any).trCta ?? 'split_letters') as TextTransitionId;
  const tH = getTextTransition(txHeadline)(frame, headlineIn, motion.transitionTuningHeadline);
  const tC2 = getTextTransition(txCta2)(frame, ctaIn, motion.transitionTuningCta2 ?? motion.transitionTuningCta);

  const wigH = brazuWiggle(frame, { amplitude: wH * wiggleIntensity, frequency: 0.74, seed: 10 });
  const wigC2 = brazuWiggle(frame, { amplitude: wC2 * wiggleIntensity, frequency: 0.82, seed: 210 });

  const ctaText = (props.cta2 && props.cta2.trim()) || 'EM TODAS AS PLATAFORMAS DIGITAIS';
  const ctaOpacity = interpolate(frame, [ctaIn, ctaIn + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logosAppear = eased(frame, logosIn, logosIn + 24, easings.outCubic);
  const finalFlash = finalFlashEnabled ? interpolate(frame, [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14], [0, 0.45, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const showAll = frame >= FINAL_POSTER;
  const isStory = props.renderTarget === 'story';
  const visiblePlatforms = props.platforms;
  const platformLogoSize = motion.platformLogoSize ?? 54;
  const platformLogoGap = motion.platformLogoGap ?? 18;
  const platformLogoScales = motion.platformLogoScales ?? {};
  const platformLogoWiggle = motion.platformLogoWiggle ?? 0.065;
  const platformLogoWiggleSpeed = motion.platformLogoWiggleSpeed ?? 1;
  const logoCount = Math.max(1, visiblePlatforms.length);
  const maxLogosWidth = 640;
  const totalRequestedLogoWidth = visiblePlatforms.reduce((sum, p) => {
    const size = Math.round(platformLogoSize * (platformLogoScales[p] ?? 1));
    return sum + (motion.customLogos?.[p] ? size * 2.8 : size);
  }, 0) + Math.max(0, logoCount - 1) * platformLogoGap;
  const logosFitScale = Math.min(1, maxLogosWidth / Math.max(1, totalRequestedLogoWidth));
  const fittedLogoGap = Math.max(8, Math.round(platformLogoGap * logosFitScale));

  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, Arial, sans-serif', color: '#fff', overflow: 'hidden' }}>
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontCta ?? '', motion.fontCta1 ?? '']} />
      <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={particlesEnabled ? 1 : 0} background={motion.background} />
      <OverlayLayer overlays={motion.overlays} />

      {/* Layout idêntico ao PRÉ-SAVE, sem data e sem CTA de pré-save */}
      <AbsoluteFill style={{ padding: isStory ? '0 82px' : '0 86px', top: isStory ? 245 : 88, height: isStory ? 1450 : 1220, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: isStory ? 42 : 34, alignItems: 'center', textAlign: 'center' }}>
        {/* HEADLINE */}
        <div style={{ width: '100%' }}>
          <div style={{ width: '100%', paddingBottom: 10, overflow: 'visible' }}>
            <div style={{
              fontFamily: `'${fontHeadline?.family ?? 'Arial'}', Arial, sans-serif`,
              fontSize: (props.headline || '').length > 14 ? 76 : 92,
              lineHeight: 0.96,
              fontWeight: fontHeadline?.weight ?? 900,
              letterSpacing: (props.headline || '').length > 14 ? 1.5 : -1,
              whiteSpace: 'pre-line',
              maxWidth: '100%',
              overflow: 'visible',
              ...applyTextStyle(motion.styleHeadline),
              ...userTextTransform(motion.styleHeadline, { transform: wigH.transform }),
            }}>
              <StyledText text={props.headline || 'DISPONÍVEL'} transition={showAll ? undefined : tH} style={motion.styleHeadline} stroke={motion.strokeHeadline} preserveFontShape={false} previewMode={false} />
            </div>
          </div>
          {/* SEM DATA — a música já saiu */}
        </div>

        {/* CAPA */}
        <div style={{ marginTop: 0, marginBottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <div data-cover-position-wrapper style={{ transform: `translate(${motion.coverX ?? 0}px, ${motion.coverY ?? 0}px)`, willChange: 'transform' }}>
            <PremiumCover src={props.coverImage} size={coverSize} entryFrame={COVER_IN} spinStart={COVER_IN + 70} spinEnd={FINAL_HIT - 4} motionId={motion.coverMotion ?? 'slide_up_glow'} spinTurns={spinTurns} wiggleIntensity={wiggleIntensity} accentFrames={accents} glowColor={glowColor} />
          </div>
        </div>

        {/* CTA (ex: "EM TODAS AS PLATAFORMAS DIGITAIS") — sem "FAÇA O PRÉ-SAVE" */}
        <div style={{ width: '100%', marginTop: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            fontFamily: `'${fontCta2?.family ?? fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
            width: '100%',
            minHeight: 52,
            fontSize: 29,
            lineHeight: 1.12,
            fontWeight: fontCta2?.weight ?? fontCta?.weight ?? 900,
            letterSpacing: 2.5,
            whiteSpace: 'pre-line',
            maxWidth: '100%',
            opacity: ctaText.trim() ? (showAll ? 1 : ctaOpacity) : 0,
            ...applyTextStyle(motion.styleCta2 ?? motion.styleCta),
            ...userTextTransform(motion.styleCta2 ?? motion.styleCta, { transform: wigC2.transform }),
          }}>
            <StyledText text={ctaText} transition={showAll ? undefined : tC2} style={motion.styleCta2 ?? motion.styleCta} stroke={motion.strokeCta2 ?? motion.strokeCta} preserveFontShape={false} previewMode={false} />
          </div>

          {/* LOGOS */}
          {visiblePlatforms.length > 0 ? (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: fittedLogoGap, flexWrap: 'nowrap', opacity: showAll ? 1 : logosAppear, width: '100%', maxWidth: maxLogosWidth, marginLeft: 'auto', marginRight: 'auto' }}>
              {visiblePlatforms.map((p, idx) => (
                <PlatformLogo
                  key={p}
                  name={p}
                  size={Math.round(platformLogoSize * (platformLogoScales[p] ?? 1) * logosFitScale)}
                  maxWidth={Math.round(platformLogoSize * (platformLogoScales[p] ?? 1) * logosFitScale * 2.15)}
                  delay={logosIn + idx * 7}
                  customSrc={motion.customLogos?.[p]}
                  tintEnabled={motion.platformLogoTintEnabled}
                  tintColor={motion.platformLogoTintColor}
                  index={idx}
                  pulseAmount={platformLogoWiggle}
                  pulseSpeed={platformLogoWiggleSpeed}
                />
              ))}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#fff', opacity: finalFlash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
