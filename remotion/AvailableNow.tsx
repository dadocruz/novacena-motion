import React from 'react';
import { FontFaces } from './FontFaces';
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
import { DEFAULT_FONTS, findFont, applyTextStyle, userTextTransform, applyGradientStyle, hasGradient } from '../lib/fontCatalog';
import type { TemplateProps, TextTransitionId } from './types';
import { textStrokeStyle, textFillStyle } from './textStroke';

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

  const fontHeadline = findFont(motion.fontHeadline ?? DEFAULT_FONTS.headline, motion.customFonts ?? []);
  const fontDate = findFont(motion.fontDate ?? DEFAULT_FONTS.date, motion.customFonts ?? []);
  const fontCta = findFont(motion.fontCta ?? DEFAULT_FONTS.cta, motion.customFonts ?? []);

  const fontCta1Id =
    motion.fontCta1 && motion.fontCta1 !== DEFAULT_FONTS.cta
      ? motion.fontCta1
      : motion.fontCta ?? DEFAULT_FONTS.cta;

  const fontCta2Id =
    motion.fontCta2 && motion.fontCta2 !== DEFAULT_FONTS.cta
      ? motion.fontCta2
      : motion.fontCta ?? DEFAULT_FONTS.cta;

  const fontCta1 = findFont(fontCta1Id, motion.customFonts ?? []);
  const fontCta2 = findFont(fontCta2Id, motion.customFonts ?? []);
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

  const cta1Text = props.cta ?? 'FAÇA O PRÉ-SAVE';
  const cta2Text = props.cta2 ?? props.cta ?? 'EM TODAS AS PLATAFORMAS DIGITAIS';

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

  // Só mostra logos que foram enviados/customizados.
  // Evita bolinhas/logos genéricos sem contexto visual no render final.
  const visiblePlatforms = props.platforms.filter((p) => Boolean(motion.customLogos?.[p]));
  const platformLogoSize = motion.platformLogoSize ?? 54;
  const platformLogoGap = motion.platformLogoGap ?? 18;
  const platformLogoScales = motion.platformLogoScales ?? {};

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
  const textStrokeCss = (stroke?: any): React.CSSProperties => {
    if (!stroke || stroke.mode === 'none' || Number(stroke.width ?? 0) <= 0) return {};

    const width = Number(stroke.width ?? 0);
    const color = stroke.color || stroke.gradientFrom || '#ffffff';

    if (stroke.mode === 'outer') {
      return {
        WebkitTextStroke: `${width}px ${color}`,
        paintOrder: 'stroke fill',
      } as React.CSSProperties;
    }

    if (stroke.mode === 'inner') {
      return {
        textShadow: `
          ${width}px 0 0 ${color},
          -${width}px 0 0 ${color},
          0 ${width}px 0 ${color},
          0 -${width}px 0 ${color},
          0 0 ${Math.max(2, width * 2)}px ${color}
        `,
      } as React.CSSProperties;
    }

    return {};
  };

  function withoutFontFamily(style: React.CSSProperties): React.CSSProperties {
    const next = { ...style } as React.CSSProperties;
    delete (next as any).fontFamily;
    delete (next as any).fontWeight;
    return next;
  }

  const renderTextLines = (value: string, tx: typeof tH) => {
    const lines = String(value ?? '').split(/\r?\n/);

    return lines.map((line, lineIndex) => (
      <React.Fragment key={`line-${lineIndex}`}>
        {showAll || !tx.perChar ? line : renderText(line, tx)}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </React.Fragment>
    ));
  };

  const getFillOpacity = (style?: any, stroke?: any) => {
    const raw =
      style?.fillOpacity ??
      style?.textOpacity ??
      style?.opacityFill ??
      style?.fillAlpha ??
      stroke?.fillOpacity ??
      stroke?.textOpacity ??
      stroke?.opacityFill ??
      stroke?.fillAlpha ??
      stroke?.opacity ??
      100;

    const value = Number(raw);

    if (!Number.isFinite(value)) return 1;
    if (value > 1) return Math.max(0, Math.min(1, value / 100));

    return Math.max(0, Math.min(1, value));
  };

  const normalizeHex = (color?: string) => {
    if (!color) return '#ffffff';
    if (color.startsWith('#')) return color;
    return color;
  };

  const hexToRgba = (color: string, alpha: number) => {
    const safe = normalizeHex(color);

    if (!safe.startsWith('#')) return safe;

    const hex = safe.replace('#', '');
    const full = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;

    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);

    if ([r, g, b].some((n) => Number.isNaN(n))) return safe;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const renderPlainLines = (value: string) => {
    return String(value ?? '').split(/\r?\n/).map((line, lineIndex, arr) => (
      <React.Fragment key={`plain-line-${lineIndex}`}>
        {line}
        {lineIndex < arr.length - 1 ? <br /> : null}
      </React.Fragment>
    ));
  };

  const textStrokeLayerCss = (stroke?: any): React.CSSProperties => {
    if (!stroke || stroke.mode === 'none' || Number(stroke.width ?? 0) <= 0) return {};

    const width = Number(stroke.width ?? 0);
    const color = stroke.color || stroke.gradientFrom || '#ffffff';

    return {
      WebkitTextStroke: `${width}px ${color}`,
      WebkitTextFillColor: 'transparent',
      paintOrder: 'stroke fill',
    } as React.CSSProperties;
  };

  const textFillLayerCss = (style?: any, stroke?: any): React.CSSProperties => {
    const fillOpacity = getFillOpacity(style, stroke);

    if (hasGradient(style)) {
      const from = style?.gradientFrom || style?.color || '#ffffff';
      const to = style?.gradientTo || style?.color2 || style?.color || '#ffffff';
      const angle = Number(style?.gradientAngle ?? 90);

      return {
        backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        opacity: fillOpacity,
        display: 'inline-block',
      } as React.CSSProperties;
    }

    const color = style?.color || '#ffffff';

    return {
      color: hexToRgba(color, fillOpacity),
      WebkitTextFillColor: hexToRgba(color, fillOpacity),
      display: 'inline-block',
    } as React.CSSProperties;
  };

  const renderTextWithStyle = (
    text: string,
    tx: typeof tH,
    style?: typeof motion.styleHeadline,
    stroke?: any
  ) => {
    // IMPORTANTE:
    // Não renderizar fonte decorativa letra por letra.
    // Split por letra quebra ligaduras, kerning e desenho real da fonte.
    // Por isso o texto visual usa bloco inteiro e mantém apenas transform/posição do wrapper.
    const fillContent = renderPlainLines(text);
    const strokeContent = renderPlainLines(text);

    const strokeCss = textStrokeLayerCss(stroke);
    const hasStroke = Object.keys(strokeCss).length > 0;

    if (hasStroke) {
      return (
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span
            aria-hidden
            style={{
              ...strokeCss,
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          >
            {strokeContent}
          </span>

          <span
            style={{
              ...textFillLayerCss(style, stroke),
              position: 'relative',
              zIndex: 1,
            }}
          >
            {fillContent}
          </span>
        </span>
      );
    }

    return (
      <span style={textFillLayerCss(style, stroke)}>
        {fillContent}
      </span>
    );
  };





  return (
    <AbsoluteFill
      style={{
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '', motion.fontCta ?? '', motion.fontCta1 ?? '', motion.fontCta2 ?? '']} />
      <CinematicBackground
        coverImage={props.coverImage}
        accentFrames={accents}
        intensity={particlesEnabled ? 1 : 0}
        background={motion.background}
      />

      {/* OVERLAY / TEXTURA — acima do BG e abaixo de capa/textos/logos */}
      <OverlayLayer overlays={motion.overlays} />
<AbsoluteFill
        style={{
          padding: isStory ? '0 82px' : '0 86px',
          top: isStory ? 245 : 88,
          height: isStory ? 1450 : 1220,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: isStory ? 42 : 34,
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
                fontSize: (props.headline || '').length > 14 ? 76 : 92,
                lineHeight: 0.96,
                fontWeight: fontHeadline?.weight ?? 900,
                letterSpacing: (props.headline || '').length > 14 ? 1.5 : -1,
                whiteSpace: 'pre-line',
                maxWidth: '100%',
                ...textStrokeStyle(motion.strokeHeadline),
              ...(motion.styleHeadline?.useGradient ? {} : textFillStyle(motion.strokeHeadline)),
              textShadow: 'none',
                overflow: 'visible',
                ...applyTextStyle(motion.styleHeadline),
                ...(showAll ? {} : tH.wrapStyle),
              ...userTextTransform(motion.styleHeadline, tH.wrapStyle),
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
                marginTop: 4,
                display: 'inline-block',
                
                fontSize: 26,
                fontWeight: fontDate?.weight ?? 700,
                letterSpacing: 3.5,
                whiteSpace: 'pre-line',
                transform: showAll ? undefined : wigD.transform,
                ...applyTextStyle(motion.styleDate),
                ...(showAll ? {} : tD.wrapStyle),
              ...userTextTransform(motion.styleDate, tD.wrapStyle),
              }}
            >
              {renderTextWithStyle(props.releaseDate, tD, motion.styleDate)}
            </div>
          ) : null}
        </div>

        {/* CAPA PREMIUM */}
        <div
          style={{
            marginTop: 0,
            marginBottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div

            data-cover-position-wrapper

            style={{

              transform: `translate(${motion.coverX ?? 0}px, ${motion.coverY ?? 0}px)`,

              willChange: 'transform',

            }}

          >

          <PremiumCover
            src={props.coverImage}
            size={coverSize}
            entryFrame={COVER_IN}
            spinStart={COVER_IN + 70}
            spinEnd={FINAL_HIT - 4}
            motionId={motion.coverMotion ?? 'slide_up_glow'}
            spinTurns={spinTurns}
            wiggleIntensity={wiggleIntensity}
            accentFrames={accents}
            glowColor={glowColor}
          />

          </div>
        </div>

        <div
          style={{
            width: '100%',
            marginTop: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* CTA 1 */}
          <div
            style={{
              fontFamily: `'${fontCta1?.family ?? fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
              width: '100%',
              minHeight: 44,
              fontSize: 27,
              lineHeight: 1.1,
              fontWeight: fontCta1?.weight ?? fontCta?.weight ?? 900,
              letterSpacing: 2.2,
              whiteSpace: 'pre-line',
              maxWidth: '100%',
              textShadow: 'none',
              opacity: cta1Text.trim() ? (showAll ? 0 : cta1Opacity) : 0,
              transform: showAll ? undefined : wigC.transform,
              ...withoutFontFamily(applyTextStyle(motion.styleCta1 ?? motion.styleCta)),
              ...textStrokeCss(motion.strokeCta1 ?? motion.strokeCta),
              ...(showAll ? {} : tC1.wrapStyle),
              ...userTextTransform(motion.styleCta1 ?? motion.styleCta, tC1.wrapStyle),
            }}
          >
            {renderTextWithStyle(cta1Text, tC1, motion.styleCta1 ?? motion.styleCta, motion.strokeCta1 ?? motion.strokeCta)}
          </div>

          {/* CTA 2 */}
          <div
            style={{
              fontFamily: `'${fontCta2?.family ?? fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
              width: '100%',
              minHeight: 52,
              fontSize: 29,
              lineHeight: 1.12,
              fontWeight: fontCta2?.weight ?? fontCta?.weight ?? 900,
              letterSpacing: 2.5,
              whiteSpace: 'pre-line',
              maxWidth: '100%',
              textShadow: 'none',
              opacity: cta2Text.trim() ? (showAll ? 1 : cta2Opacity) : 0,
              transform: showAll ? undefined : wigC.transform,
              ...withoutFontFamily(applyTextStyle(motion.styleCta2 ?? motion.styleCta)),
              ...textStrokeCss(motion.strokeCta2 ?? motion.strokeCta),
              ...(showAll ? {} : tC.wrapStyle),
              ...userTextTransform(motion.styleCta2 ?? motion.styleCta, tC.wrapStyle),
            }}
          >
            {renderTextWithStyle(cta2Text, tC, motion.styleCta2 ?? motion.styleCta, motion.strokeCta2 ?? motion.strokeCta)}
          </div>

          {/* LOGOS — apenas logos customizados enviados pelo usuário */}
          {visiblePlatforms.length > 0 ? (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: platformLogoGap,
                flexWrap: 'wrap',
                opacity: showAll ? 1 : logosAppear,
                
                
                
                
                
              }}
            >
              {visiblePlatforms.map((p, idx) => (
                <PlatformLogo
                  key={p}
                  name={p}
                  size={Math.round(platformLogoSize * (platformLogoScales[p] ?? 1))}
                  delay={logosIn + idx * 7}
                  customSrc={motion.customLogos?.[p]}
                />
              ))}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
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
