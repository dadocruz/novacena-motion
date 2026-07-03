import type {
  PlatformName,
  CoverMotionId,
  TextTransitionId,
  TextTransitionTuning,
  TextStyle,
  TemplateId,
  RenderTarget,
} from '../remotion/types';
import { AvailableNow } from '../remotion/AvailableNow';
import { WatchOnYouTube } from '../remotion/WatchOnYouTube';
import { YouTubeSubscribe } from '../remotion/YouTubeSubscribe';
import { YouTubeViews } from '../remotion/YouTubeViews';
import { Milestone } from '../remotion/Milestone';
import { OutNow } from '../remotion/OutNow';
import { SpotifyPrint } from '../remotion/SpotifyPrint';

export const componentByTemplate = {
  available_now: AvailableNow,
  watch_youtube: WatchOnYouTube,
  youtube_subscribe: YouTubeSubscribe,
  youtube_views: YouTubeViews,
  milestone: Milestone,
  out_now: OutNow,
  listen_deezer: OutNow,
  spotify_print: SpotifyPrint,
};

export const allPlatforms: PlatformName[] = ['Spotify', 'Deezer', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Tidal'];

export const GLOW_PRESETS: { label: string; color: string }[] = [
  { label: 'Roxo', color: 'rgba(190, 90, 255, 0.32)' },
  { label: 'Laranja', color: 'rgba(255, 140, 60, 0.32)' },
  { label: 'Verde', color: 'rgba(60, 220, 130, 0.32)' },
  { label: 'Vermelho', color: 'rgba(255, 60, 60, 0.32)' },
  { label: 'Azul', color: 'rgba(80, 140, 255, 0.32)' },
  { label: 'Dourado', color: 'rgba(255, 200, 80, 0.32)' },
  { label: 'Rosa', color: 'rgba(255, 90, 180, 0.32)' },
  { label: 'Off-white', color: 'rgba(255, 255, 255, 0.20)' },
];

export const BG_COLORS = ['#000000', '#030205', '#0a0a14', '#1a0a2a', '#0a1a14', '#2a0a14', '#1a1a2a'];

export const PLATFORMS = ['Spotify', 'Deezer', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Tidal'] as const;

export const COVER_MOTION_OPTIONS: { value: CoverMotionId; label: string }[] = [
  { value: 'zoom_bounce', label: 'Zoom Bounce — Intro impacto' },
  { value: 'slide_up', label: 'Slide Up — Vem de baixo' },
  { value: 'slide_left', label: 'Slide Left — Entra da esquerda' },
  { value: 'slide_right', label: 'Slide Right — Entra da direita' },
  { value: 'flip_card', label: 'Flip Card — Virada premium' },
  { value: 'vinyl_reveal', label: 'Vinyl Reveal — Giro lateral' },
];

// ============================================================
// TIPOS LOCAIS DE STATE
// ============================================================
export type ArtistRecord = {
  id: string;
  slug: string;
  name: string;
  driveFolderPath?: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  template: string;
  thumbnailPath?: string;
  createdAt: string;
};

export type Photo = {
  id: string;
  filename: string;
  path: string;
  uploadedAt: string;
};

export type UserFontRecord = {
  id: string;
  label: string;
  filename: string;
  family: string;
  category: 'display' | 'sans' | 'special';
  weight: number;
};

export type OverlayAsset = {
  id: string;
  label: string;
  path: string;
  type: 'video' | 'image';
  blendMode: 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal';
  durationSec?: number;
};

export type TextStyleState = {
  color: string;
  useGradient: boolean;
  gradientColor1: string;
  gradientColor2: string;
  gradientAngle: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
};

export const HEADLINE_STYLE_DEFAULTS: TextStyleState = {
  color: '#ffffff',
  useGradient: false,
  gradientColor1: '#b855ff',
  gradientColor2: '#ff9244',
  gradientAngle: 120,
  letterSpacing: -2,
  textAlign: 'center',
  paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
  marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
};

export const DATE_STYLE_DEFAULTS: TextStyleState = {
  color: '#ffffff',
  useGradient: false,
  gradientColor1: '#ffd06b',
  gradientColor2: '#ff6e51',
  gradientAngle: 120,
  letterSpacing: 2.4,
  textAlign: 'center',
  paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
  marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
};

export const CTA_STYLE_DEFAULTS: TextStyleState = {
  color: '#ffffff',
  useGradient: false,
  gradientColor1: '#ffffff',
  gradientColor2: '#b855ff',
  gradientAngle: 120,
  letterSpacing: 2.4,
  textAlign: 'center',
  paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
  marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
};

export function mergeTextStyle(defaults: TextStyleState, style?: TextStyle): TextStyleState {
  return {
    ...defaults,
    ...(style ?? {}),
  };
}

export const CTA_TIMING_DEFAULTS = {
  cta1InFrame: 78,
  ctaSwapFrame: 124,
  cta2InFrame: 138,
  logosInFrame: 158,
} as const;

export const DEFAULT_TEXT_WIGGLE_VALUES = {
  headline: 0.35,
  date: 0.25,
  cta: 0.3,
  cta1: 0.3,
  cta2: 0.25,
} as const;

export const TEXT_IN_FRAME_DEFAULTS_BY_TEMPLATE: Record<TemplateId, Record<TextPreviewRole, number>> = {
  available_now: { headline: 0, date: 38, cta1: 78, cta2: 138 },
  watch_youtube: { headline: 14, date: 96, cta1: 124, cta2: 124 },
  youtube_subscribe: { headline: 12, date: 70, cta1: 124, cta2: 124 },
  youtube_views: { headline: 30, date: 12, cta1: 64, cta2: 86 },
  milestone: { headline: 78, date: 14, cta1: 106, cta2: 106 },
  out_now: { headline: 14, date: 130, cta1: 88, cta2: 88 },
  listen_deezer: { headline: 14, date: 130, cta1: 88, cta2: 88 },
  spotify_print: { headline: 78, date: 14, cta1: 106, cta2: 106 },
};

export const TEXT_TRANSITION_PREVIEW_LEAD_FRAMES = 2;
export const TEXT_TRANSITION_PREVIEW_LOOP_FRAMES = 54;
export const COVER_TRANSITION_IN_FRAME = 54;
export const COVER_TRANSITION_DURATION_FRAMES = 60;
export const COVER_TRANSITION_PREVIEW_LEAD_FRAMES = 24;
export const COVER_TRANSITION_PREVIEW_TAIL_FRAMES = 8;
export const EDITOR_HISTORY_LIMIT = 100;

export type TextPreviewRole = 'headline' | 'date' | 'cta1' | 'cta2';
export type EditPreviewLoop = { startFrame: number; endFrame: number; kind?: 'text' | 'cover'; role?: TextPreviewRole };
export type EditorHistorySnapshot = Record<string, any>;
/** Knobs de ENTRADA resolvidos (o corte/saída viaja à parte no tuning). */
export type ResolvedTextTuning = { intensity: number; speed: number; stagger: number };
export type TextTransitionTuningState = Record<TextPreviewRole, ResolvedTextTuning>;

export const DEFAULT_TEXT_TRANSITION_TUNING: ResolvedTextTuning = {
  intensity: 1,
  speed: 1,
  stagger: 1,
};

export const TRANSITION_TUNING_PRESETS: Array<{
  id: string;
  label: string;
  values: ResolvedTextTuning;
}> = [
  { id: 'clean', label: 'Clean', values: { intensity: 0.72, speed: 0.95, stagger: 0.65 } },
  { id: 'impact', label: 'Impacto', values: { intensity: 1.28, speed: 1.05, stagger: 1 } },
  { id: 'snappy', label: 'Rápido', values: { intensity: 1.05, speed: 1.55, stagger: 0.45 } },
  { id: 'cinematic', label: 'Cine', values: { intensity: 1.6, speed: 0.78, stagger: 1.45 } },
];

export function clampTuningValue(value: unknown, min: number, max: number, fallback: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, next));
}

