import type { MotionConfig, TemplateId } from '../remotion/types';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_SAFE_TOP = 285;
export const STORY_SAFE_BOTTOM = 1635;

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function coverSizeBoundsForTemplate(template: TemplateId) {
  if (template === 'watch_youtube') return { min: 360, max: 560, fallback: 520 };
  if (template === 'milestone') return { min: 260, max: 460, fallback: 430 };
  if (template === 'spotify_print') return { min: 280, max: 700, fallback: 520 };
  if (template === 'youtube_subscribe' || template === 'youtube_views') return { min: 280, max: 620, fallback: 520 };
  return { min: 320, max: 780, fallback: 510 };
}

export function normalizeCoverSizeForTemplate(template: TemplateId, value: unknown) {
  const bounds = coverSizeBoundsForTemplate(template);
  const numeric = Number(value);
  return clampNumber(Number.isFinite(numeric) ? numeric : bounds.fallback, bounds.min, bounds.max);
}

export function getWatchYouTubeGeometry(motion?: Pick<MotionConfig, 'coverSize' | 'coverX' | 'coverY'>) {
  const coverSize = normalizeCoverSizeForTemplate('watch_youtube', motion?.coverSize);
  const coverTop = clampNumber(
    620 + (motion?.coverY ?? 0),
    STORY_SAFE_TOP + 230,
    STORY_SAFE_BOTTOM - coverSize - 250,
  );
  const coverLeftOffset = clampNumber(motion?.coverX ?? 0, -220, 220);
  const channelTop = clampNumber(coverTop + coverSize + 34, STORY_SAFE_TOP + 720, STORY_SAFE_BOTTOM - 220);
  const ctaTop = clampNumber(channelTop + 84, STORY_SAFE_TOP + 840, STORY_SAFE_BOTTOM - 110);

  return {
    coverSize,
    coverTop,
    coverLeftOffset,
    channelTop,
    ctaTop,
  };
}
