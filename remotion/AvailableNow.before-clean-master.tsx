import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CoverCard, SceneShell } from './SceneShell';
import { PlatformLogo } from './PlatformLogo';
import type { TemplateProps } from './types';

const POSTER_END = 2;
const TITLE_IN = 16;
const DATE_IN = 32;
const COVER_IN = 44;
const SONG_IN = 62;
const CTA_IN = 78;
const MID_HIT = 120;
const LOGOS_IN = 136;
const FINAL_HIT = 208;
const FINAL_POSTER = 224;

function clampInterpolate(
  frame: number,
  input: number[],
  output: number[]
) {
  return interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function bounceIn(frame: number, fps: number, start: number, fromScale = 0.86) {
  const local = frame - start;

  const s = spring({
    frame: local,
    fps,
    config: {
      damping: 14,
      mass: 0.72,
      stiffness: 135,
    },
  });

  return {
    opacity: clampInterpolate(local, [0, 10, 20], [0, 0.8, 1]),
    transform: `
      translateY(${clampInterpolate(s, [0, 1], [38, 0])}px)
      scale(${clampInterpolate(s, [0, 0.68, 1], [fromScale, 1.045, 1])})
    `,
  };
}

function titleIn(frame: number, fps: number) {
  const local = frame - TITLE_IN;

  const s = spring({
    frame: local,
    fps,
    config: {
      damping: 13,
      mass: 0.75,
      stiffness: 145,
    },
  });

  return {
    opacity: clampInterpolate(local, [0, 8, 18], [0, 0.75, 1]),
    letterSpacing: clampInterpolate(local, [0, 18], [8, -5]),
    transform: `
      translateY(${clampInterpolate(s, [0, 1], [-86, 0])}px)
      scale(${clampInterpolate(s, [0, 0.66, 1], [0.82, 1.075, 1])})
    `,
  };
}

function coverMotion(frame: number, fps: number) {
  const local = frame - COVER_IN;

  const s = spring({
    frame: local,
    fps,
    config: {
      damping: 14,
      mass: 0.78,
      stiffness: 125,
    },
  });

  const opacity = clampInterpolate(local, [0, 10, 22], [0, 0.85, 1]);
  const baseScale = clampInterpolate(s, [0, 0.66, 1], [0.74, 1.045, 1]);
  const y = clampInterpolate(s, [0, 1], [54, 0]);

  const idleY = Math.sin(frame * 0.045) * 3.2;
  const idleRot = Math.sin(frame * 0.035) * 0.36;

  const flipAccent = clampInterpolate(
    frame,
    [MID_HIT - 8, MID_HIT, MID_HIT + 14],
    [0, 1, 0]
  );

  return {
    opacity,
    transform: `
      translateY(${y + idleY}px)
      rotate(${idleRot}deg)
      rotateY(${flipAccent * 8}deg)
      scale(${baseScale})
    `,
  };
}

function hitAmount(frame: number, center: number, spread = 18) {
  return clampInterpolate(frame, [center - spread, center, center + spread], [0, 1, 0]);
}

export const AvailableNow: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const posterOpacity =
    frame < POSTER_END
      ? 1
      : frame >= FINAL_POSTER
        ? clampInterpolate(frame, [FINAL_POSTER, 238], [0, 1])
        : 0;

  const motionOpacity = 1 - posterOpacity;

  const title = titleIn(frame, fps);
  const date = bounceIn(frame, fps, DATE_IN, 0.92);
  const cover = coverMotion(frame, fps);
  const song = bounceIn(frame, fps, SONG_IN, 0.94);
  const cta = bounceIn(frame, fps, CTA_IN, 0.96);

  const mid = hitAmount(frame, MID_HIT, 18);
  const final = hitAmount(frame, FINAL_HIT, 20);

  const cameraScale = 1 + mid * 0.028 + final * 0.022;
  const cameraX = Math.sin(frame * 0.08) * mid * 2.4 + Math.sin(frame * 0.03) * 1.2;
  const cameraY = Math.cos(frame * 0.075) * mid * 2.1 + Math.cos(frame * 0.026) * 1.4;
  const cameraRot = Math.sin(frame * 0.09) * mid * 0.18;

  const bgScale = 1.075 + Math.sin(frame * 0.012) * 0.006;
  const bgX = Math.sin(frame * 0.016) * 8;
  const bgY = Math.cos(frame * 0.012) * 10;

  const ctaOneOpacity = clampInterpolate(frame, [MID_HIT - 12, MID_HIT - 2], [1, 0]);
  const ctaTwoOpacity = clampInterpolate(frame, [MID_HIT - 1, MID_HIT + 14], [0, 1]);

  const burnOpacity = Math.max(mid * 0.18, final * 0.16);
  const logosOpacity = clampInterpolate(frame, [LOGOS_IN, LOGOS_IN + 18], [0, 1]);

  const ctaTwo = props.cta || 'EM TODAS AS PLATAFORMAS DIGITAIS';

  return (
    <SceneShell media={props.media} renderTarget={props.renderTarget} tint="rgba(145,70,255,0.24)">
      <AbsoluteFill style={{ background: '#020205', overflow: 'hidden' }}>
        <AbsoluteFill style={{ opacity: motionOpacity }}>
          {props.coverImage ? (
            <img
              src={props.coverImage}
              alt=""
              style={{
                position: 'absolute',
                inset: '-34%',
                width: '168%',
                height: '168%',
                objectFit: 'cover',
                objectPosition: 'center center',
                transform: `translate(${bgX}px, ${bgY}px) scale(${bgScale * 1.18})`,
                filter: 'blur(24px) saturate(1.16) contrast(1.12)',
                opacity: 0.96,
              }}
            />
          ) : null}

          <AbsoluteFill style={{ background: 'rgba(0,0,0,0.68)' }} />

          <AbsoluteFill
            style={{
              background:
                'radial-gradient(circle at 50% 24%, rgba(185,92,255,0.24), transparent 34%), radial-gradient(circle at 42% 76%, rgba(255,176,74,0.16), transparent 38%), radial-gradient(circle at 50% 50%, transparent 0%, transparent 42%, rgba(0,0,0,0.56) 100%)',
              mixBlendMode: 'screen',
              opacity: 0.95,
            }}
          />

          <AbsoluteFill
            style={{
              background:
                'linear-gradient(105deg, transparent 18%, rgba(255,255,255,0.16), rgba(190,120,255,0.10), transparent 60%)',
              transform: `translateX(${clampInterpolate(frame % 170, [0, 170], [-980, 940])}px) rotate(18deg)`,
              filter: 'blur(22px)',
              opacity: 0.38,
              mixBlendMode: 'screen',
            }}
          />

          <AbsoluteFill
            style={{
              background:
                'linear-gradient(73deg, transparent 16%, rgba(255,210,120,0.10), transparent 44%)',
              transform: `translateX(${clampInterpolate((frame + 70) % 210, [0, 210], [860, -920])}px) rotate(-13deg)`,
              filter: 'blur(26px)',
              opacity: 0.34,
              mixBlendMode: 'screen',
            }}
          />

          <AbsoluteFill
            style={{
              background:
                'radial-gradient(circle at 34% 42%, rgba(255,130,42,0.78), transparent 20%), radial-gradient(circle at 68% 68%, rgba(255,222,130,0.42), transparent 24%), linear-gradient(90deg, transparent, rgba(255,220,120,0.42), transparent)',
              mixBlendMode: 'screen',
              opacity: burnOpacity,
              filter: 'blur(24px)',
              transform: `scale(${1 + burnOpacity * 0.16}) rotate(${burnOpacity * 2.5}deg)`,
            }}
          />

          <AbsoluteFill
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.38) 0 1px, transparent 1.5px)',
              backgroundSize: '38px 38px',
              backgroundPosition: `${frame * 0.35}px ${frame * -0.22}px`,
              opacity: 0.13,
              mixBlendMode: 'screen',
            }}
          />

          <AbsoluteFill
            style={{
              backgroundImage:
                'linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.055) 48%, transparent 51%), radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 78%)',
              opacity: 0.9,
              mixBlendMode: 'overlay',
            }}
          />
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: motionOpacity,
            transform: `
              translate(${cameraX}px, ${cameraY}px)
              scale(${cameraScale})
              rotate(${cameraRot}deg)
            `,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center',
              padding: '78px 56px 62px',
            }}
          >
            <div>
              <div
                style={{
                  opacity: clampInterpolate(frame, [8, 22], [0, 1]),
                  transform: `translateY(${clampInterpolate(frame, [8, 22], [18, 0])}px)`,
                  fontSize: 36,
                  letterSpacing: 7,
                  fontWeight: 850,
                  textTransform: 'uppercase',
                  textShadow: '0 4px 18px rgba(0,0,0,0.78)',
                }}
              >
                {props.artistName}
              </div>

              <div
                style={{
                  marginTop: 16,
                  fontSize: 142,
                  lineHeight: 0.9,
                  fontWeight: 1000,
                  textTransform: 'uppercase',
                  textShadow:
                    '0 12px 34px rgba(0,0,0,0.88), 0 0 34px rgba(190,90,255,0.22)',
                  ...title,
                }}
              >
                {props.headline}
              </div>

              {props.releaseDate ? (
                <div
                  style={{
                    ...date,
                    marginTop: 18,
                    display: 'inline-block',
                    padding: '12px 28px',
                    borderRadius: 999,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.34)',
                    fontSize: 27,
                    fontWeight: 950,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  LANÇAMENTO {props.releaseDate}
                </div>
              ) : null}
            </div>

            <div
              style={{
                textAlign: 'center',
                opacity: cover.opacity,
                transform: cover.transform,
                transformOrigin: 'center center',
              }}
            >
              <div style={{ filter: 'drop-shadow(0 28px 48px rgba(0,0,0,0.62))' }}>
                <CoverCard src={props.coverImage} size={548} />
              </div>

              <div
                style={{
                  ...song,
                  marginTop: 30,
                  fontSize: 48,
                  fontWeight: 950,
                  textShadow: '0 8px 28px rgba(0,0,0,0.80)',
                }}
              >
                {props.songTitle}
              </div>
            </div>

            <div style={{ width: '100%', minHeight: 166 }}>
              <div
                style={{
                  ...cta,
                  position: 'relative',
                  height: 58,
                  fontSize: 39,
                  fontWeight: 1000,
                  letterSpacing: 2.1,
                  textTransform: 'uppercase',
                  textShadow: '0 4px 22px rgba(0,0,0,0.86)',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, opacity: ctaOneOpacity }}>
                  FAÇA O PRE-SAVE
                </div>

                <div style={{ position: 'absolute', inset: 0, opacity: ctaTwoOpacity }}>
                  {ctaTwo}
                </div>
              </div>

              <div
                style={{
                  marginTop: 26,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 30,
                  flexWrap: 'wrap',
                  opacity: logosOpacity,
                }}
              >
                {props.platforms.map((p, index) => (
                  <PlatformLogo
                    key={p}
                    name={p}
                    size={92}
                    delay={LOGOS_IN + index * 8}
                  />
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: posterOpacity,
            background: '#020205',
          }}
        >
          {props.coverImage ? (
            <img
              src={props.coverImage}
              alt=""
              style={{
                position: 'absolute',
                inset: '-34%',
                width: '168%',
                height: '168%',
                objectFit: 'cover',
                objectPosition: 'center center',
                filter: 'blur(24px) saturate(1.12) contrast(1.10)',
                opacity: 0.92,
              }}
            />
          ) : null}

          <AbsoluteFill style={{ background: 'rgba(0,0,0,0.70)' }} />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center',
              padding: '78px 56px 62px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 36,
                  letterSpacing: 7,
                  fontWeight: 850,
                  textTransform: 'uppercase',
                }}
              >
                {props.artistName}
              </div>

              <div
                style={{
                  marginTop: 16,
                  fontSize: 142,
                  lineHeight: 0.9,
                  fontWeight: 1000,
                  letterSpacing: -5,
                  textTransform: 'uppercase',
                  textShadow: '0 12px 34px rgba(0,0,0,0.88)',
                }}
              >
                {props.headline}
              </div>

              {props.releaseDate ? (
                <div
                  style={{
                    marginTop: 18,
                    display: 'inline-block',
                    padding: '12px 28px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.14)',
                    fontSize: 27,
                    fontWeight: 950,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  LANÇAMENTO {props.releaseDate}
                </div>
              ) : null}
            </div>

            <div>
              <CoverCard src={props.coverImage} size={548} />
              <div style={{ marginTop: 30, fontSize: 48, fontWeight: 950 }}>
                {props.songTitle}
              </div>
            </div>

            <div style={{ width: '100%', minHeight: 166 }}>
              <div
                style={{
                  height: 58,
                  fontSize: 39,
                  fontWeight: 1000,
                  letterSpacing: 2.1,
                  textTransform: 'uppercase',
                }}
              >
                {ctaTwo}
              </div>

              <div
                style={{
                  marginTop: 26,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 30,
                  flexWrap: 'wrap',
                }}
              >
                {props.platforms.map((p) => (
                  <PlatformLogo key={p} name={p} size={92} />
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </SceneShell>
  );
};
