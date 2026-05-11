import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const MOTION = {
  posterFrames: 2,

  revealStart: 2,

  titleIn: 12,
  coverIn: 30,
  songIn: 48,
  ctaIn: 62,
  logosIn: 78,

  transitionOne: 58,
  transitionMiddle: 112,
  transitionFinal: 202,

  ctaSwap: 120,
};

export function useBrazuTimeline() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return {
    frame,
    fps,
    camera: cameraZoomRotShake(frame, fps),
    bg: backgroundPulse(frame),
    transitionOne: transitionHit(frame, MOTION.transitionOne, 26, 0.7),
    transitionMiddle: transitionHit(frame, MOTION.transitionMiddle, 32, 1),
    transitionFinal: transitionHit(frame, MOTION.transitionFinal, 34, 0.9),
  };
}

export function posterCutOpacity(frame: number) {
  return frame < MOTION.posterFrames ? 1 : 0;
}

export function motionOpacity(frame: number) {
  return frame < MOTION.posterFrames ? 0 : 1;
}

export function copilotBounceIn(
  frame: number,
  fps: number,
  start: number,
  amplitude = 1
) {
  const local = frame - start;

  const s = spring({
    frame: local,
    fps,
    config: {
      damping: 13,
      mass: 0.72,
      stiffness: 132,
    },
  });

  const opacity = interpolate(local, [0, 8, 18], [0, 0.75, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const y = interpolate(s, [0, 1], [54 * amplitude, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(s, [0, 0.68, 1], [0.82, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blur = interpolate(local, [0, 15], [14, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    opacity,
    transform: `translateY(${y}px) scale(${scale})`,
    filter: `blur(${blur}px)`,
  };
}

export function textZoomBounce(
  frame: number,
  fps: number,
  start: number
) {
  const local = frame - start;

  const s = spring({
    frame: local,
    fps,
    config: {
      damping: 12,
      mass: 0.76,
      stiffness: 146,
    },
  });

  const opacity = interpolate(local, [0, 7, 16], [0, 0.72, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const y = interpolate(s, [0, 1], [-116, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(s, [0, 0.58, 0.82, 1], [0.72, 1.14, 0.97, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tracking = interpolate(local, [0, 18], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blur = interpolate(local, [0, 18], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    opacity,
    letterSpacing: tracking,
    transform: `translateY(${y}px) scale(${scale})`,
    filter: `blur(${blur}px)`,
  };
}

export function coverHeroMotion(
  frame: number,
  fps: number,
  start: number
) {
  const local = frame - start;

  const s = spring({
    frame: local,
    fps,
    config: {
      damping: 12,
      mass: 0.8,
      stiffness: 126,
    },
  });

  const opacity = interpolate(local, [0, 8, 18], [0, 0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(s, [0, 0.68, 1], [0.62, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const y = interpolate(s, [0, 1], [90, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const idleY = Math.sin((frame - start) * 0.055) * 5;
  const idleRot = Math.sin((frame - start) * 0.045) * 0.55;

  const flipOne = transitionHit(frame, start + 76, 30, 1);
  const flipTwo = transitionHit(frame, start + 128, 30, 0.7);
  const yRot = (flipOne.progress + flipTwo.progress) * 360;

  return {
    opacity,
    transform: `
      translateY(${y + idleY}px)
      rotate(${idleRot}deg)
      rotateY(${yRot}deg)
      scale(${scale})
    `,
  };
}

export function cameraZoomRotShake(frame: number, fps: number) {
  const intro = spring({
    frame: frame - MOTION.revealStart,
    fps,
    config: {
      damping: 18,
      mass: 0.95,
      stiffness: 90,
    },
  });

  const baseScale = interpolate(intro, [0, 1], [1.09, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const driftScale = 1 + Math.sin(frame * 0.012) * 0.006;
  const driftX = Math.sin(frame * 0.021) * 7;
  const driftY = Math.cos(frame * 0.017) * 9;
  const driftRot = Math.sin(frame * 0.012) * 0.28;

  return {
    transform: `
      translate(${driftX}px, ${driftY}px)
      scale(${baseScale * driftScale})
      rotate(${driftRot}deg)
    `,
  };
}

export function backgroundPulse(frame: number) {
  const zoom = 1.13 + Math.sin(frame * 0.012) * 0.018;
  const x = Math.sin(frame * 0.018) * 18;
  const y = Math.cos(frame * 0.014) * 22;

  return {
    transform: `translate(${x}px, ${y}px) scale(${zoom})`,
  };
}

export function transitionHit(
  frame: number,
  center: number,
  duration: number,
  intensity = 1
) {
  const half = duration / 2;
  const start = center - half;
  const end = center + half;
  const local = frame - start;

  const progress = interpolate(local, [0, half, duration], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = 1 + progress * 0.085 * intensity;
  const rot = Math.sin(local * 0.65) * progress * 1.4 * intensity;
  const shakeX = Math.sin(local * 1.7) * progress * 18 * intensity;
  const shakeY = Math.cos(local * 1.35) * progress * 12 * intensity;
  const blur = progress * 5.5 * intensity;

  return {
    progress,
    active: frame >= start && frame <= end,
    style: {
      transform: `
        translate(${shakeX}px, ${shakeY}px)
        scale(${scale})
        rotate(${rot}deg)
      `,
      filter: `blur(${blur}px)`,
    },
  };
}

export function ctaSwapOpacity(frame: number, before = true) {
  const swap = MOTION.ctaSwap;

  if (before) {
    return interpolate(frame, [swap - 14, swap - 3], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  return interpolate(frame, [swap - 2, swap + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function filmBurnOpacity(frame: number) {
  const t1 = transitionHit(frame, MOTION.transitionOne, 34, 1).progress;
  const t2 = transitionHit(frame, MOTION.transitionMiddle, 42, 1).progress;
  const t3 = transitionHit(frame, MOTION.transitionFinal, 38, 1).progress;

  return Math.max(t1 * 0.28, t2 * 0.34, t3 * 0.36);
}
