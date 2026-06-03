import React from 'react';
import { FontFaces } from './FontFaces';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { easings, eased, loopFloat, getTextTransition, type TextTransitionId } from './motionEngine';
import { brazuWiggle } from './motionEffects';
import { CinematicBackground } from './CinematicBackground';
import { OverlayLayer } from './OverlayLayer';
import { StyledText } from './StyledText';
import { DEFAULT_FONTS, findFont, resolveMotion, ff, applyTextStyle, userTextTransform } from '../lib/fontCatalog';
import type { TemplateProps } from './types';
import { textStrokeStyle, textFillStyle } from './textStroke';

/**
 * ULTRAPASSAMOS (visualizações no YouTube) — vídeo de BG + "ULTRAPASSAMOS"
 * vermelho + número gigante ("+ 20 MILHÕES") + "DE VISUALIZAÇÕES" + @canal em
 * caixa vermelha + play buttons flutuando. Fontes: Akhand (número) + Bebas.
 * Reaproveita os campos de métrica (metricPrefix / metricNumber / metricLabel).
 */

const PREFIX_IN = 12;
const NUMBER_IN = 30;
const LABEL_IN = 64;
const CHANNEL_IN = 86;
const ICONS_IN = 24;
const MID_HIT = 120;
const FINAL_HIT_BASE = 208;
const FINAL_POSTER_BASE = 222;

const YouTubePlay: React.FC<{ size: number; glitch?: number }> = ({ size, glitch = 0 }) => {
  const w = size;
  const h = size * 0.7;
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {glitch > 0 && (
        <>
          <svg width={w} height={h} viewBox="0 0 90 63" style={{ position: 'absolute', left: -glitch, top: 0, opacity: 0.55 }}>
            <rect width="90" height="63" rx="16" fill="#00e5ff" />
          </svg>
          <svg width={w} height={h} viewBox="0 0 90 63" style={{ position: 'absolute', left: glitch, top: 0, opacity: 0.55 }}>
            <rect width="90" height="63" rx="16" fill="#ff2b2b" />
          </svg>
        </>
      )}
      <svg width={w} height={h} viewBox="0 0 90 63" style={{ position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 10px 24px rgba(255,0,0,0.45))' }}>
        <rect width="90" height="63" rx="16" fill="#FF0000" />
        <path d="M37 20 L37 43 L58 31.5 Z" fill="#fff" />
      </svg>
    </div>
  );
};