export function normalizeTextTransitionTuning(value?: Partial<TextTransitionTuning> | null): ResolvedTextTuning {
  return {
    intensity: clampTuningValue(value?.intensity, 0.15, 2.4, DEFAULT_TEXT_TRANSITION_TUNING.intensity),
    speed: clampTuningValue(value?.speed, 0.35, 2.4, DEFAULT_TEXT_TRANSITION_TUNING.speed),
    stagger: clampTuningValue(value?.stagger, 0, 2.4, DEFAULT_TEXT_TRANSITION_TUNING.stagger),
  };
}

export function createDefaultTransitionTuningState(): TextTransitionTuningState {
  return {
    headline: { ...DEFAULT_TEXT_TRANSITION_TUNING },
    date: { ...DEFAULT_TEXT_TRANSITION_TUNING },
    cta1: { ...DEFAULT_TEXT_TRANSITION_TUNING },
    cta2: { ...DEFAULT_TEXT_TRANSITION_TUNING },
  };
}

export function normalizeTransitionTuningState(value?: Partial<Record<TextPreviewRole, Partial<TextTransitionTuning>>> | null): TextTransitionTuningState {
  return {
    headline: normalizeTextTransitionTuning(value?.headline),
    date: normalizeTextTransitionTuning(value?.date),
    cta1: normalizeTextTransitionTuning(value?.cta1),
    cta2: normalizeTextTransitionTuning(value?.cta2),
  };
}

