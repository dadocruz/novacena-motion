import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { popIn, wiggle, fadeUp, introSpring } from './animations';
import { CoverCard, SceneShell } from './SceneShell';
import { PlatformLogo } from './PlatformLogo';
import type { TemplateProps } from './types';

export const AvailableNow: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = introSpring(frame, fps, 6);
  const cover = popIn(frame, fps, 22, 0.52);
  const cta = fadeUp(frame, 58, 42);
  const logos = fadeUp(frame, 72, 34);

  return (
    <SceneShell media={props.media} renderTarget={props.renderTarget} tint="rgba(165,34,255,0.28)">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', transform: wiggle(frame, 0.32) }}>
          <div style={{ fontSize: 38, letterSpacing: 7, fontWeight: 700, opacity: interpolate(head, [0, 1], [0, 0.96]), textTransform: 'uppercase' }}>{props.artistName}</div>
          <div
            style={{
              marginTop: 18,
              fontSize: 152,
              lineHeight: 0.92,
              letterSpacing: -5,
              fontWeight: 1000,
              opacity: interpolate(head, [0, 0.4, 1], [0, 1, 1]),
              transform: `translateY(${interpolate(head, [0, 1], [-120, 0])}px) scale(${interpolate(head, [0, 0.65, 1], [0.78, 1.08, 1])})`,
              textShadow: '0 10px 36px rgba(0,0,0,0.78)',
              textTransform: 'uppercase',
            }}
          >
            {props.headline}
          </div>
          {props.releaseDate && (
            <div style={{ marginTop: 22, display: 'inline-block', padding: '12px 28px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
              LANÇAMENTO {props.releaseDate}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', opacity: cover.opacity, transform: `scale(${cover.scale}) ${wiggle(frame, 0.16)}` }}>
          <CoverCard src={props.coverImage} size={548} />
          <div style={{ marginTop: 28, fontSize: 48, fontWeight: 900, textShadow: '0 8px 28px rgba(0,0,0,0.74)' }}>{props.songTitle}</div>
        </div>

        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ ...cta, fontSize: 40, fontWeight: 1000, letterSpacing: 2.4, textTransform: 'uppercase', textShadow: '0 4px 22px rgba(0,0,0,0.82)' }}>{props.cta}</div>
          <div style={{ ...logos, marginTop: 28, display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
            {props.platforms.map((p, index) => (
              <PlatformLogo
                key={p}
                name={p}
                size={86}
                delay={index * 8}
              />
            ))}
          </div>
        </div>
      </div>
    </SceneShell>
  );
};