export const YouTubeViews: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const motion = props.motion ?? {};
  const durationFrames = (motion.durationSeconds ?? 8) * 30;
  const FINAL_HIT = Math.min(FINAL_HIT_BASE, durationFrames - 14);
  const FINAL_POSTER = Math.min(FINAL_POSTER_BASE, durationFrames - 2);
  const accents = [MID_HIT, FINAL_HIT];
  const M = resolveMotion(props.motion, 'rgba(255, 40, 40, 0.34)');
  const isStory = props.renderTarget === 'story';

  // Número usa Akhand Black por padrão; prefixo/label/canal usam Bebas Neue.
  const fontNumber = findFont(motion.fontHeadline ?? 'premium-akhand-black', motion.customFonts ?? []) ?? M.fontHeadline;
  const fontPrefix = findFont(motion.fontDate ?? 'premium-bebas-neue', motion.customFonts ?? []) ?? M.fontDate;
  const fontLabel = findFont(motion.fontCta1 ?? motion.fontCta ?? 'premium-bebas-neue', motion.customFonts ?? []) ?? M.fontCta;

  const prefixIn = motion.dateInFrame ?? PREFIX_IN;
  const numberIn = motion.headlineInFrame ?? NUMBER_IN;
  const labelIn = motion.cta1InFrame ?? LABEL_IN;
  const channelIn = motion.cta2InFrame ?? CHANNEL_IN;

  const txPrefix = (motion.transitionDate ?? 'mask_reveal') as TextTransitionId;
  const txNumber = (motion.transitionHeadline ?? 'scale_pop') as TextTransitionId;
  const txLabel = (motion.transitionCta1 ?? motion.transitionCta ?? 'mask_reveal') as TextTransitionId;
  const tPrefix = getTextTransition(txPrefix)(frame, prefixIn, motion.transitionTuningDate);
  const tNumber = getTextTransition(txNumber)(frame, numberIn, motion.transitionTuningHeadline);
  const tLabel = getTextTransition(txLabel)(frame, labelIn, motion.transitionTuningCta1 ?? motion.transitionTuningCta);

  const showAll = frame >= FINAL_POSTER;
  const finalFlash = M.finalFlash
    ? interpolate(frame, [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14], [0, 0.4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const numberWiggle = brazuWiggle(frame, { amplitude: (motion.wiggleHeadline ?? 0.3) * M.wiggleIntensity, frequency: 0.72, seed: 20 });
  const channelOpacity = eased(frame, channelIn, channelIn + 18, easings.outCubic);
  const glitchPulse = Math.max(0, Math.sin(frame * 0.5) - 0.85) * 36;
  const chroma = 1.5 + glitchPulse;

  const prefixText = props.metricPrefix || 'ULTRAPASSAMOS';
  const numberText = props.metricNumber || '+ 20 MILHÕES';
  const labelText = props.metricLabel || 'DE VISUALIZAÇÕES';
  const channelText = props.channelName || '';

  const floating = isStory
    ? [
        { left: -40, top: 250, size: 150, off: 0, rot: -10 },
        { left: 900, top: 300, size: 180, off: 60, rot: 8 },
        { left: -50, top: 1640, size: 175, off: 120, rot: 12 },
        { left: 905, top: 1680, size: 150, off: 180, rot: -8 },
      ]
    : [
        { left: -30, top: 200, size: 130, off: 0, rot: -10 },
        { left: 910, top: 1080, size: 150, off: 90, rot: 8 },
      ];

  return (
    <AbsoluteFill style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', overflow: 'hidden' }}>
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '', motion.fontCta1 ?? '', motion.fontCta ?? '']} />
      <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={M.particlesEnabled ? 0.55 : 0} background={M.background} />

      {/* Escurecimento inferior + vinheta vermelha sutil */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.74) 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 300px rgba(150,0,0,0.32)', pointerEvents: 'none' }} />

      <OverlayLayer overlays={motion.overlays} />

      {/* Play buttons flutuando */}
      {floating.map((f, i) => {
        const appear = eased(frame, ICONS_IN + i * 4, ICONS_IN + i * 4 + 22, easings.outCubic);
        return (
          <div key={i} style={{ position: 'absolute', left: f.left, top: f.top, opacity: appear * 0.9, transform: `${loopFloat(frame, f.off, 1.1)} rotate(${f.rot}deg)` }}>
            <YouTubePlay size={f.size} glitch={chroma * 0.5} />
          </div>
        );
      })}

      {/* Bloco de texto central-inferior */}
      <div style={{ position: 'absolute', left: isStory ? 80 : 70, right: isStory ? 80 : 70, top: isStory ? '46%' : '40%', textAlign: 'center' }}>
        {/* ULTRAPASSAMOS (vermelho) */}
        <div
          style={{
            fontFamily: ff(fontPrefix?.family ?? 'Arial'),
            fontSize: isStory ? 58 : 48,
            lineHeight: 1,
            fontWeight: fontPrefix?.weight ?? 700,
            letterSpacing: 3,
            color: '#FF1212',
            textTransform: 'uppercase',
            textShadow: '0 6px 20px rgba(0,0,0,0.5)',
            ...applyTextStyle(motion.styleDate),
          }}
        >
          <StyledText previewLayerId="ytviews-prefix" text={prefixText} transition={showAll ? undefined : tPrefix} style={motion.styleDate} stroke={motion.strokeDate} preserveFontShape={false} previewMode={false} />
        </div>

        {/* NÚMERO gigante (branco, Akhand Black) */}
        <div
          style={{
            fontFamily: ff(fontNumber?.family ?? 'Arial'),
            fontSize: (numberText.length > 10) ? (isStory ? 150 : 120) : (isStory ? 188 : 150),
            lineHeight: 0.9,
            fontWeight: fontNumber?.weight ?? 900,
            letterSpacing: -1,
            color: '#ffffff',
            textTransform: 'uppercase',
            marginTop: 6,
            textShadow: `${chroma}px 0 rgba(0,229,255,0.45), ${-chroma}px 0 rgba(255,0,80,0.45), 0 14px 38px rgba(0,0,0,0.55)`,
            ...textStrokeStyle(M.strokeHeadline),
            ...(motion.styleHeadline?.useGradient ? {} : textFillStyle(M.strokeHeadline)),
            ...applyTextStyle(motion.styleHeadline),
            ...userTextTransform(motion.styleHeadline, { transform: numberWiggle.transform }),
          }}
        >
          <StyledText previewLayerId="ytviews-number" text={numberText} transition={showAll ? undefined : tNumber} style={motion.styleHeadline} stroke={M.strokeHeadline} preserveFontShape={false} previewMode={false} />
        </div>

        {/* DE VISUALIZAÇÕES (branco) */}
        <div
          style={{
            fontFamily: ff(fontLabel?.family ?? 'Arial'),
            fontSize: isStory ? 52 : 42,
            lineHeight: 1,
            fontWeight: fontLabel?.weight ?? 700,
            letterSpacing: 2,
            color: '#ffffff',
            textTransform: 'uppercase',
            marginTop: 8,
            textShadow: '0 8px 24px rgba(0,0,0,0.5)',
            ...applyTextStyle(motion.styleCta1 ?? motion.styleCta),
          }}
        >
          <StyledText previewLayerId="ytviews-label" text={labelText} transition={showAll ? undefined : tLabel} style={motion.styleCta1 ?? motion.styleCta} stroke={motion.strokeCta1 ?? motion.strokeCta} preserveFontShape={false} previewMode={false} />
        </div>

        {/* @canal em caixa vermelha (opcional) */}
        {channelText.trim() ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: isStory ? 26 : 18, opacity: showAll ? 1 : channelOpacity }}>
            <div
              data-novacena-preview-layer="ytviews-channel"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FF0000',
                borderRadius: 12,
                padding: isStory ? '14px 36px' : '11px 28px',
                maxWidth: '92%',
                boxShadow: '0 14px 34px rgba(255,0,0,0.40)',
              }}
            >
              <span
                style={{
                  fontFamily: ff(fontLabel?.family ?? 'Arial'),
                  fontSize: isStory ? 42 : 34,
                  fontWeight: fontLabel?.weight ?? 700,
                  letterSpacing: 1.5,
                  color: '#fff',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: isStory ? 840 : 760,
                }}
              >
                {channelText}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <AbsoluteFill style={{ background: '#fff', opacity: finalFlash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
