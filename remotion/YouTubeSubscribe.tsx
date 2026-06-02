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
 * INSCREVA-SE NO CANAL (YouTube) — vídeo de BG + "INSCREVA-SE" vermelho /
 * "NO CANAL" branco + @handle em caixa vermelha + play buttons flutuando +
 * leve glitch/aberração cromática. Mesmo BG de vídeo dos outros YouTube.
 * Fonte padrão: Akhand Light (premium-akhand-light).
 */

const HEADLINE_IN = 12;
const CHANNEL_IN = 70;
const ICONS_IN = 24;
const MID_HIT = 120;
const FINAL_HIT_BASE = 208;
const FINAL_POSTER_BASE = 222;

// Play button do YouTube desenhado em SVG (vermelho + triângulo branco).
const YouTubePlay: React.FC<{ size: number; glitch?: number }> = ({ size, glitch = 0 }) => {
  const w = size;
  const h = size * 0.7;
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {glitch > 0 && (
        <>
          <svg width={w} height={h} viewBox="0 0 90 63" style={{ position: 'absolute', left: -glitch, top: 0, opacity: 0.6 }}>
            <rect width="90" height="63" rx="16" fill="#00e5ff" />
          </svg>
          <svg width={w} height={h} viewBox="0 0 90 63" style={{ position: 'absolute', left: glitch, top: 0, opacity: 0.6 }}>
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

export const YouTubeSubscribe: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const motion = props.motion ?? {};
  const durationFrames = (motion.durationSeconds ?? 8) * 30;
  const FINAL_HIT = Math.min(FINAL_HIT_BASE, durationFrames - 14);
  const FINAL_POSTER = Math.min(FINAL_POSTER_BASE, durationFrames - 2);
  const accents = [MID_HIT, FINAL_HIT];
  const M = resolveMotion(props.motion, 'rgba(255, 40, 40, 0.34)');
  const isStory = props.renderTarget === 'story';

  const fontHeadline = findFont(motion.fontHeadline ?? 'premium-akhand-light', motion.customFonts ?? []) ?? M.fontHeadline;
  const fontChannel = findFont(motion.fontDate ?? 'premium-akhand-light', motion.customFonts ?? []) ?? M.fontDate;

  const headlineIn = motion.headlineInFrame ?? HEADLINE_IN;
  const channelIn = motion.dateInFrame ?? CHANNEL_IN;
  const txHeadline = (motion.transitionHeadline ?? 'mask_reveal') as TextTransitionId;
  const txChannel = (motion.transitionDate ?? 'scale_pop') as TextTransitionId;
  const tH = getTextTransition(txHeadline)(frame, headlineIn, motion.transitionTuningHeadline);
  const tC = getTextTransition(txChannel)(frame, channelIn, motion.transitionTuningDate);

  const showAll = frame >= FINAL_POSTER;
  const finalFlash = M.finalFlash
    ? interpolate(frame, [FINAL_HIT - 2, FINAL_HIT, FINAL_HIT + 14], [0, 0.4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const headlineWiggle = brazuWiggle(frame, { amplitude: (motion.wiggleHeadline ?? 0.3) * M.wiggleIntensity, frequency: 0.7, seed: 10 });
  const channelOpacity = eased(frame, channelIn, channelIn + 18, easings.outCubic);

  // Glitch sutil periódico (aberração cromática no título)
  const glitchPulse = Math.max(0, Math.sin(frame * 0.5) - 0.85) * 40;
  const chroma = 2 + glitchPulse;

  const channelText = props.channelName || '@SEUCANAL';

  // Play buttons flutuando nos cantos
  const floating = isStory
    ? [
        { left: -30, top: 980, size: 150, off: 0, rot: -10 },
        { left: 880, top: 1010, size: 190, off: 60, rot: 8 },
        { left: -50, top: 1640, size: 170, off: 120, rot: 12 },
      ]
    : [
        { left: -20, top: 720, size: 130, off: 0, rot: -10 },
        { left: 900, top: 760, size: 160, off: 60, rot: 8 },
      ];

  return (
    <AbsoluteFill style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', overflow: 'hidden' }}>
      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '']} />
      <CinematicBackground coverImage={props.coverImage} accentFrames={accents} intensity={M.particlesEnabled ? 0.6 : 0} background={M.background} />

      {/* Escurecimento + vinheta vermelha pro mood YouTube */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.72) 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 320px rgba(180,0,0,0.45)', pointerEvents: 'none' }} />

      <OverlayLayer overlays={motion.overlays} />

      {/* "YouTube" vertical decorativo na borda esquerda */}
      <div
        style={{
          position: 'absolute',
          left: isStory ? -10 : -16,
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          transformOrigin: 'center',
          fontFamily: ff(fontHeadline?.family ?? 'Arial'),
          fontSize: isStory ? 150 : 120,
          fontWeight: 900,
          letterSpacing: 6,
          color: 'rgba(255,255,255,0.10)',
          textTransform: 'lowercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        youtube
      </div>

      {/* Play buttons flutuando */}
      {floating.map((f, i) => {
        const appear = eased(frame, ICONS_IN + i * 4, ICONS_IN + i * 4 + 22, easings.outCubic);
        return (
          <div key={i} style={{ position: 'absolute', left: f.left, top: f.top, opacity: appear * 0.9, transform: `${loopFloat(frame, f.off, 1.1)} rotate(${f.rot}deg)` }}>
            <YouTubePlay size={f.size} glitch={chroma * 0.5} />
          </div>
        );
      })}

      {/* Bloco de texto inferior */}
      <div style={{ position: 'absolute', left: isStory ? 90 : 80, right: isStory ? 90 : 80, bottom: isStory ? 250 : 150, textAlign: 'center' }}>
        {/* INSCREVA-SE (vermelho) com aberração cromática sutil */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontFamily: ff(fontHeadline?.family ?? 'Arial'),
              fontSize: isStory ? 116 : 96,
              lineHeight: 0.92,
              fontWeight: fontHeadline?.weight ?? 700,
              letterSpacing: 1,
              color: '#FF1212',
              textTransform: 'uppercase',
              textShadow: `${chroma}px 0 rgba(0,229,255,0.55), ${-chroma}px 0 rgba(255,0,80,0.55), 0 10px 30px rgba(0,0,0,0.5)`,
              ...applyTextStyle(motion.styleHeadline),
              ...userTextTransform(motion.styleHeadline, { transform: headlineWiggle.transform }),
            }}
          >
            <StyledText
              previewLayerId="ytsub-headline"
              text={props.headline || 'INSCREVA-SE'}
              transition={showAll ? undefined : tH}
              style={motion.styleHeadline}
              stroke={motion.strokeHeadline}
              preserveFontShape={false}
              previewMode={false}
            />
          </div>
        </div>

        {/* NO CANAL (branco) */}
        <div
          style={{
            fontFamily: ff(fontHeadline?.family ?? 'Arial'),
            fontSize: isStory ? 70 : 58,
            lineHeight: 1,
            fontWeight: fontHeadline?.weight ?? 700,
            letterSpacing: 2,
            color: '#ffffff',
            textTransform: 'uppercase',
            marginTop: 8,
            textShadow: '0 8px 26px rgba(0,0,0,0.5)',
          }}
        >
          NO CANAL
        </div>

        {/* @handle em caixa vermelha */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: isStory ? 28 : 20, opacity: showAll ? 1 : channelOpacity }}>
          <div
            data-novacena-preview-layer="ytsub-channel"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FF0000',
              borderRadius: 12,
              padding: isStory ? '16px 40px' : '12px 32px',
              maxWidth: '92%',
              boxShadow: '0 14px 34px rgba(255,0,0,0.40)',
            }}
          >
            <span
              style={{
                fontFamily: ff(fontChannel?.family ?? 'Arial'),
                fontSize: isStory ? 46 : 38,
                fontWeight: fontChannel?.weight ?? 700,
                letterSpacing: 1.5,
                color: '#fff',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: isStory ? 820 : 760,
                ...textStrokeStyle(M.strokeDate),
                ...(motion.styleDate?.useGradient ? {} : textFillStyle(M.strokeDate)),
              }}
            >
              <StyledText
                text={channelText}
                transition={showAll ? undefined : tC}
                style={motion.styleDate}
                stroke={motion.strokeDate}
                preserveFontShape={false}
                previewMode={false}
              />
            </span>
          </div>
        </div>
      </div>

      <AbsoluteFill style={{ background: '#fff', opacity: finalFlash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
