import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { easings, eased, getTextTransition } from './motionEngine';
import { brazuWiggle } from './motionEffects';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { CustomTextsLayer } from './CustomTextsLayer';
import { CoverPosterLayer } from './CoverPosterLayer';
import { PremiumCover } from './PremiumCover';
import { PlatformLogo } from './PlatformLogo';
import { DEFAULT_FONTS, findFont, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps, TextTransitionId } from './types';
import { StyledText } from './StyledText';

const HEADLINE_IN = 0;
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

  const fontHeadline = findFont(motion.fontHeadline ?? DEFAULT_FONTS.headline, motion.customFonts ?? []);
  const fontDate = findFont(motion.fontDate ?? DEFAULT_FONTS.date, motion.customFonts ?? []);
  const fontCta = findFont(motion.fontCta ?? DEFAULT_FONTS.cta, motion.customFonts ?? []);
  const fontCta1Id = motion.fontCta1 && motion.fontCta1 !== DEFAULT_FONTS.cta ? motion.fontCta1 : motion.fontCta ?? DEFAULT_FONTS.cta;
  const fontCta2Id = motion.fontCta2 && motion.fontCta2 !== DEFAULT_FONTS.cta ? motion.fontCta2 : motion.fontCta ?? DEFAULT_FONTS.cta;
  const fontCta1 = findFont(fontCta1Id, motion.customFonts ?? []);
  const fontCta2 = findFont(fontCta2Id, motion.customFonts ?? []);

  const coverSize = motion.coverSize ?? 510;
  const coverIn = Math.max(0, Math.round(motion.coverInFrame ?? COVER_IN));
  const spinTurns = motion.spinTurns ?? 2;
  const wiggleIntensity = motion.wiggleIntensity ?? 1;
  const wH = motion.wiggleHeadline ?? 0.35;
  const wD = motion.wiggleDate ?? 0.25;
  const wC1 = motion.wiggleCta1 ?? motion.wiggleCta ?? 0.3;
  const wC2 = motion.wiggleCta2 ?? motion.wiggleCta ?? 0.25;
  const particlesEnabled = motion.particlesEnabled ?? true;
  const finalFlashEnabled = motion.finalFlash ?? true;
  const glowColor = motion.glowColor ?? 'rgba(190, 90, 255, 0.28)';
  const cta1In = motion.cta1InFrame ?? CTA1_IN_DEFAULT;
  const ctaSwapFrame = motion.ctaSwapFrame ?? MID_HIT;
  const cta2In = motion.cta2InFrame ?? CTA2_IN_DEFAULT;
  const logosIn = motion.logosInFrame ?? LOGOS_IN_DEFAULT;
  const headlineIn = motion.headlineInFrame ?? HEADLINE_IN;
  const dateIn = motion.dateInFrame ?? DATE_IN;

  const txHeadline: TextTransitionId = (motion.transitionHeadline ?? (motion as any).trHeadline ?? 'mask_reveal') as TextTransitionId;
  const txDate: TextTransitionId = (motion.transitionDate ?? (motion as any).trDate ?? 'scale_pop') as TextTransitionId;
  const txCta: TextTransitionId = (motion.transitionCta ?? (motion as any).trCta ?? 'split_letters') as TextTransitionId;
  const tH = getTextTransition(txHeadline)(frame, headlineIn, motion.transitionTuningHeadline);
  const tD = getTextTransition(txDate)(frame, dateIn, motion.transitionTuningDate);
  const txCta1 = (motion.transitionCta1 ?? (motion as any).trCta1 ?? motion.transitionCta ?? (motion as any).trCta ?? 'scale_pop') as TextTransitionId;
  const txCta2 = (motion.transitionCta2 ?? (motion as any).trCta2 ?? motion.transitionCta ?? (motion as any).trCta ?? txCta) as TextTransitionId;
  const tC1 = getTextTransition(txCta1)(frame, cta1In, motion.transitionTuningCta1 ?? motion.transitionTuningCta);
  const tC2 = getTextTransition(txCta2)(frame, cta2In, motion.transitionTuningCta2 ?? motion.transitionTuningCta);

  const wigH = brazuWiggle(frame, { amplitude: wH * wiggleIntensity, frequency: 0.74, seed: 10 });
  const wigD = brazuWiggle(frame, { amplitude: wD * wiggleIntensity, frequency: 0.64, seed: 70 });
  const wigC1 = brazuWiggle(frame, { amplitude: wC1 * wiggleIntensity, frequency: 0.9, seed: 130 });
  const wigC2 = brazuWiggle(frame, { amplitude: wC2 * wiggleIntensity, frequency: 0.82, seed: 210 });

  const cta1Text = props.cta ?? 'FAÇA O PRÉ-SAVE';
  const cta2Text = props.cta2 ?? props.cta ?? 'EM TODAS AS PLATAFORMAS DIGITAIS';
  const cta1Opacity = interpolate(frame, [ctaSwapFrame - 8, ctaSwapFrame + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cta2Opacity = interpolate(frame, [cta2In, cta2In + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
  const maxLogosWidth = 920;
  const logoBoxMultiplier = motion.platformLogoPack === 'standard' || motion.platformLogoPack === 'rectangular' ? 2.15 : 1;
  const totalRequestedLogoWidth = visiblePlatforms.reduce((sum, p) => {
    const size = Math.round(platformLogoSize * (platformLogoScales[p] ?? 1));
    return sum + size * logoBoxMultiplier;
  }, 0) + Math.max(0, logoCount - 1) * platformLogoGap;
  const logosFitScale = Math.min(1, maxLogosWidth / Math.max(1, totalRequestedLogoWidth));
  const fittedLogoGap = Math.max(0, Math.round(platformLogoGap * logosFitScale));

  if (motion.layoutPreset === 'novacena_presave_typographic') {
    const textShadow = '0 2px 0 rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)';
    const renderText = (
      text: string,
      top: number,
      font: typeof fontHeadline,
      style: React.CSSProperties,
      anim: any,
      userStyle?: any
    ) => (
      <div
        style={{
          position: 'absolute',
          top,
          left: 74,
          right: 74,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          fontFamily: `'${font?.family ?? 'Arial'}', Arial, sans-serif`,
          fontWeight: font?.weight ?? 900,
          color: '#f4f1e9',
          textShadow,
          ...style,
          ...applyTextStyle(userStyle),
          ...anim,
          ...userTextTransform(userStyle, anim),
        }}
      >
        {text}
      </div>
    );

    return (
      <AbsoluteFill style={{ fontFamily: 'Inter, Arial, sans-serif', color: '#fff', overflow: 'hidden', background: '#f8f7f2' }}>
        <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '', motion.fontCta ?? '', motion.fontCta1 ?? '', motion.fontCta2 ?? '']} />
        <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={0} background={motion.background} />
        <OverlayLayer overlays={motion.overlays} />
        <CustomTextsLayer texts={motion.customTexts} customFonts={motion.customFonts} />
      <CoverPosterLayer poster={motion.poster} />
        {renderText(props.headline || 'LANÇAMENTO', 360, fontHeadline, {
          fontSize: 92,
          lineHeight: 0.94,
          letterSpacing: 0,
          textTransform: 'uppercase',
        }, showAll ? {} : tH, motion.styleHeadline)}
        {props.releaseDate ? renderText(props.releaseDate, 472, fontDate, {
          fontSize: 62,
          lineHeight: 0.98,
          letterSpacing: 0,
          textTransform: 'uppercase',
        }, showAll ? {} : tD, motion.styleDate) : null}
        {renderText(cta1Text, 1398, fontCta1, {
          fontSize: 58,
          lineHeight: 0.96,
          letterSpacing: 0,
          textTransform: 'uppercase',
          opacity: showAll ? 1 : cta1Opacity,
        }, showAll ? {} : tC1, motion.styleCta1 ?? motion.styleCta)}
        {renderText(cta2Text, 1568, fontCta2, {
          fontSize: 28,
          lineHeight: 1.1,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          opacity: showAll ? 1 : cta2Opacity,
        }, showAll ? {} : tC2, motion.styleCta2 ?? motion.styleCta)}
        <AbsoluteFill style={{ background: '#fff', opacity: finalFlash, pointerEvents: 'none' }} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, Arial, sans-serif', color: '#fff', overflow: 'hidden' }}>
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '', motion.fontCta ?? '', motion.fontCta1 ?? '', motion.fontCta2 ?? '']} />
      <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={particlesEnabled ? 1 : 0} background={motion.background} />
      <OverlayLayer overlays={motion.overlays} />
      <CustomTextsLayer texts={motion.customTexts} customFonts={motion.customFonts} />
      <CoverPosterLayer poster={motion.poster} />
      <AbsoluteFill style={{ padding: isStory ? '0 82px' : '0 86px', top: isStory ? 245 : 88, height: isStory ? 1450 : 1220, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: isStory ? 42 : 34, alignItems: 'center', textAlign: 'center' }}>
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
              <StyledText previewLayerId="headline" text={props.headline || 'LANÇAMENTO'} transition={showAll ? undefined : tH} style={motion.styleHeadline} stroke={motion.strokeHeadline} preserveFontShape={false} previewMode={false} />
            </div>
          </div>
          {props.releaseDate ? (
            <div style={{
              fontFamily: `'${fontDate?.family ?? 'Arial'}', Arial, sans-serif`,
              marginTop: 4,
              display: 'inline-block',
              fontSize: 26,
              fontWeight: fontDate?.weight ?? 700,
              letterSpacing: 3.5,
              whiteSpace: 'pre-line',
              ...applyTextStyle(motion.styleDate),
              ...userTextTransform(motion.styleDate, { transform: wigD.transform }),
            }}>
              <StyledText previewLayerId="date" text={props.releaseDate} transition={showAll ? undefined : tD} style={motion.styleDate} stroke={motion.strokeDate} preserveFontShape={false} previewMode={false} />
            </div>
          ) : null}
        </div>
        <div style={{ marginTop: 0, marginBottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <div data-cover-position-wrapper data-novacena-preview-layer="cover" style={{ transform: `translate(${motion.coverX ?? 0}px, ${motion.coverY ?? 0}px)`, willChange: 'transform' }}>
            <PremiumCover src={props.coverImage} size={coverSize} entryFrame={coverIn} spinStart={coverIn + 70} spinEnd={FINAL_HIT - 4} motionId={motion.coverMotion ?? 'slide_up_glow'} spinTurns={spinTurns} wiggleIntensity={wiggleIntensity} accentFrames={accents} glowColor={glowColor} />
          </div>
        </div>
        <div style={{ width: '100%', marginTop: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            fontFamily: `'${fontCta1?.family ?? fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
            width: '100%',
            minHeight: 44,
            fontSize: 27,
            lineHeight: 1.1,
            fontWeight: fontCta1?.weight ?? fontCta?.weight ?? 900,
            letterSpacing: 2.2,
            whiteSpace: 'pre-line',
            maxWidth: '100%',
            opacity: cta1Text.trim() ? (showAll ? 0 : cta1Opacity) : 0,
            ...applyTextStyle(motion.styleCta1 ?? motion.styleCta),
            ...userTextTransform(motion.styleCta1 ?? motion.styleCta, { transform: wigC1.transform }),
          }}>
            <StyledText previewLayerId="cta1" text={cta1Text} transition={showAll ? undefined : tC1} style={motion.styleCta1 ?? motion.styleCta} stroke={motion.strokeCta1 ?? motion.strokeCta} preserveFontShape={false} previewMode={false} />
          </div>
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
            opacity: cta2Text.trim() ? (showAll ? 1 : cta2Opacity) : 0,
            ...applyTextStyle(motion.styleCta2 ?? motion.styleCta),
            ...userTextTransform(motion.styleCta2 ?? motion.styleCta, { transform: wigC2.transform }),
          }}>
            <StyledText previewLayerId="cta2" text={cta2Text} transition={showAll ? undefined : tC2} style={motion.styleCta2 ?? motion.styleCta} stroke={motion.strokeCta2 ?? motion.strokeCta} preserveFontShape={false} previewMode={false} />
          </div>
          {visiblePlatforms.length > 0 ? (
            <div data-novacena-preview-layer="logos" style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: fittedLogoGap, flexWrap: 'nowrap', opacity: showAll ? 1 : logosAppear, width: 'fit-content', maxWidth: maxLogosWidth, marginLeft: 'auto', marginRight: 'auto', transform: `translate(${motion.platformLogoX ?? 0}px, ${motion.platformLogoY ?? 0}px)`, willChange: 'transform' }}>
              {visiblePlatforms.map((p, idx) => (
                <PlatformLogo
                  key={p}
                  name={p}
                  variant={logoBoxMultiplier === 1 ? 'icon' : undefined}
                  size={Math.round(platformLogoSize * (platformLogoScales[p] ?? 1) * logosFitScale)}
                  maxWidth={Math.round(platformLogoSize * (platformLogoScales[p] ?? 1) * logosFitScale * logoBoxMultiplier)}
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