export function transitionTuningFromMotion(motion: any): TextTransitionTuningState {
  return normalizeTransitionTuningState({
    headline: motion?.transitionTuningHeadline ?? motion?.transitionTuning?.headline,
    date: motion?.transitionTuningDate ?? motion?.transitionTuning?.date,
    cta1: motion?.transitionTuningCta1 ?? motion?.transitionTuningCta ?? motion?.transitionTuning?.cta1,
    cta2: motion?.transitionTuningCta2 ?? motion?.transitionTuningCta ?? motion?.transitionTuning?.cta2,
  });
}

export function cloneHistoryValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function serializeEditorSnapshot(snapshot: EditorHistorySnapshot) {
  return JSON.stringify(snapshot);
}

export function parseEditorSnapshot(serialized: string): EditorHistorySnapshot | null {
  try {
    return JSON.parse(serialized) as EditorHistorySnapshot;
  } catch {
    return null;
  }
}

export function pushHistorySnapshot(stack: React.MutableRefObject<EditorHistorySnapshot[]>, snapshot: EditorHistorySnapshot) {
  stack.current = [...stack.current, cloneHistoryValue(snapshot)].slice(-EDITOR_HISTORY_LIMIT);
}

export function normalizeAssetUrl(src?: string): string | undefined {
  if (!src) return src;
  if (src.startsWith('/uploads/')) return src.replace('/uploads/', '/api/uploads/');
  return src;
}

export function normalizeCustomLogos(logos: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(logos)) {
    next[key] = normalizeAssetUrl(value) ?? value;
  }
  return next;
}

export function isBlobUrl(src?: string): boolean {
  return !!src && src.startsWith('blob:');
}

export type StudioToolId =
  | 'cover'
  | 'text'
  | 'motion'
  | 'logos'
  | 'overlay'
  | 'timeline'
  | 'render';

export function scrollToStudioSection(section?: string) {
  if (!section || typeof window === 'undefined') return;

  window.requestAnimationFrame(() => {
    const el = document.querySelector(`[data-right-panel-section="${section}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

export function renderScriptFor(template: TemplateId, target: RenderTarget): string {
  const suffix = target === 'feed' ? ':feed' : '';
  if (template === 'available_now') return `render:available${suffix}`;
  if (template === 'watch_youtube') return `render:youtube${suffix}`;
  if (template === 'youtube_subscribe') return `render:youtubesubscribe${suffix}`;
  if (template === 'youtube_views') return `render:youtubeviews${suffix}`;
  if (template === 'milestone') return `render:milestone${suffix}`;
  if (template === 'listen_deezer') return `render:deezer${suffix}`;
  if (template === 'spotify_print') return `render:spotifyprint${suffix}`;
  return `render:outnow${suffix}`;
}

export const RIGHT_PANEL_SECTION_ORDER_KEY = 'novacena:right-panel-section-order-v1';

export const DEFAULT_RIGHT_PANEL_SECTION_ORDER = [
  'Projeto',
  'Áudio',
  'Logos das plataformas',
  'Texto',
  'Ritmo CTA (Disponível)',
  'Overlays (filmburn / película)',
  'Capa',
  'Celular',
  'Brilho',
  'Efeitos',
];

export function getRightPanelSectionOrder(): string[] {
  if (typeof window === 'undefined') return DEFAULT_RIGHT_PANEL_SECTION_ORDER;

  try {
    const saved = window.localStorage.getItem(RIGHT_PANEL_SECTION_ORDER_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return DEFAULT_RIGHT_PANEL_SECTION_ORDER;

    return [
      ...parsed.filter((item: string) => DEFAULT_RIGHT_PANEL_SECTION_ORDER.includes(item)),
      ...DEFAULT_RIGHT_PANEL_SECTION_ORDER.filter((item) => !parsed.includes(item)),
    ];
  } catch {
    return DEFAULT_RIGHT_PANEL_SECTION_ORDER;
  }
}

export function getRightPanelSectionIndex(title: string): number {
  return getRightPanelSectionOrder().indexOf(title);
}

export function saveRightPanelSectionOrder(order: string[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(RIGHT_PANEL_SECTION_ORDER_KEY, JSON.stringify(order));
  window.dispatchEvent(new CustomEvent('novacena:right-panel-section-order-changed'));
}

export function moveRightPanelSection(sourceTitle: string, targetTitle: string) {
  if (!sourceTitle || !targetTitle || sourceTitle === targetTitle) return;

  const order = getRightPanelSectionOrder();
  const from = order.indexOf(sourceTitle);
  const to = order.indexOf(targetTitle);

  if (from === -1 || to === -1) return;

  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);

  saveRightPanelSectionOrder(next);
}
