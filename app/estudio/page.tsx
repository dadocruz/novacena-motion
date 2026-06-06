'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RIGHT_PANEL_PRESET_ORDER,
  SIMPLE_MODE_SECTIONS,
  STUDIO_TOOL_DOCK,
  type StudioMode,
} from '../../lib/studioWorkflow';
import FontsPanel, { type FontRole } from '../../components/FontsPanel';

import { Player } from '@remotion/player';
import {
  type PlatformName,
  type OverlayPlacement,
  type TextStyle,
  type CoverMotionId,
  type TemplateId,
  type RenderTarget,
  type TextTransitionId,
  type TextTransitionTuning,
  type MotionConfig,
  type PlatformLogoPackId,
  type TemplateProps,
} from '../../remotion/types'
import {
  templateOrder,
  templateLabels,
  getProject,
} from '../../remotion/project';
import { DEFAULT_FONTS, userFontToFontDef, FONT_CATALOG, type FontDef } from '../../lib/fontCatalog';
import { BILLING_CYCLES, planPrice, SAAS_PLANS, type BillingCycle } from '../../lib/saasPlans';

import {
  componentByTemplate,
  allPlatforms,
  GLOW_PRESETS,
  BG_COLORS,
  PLATFORMS,
  COVER_MOTION_OPTIONS,
  HEADLINE_STYLE_DEFAULTS,
  DATE_STYLE_DEFAULTS,
  CTA_STYLE_DEFAULTS,
  CTA_TIMING_DEFAULTS,
  DEFAULT_TEXT_WIGGLE_VALUES,
  TEXT_IN_FRAME_DEFAULTS_BY_TEMPLATE,
  TEXT_TRANSITION_PREVIEW_LEAD_FRAMES,
  TEXT_TRANSITION_PREVIEW_LOOP_FRAMES,
  COVER_TRANSITION_IN_FRAME,
  COVER_TRANSITION_DURATION_FRAMES,
  COVER_TRANSITION_PREVIEW_LEAD_FRAMES,
  COVER_TRANSITION_PREVIEW_TAIL_FRAMES,
  EDITOR_HISTORY_LIMIT,
  DEFAULT_TEXT_TRANSITION_TUNING,
  TRANSITION_TUNING_PRESETS,
  mergeTextStyle,
  clampTuningValue,
  normalizeTextTransitionTuning,
  createDefaultTransitionTuningState,
  normalizeTransitionTuningState,
  transitionTuningFromMotion,
  cloneHistoryValue,
  serializeEditorSnapshot,
  parseEditorSnapshot,
  pushHistorySnapshot,
  normalizeAssetUrl,
  normalizeCustomLogos,
  isBlobUrl,
  scrollToStudioSection,
  renderScriptFor,
  type ArtistRecord,
  type GalleryItem,
  type Photo,
  type UserFontRecord,
  type OverlayAsset,
  type TextStyleState,
  type TextPreviewRole,
  type EditPreviewLoop,
  type EditorHistorySnapshot,
  type TextTransitionTuningState,
  type StudioToolId,
} from '../editorConstants';

import {
  topbarStyle,
  separator,
  topTab,
  topTabActive,
  leftSidebar,
  rightSidebar,
  centerStyle,
  previewToolbarStyle,
  renderBarStyle,
  downloadVideoBtnStyle,
  downloadVideoWideBtnStyle,
  gridTwoCols,
  uploadCardStyle,
  uploadCardStyleSmall,
  uploadThumbStyle,
  primaryBtn,
  renderBtnStyle,
  ghostBtnStyle,
  chip,
  chipActive,
  resetBtnStyle,
  miniLabel,
  miniInputLabel,
  fieldInputStyle,
  segBtn,
  segBtnActive,
  dashedUpload,
  linkBtnDanger,
  userFontRow,
  overlayLibraryRow,
  tinyAddBtn,
  tinyDelBtn,
  platformLogoRow,
  colorInputStyle,
  textBoxGridStyle,
  miniNumberInputStyle,
  tinyNumInput,
  tinySelect,
  photoDelBtn,
  logBoxStyle,
} from '../editorStyles';

import {
  DragSlider,
  BrandSmall,
  ArtistSelector,
  ArtistModal,
  GalleryView,
  OverlayTimeline,
  TimelinePanel,
  type TimelineTrack,
  type TimelineTool,
  TextColorEditor,
  TextLayoutEditor,
  NumberBox,
  Section,
  SliderRow,
  TextAreaField,
  Field,
  TemplateButton,
  SegmentedControl,
  ToggleRow,
  FontPicker,
} from '../../components/editor';

type RenderEngine = 'desktop' | 'local' | 'lambda';

type OverlayPresetItem = {
  id: string;
  label: string;
  template: string;
  pack?: string;
  type: 'video' | 'image';
  thumbnail?: string;
  placement: Record<string, any>;
  createdAt: string;
};

const SAAS_EXPORT_MODE =
  process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
  process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
const MAX_BACKGROUND_CLIP_SECONDS = 60;
const HEAVY_BACKGROUND_VIDEO_BYTES = 40 * 1024 * 1024;
const LONG_BACKGROUND_VIDEO_SECONDS = 45;
const PHONE_TRANSITION_IN_FRAME = 98;

function defaultCoverInFrameForTemplate(templateId: TemplateId) {
  if (templateId === 'watch_youtube') return 50;
  if (templateId === 'milestone') return 40;
  return COVER_TRANSITION_IN_FRAME;
}

function defaultPhoneInFrameForTemplate(templateId: TemplateId) {
  return templateId === 'spotify_print' ? PHONE_TRANSITION_IN_FRAME : 0;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type LocalAssetRef = {
  id: string;
  kind: 'backgroundVideo' | 'backgroundAudio' | 'overlay';
  name: string;
  size: number;
  type: string;
  durationSec?: number;
  width?: number;
  height?: number;
  lastModified?: number;
  trimStartSec?: number;
  trimDurationSec?: number;
  sourcePath?: string;
  previewSrc?: string;
  serverPreviewSrc?: string;
  renderReadySrc?: string;
  previewMode?: string;
  requiresOptimization?: boolean;
};

type SharedBackgroundVideoPatch = {
  bgVideo: string;
  bgVideoStartSec: number;
  bgVideoDuration: number;
  bgVideoNeedsTrim: boolean;
  bgVideoOriginalName: string;
  bgVideoLocalAsset: LocalAssetRef | null;
  bgVideoOpacity: number;
  bgVideoBlur: number;
  bgVideoSaturation: number;
  useVideoAudio: boolean;
};

type SharedAudioPatch = {
  audioSrc: string;
  audioDuration: number;
  audioOriginalName: string;
  audioStartSec: number;
  audioVolume: number;
  audioFadeIn: number;
  audioFadeOut: number;
  useVideoAudio: boolean;
};

type SaasUserSummary = {
  email: string;
  name: string;
  tokens: number;
  planId?: string;
  billingCycle?: string;
};

type PixPayment = {
  type: 'pix';
  key: string;
  name: string;
  whatsapp?: string;
  amountBRL: number;
  planName: string;
  cycle: BillingCycle;
  renders: number;
  reference: string;
};

const DEFAULT_TEXT_ROLE_LABELS: Partial<Record<FontRole, string>> = {
  headline: 'Headline',
  date: 'Data',
  cta1: 'Chamada 1',
  cta2: 'Chamada 2',
};
type EditorTextTransitionRole = 'headline' | 'date' | 'cta1' | 'cta2';

const PLATFORM_LOGO_PACK_OPTIONS: {
  id: PlatformLogoPackId;
  label: string;
  hint: string;
  available: boolean;
}[] = [
  { id: 'standard', label: 'Logos padrão', hint: 'Aguardando pacote', available: false },
  { id: 'round', label: 'Logos redondos', hint: 'Brancos editáveis', available: true },
  { id: 'rectangular', label: 'Logos retangulares', hint: 'Aguardando pacote', available: false },
];

const ROUND_WHITE_PLATFORM_LOGOS: Partial<Record<PlatformName, string>> = {
  Spotify: '/logos/platforms/round-white/SPOTIFY.png',
  Deezer: '/logos/platforms/round-white/DEEZER.png',
  'Apple Music': '/logos/platforms/round-white/APPLE.png',
  'YouTube Music': '/logos/platforms/round-white/YOUTUBE.png',
  'Amazon Music': '/logos/platforms/round-white/AMAZON.png',
  Tidal: '/logos/platforms/round-white/TIDAL.png',
};

function isFactoryPlatformLogoPath(src?: string) {
  return typeof src === 'string' && src.startsWith('/logos/platforms/');
}

function defaultPlatformLogoForPack(pack: PlatformLogoPackId, platform: PlatformName) {
  if (pack === 'round') return ROUND_WHITE_PLATFORM_LOGOS[platform];
  return undefined;
}

const TEXT_ROLE_LABELS_BY_TEMPLATE: Partial<Record<TemplateId, Partial<Record<FontRole, string>>>> = {
  available_now: {
    headline: 'Titulo',
    date: 'Data de lancamento',
    cta1: 'CTA principal',
    cta2: 'CTA secundario',
  },
  watch_youtube: {
    headline: 'Titulo fixo',
    date: 'Canal do YouTube',
    cta1: 'CTA do video',
  },
  youtube_subscribe: {
    headline: 'INSCREVA-SE',
    cta1: 'Texto 1',
    date: '@ do canal',
  },
  youtube_views: {
    date: 'ULTRAPASSAMOS',
    headline: 'Numero',
    cta1: 'Metrica',
    cta2: '@ do canal',
  },
  milestone: {
    date: 'Texto acima',
    headline: 'Numero',
    cta1: 'Metrica',
  },
  out_now: {
    headline: 'Headline',
    cta2: 'CTA plataformas',
  },
  spotify_print: {
    date: 'Texto acima',
    headline: 'Numero',
    cta1: 'Metrica',
  },
};

const VISIBLE_TEXT_ROLES_BY_TEMPLATE: Partial<Record<TemplateId, EditorTextTransitionRole[]>> = {
  watch_youtube: ['headline', 'date', 'cta1'],
  youtube_subscribe: ['headline', 'cta1', 'date'],
  youtube_views: ['date', 'headline', 'cta1', 'cta2'],
  milestone: ['date', 'headline', 'cta1'],
  out_now: ['headline', 'cta2'],
  spotify_print: ['date', 'headline', 'cta1'],
};

function getTextRoleLabels(template: TemplateId): Partial<Record<FontRole, string>> {
  return {
    ...DEFAULT_TEXT_ROLE_LABELS,
    ...(TEXT_ROLE_LABELS_BY_TEMPLATE[template] ?? {}),
  };
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Home() {
  const [isClientReady, setIsClientReady] = useState(false);
  const [saasUser, setSaasUser] = useState<SaasUserSummary | null>(null);
  const [activeStudioTool, setActiveStudioTool] = useState<StudioToolId>('cover');
  const [showTimeline, setShowTimeline] = useState(true);
  const [timelineSec, setTimelineSec] = useState(0);
  const [activeTextRole, setActiveTextRole] = useState<FontRole>('headline');
  // ─── ARTISTA ──────────────────────────────────────────────
  const [artists, setArtists] = useState<ArtistRecord[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const activeArtist = artists.find((a) => a.slug === activeSlug);

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [driveFolderPath, setDriveFolderPath] = useState('');
  const factoryAvailableNow = getProject('available_now') as any;
  const factoryMotion = (factoryAvailableNow.motion ?? {}) as MotionConfig & Record<string, any>;
  const factoryBackground = (factoryMotion.background ?? {}) as Record<string, any>;
  const factoryPosterFrame = (factoryAvailableNow.posterFrame ?? {}) as Record<string, any>;
  const factoryStyleHeadline = (factoryMotion.styleHeadline ?? {}) as Record<string, any>;
  const factoryStyleDate = (factoryMotion.styleDate ?? {}) as Record<string, any>;
  const factoryStyleCta = (factoryMotion.styleCta ?? {}) as Record<string, any>;
  const factoryStyleCta1 = (factoryMotion.styleCta1 ?? factoryMotion.styleCta ?? {}) as Record<string, any>;
  const factoryStyleCta2 = (factoryMotion.styleCta2 ?? factoryMotion.styleCta ?? {}) as Record<string, any>;
  const styleNumber = (style: Record<string, any>, key: string, fallback: number) =>
    typeof style[key] === 'number' ? style[key] : fallback;
  const factoryTextMetrics = {
    scale: {
      headline: styleNumber(factoryStyleHeadline, 'scale', 1),
      date: styleNumber(factoryStyleDate, 'scale', 1),
      cta: styleNumber(factoryStyleCta, 'scale', 1),
      cta1: styleNumber(factoryStyleCta1, 'scale', 1),
      cta2: styleNumber(factoryStyleCta2, 'scale', 1),
    },
    letterSpacing: {
      headline: styleNumber(factoryStyleHeadline, 'letterSpacing', 0),
      date: styleNumber(factoryStyleDate, 'letterSpacing', 0),
      cta: styleNumber(factoryStyleCta, 'letterSpacing', 0),
      cta1: styleNumber(factoryStyleCta1, 'letterSpacing', 0),
      cta2: styleNumber(factoryStyleCta2, 'letterSpacing', 0),
    },
    lineHeight: {
      headline: styleNumber(factoryStyleHeadline, 'lineHeight', 1.2),
      date: styleNumber(factoryStyleDate, 'lineHeight', 1.2),
      cta: styleNumber(factoryStyleCta, 'lineHeight', 1.3),
      cta1: styleNumber(factoryStyleCta1, 'lineHeight', 1.3),
      cta2: styleNumber(factoryStyleCta2, 'lineHeight', 1.3),
    },
    offsetX: {
      headline: styleNumber(factoryStyleHeadline, 'offsetX', 0),
      date: styleNumber(factoryStyleDate, 'offsetX', 0),
      cta: styleNumber(factoryStyleCta, 'offsetX', 0),
      cta1: styleNumber(factoryStyleCta1, 'offsetX', 0),
      cta2: styleNumber(factoryStyleCta2, 'offsetX', 0),
    },
    offsetY: {
      headline: styleNumber(factoryStyleHeadline, 'offsetY', 0),
      date: styleNumber(factoryStyleDate, 'offsetY', 0),
      cta: styleNumber(factoryStyleCta, 'offsetY', 0),
      cta1: styleNumber(factoryStyleCta1, 'offsetY', 0),
      cta2: styleNumber(factoryStyleCta2, 'offsetY', 0),
    },
  };

  // ─── PROJETO ──────────────────────────────────────────────
  const [template, setTemplate] = useState<TemplateId>('available_now');
  const [layoutPreset, setLayoutPreset] = useState<string>(factoryMotion.layoutPreset ?? '');
  const [target, setTarget] = useState<RenderTarget>('story');
  const [showSafeArea, setShowSafeArea] = useState(false);

  const [releaseDate, setReleaseDate] = useState(factoryAvailableNow.releaseDate ?? '');
  const [coverImage, setCoverImage] = useState(factoryAvailableNow.coverImage);
  const [headline, setHeadline] = useState(factoryAvailableNow.headline);
  const [cta, setCta] = useState(factoryAvailableNow.cta);
  const [cta2, setCta2] = useState(factoryAvailableNow.cta2 ?? factoryAvailableNow.cta);
  const [showCta1, setShowCta1] = useState<boolean>(factoryAvailableNow.showCta1 ?? true);
  const [showCta2, setShowCta2] = useState<boolean>(factoryAvailableNow.showCta2 ?? true);
  const [showCover, setShowCover] = useState<boolean>(factoryAvailableNow.showCover ?? true);

  const [channelName, setChannelName] = useState(factoryAvailableNow.channelName ?? '');
  const [metricPrefix, setMetricPrefix] = useState(factoryAvailableNow.metricPrefix ?? 'ULTRAPASSAMOS');
  const [metricNumber, setMetricNumber] = useState(factoryAvailableNow.metricNumber ?? '100.000');
  const [metricLabel, setMetricLabel] = useState(factoryAvailableNow.metricLabel ?? 'OUVINTES');
  const [platformsSel, setPlatformsSel] = useState<PlatformName[]>(() => {
    const saved: PlatformName[] = factoryAvailableNow.platforms ?? [];
    const logos = (factoryMotion.customLogos ?? {}) as Record<string, string>;
    const fromLogos = (Object.keys(logos) as PlatformName[]).filter((p) => allPlatforms.includes(p) && !saved.includes(p));
    return [...saved, ...fromLogos];
  });

  // ─── MOTION CONFIG ────────────────────────────────────────
  const [fontHeadline, setFontHeadline] = useState<string>(factoryMotion.fontHeadline ?? DEFAULT_FONTS.headline);
  const [fontDate, setFontDate] = useState<string>(factoryMotion.fontDate ?? DEFAULT_FONTS.date);
  const [fontCta, setFontCta] = useState<string>(factoryMotion.fontCta ?? DEFAULT_FONTS.cta);
  const [fontCta1, setFontCta1] = useState<string>(factoryMotion.fontCta1 ?? factoryMotion.fontCta ?? DEFAULT_FONTS.cta);
  const [fontCta2, setFontCta2] = useState<string>(factoryMotion.fontCta2 ?? factoryMotion.fontCta ?? DEFAULT_FONTS.cta);
  const [coverSize, setCoverSize] = useState<number>(factoryMotion.coverSize ?? 510);
  const [coverY, setCoverY] = useState<number>(factoryMotion.coverY ?? 0);
  const [coverX, setCoverX] = useState<number>(factoryMotion.coverX ?? 0);
  const [coverMotion, setCoverMotion] = useState<CoverMotionId>(factoryMotion.coverMotion ?? 'zoom_bounce');
  const [coverInFrame, setCoverInFrame] = useState<number>(factoryMotion.coverInFrame ?? defaultCoverInFrameForTemplate('available_now'));
  // ─── Controles do Celular (template spotify_print) ──────
  const [phoneSize, setPhoneSize] = useState<number>(520);
  const [phoneX, setPhoneX] = useState<number>(0);
  const [phoneY, setPhoneY] = useState<number>(0);
  const [phoneTilt, setPhoneTilt] = useState<number>(-6);
  const [phoneMotion, setPhoneMotion] = useState<
    | 'zoom_bounce' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right'
    | 'flip_card' | 'tilt_in_left' | 'tilt_in_right' | 'drop_in' | 'stamp'
    | 'diagonal_tl' | 'diagonal_tr'
  >('zoom_bounce');
  const [phoneSpinTurns, setPhoneSpinTurns] = useState<number>(0);
  const [phoneWiggle, setPhoneWiggle] = useState<number>(0.7);
  const [phoneDynamicIsland, setPhoneDynamicIsland] = useState<boolean>(true);
  const [phoneInFrame, setPhoneInFrame] = useState<number>(factoryMotion.phoneInFrame ?? defaultPhoneInFrameForTemplate('available_now'));
  const [spinTurns, setSpinTurns] = useState<number>(factoryMotion.spinTurns ?? 2);
  const [wiggleIntensity, setWiggleIntensity] = useState<number>(factoryMotion.wiggleIntensity ?? 1);
  const [wiggleH, setWiggleH] = useState<number>(factoryMotion.wiggleHeadline ?? DEFAULT_TEXT_WIGGLE_VALUES.headline);
  const [wiggleD, setWiggleD] = useState<number>(factoryMotion.wiggleDate ?? DEFAULT_TEXT_WIGGLE_VALUES.date);
  const [wiggleC, setWiggleC] = useState<number>(factoryMotion.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta);
  const [wiggleCta1, setWiggleCta1] = useState<number>(factoryMotion.wiggleCta1 ?? factoryMotion.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta1);
  const [wiggleCta2, setWiggleCta2] = useState<number>(factoryMotion.wiggleCta2 ?? factoryMotion.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta2);
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(factoryMotion.particlesEnabled ?? true);
  const [finalFlash, setFinalFlash] = useState<boolean>(factoryMotion.finalFlash ?? true);
  const [glowColor, setGlowColor] = useState<string>(factoryMotion.glowColor ?? GLOW_PRESETS[0].color);

  // Transições
  const [trHeadline, setTrHeadline] = useState<TextTransitionId>(factoryMotion.transitionHeadline ?? 'mask_reveal');
  const [trDate, setTrDate] = useState<TextTransitionId>(factoryMotion.transitionDate ?? 'scale_pop');
  const [trCta, setTrCta] = useState<TextTransitionId>(factoryMotion.transitionCta ?? 'split_letters');
  const [trCta1, setTrCta1] = useState<TextTransitionId>(factoryMotion.transitionCta1 ?? factoryMotion.transitionCta ?? 'scale_pop');
  const [trCta2, setTrCta2] = useState<TextTransitionId>(factoryMotion.transitionCta2 ?? factoryMotion.transitionCta ?? 'split_letters');
  const [transitionTuning, setTransitionTuning] = useState<TextTransitionTuningState>(() =>
    transitionTuningFromMotion(factoryMotion)
  );

  // Estilo de texto (cor + gradiente) por elemento
  const [styleHeadline, setStyleHeadline] = useState<TextStyleState>({
    ...mergeTextStyle(HEADLINE_STYLE_DEFAULTS, factoryMotion.styleHeadline as TextStyle),
  });
  const [styleDate, setStyleDate] = useState<TextStyleState>({
    ...mergeTextStyle(DATE_STYLE_DEFAULTS, factoryMotion.styleDate as TextStyle),
  });
  const [styleCta, setStyleCta] = useState<TextStyleState>({
    ...mergeTextStyle(CTA_STYLE_DEFAULTS, factoryMotion.styleCta as TextStyle),
  });
  const [styleCta1, setStyleCta1] = useState<TextStyleState>({
    ...mergeTextStyle(CTA_STYLE_DEFAULTS, (factoryMotion.styleCta1 ?? factoryMotion.styleCta) as TextStyle),
  });
  const [styleCta2, setStyleCta2] = useState<TextStyleState>({
    ...mergeTextStyle(CTA_STYLE_DEFAULTS, (factoryMotion.styleCta2 ?? factoryMotion.styleCta) as TextStyle),
  });
  const [cta1InFrame, setCta1InFrame] = useState<number>(factoryMotion.cta1InFrame ?? CTA_TIMING_DEFAULTS.cta1InFrame);
  const [ctaSwapFrame, setCtaSwapFrame] = useState<number>(factoryMotion.ctaSwapFrame ?? CTA_TIMING_DEFAULTS.ctaSwapFrame);
  const [cta2InFrame, setCta2InFrame] = useState<number>(factoryMotion.cta2InFrame ?? CTA_TIMING_DEFAULTS.cta2InFrame);
  const [textInFrames, setTextInFrames] = useState<Partial<Record<TextPreviewRole, number>>>({
    headline: factoryMotion.headlineInFrame,
    date: factoryMotion.dateInFrame,
    cta1: factoryMotion.cta1InFrame,
    cta2: factoryMotion.cta2InFrame,
  });
  const [logosInFrame, setLogosInFrame] = useState<number>(factoryMotion.logosInFrame ?? CTA_TIMING_DEFAULTS.logosInFrame);

  const textTimingDefaults = TEXT_IN_FRAME_DEFAULTS_BY_TEMPLATE[template] ?? TEXT_IN_FRAME_DEFAULTS_BY_TEMPLATE.available_now;
  const effectiveTextInFrames: Record<TextPreviewRole, number> = {
    headline: textInFrames.headline ?? textTimingDefaults.headline,
    date: textInFrames.date ?? textTimingDefaults.date,
    cta1: textInFrames.cta1 ?? (template === 'available_now' ? cta1InFrame : textTimingDefaults.cta1),
    cta2: textInFrames.cta2 ?? (template === 'available_now' ? cta2InFrame : textTimingDefaults.cta2),
  };
  const textRoleLabels = useMemo(() => getTextRoleLabels(template), [template]);
  const visibleTextRoles = VISIBLE_TEXT_ROLES_BY_TEMPLATE[template];
  const hasOptionalCta1 = template === 'available_now' || template === 'watch_youtube';
  const hasOptionalCta2 = template === 'available_now';

  // Project settings
  const [durationSeconds, setDurationSeconds] = useState<number>(
    factoryAvailableNow.durationSeconds ?? factoryMotion.durationSeconds ?? 8
  );

  // Capa/poster oficial do arquivo renderizado.
  // O MP4 final pode começar e terminar com esse frame congelado.
  const [posterFrameEnabled, setPosterFrameEnabled] = useState<boolean>(factoryPosterFrame.enabled ?? false);
  const [posterFrameSec, setPosterFrameSec] = useState<number>(factoryPosterFrame.frameSec ?? 3);
  const [posterHoldSec, setPosterHoldSec] = useState<number>(factoryPosterFrame.holdSec ?? 1);
  const [posterOutroEnabled, setPosterOutroEnabled] = useState<boolean>(factoryPosterFrame.outroEnabled ?? true);
  const [bgVideo, setBgVideo] = useState<string>(factoryBackground.videoSrc ?? '');
  const [bgVideoStartSec, setBgVideoStartSec] = useState<number>(
    typeof factoryBackground.videoStartFrame === 'number' ? factoryBackground.videoStartFrame / 30 : 0
  );
  const [bgVideoDuration, setBgVideoDuration] = useState<number>(factoryBackground.videoDurationSec ?? 0);
  const [bgVideoNeedsTrim, setBgVideoNeedsTrim] = useState<boolean>(factoryBackground.videoNeedsTrim ?? false);
  const [bgVideoOriginalName, setBgVideoOriginalName] = useState<string>(factoryBackground.videoOriginalName ?? '');
  const [bgVideoOpacity, setBgVideoOpacity] = useState<number>(factoryBackground.videoOpacity ?? 1);
  const [bgColor, setBgColor] = useState<string>(factoryBackground.bgColor ?? '#030205');
  const [bgVideoBlur, setBgVideoBlur] = useState<number>(factoryBackground.videoBlur ?? 22);
  const [bgVideoSaturation, setBgVideoSaturation] = useState<number>(factoryBackground.videoSaturation ?? 1.15);

  // ─── ÁUDIO ────────────────────────────────────────────────
  const [audioSrc, setAudioSrc] = useState<string>(factoryBackground.audioSrc ?? '');
  const [audioStartSec, setAudioStartSec] = useState<number>(factoryBackground.audioStartSec ?? 0);
  const [audioVolume, setAudioVolume] = useState<number>(factoryBackground.audioVolume ?? 0.8);
  const [audioFadeIn, setAudioFadeIn] = useState<number>(factoryBackground.audioFadeInSec ?? 0.5);
  const [audioFadeOut, setAudioFadeOut] = useState<number>(factoryBackground.audioFadeOutSec ?? 1);
  // Audio do BG ligado por padrao. Toggle vira mute.
  const [useVideoAudio, setUseVideoAudio] = useState<boolean>(factoryBackground.useVideoAudio ?? true);
  const [audioDuration, setAudioDuration] = useState<number>(factoryBackground.audioDurationSec ?? 0);
  const [audioOriginalName, setAudioOriginalName] = useState<string>(factoryBackground.audioOriginalName ?? '');
  const [audioPreviewTime, setAudioPreviewTime] = useState<number>(factoryBackground.audioStartSec ?? 0);
  const [audioStartTimecodeInput, setAudioStartTimecodeInput] = useState('00:00.0');
  const [audioUploadProgress, setAudioUploadProgress] = useState<number | null>(null);
  const [audioUploadMsg, setAudioUploadMsg] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // ─── LOGOS CUSTOMIZADOS POR PLATAFORMA ────────────────────
  const [customLogos, setCustomLogos] = useState<Record<string, string>>(factoryMotion.customLogos ?? {});
  const [platformLogoSize, setPlatformLogoSize] = useState<number>(factoryMotion.platformLogoSize ?? 58);
  const [platformLogoGap, setPlatformLogoGap] = useState<number>(factoryMotion.platformLogoGap ?? 18);
  const [platformLogoScales, setPlatformLogoScales] = useState<Record<string, number>>(factoryMotion.platformLogoScales ?? {});
  const [platformLogoX, setPlatformLogoX] = useState<number>(factoryMotion.platformLogoX ?? 0);
  const [platformLogoY, setPlatformLogoY] = useState<number>(factoryMotion.platformLogoY ?? 0);
  const [milestoneLogoSize, setMilestoneLogoSize] = useState<number>(factoryMotion.milestoneLogoSize ?? 84);
  const [milestoneLogoX, setMilestoneLogoX] = useState<number>(factoryMotion.milestoneLogoX ?? 0);
  const [milestoneLogoY, setMilestoneLogoY] = useState<number>(factoryMotion.milestoneLogoY ?? 0);
  const [platformLogoPack, setPlatformLogoPack] = useState<PlatformLogoPackId>(factoryMotion.platformLogoPack ?? 'round');
  const [platformLogoTintEnabled, setPlatformLogoTintEnabled] = useState<boolean>(factoryMotion.platformLogoTintEnabled ?? false);
  const [platformLogoTintColor, setPlatformLogoTintColor] = useState<string>(factoryMotion.platformLogoTintColor ?? '#ffffff');
  const platformLogoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const effectiveCustomLogos = useMemo(() => {
    const next: Record<string, string> = {};

    for (const platform of allPlatforms) {
      const packed = defaultPlatformLogoForPack(platformLogoPack, platform);
      const selected = customLogos[platform];

      if (packed) next[platform] = packed;
      if (selected && !isFactoryPlatformLogoPath(selected)) next[platform] = selected;
      if (!packed && selected) next[platform] = selected;
    }

    return next;
  }, [customLogos, platformLogoPack]);

  // Overlays
  const [overlayAssets, setOverlayAssets] = useState<OverlayAsset[]>([]);
  const [overlayPresets, setOverlayPresets] = useState<OverlayPresetItem[]>([]);
  const [savingOverlayPreset, setSavingOverlayPreset] = useState(false);
  const [overlays, setOverlays] = useState<OverlayPlacement[]>([]);

  // User fonts
  const [userFonts, setUserFonts] = useState<UserFontRecord[]>([]);
  const [fontSearch, setFontSearch] = useState('');
  const [favoriteFontIds, setFavoriteFontIds] = useState<string[]>([]);

  // ─── ESTADOS DE UI ───────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [rendering, setRendering] = useState(false);
  const [renderMessage, setRenderMessage] = useState('');
  const [renderLog, setRenderLog] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeCycle, setUpgradeCycle] = useState<BillingCycle>('monthly');
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [upgradePixPayment, setUpgradePixPayment] = useState<PixPayment | null>(null);
  const [loadingUpgradePlan, setLoadingUpgradePlan] = useState<string | null>(null);
  const [renderEngine, setRenderEngine] = useState<RenderEngine>(() => {
    if (SAAS_EXPORT_MODE) return 'lambda';
    if (typeof window === 'undefined') return 'desktop';
    const saved = localStorage.getItem('novacena:renderEngine');
    return saved === 'desktop' || saved === 'local' || saved === 'lambda' ? saved : 'desktop';
  });
  const [lambdaOutputUrl, setLambdaOutputUrl] = useState<string | null>(null);
  const [renderFiles, setRenderFiles] = useState<{name: string; size: number; mtime: string}[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [uploadingOverlay, setUploadingOverlay] = useState(false);
  const [overlayUploadProgress, setOverlayUploadProgress] = useState<number | null>(null);
  const [overlayUploadMsg, setOverlayUploadMsg] = useState('');
  const [processingVideoClip, setProcessingVideoClip] = useState(false);
  const [videoUploadMsg, setVideoUploadMsg] = useState('');
  const [bgTrimPreviewTime, setBgTrimPreviewTime] = useState(0);
  const [bgTrimTimecodeInput, setBgTrimTimecodeInput] = useState('00:00.0');
  const [bgVideoLocalAsset, setBgVideoLocalAsset] = useState<LocalAssetRef | null>(
    (factoryBackground.localAsset as LocalAssetRef | undefined) ?? null
  );
  const [activeTab, setActiveTab] = useState<'studio' | 'gallery'>('studio');
  const [studioMode, setStudioMode] = useState<StudioMode>('simple');
  const [typoSubTab, setTypoSubTab] = React.useState<'char'|'layout'>('char');
  const [textPanelTab, setTextPanelTab] = useState<'fontes' | 'entrada' | 'cor' | 'layout'>('fontes');
  const [showArtistModal, setShowArtistModal] = useState(false);

  // ─── Gênero / IA / Template Builder ──────────────────────
  type GenrePreset = {
    id: string;
    label: string;
    description: string;
    accentColor: string;
    config: Record<string, any>;
  };
  type SavedTemplatePreset = {
    id: string;
    name: string;
    config: Record<string, any>;
    createdAt?: number;
    thumbnail?: string;
  };
  const [genrePresets, setGenrePresets] = useState<GenrePreset[]>([]);
  const [activeGenreId, setActiveGenreId] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplatePreset[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiBgBusy, setAiBgBusy] = useState(false);
  const [aiBgMessage, setAiBgMessage] = useState('');
  // Decisões da IA (mostradas no painel pra usuário ver o que foi aplicado)
  type AiDecision = {
    field: string;
    label: string;
    chosen: string;
    applied: boolean;
    reason?: string;
  };
  const [aiDecisions, setAiDecisions] = useState<AiDecision[]>([]);
  const [aiRationale, setAiRationale] = useState('');
  const [aiDecisionsOpen, setAiDecisionsOpen] = useState(false);
  // Pipeline (cascata otimizada Gemini→GPT→Claude)
  type PipelineStep = { stage: string; provider: string; durationMs: number; costEstimateUsd: number; cached: boolean; ok: boolean };
  const [aiPipeline, setAiPipeline] = useState<PipelineStep[]>([]);
  const [aiTotalCost, setAiTotalCost] = useState(0);
  // Referência de motion (PNG/JPG)
  const [aiReferenceUrl, setAiReferenceUrl] = useState<string>('');
  const [aiReferenceAnalysis, setAiReferenceAnalysis] = useState<string>('');
  const [aiReferenceBusy, setAiReferenceBusy] = useState(false);
  const aiReferenceInputRef = useRef<HTMLInputElement | null>(null);
  type AiProviderInfo = { id: string; label: string; available: boolean };
  const [aiProviders, setAiProviders] = useState<AiProviderInfo[]>([]);
  const aiConfigured = aiProviders.some((p) => p.available && p.id !== 'mock');
  const [templateBuilderName, setTemplateBuilderName] = useState('');
  const [templateBuilderBusy, setTemplateBuilderBusy] = useState(false);
  const [templateBuilderMessage, setTemplateBuilderMessage] = useState('');
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(false);

  const playerRef = useRef<any>(null);
  // true logo antes de um seek que NÓS disparamos (seekTo programático),
  // pra distinguir de um clique do usuário na timeline (que deve pausar).
  const programmaticSeekRef = useRef(false);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const lastTextPreviewRoleRef = useRef<TextPreviewRole>('headline');
  const previewDragRef = useRef<{
    layerId: string;
    kind: 'text' | 'cover' | 'phone' | 'logos' | 'element';
    role?: FontRole;
    overlayId?: string;
    mode?: 'move' | 'scale';
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    startScale?: number;
    previewWidth: number;
    previewHeight: number;
    moved: boolean;
  } | null>(null);
  const suppressPreviewClickRef = useRef(false);
  const [editPreviewLoop, setEditPreviewLoop] = useState<EditPreviewLoop | null>(null);
  const [previewDraggingLayerId, setPreviewDraggingLayerId] = useState<string | null>(null);
  const [editingPreviewTextRole, setEditingPreviewTextRole] = useState<FontRole | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [txScale, setTxScale] = React.useState<Record<string,number>>(factoryTextMetrics.scale);
  const [txLS, setTxLS] = React.useState<Record<string,number>>(factoryTextMetrics.letterSpacing);
  const [txLH, setTxLH] = React.useState<Record<string,number>>(factoryTextMetrics.lineHeight);
  const [txOX, setTxOX] = React.useState<Record<string,number>>(factoryTextMetrics.offsetX);
  const [txOY, setTxOY] = React.useState<Record<string,number>>(factoryTextMetrics.offsetY);
  const [txAlign, setTxAlign] = React.useState<Record<string,string>>({
    headline: factoryStyleHeadline.textAlign ?? 'center',
    date: factoryStyleDate.textAlign ?? 'center',
    cta: factoryStyleCta.textAlign ?? 'center',
    cta1: factoryStyleCta1.textAlign ?? 'center',
    cta2: factoryStyleCta2.textAlign ?? 'center',
  } as Record<string,string>);
  function updTxN(setter: React.Dispatch<React.SetStateAction<Record<string,number>>>, key: string, val: number) {
    setter(prev => ({ ...prev, [key]: val }));
  }

  function applyTextMetricsFromStyle(role: string, style?: Record<string, any>) {
    if (!style) return;

    if (typeof style.scale === 'number') setTxScale((prev) => ({ ...prev, [role]: style.scale }));
    if (typeof style.letterSpacing === 'number') setTxLS((prev) => ({ ...prev, [role]: style.letterSpacing }));
    if (typeof style.lineHeight === 'number') setTxLH((prev) => ({ ...prev, [role]: style.lineHeight }));
    if (typeof style.offsetX === 'number') setTxOX((prev) => ({ ...prev, [role]: style.offsetX }));
    if (typeof style.offsetY === 'number') setTxOY((prev) => ({ ...prev, [role]: style.offsetY }));
  }
  function updTxS(setter: React.Dispatch<React.SetStateAction<Record<string,string>>>, key: string, val: string) {
    setter(prev => ({ ...prev, [key]: val }));
  }

  // ── Tipografia avançada ────────────────────────────────────
  const [textTarget, setTextTarget] = React.useState<'headline'|'date'|'cta'>('headline');
  const [headlineLS,     setHeadlineLS]     = React.useState(0);   // letter-spacing em
  const [headlineLH,     setHeadlineLH]     = React.useState(1.1);  // line-height
  const [headlineX,      setHeadlineX]      = React.useState(0);   // offset X %
  const [headlineY,      setHeadlineY]      = React.useState(0);   // offset Y %


  // Progresso do render
  const [renderJobId, setRenderJobId] = React.useState<string | null>(null);
  const [renderProgress, setRenderProgress] = React.useState(0);
  const [renderStatus, setRenderStatus] = React.useState<'idle'|'rendering'|'done'|'error'>('idle');

  React.useEffect(() => {
    if (!renderJobId) return;
    setRenderProgress(0);
    setRenderStatus('rendering');
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/render?jobId=${renderJobId}`);
        const data = await res.json();
        if (data.progress != null) setRenderProgress(Math.round(data.progress * 100));
        if (data.status === 'completed') { setRenderStatus('done'); setRenderProgress(100); clearInterval(interval); }
        else if (data.status === 'error') { setRenderStatus('error'); clearInterval(interval); }
      } catch { clearInterval(interval); }
    }, 800);
    return () => clearInterval(interval);
  }, [renderJobId]);


  // ── Drag & drop na capa ────────────────────────────────────
  const [isCoverDragging, setIsCoverDragging] = React.useState(false);
  React.useEffect(() => {
    function onDragOver(e: DragEvent) { e.preventDefault(); setIsCoverDragging(true); }
    function onDragLeave() { setIsCoverDragging(false); }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      setIsCoverDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && /\.(png|jpe?g|webp)$/i.test(file.name)) {
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('cover-upload-input') as HTMLInputElement | null;
        if (input) {
          Object.defineProperty(input, 'files', { value: dt.files, writable: true });
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);


  // ── Atalho Space: play/pause ──────────────────────────────
  const releaseEditPreviewLoopAndPlayFull = useCallback(() => {
    setEditPreviewLoop(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          programmaticSeekRef.current = true;
          playerRef.current?.seekTo?.(0);
          playerRef.current?.play?.();
        } catch {
          // fallback silencioso
        }
      });
    });
  }, []);

  function restartPlayerFromZero() {
    setEditPreviewLoop(null);

    requestAnimationFrame(() => {
      try {
        programmaticSeekRef.current = true;
        playerRef.current?.seekTo?.(0);
      } catch {
        // fallback silencioso
      }
    });
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const key = e.key.toLowerCase();
      const wantsEditorUndo = (e.metaKey || e.ctrlKey) && key === 'z';

      if (wantsEditorUndo) {
        e.preventDefault();
        if (e.shiftKey) {
          redoEditorAction();
        } else {
          undoEditorAction();
        }
        return;
      }

      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Backslash' || e.key === '\\') {
        e.preventDefault();
        restartPlayerFromZero();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (editPreviewLoop) {
          releaseEditPreviewLoopAndPlayFull();
          return;
        }

        const player = playerRef.current as any;
        if (!player) return;
        if (player.isPlaying?.()) {
          player.pause?.();
        } else {
          player.play?.();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editPreviewLoop, releaseEditPreviewLoopAndPlayFull]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const bgImageInputRef = useRef<HTMLInputElement | null>(null);
  const bgTrimVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgTrimSelectionEndRef = useRef<number | null>(null);
  const bgTrimPreviewCursorRef = useRef(0);
  const bgTrimProgrammaticSeekRef = useRef(false);
  const photoMultiRef = useRef<HTMLInputElement | null>(null);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);

  // ─── EFEITOS ─────────────────────────────────────────────
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!SAAS_EXPORT_MODE) return;
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && data.user) setSaasUser(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!bgVideo || bgVideoDuration <= 0) return;
    const maxStart = Math.max(0, bgVideoNeedsTrim ? bgVideoDuration - Math.min(durationSeconds, MAX_BACKGROUND_CLIP_SECONDS) : bgVideoDuration);
    setBgVideoStartSec((current) => Math.min(current, maxStart));
  }, [bgVideo, bgVideoDuration, bgVideoNeedsTrim, durationSeconds]);

  useEffect(() => {
    setBgTrimTimecodeInput(formatTimecode(bgVideoStartSec));
    if (bgVideoNeedsTrim) setBgTrimPreviewTime(bgVideoStartSec);
  }, [bgVideoStartSec, bgVideoNeedsTrim]);

  // Carregar favoritos de fontes
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('novacena.favoriteFonts');
      if (raw) setFavoriteFontIds(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('novacena.favoriteFonts', JSON.stringify(favoriteFontIds));
    } catch {}
  }, [favoriteFontIds]);

  // Favoritos de fontes
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('novacena.favoriteFontIds');
      if (raw) setFavoriteFontIds(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('novacena.favoriteFontIds', JSON.stringify(favoriteFontIds));
    } catch {}
  }, [favoriteFontIds]);

  // Carregar lista de artistas ao montar
  useEffect(() => {
    fetch('/api/artists')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setArtists(d.artists);
          setActiveSlug((current) => (current && d.artists.some((artist: ArtistRecord) => artist.slug === current) ? current : null));
        }
      });
    // user fonts
    fetch('/api/fonts/upload')
      .then((r) => r.json())
      .then((d) => d.ok && setUserFonts(d.fonts));
    // overlays
    fetch('/api/upload-overlay')
      .then((r) => r.json())
      .then((d) => d.ok && setOverlayAssets(d.overlays));
    loadSavedTemplates();
    // AI providers disponíveis (Anthropic/OpenAI/Gemini com base nas env vars)
    fetch('/api/ai/providers')
      .then((r) => r.json())
      .then((d) => d.ok && setAiProviders(d.providers))
      .catch(() => {});
    // platform logos
    fetch('/api/platform-logos')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const map: Record<string, string> = {};
          for (const l of d.logos) map[l.platform] = l.path;
          setCustomLogos(map);
        }
      });
  }, []);

  // Quando artista muda, carrega galeria + fotos + drive path
  useEffect(() => {
    if (!activeSlug) {
      setGallery([]);
      setPhotos([]);
      setDriveFolderPath('');
      return;
    }
    fetch(`/api/artists/${activeSlug}/gallery`)
      .then((r) => r.json())
      .then((d) => d.ok && setGallery(d.items));
    fetch(`/api/artists/${activeSlug}/photos`)
      .then((r) => r.json())
      .then((d) => d.ok && setPhotos(d.photos));
    fetch(`/api/artists/${activeSlug}`)
      .then((r) => r.json())
      .then((d) => d.ok && setDriveFolderPath(d.artist.driveFolderPath ?? ''));
  }, [activeSlug]);

  // Aplica plano vindo do AI Lab (via /?aiPlan=1 + localStorage.novacena.ai.lastPlan)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // pequeno delay pra evitar hydration mismatch — aplica depois do primeiro paint
    const timer = window.setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('aiPlan') !== '1') return;

    let saved: any = null;
    try {
      const raw = window.localStorage.getItem('novacena.ai.lastPlan');
      if (!raw) return;
      saved = JSON.parse(raw);
    } catch {
      return;
    }

    const plan = saved?.plan;
    if (!plan || typeof plan !== 'object') return;

    // ---- mapeia category -> TemplateId do Studio ----
    // category vem do mock como "spotify_milestone", "spotify_available_now" etc.
    const categoryToTemplate: Record<string, string> = {
      spotify_milestone: 'milestone',
      milestone: 'milestone',
      spotify_available_now: 'available_now',
      available_now: 'available_now',
    };
    const wantedTemplate =
      categoryToTemplate[plan.category as string] ??
      categoryToTemplate[plan.templateId as string] ??
      null;
    if (wantedTemplate) {
      const validTemplates = (templateOrder as readonly string[]) ?? Object.keys(templateLabels ?? {});
      if (validTemplates.includes(wantedTemplate)) {
        switchTemplate(wantedTemplate as TemplateId);
      }
    }

    // ---- target a partir de formats[0] ----
    const firstFormat = Array.isArray(plan.formats) ? plan.formats[0] : null;
    if (firstFormat === 'story' || firstFormat === 'feed' || firstFormat === 'reels') {
      setTarget(firstFormat as RenderTarget);
    } else if (firstFormat === 'square') {
      setTarget('feed' as RenderTarget);
    }

    if (typeof plan.durationSeconds === 'number' && plan.durationSeconds > 0 && plan.durationSeconds <= 60) {
      setDurationSeconds(plan.durationSeconds);
    }

    // ---- textos (vêm dentro de plan.texts) ----
    const texts = plan.texts ?? {};
    if (typeof texts.headline === 'string') setHeadline(texts.headline);
    if (typeof texts.number === 'string') setMetricNumber(texts.number);
    if (typeof texts.label === 'string') setMetricLabel(texts.label);
    if (typeof texts.title === 'string') setMetricPrefix(texts.title);

    // platform é string única; transformamos em array de uma posição
    if (typeof texts.platform === 'string' && texts.platform.trim()) {
      setPlatformsSel([texts.platform as PlatformName]);
    }

    // ---- cores (vêm dentro de plan.style) ----
    const style = plan.style ?? {};
    if (typeof style.backgroundColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(style.backgroundColor)) {
      setBgColor(style.backgroundColor);
    }
    if (typeof style.primaryColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(style.primaryColor)) {
      setGlowColor(style.primaryColor);
    }

    // ---- motion (vêm dentro de plan.motion) ----
    const motion = plan.motion ?? {};
    if (typeof motion.coverMotion === 'string') {
      setCoverMotion(normalizeCoverMotionId(motion.coverMotion));
    }

    setActiveStudioTool('cover');
    setSaveMessage('Plano IA aplicado no Studio');

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('aiPlan');
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Aplica os textos/toggles de fábrica de UM template específico.
  // Usado na montagem inicial e na PRIMEIRA vez que cada template é aberto.
  // NÃO é chamado em toda troca — switchTemplate salva/restaura a config
  // de cada template independentemente (ver switchTemplate).
  function applyTemplateContentDefaults(tid: TemplateId) {
    const next = getProject(tid) as ReturnType<typeof getProject> & { showCta1?: boolean; showCta2?: boolean; showCover?: boolean };
    setHeadline(next.headline);
    setReleaseDate(next.releaseDate ?? '');
    setCta(next.cta);
    setCta2(next.cta2 ?? next.cta ?? '');
    setShowCta1(next.showCta1 ?? true);
    setShowCta2(next.showCta2 ?? (tid === 'available_now'));
    setShowCover(next.showCover ?? true);
    setChannelName(next.channelName ?? '');
    setMetricPrefix(next.metricPrefix ?? 'ULTRAPASSAMOS');
    setMetricNumber(next.metricNumber ?? '100.000');
    setMetricLabel(next.metricLabel ?? 'OUVINTES');
  }

  // Aplica defaults APENAS na montagem inicial (template inicial = available_now).
  // Trocas posteriores são geridas por switchTemplate (save/restore por template),
  // que mantém cada template totalmente independente.
  const didApplyInitialTemplateRef = useRef(false);
  useEffect(() => {
    if (didApplyInitialTemplateRef.current) return;
    didApplyInitialTemplateRef.current = true;
    applyTemplateContentDefaults(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // Carregar arquivos renderizados ao montar
  useEffect(() => {
    fetch('/api/render-files').then(r => r.json()).then(d => setRenderFiles(d.files ?? []));
  }, []);

  // ─── COMPUTED ────────────────────────────────────────────
  const allFonts: FontDef[] = useMemo(
    () => {
      const user = userFonts.map(userFontToFontDef);
      const merged = [...FONT_CATALOG, ...user];
      const seen = new Set<string>();
      return merged.filter((f) => {
        const labelKey = String(f.label || f.family || f.id)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\.(otf|ttf|woff2?|eot)$/g, '')
          .replace(/\b(regular|normal)\b/g, '')
          .replace(/[^a-z0-9]+/g, '');
        const familyKey = String(f.family || '')
          .toLowerCase()
          .replace(/^user_/, '')
          .replace(/[^a-z0-9]+/g, '');
        const key = `${labelKey || familyKey}:${f.weight ?? ''}`;
        if (seen.has(f.id) || seen.has(key)) return false;
        seen.add(f.id);
        seen.add(key);
        return true;
      });
    },
    [userFonts]
  );

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    if (!q) return allFonts;
    return allFonts.filter((f) =>
      [f.label, f.family, f.vibe, f.category, f.id].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [allFonts, fontSearch]);



  const fontSearchResults = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();

    const base = allFonts.filter((font) => {
      if (!q) return favoriteFontIds.includes(font.id);
      return [font.label, font.family, font.vibe, font.category, font.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    return base.slice(0, 18);
  }, [allFonts, fontSearch, favoriteFontIds]);
  // ── FONTES: helpers únicos ─────────────────────────────
  const findFont = (id: string) =>
    allFonts.find((f) => f.id === id) ?? allFonts[0];

  const currentFontHeadline = useMemo(() => findFont(fontHeadline), [allFonts, fontHeadline]);
  const currentFontDate = useMemo(() => findFont(fontDate), [allFonts, fontDate]);
  const currentFontCta = useMemo(() => findFont(fontCta), [allFonts, fontCta]);

  const favoriteFonts = useMemo(
    () => allFonts.filter((f) => favoriteFontIds.includes(f.id)).slice(0, 24),
    [allFonts, favoriteFontIds]
  );

  function toggleFavoriteFont(id: string) {
    setFavoriteFontIds((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [id, ...arr]
    );
  }

  async function applyFontTo(role: FontRole, id: string) {
    stopTransitionPreviewLoopForManualEdit();

    if (role === 'headline') {
      setFontHeadline(id);
      return;
    }

    if (role === 'date') {
      setFontDate(id);
      return;
    }

    if (role === 'cta') {
      setFontCta(id);
      setFontCta1(id);
      setFontCta2(id);
      return;
    }

    if (role === 'cta1') {
      // Só altera o slot do CTA1 — não toca no fontCta compartilhado,
      // senão a mudança vazaria para o CTA2.
      setFontCta1(id);
      return;
    }

    if (role === 'cta2') {
      // Só altera o slot do CTA2 — independente do CTA1.
      setFontCta2(id);
      return;
    }
  }

  // Estilos locais do painel de fontes
  const fontInputStyle: React.CSSProperties = {
    width: '100%',
    height: 38,
    borderRadius: 10,
    border: '1px solid var(--border-1)',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text)',
    padding: '0 12px',
    outline: 'none',
    fontSize: 13,
  };
  const smallBtn: React.CSSProperties = {
    height: 28,
    padding: '0 8px',
    borderRadius: 8,
    border: '1px solid var(--border-1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text)',
    fontSize: 11,
    cursor: 'pointer',
  };


  const defaultTextStroke = {
    mode: 'none' as const,
    width: 0,
    fillKind: 'solid' as const,
    color: '#f5c451',
    gradientFrom: '#f5c451',
    gradientTo: '#ffffff',
    gradientAngle: 90,
    opacity: 1,
    fillOpacity: 1,
  };
  const textStrokeFromFactory = (stroke?: Record<string, any>) => ({ ...defaultTextStroke, ...(stroke ?? {}) });

  const [strokeHeadline, setStrokeHeadline] = useState(textStrokeFromFactory(factoryMotion.strokeHeadline));
  const [strokeDate, setStrokeDate] = useState(textStrokeFromFactory(factoryMotion.strokeDate));
  const [strokeCta, setStrokeCta] = useState(textStrokeFromFactory(factoryMotion.strokeCta));
  const [strokeCta1, setStrokeCta1] = useState(textStrokeFromFactory(factoryMotion.strokeCta1 ?? factoryMotion.strokeCta));
  const [strokeCta2, setStrokeCta2] = useState(textStrokeFromFactory(factoryMotion.strokeCta2 ?? factoryMotion.strokeCta));
  const [textOpacity, setTextOpacity] = useState(factoryMotion.textOpacity ?? 1);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [measuredPreviewRects, setMeasuredPreviewRects] = useState<Record<string, React.CSSProperties>>({});
  const measuredPreviewRectsKeyRef = useRef('');
  const undoHistoryRef = useRef<EditorHistorySnapshot[]>([]);
  const redoHistoryRef = useRef<EditorHistorySnapshot[]>([]);
  const currentEditorSnapshotRef = useRef<EditorHistorySnapshot | null>(null);
  const lastHistorySerializedRef = useRef('');
  const historyTimerRef = useRef<number | null>(null);
  const isRestoringHistoryRef = useRef(false);

  // ─── CONFIGS ISOLADAS POR TEMPLATE ──────────────────────────
  // Cada template salva seu próprio snapshot quando o usuário troca.
  // Assim, alterar PRÉ-SAVE não afeta DISPONÍVEL e vice-versa.
  const templateConfigsRef = useRef<Partial<Record<TemplateId, EditorHistorySnapshot>>>({});
  const sharedBackgroundVideoRef = useRef<SharedBackgroundVideoPatch | null>(null);
  const sharedAudioRef = useRef<SharedAudioPatch | null>(null);

  function switchTemplate(nextId: TemplateId) {
    if (nextId === template) return;
    // Salva o estado atual no slot do template corrente
    templateConfigsRef.current[template] = cloneHistoryValue(createEditorSnapshot());
    // Carrega o estado salvo do próximo template (se existir)
    const saved = templateConfigsRef.current[nextId];
    if (saved) {
      // Revisita: restaura a config independente salva desse template
      restoreEditorSnapshot({ ...saved, template: nextId });
    } else {
      // Primeira abertura: aplica os defaults de fábrica do template
      setTemplate(nextId);
      applyFactoryTemplateDefaults(nextId);
    }
    setPreviewNonce((n) => n + 1);
  }

  function applyFactoryTemplateDefaults(tid: TemplateId) {
    const next = getProject(tid) as ReturnType<typeof getProject> & Record<string, any> & {
      showCta1?: boolean;
      showCta2?: boolean;
      showCover?: boolean;
    };
    const m = (next.motion ?? {}) as MotionConfig & Record<string, any>;
    const bg = ((m as any).background ?? {}) as Record<string, any>;
    const poster = (next.posterFrame ?? {}) as Record<string, any>;

    setActiveStudioTool('cover');
    setActiveTextRole('headline');
    setLayoutPreset(typeof m.layoutPreset === 'string' ? m.layoutPreset : '');
    setTarget((next.target ?? next.renderTarget ?? 'story') as RenderTarget);
    setShowSafeArea(false);
    setReleaseDate(next.releaseDate ?? '');
    setHeadline(next.headline ?? templateLabels[tid]);
    setCta(next.cta ?? '');
    setCta2(next.cta2 ?? next.cta ?? '');
    setShowCta1(next.showCta1 ?? true);
    setShowCta2(next.showCta2 ?? (tid === 'available_now'));
    setShowCover(next.showCover ?? true);
    setChannelName(next.channelName ?? '');
    setMetricPrefix(next.metricPrefix ?? 'ULTRAPASSAMOS');
    setMetricNumber(next.metricNumber ?? '100.000');
    setMetricLabel(next.metricLabel ?? 'OUVINTES');
    setPlatformsSel(cloneHistoryValue((next.platforms ?? ['Spotify', 'Deezer', 'Apple Music', 'YouTube Music']) as PlatformName[]));

    setFontHeadline(m.fontHeadline ?? DEFAULT_FONTS.headline);
    setFontDate(m.fontDate ?? DEFAULT_FONTS.date);
    setFontCta(m.fontCta ?? DEFAULT_FONTS.cta);
    setFontCta1(m.fontCta1 ?? m.fontCta ?? DEFAULT_FONTS.cta);
    setFontCta2(m.fontCta2 ?? m.fontCta ?? DEFAULT_FONTS.cta);
    setCoverSize(m.coverSize ?? 510);
    setCoverY(m.coverY ?? 0);
    setCoverX(m.coverX ?? 0);
    setCoverMotion(normalizeCoverMotionId(m.coverMotion ?? 'zoom_bounce'));
    setCoverInFrame(m.coverInFrame ?? defaultCoverInFrameForTemplate(tid));
    setPhoneInFrame(m.phoneInFrame ?? defaultPhoneInFrameForTemplate(tid));
    setSpinTurns(m.spinTurns ?? 2);
    setWiggleIntensity(m.wiggleIntensity ?? 1);
    setWiggleH(m.wiggleHeadline ?? DEFAULT_TEXT_WIGGLE_VALUES.headline);
    setWiggleD(m.wiggleDate ?? DEFAULT_TEXT_WIGGLE_VALUES.date);
    setWiggleC(m.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta);
    setWiggleCta1(m.wiggleCta1 ?? m.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta1);
    setWiggleCta2(m.wiggleCta2 ?? m.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta2);
    setParticlesEnabled(m.particlesEnabled ?? true);
    setFinalFlash(m.finalFlash ?? true);
    setGlowColor(m.glowColor ?? GLOW_PRESETS[0].color);
    setTrHeadline(m.transitionHeadline ?? 'mask_reveal');
    setTrDate(m.transitionDate ?? 'scale_pop');
    setTrCta(m.transitionCta ?? 'split_letters');
    setTrCta1(m.transitionCta1 ?? m.transitionCta ?? 'scale_pop');
    setTrCta2(m.transitionCta2 ?? m.transitionCta ?? 'split_letters');
    setTransitionTuning(transitionTuningFromMotion(m));
    setStyleHeadline(mergeTextStyle(HEADLINE_STYLE_DEFAULTS, m.styleHeadline as TextStyle));
    setStyleDate(mergeTextStyle(DATE_STYLE_DEFAULTS, m.styleDate as TextStyle));
    setStyleCta(mergeTextStyle(CTA_STYLE_DEFAULTS, m.styleCta as TextStyle));
    setStyleCta1(mergeTextStyle(CTA_STYLE_DEFAULTS, (m.styleCta1 ?? m.styleCta) as TextStyle));
    setStyleCta2(mergeTextStyle(CTA_STYLE_DEFAULTS, (m.styleCta2 ?? m.styleCta) as TextStyle));
    applyTextMetricsFromStyle('headline', m.styleHeadline);
    applyTextMetricsFromStyle('date', m.styleDate);
    applyTextMetricsFromStyle('cta', m.styleCta);
    applyTextMetricsFromStyle('cta1', m.styleCta1 ?? m.styleCta);
    applyTextMetricsFromStyle('cta2', m.styleCta2 ?? m.styleCta);
    setStrokeHeadline(textStrokeFromFactory(m.strokeHeadline));
    setStrokeDate(textStrokeFromFactory(m.strokeDate));
    setStrokeCta(textStrokeFromFactory(m.strokeCta));
    setStrokeCta1(textStrokeFromFactory(m.strokeCta1 ?? m.strokeCta));
    setStrokeCta2(textStrokeFromFactory(m.strokeCta2 ?? m.strokeCta));
    setTextOpacity(m.textOpacity ?? 1);
    setCta1InFrame(m.cta1InFrame ?? CTA_TIMING_DEFAULTS.cta1InFrame);
    setCtaSwapFrame(m.ctaSwapFrame ?? CTA_TIMING_DEFAULTS.ctaSwapFrame);
    setCta2InFrame(m.cta2InFrame ?? CTA_TIMING_DEFAULTS.cta2InFrame);
    setTextInFrames({
      headline: typeof m.headlineInFrame === 'number' ? m.headlineInFrame : undefined,
      date: typeof m.dateInFrame === 'number' ? m.dateInFrame : undefined,
      cta1: typeof m.cta1InFrame === 'number' ? m.cta1InFrame : undefined,
      cta2: typeof m.cta2InFrame === 'number' ? m.cta2InFrame : undefined,
    });
    setLogosInFrame(m.logosInFrame ?? CTA_TIMING_DEFAULTS.logosInFrame);
    setDurationSeconds(next.durationSeconds ?? m.durationSeconds ?? 60);
    setPosterFrameEnabled(Boolean(poster.enabled));
    setPosterFrameSec(poster.frameSec ?? 3);
    setPosterHoldSec(poster.holdSec ?? 1);
    setPosterOutroEnabled(poster.outroEnabled ?? true);
    setBgVideo('');
    setBgVideoStartSec(typeof bg.videoStartFrame === 'number' ? bg.videoStartFrame / 30 : 0);
    setBgVideoDuration(0);
    setBgVideoOpacity(bg.videoOpacity ?? 1);
    setBgColor(bg.bgColor ?? '#030205');
    setBgVideoBlur(bg.videoBlur ?? 22);
    setBgVideoSaturation(bg.videoSaturation ?? 1.15);
    setAudioSrc('');
    setAudioStartSec(bg.audioStartSec ?? 0);
    setAudioVolume(bg.audioVolume ?? 0.8);
    setAudioFadeIn(bg.audioFadeInSec ?? 0.5);
    setAudioFadeOut(bg.audioFadeOutSec ?? 1);
    setAudioDuration(bg.audioDurationSec ?? 0);
    setAudioOriginalName(bg.audioOriginalName ?? '');
    setAudioPreviewTime(bg.audioStartSec ?? 0);
    setAudioStartTimecodeInput(formatTimecode(bg.audioStartSec ?? 0));
    setUseVideoAudio(bg.useVideoAudio ?? true);
    setPlatformLogoPack((m.platformLogoPack ?? 'round') as PlatformLogoPackId);
    setCustomLogos(m.customLogos ?? {});
    setPlatformLogoSize(m.platformLogoSize ?? 89);
    setPlatformLogoGap(m.platformLogoGap ?? 22);
    setPlatformLogoScales(m.platformLogoScales ?? {});
    setPlatformLogoX(m.platformLogoX ?? 0);
    setPlatformLogoY(m.platformLogoY ?? 0);
    setMilestoneLogoSize(m.milestoneLogoSize ?? 84);
    setMilestoneLogoX(m.milestoneLogoX ?? 0);
    setMilestoneLogoY(m.milestoneLogoY ?? 0);
    setPlatformLogoTintEnabled(m.platformLogoTintEnabled ?? false);
    setPlatformLogoTintColor(m.platformLogoTintColor ?? '#ffffff');
    setOverlays(cloneHistoryValue(m.overlays ?? []));

    if (sharedBackgroundVideoRef.current) {
      applyBackgroundVideoPatchToState(sharedBackgroundVideoRef.current);
    }
    if (sharedAudioRef.current) {
      applyAudioPatchToState(sharedAudioRef.current);
    }
  }

  function backgroundVideoSnapshotPatch(patch: SharedBackgroundVideoPatch): EditorHistorySnapshot {
    return {
      bgVideo: patch.bgVideo,
      bgVideoStartSec: patch.bgVideoStartSec,
      bgVideoDuration: patch.bgVideoDuration,
      bgVideoNeedsTrim: patch.bgVideoNeedsTrim,
      bgVideoOriginalName: patch.bgVideoOriginalName,
      bgVideoLocalAsset: cloneHistoryValue(patch.bgVideoLocalAsset),
      bgVideoOpacity: patch.bgVideoOpacity,
      bgVideoBlur: patch.bgVideoBlur,
      bgVideoSaturation: patch.bgVideoSaturation,
      useVideoAudio: patch.useVideoAudio,
    };
  }

  function audioSnapshotPatch(patch: SharedAudioPatch): EditorHistorySnapshot {
    return {
      audioSrc: patch.audioSrc,
      audioDuration: patch.audioDuration,
      audioOriginalName: patch.audioOriginalName,
      audioStartSec: patch.audioStartSec,
      audioVolume: patch.audioVolume,
      audioFadeIn: patch.audioFadeIn,
      audioFadeOut: patch.audioFadeOut,
      useVideoAudio: patch.useVideoAudio,
    };
  }

  function patchSavedTemplateSnapshots(patch: EditorHistorySnapshot) {
    for (const templateId of templateOrder) {
      if (templateId === template) continue;
      const saved = templateConfigsRef.current[templateId];
      if (!saved) continue;
      templateConfigsRef.current[templateId] = cloneHistoryValue({
        ...saved,
        ...patch,
      });
    }
  }

  function applyBackgroundVideoPatchToState(patch: SharedBackgroundVideoPatch) {
    setBgVideo(patch.bgVideo);
    setBgVideoStartSec(patch.bgVideoStartSec);
    setBgTrimPreviewTime(patch.bgVideoStartSec);
    setBgTrimTimecodeInput(formatTimecode(patch.bgVideoStartSec));
    setBgVideoDuration(patch.bgVideoDuration);
    setBgVideoNeedsTrim(patch.bgVideoNeedsTrim);
    setBgVideoOriginalName(patch.bgVideoOriginalName);
    setBgVideoLocalAsset(cloneHistoryValue(patch.bgVideoLocalAsset));
    setBgVideoOpacity(patch.bgVideoOpacity);
    setBgVideoBlur(patch.bgVideoBlur);
    setBgVideoSaturation(patch.bgVideoSaturation);
    setUseVideoAudio(patch.useVideoAudio);
  }

  function shareBackgroundVideoWithTemplates(patch: SharedBackgroundVideoPatch) {
    const cleanPatch = cloneHistoryValue(patch);
    sharedBackgroundVideoRef.current = cleanPatch;
    patchSavedTemplateSnapshots(backgroundVideoSnapshotPatch(cleanPatch));
  }

  function applyAudioPatchToState(patch: SharedAudioPatch) {
    setAudioSrc(patch.audioSrc);
    setAudioDuration(patch.audioDuration);
    setAudioOriginalName(patch.audioOriginalName);
    setAudioStartSec(patch.audioStartSec);
    setAudioPreviewTime(patch.audioStartSec);
    setAudioStartTimecodeInput(formatTimecode(patch.audioStartSec));
    setAudioVolume(patch.audioVolume);
    setAudioFadeIn(patch.audioFadeIn);
    setAudioFadeOut(patch.audioFadeOut);
    setUseVideoAudio(patch.useVideoAudio);
  }

  function shareAudioWithTemplates(patch: SharedAudioPatch) {
    const cleanPatch = cloneHistoryValue(patch);
    sharedAudioRef.current = cleanPatch;
    patchSavedTemplateSnapshots(audioSnapshotPatch(cleanPatch));
  }

  function backgroundOverrideFromPatch(patch: SharedBackgroundVideoPatch): Partial<NonNullable<MotionConfig['background']>> {
    return {
      videoSrc: patch.bgVideo || undefined,
      mediaType: 'video',
      videoStartFrame: Math.floor(patch.bgVideoStartSec * 30),
      videoDurationSec: patch.bgVideoDuration || undefined,
      videoNeedsTrim: patch.bgVideoNeedsTrim || undefined,
      videoOriginalName: patch.bgVideoOriginalName || undefined,
      localAsset: patch.bgVideoLocalAsset ?? undefined,
      videoOpacity: patch.bgVideoOpacity,
      videoBlur: patch.bgVideoBlur,
      videoSaturation: patch.bgVideoSaturation,
      useVideoAudio: patch.useVideoAudio,
    };
  }

  function createEditorSnapshot(): EditorHistorySnapshot {
    return cloneHistoryValue({
      activeStudioTool,
      activeTextRole,
      template,
      layoutPreset,
      target,
      showSafeArea,
      releaseDate,
      coverImage,
      headline,
      cta,
      cta2,
      showCta1,
      showCta2,
      showCover,
      channelName,
      metricPrefix,
      metricNumber,
      metricLabel,
      platformsSel,
      fontHeadline,
      fontDate,
      fontCta,
      fontCta1,
      fontCta2,
      coverSize,
      coverY,
      coverX,
      coverMotion,
      coverInFrame,
      phoneSize,
      phoneX,
      phoneY,
      phoneTilt,
      phoneMotion,
      phoneSpinTurns,
      phoneWiggle,
      phoneDynamicIsland,
      phoneInFrame,
      spinTurns,
      wiggleIntensity,
      wiggleH,
      wiggleD,
      wiggleC,
      wiggleCta1,
      wiggleCta2,
      particlesEnabled,
      finalFlash,
      glowColor,
      trHeadline,
      trDate,
      trCta,
      trCta1,
      trCta2,
      transitionTuning,
      styleHeadline,
      styleDate,
      styleCta,
      styleCta1,
      styleCta2,
      strokeHeadline,
      strokeDate,
      strokeCta,
      strokeCta1,
      strokeCta2,
      textOpacity,
      cta1InFrame,
      ctaSwapFrame,
      cta2InFrame,
      textInFrames,
      logosInFrame,
      durationSeconds,
      posterFrameEnabled,
      posterFrameSec,
      posterHoldSec,
      posterOutroEnabled,
      bgVideo,
      bgVideoStartSec,
      bgVideoDuration,
      bgVideoNeedsTrim,
      bgVideoOriginalName,
      bgVideoLocalAsset,
      bgVideoOpacity,
      bgColor,
      bgVideoBlur,
      bgVideoSaturation,
      audioSrc,
      audioStartSec,
      audioVolume,
      audioFadeIn,
      audioFadeOut,
      audioDuration,
      audioOriginalName,
      useVideoAudio,
      customLogos,
      platformLogoSize,
      platformLogoGap,
      platformLogoScales,
      platformLogoX,
      platformLogoY,
      milestoneLogoSize,
      milestoneLogoX,
      milestoneLogoY,
      platformLogoPack,
      platformLogoTintEnabled,
      platformLogoTintColor,
      overlays,
      favoriteFontIds,
      studioMode,
      typoSubTab,
      textPanelTab,
      txScale,
      txLS,
      txLH,
      txOX,
      txOY,
      txAlign,
      textTarget,
      headlineLS,
      headlineLH,
      headlineX,
      headlineY,
    });
  }

  function clearPendingHistoryTimer() {
    if (historyTimerRef.current == null) return;
    window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
  }

  function restoreEditorSnapshot(snapshot: EditorHistorySnapshot) {
    clearPendingHistoryTimer();
    isRestoringHistoryRef.current = true;
    currentEditorSnapshotRef.current = cloneHistoryValue(snapshot);
    lastHistorySerializedRef.current = serializeEditorSnapshot(snapshot);

    const snapshotTemplate = (snapshot.template ?? 'available_now') as TemplateId;

    setEditPreviewLoop(null);
    setActiveStudioTool((snapshot.activeStudioTool ?? 'cover') as StudioToolId);
    setActiveTextRole((snapshot.activeTextRole ?? 'headline') as FontRole);
    setTemplate(snapshotTemplate);
    setLayoutPreset(typeof snapshot.layoutPreset === 'string' ? snapshot.layoutPreset : '');
    setTarget((snapshot.target ?? 'story') as RenderTarget);
    setShowSafeArea(Boolean(snapshot.showSafeArea));
    setReleaseDate(snapshot.releaseDate ?? '');
    setCoverImage(snapshot.coverImage ?? '');
    setHeadline(snapshot.headline ?? '');
    setCta(snapshot.cta ?? '');
    setCta2(snapshot.cta2 ?? '');
    setShowCta1(snapshot.showCta1 ?? true);
    setShowCta2(snapshot.showCta2 ?? true);
    setShowCover(snapshot.showCover ?? true);
    setChannelName(snapshot.channelName ?? '');
    setMetricPrefix(snapshot.metricPrefix ?? 'ULTRAPASSAMOS');
    setMetricNumber(snapshot.metricNumber ?? '100.000');
    setMetricLabel(snapshot.metricLabel ?? 'OUVINTES');
    setPlatformsSel(cloneHistoryValue(snapshot.platformsSel ?? []));
    setFontHeadline(snapshot.fontHeadline ?? DEFAULT_FONTS.headline);
    setFontDate(snapshot.fontDate ?? DEFAULT_FONTS.date);
    setFontCta(snapshot.fontCta ?? DEFAULT_FONTS.cta);
    setFontCta1(snapshot.fontCta1 ?? DEFAULT_FONTS.cta);
    setFontCta2(snapshot.fontCta2 ?? DEFAULT_FONTS.cta);
    setCoverSize(snapshot.coverSize ?? 510);
    setCoverY(snapshot.coverY ?? 0);
    setCoverX(snapshot.coverX ?? 0);
    setCoverMotion(normalizeCoverMotionId(snapshot.coverMotion));
    setCoverInFrame(snapshot.coverInFrame ?? defaultCoverInFrameForTemplate(snapshotTemplate));
    setPhoneSize(snapshot.phoneSize ?? 520);
    setPhoneX(snapshot.phoneX ?? 0);
    setPhoneY(snapshot.phoneY ?? 0);
    setPhoneTilt(snapshot.phoneTilt ?? -6);
    setPhoneMotion((snapshot.phoneMotion ?? 'zoom_bounce') as typeof phoneMotion);
    setPhoneSpinTurns(snapshot.phoneSpinTurns ?? 0);
    setPhoneWiggle(snapshot.phoneWiggle ?? 0.7);
    setPhoneDynamicIsland(snapshot.phoneDynamicIsland ?? true);
    setPhoneInFrame(snapshot.phoneInFrame ?? defaultPhoneInFrameForTemplate(snapshotTemplate));
    setSpinTurns(snapshot.spinTurns ?? 2);
    setWiggleIntensity(snapshot.wiggleIntensity ?? 1);
    setWiggleH(snapshot.wiggleH ?? DEFAULT_TEXT_WIGGLE_VALUES.headline);
    setWiggleD(snapshot.wiggleD ?? DEFAULT_TEXT_WIGGLE_VALUES.date);
    setWiggleC(snapshot.wiggleC ?? DEFAULT_TEXT_WIGGLE_VALUES.cta);
    setWiggleCta1(snapshot.wiggleCta1 ?? snapshot.wiggleC ?? DEFAULT_TEXT_WIGGLE_VALUES.cta1);
    setWiggleCta2(snapshot.wiggleCta2 ?? snapshot.wiggleC ?? DEFAULT_TEXT_WIGGLE_VALUES.cta2);
    setParticlesEnabled(snapshot.particlesEnabled ?? true);
    setFinalFlash(snapshot.finalFlash ?? true);
    setGlowColor(snapshot.glowColor ?? GLOW_PRESETS[0].color);
    setTrHeadline((snapshot.trHeadline ?? 'mask_reveal') as TextTransitionId);
    setTrDate((snapshot.trDate ?? 'scale_pop') as TextTransitionId);
    setTrCta((snapshot.trCta ?? 'split_letters') as TextTransitionId);
    setTrCta1((snapshot.trCta1 ?? 'scale_pop') as TextTransitionId);
    setTrCta2((snapshot.trCta2 ?? 'split_letters') as TextTransitionId);
    setTransitionTuning(normalizeTransitionTuningState(snapshot.transitionTuning));
    setStyleHeadline(cloneHistoryValue(mergeTextStyle(HEADLINE_STYLE_DEFAULTS, snapshot.styleHeadline as TextStyle)));
    setStyleDate(cloneHistoryValue(mergeTextStyle(DATE_STYLE_DEFAULTS, snapshot.styleDate as TextStyle)));
    setStyleCta(cloneHistoryValue(mergeTextStyle(CTA_STYLE_DEFAULTS, snapshot.styleCta as TextStyle)));
    setStyleCta1(cloneHistoryValue(mergeTextStyle(CTA_STYLE_DEFAULTS, snapshot.styleCta1 as TextStyle)));
    setStyleCta2(cloneHistoryValue(mergeTextStyle(CTA_STYLE_DEFAULTS, snapshot.styleCta2 as TextStyle)));
    setStrokeHeadline(cloneHistoryValue(snapshot.strokeHeadline ?? defaultTextStroke));
    setStrokeDate(cloneHistoryValue(snapshot.strokeDate ?? defaultTextStroke));
    setStrokeCta(cloneHistoryValue(snapshot.strokeCta ?? defaultTextStroke));
    setStrokeCta1(cloneHistoryValue(snapshot.strokeCta1 ?? defaultTextStroke));
    setStrokeCta2(cloneHistoryValue(snapshot.strokeCta2 ?? defaultTextStroke));
    setTextOpacity(snapshot.textOpacity ?? 1);
    setCta1InFrame(snapshot.cta1InFrame ?? CTA_TIMING_DEFAULTS.cta1InFrame);
    setCtaSwapFrame(snapshot.ctaSwapFrame ?? CTA_TIMING_DEFAULTS.ctaSwapFrame);
    setCta2InFrame(snapshot.cta2InFrame ?? CTA_TIMING_DEFAULTS.cta2InFrame);
    setTextInFrames(cloneHistoryValue(snapshot.textInFrames ?? {}));
    setLogosInFrame(snapshot.logosInFrame ?? CTA_TIMING_DEFAULTS.logosInFrame);
    setDurationSeconds(snapshot.durationSeconds ?? 8);
    setPosterFrameEnabled(Boolean(snapshot.posterFrameEnabled));
    setPosterFrameSec(snapshot.posterFrameSec ?? 3);
    setPosterHoldSec(snapshot.posterHoldSec ?? 1);
    setPosterOutroEnabled(snapshot.posterOutroEnabled ?? true);
    setBgVideo(snapshot.bgVideo ?? '');
    setBgVideoStartSec(snapshot.bgVideoStartSec ?? 0);
    setBgVideoDuration(snapshot.bgVideoDuration ?? 0);
    setBgVideoOpacity(snapshot.bgVideoOpacity ?? 1);
    setBgColor(snapshot.bgColor ?? '#030205');
    setBgVideoBlur(snapshot.bgVideoBlur ?? 22);
    setBgVideoSaturation(snapshot.bgVideoSaturation ?? 1.15);
    setAudioSrc(snapshot.audioSrc ?? '');
    setAudioStartSec(snapshot.audioStartSec ?? 0);
    setAudioVolume(snapshot.audioVolume ?? 0.8);
    setAudioFadeIn(snapshot.audioFadeIn ?? 0.5);
    setAudioFadeOut(snapshot.audioFadeOut ?? 1);
    setAudioDuration(snapshot.audioDuration ?? 0);
    setAudioOriginalName(snapshot.audioOriginalName ?? '');
    setAudioPreviewTime(snapshot.audioStartSec ?? 0);
    setAudioStartTimecodeInput(formatTimecode(snapshot.audioStartSec ?? 0));
    setUseVideoAudio(snapshot.useVideoAudio ?? true);
    setCustomLogos(cloneHistoryValue(snapshot.customLogos ?? {}));
    setPlatformLogoSize(snapshot.platformLogoSize ?? 58);
    setPlatformLogoGap(snapshot.platformLogoGap ?? 18);
    setPlatformLogoScales(cloneHistoryValue(snapshot.platformLogoScales ?? {}));
    setPlatformLogoX(snapshot.platformLogoX ?? 0);
    setPlatformLogoY(snapshot.platformLogoY ?? 0);
    setMilestoneLogoSize(snapshot.milestoneLogoSize ?? 84);
    setMilestoneLogoX(snapshot.milestoneLogoX ?? 0);
    setMilestoneLogoY(snapshot.milestoneLogoY ?? 0);
    setPlatformLogoPack((snapshot.platformLogoPack ?? 'round') as PlatformLogoPackId);
    setPlatformLogoTintEnabled(snapshot.platformLogoTintEnabled ?? false);
    setPlatformLogoTintColor(snapshot.platformLogoTintColor ?? '#ffffff');
    setOverlays(cloneHistoryValue(snapshot.overlays ?? []));
    setFavoriteFontIds(cloneHistoryValue(snapshot.favoriteFontIds ?? []));
    setStudioMode((snapshot.studioMode ?? 'simple') as StudioMode);
    setTypoSubTab((snapshot.typoSubTab ?? 'char') as 'char' | 'layout');
    setTextPanelTab((snapshot.textPanelTab ?? 'fontes') as 'fontes' | 'entrada' | 'cor' | 'layout');
    setTxScale(cloneHistoryValue(snapshot.txScale ?? { headline: 1, date: 1, cta: 1, cta1: 1, cta2: 1 }));
    setTxLS(cloneHistoryValue(snapshot.txLS ?? { headline: 0, date: 0, cta: 0, cta1: 0, cta2: 0 }));
    setTxLH(cloneHistoryValue(snapshot.txLH ?? { headline: 1.2, date: 1.2, cta: 1.3, cta1: 1.3, cta2: 1.3 }));
    setTxOX(cloneHistoryValue(snapshot.txOX ?? { headline: 0, date: 0, cta: 0, cta1: 0, cta2: 0 }));
    setTxOY(cloneHistoryValue(snapshot.txOY ?? { headline: 0, date: 0, cta: 0, cta1: 0, cta2: 0 }));
    setTxAlign(cloneHistoryValue(snapshot.txAlign ?? { headline: 'center', date: 'center', cta: 'center' }));
    setTextTarget((snapshot.textTarget ?? 'headline') as 'headline' | 'date' | 'cta');
    setHeadlineLS(snapshot.headlineLS ?? 0);
    setHeadlineLH(snapshot.headlineLH ?? 1.1);
    setHeadlineX(snapshot.headlineX ?? 0);
    setHeadlineY(snapshot.headlineY ?? 0);
  }

  function undoEditorAction() {
    clearPendingHistoryTimer();
    const currentSnapshot = currentEditorSnapshotRef.current ?? createEditorSnapshot();
    const currentSerialized = serializeEditorSnapshot(currentSnapshot);
    const lastSavedSnapshot = parseEditorSnapshot(lastHistorySerializedRef.current);

    if (lastHistorySerializedRef.current && currentSerialized !== lastHistorySerializedRef.current && lastSavedSnapshot) {
      pushHistorySnapshot(redoHistoryRef, currentSnapshot);
      restoreEditorSnapshot(lastSavedSnapshot);
      return;
    }

    const previous = undoHistoryRef.current.pop();
    if (!previous) return;

    pushHistorySnapshot(redoHistoryRef, currentSnapshot);
    restoreEditorSnapshot(previous);
  }

  function redoEditorAction() {
    clearPendingHistoryTimer();
    const next = redoHistoryRef.current.pop();
    if (!next) return;

    const currentSnapshot = currentEditorSnapshotRef.current ?? createEditorSnapshot();
    pushHistorySnapshot(undoHistoryRef, currentSnapshot);
    restoreEditorSnapshot(next);
  }

  React.useEffect(() => {
    const snapshot = createEditorSnapshot();
    const serialized = serializeEditorSnapshot(snapshot);
    currentEditorSnapshotRef.current = snapshot;

    if (!lastHistorySerializedRef.current) {
      lastHistorySerializedRef.current = serialized;
      return;
    }

    if (isRestoringHistoryRef.current) {
      lastHistorySerializedRef.current = serialized;
      isRestoringHistoryRef.current = false;
      return;
    }

    if (serialized === lastHistorySerializedRef.current) return;

    clearPendingHistoryTimer();
    historyTimerRef.current = window.setTimeout(() => {
      const previous = parseEditorSnapshot(lastHistorySerializedRef.current);
      if (previous && serialized !== lastHistorySerializedRef.current) {
        pushHistorySnapshot(undoHistoryRef, previous);
        redoHistoryRef.current = [];
        lastHistorySerializedRef.current = serialized;
      }
      historyTimerRef.current = null;
    }, 180);

    return clearPendingHistoryTimer;
  });


  function setTextOpacityLive(value: number) {
    setTextOpacity(value);
  }

  function changeTextStroke(role: FontRole, stroke: any) {
    const nextStroke = {
      mode: stroke?.mode ?? stroke?.type ?? 'none',
      width: Number(stroke?.width ?? 0),
      fillKind: stroke?.fillKind ?? 'solid',
      color: stroke?.color ?? '#f5c451',
      gradientFrom: stroke?.gradientFrom ?? stroke?.color ?? '#f5c451',
      gradientTo: stroke?.gradientTo ?? stroke?.color2 ?? '#ffffff',
      gradientAngle: stroke?.gradientAngle ?? 90,
      opacity: stroke?.opacity ?? 1,
      fillOpacity: stroke?.fillOpacity ?? stroke?.opacity ?? 1,
    };

    if (role === 'headline') setStrokeHeadline(nextStroke);
    if (role === 'date') setStrokeDate(nextStroke);

    if (role === 'cta') {
      setStrokeCta(nextStroke);
      setStrokeCta1(nextStroke);
      setStrokeCta2(nextStroke);
    }

    if (role === 'cta1') setStrokeCta1(nextStroke);
    if (role === 'cta2') setStrokeCta2(nextStroke);
  }

  const motion: MotionConfig = useMemo(
    () => ({
      fontHeadline,
      fontDate,
      fontCta,
      fontCta1,
      fontCta2,
      layoutPreset,
      customFonts: userFonts.map(userFontToFontDef),
      strokeHeadline: { ...strokeHeadline },
      strokeDate: { ...strokeDate },
      strokeCta: { ...strokeCta },
      strokeCta1: { ...strokeCta1 },
      strokeCta2: { ...strokeCta2 },
      textOpacity,
      previewNonce,
      coverMotion,
      coverSize,
      coverY,
      coverX,
      coverInFrame,
      // Phone (Spotify Print)
      phoneSize,
      phoneX,
      phoneY,
      phoneTilt,
      phoneMotion,
      phoneInFrame,
      phoneSpinTurns,
      phoneWiggle,
      phoneDynamicIsland,
      spinTurns,
      wiggleIntensity,
      wiggleHeadline: wiggleH,
      wiggleDate: wiggleD,
      wiggleCta: wiggleC,
      wiggleCta1,
      wiggleCta2,
      particlesEnabled,
      finalFlash,
      glowColor,
      durationSeconds,
      transitionHeadline: trHeadline,
      transitionDate: trDate,
      transitionCta: trCta,
      transitionCta1: trCta1,
      transitionCta2: trCta2,
      headlineInFrame: effectiveTextInFrames.headline,
      dateInFrame: effectiveTextInFrames.date,
      transitionTuningHeadline: transitionTuning.headline,
      transitionTuningDate: transitionTuning.date,
      transitionTuningCta: transitionTuning.cta1,
      transitionTuningCta1: transitionTuning.cta1,
      transitionTuningCta2: transitionTuning.cta2,
      styleHeadline,
      styleDate,
      styleCta,
      styleCta1,
      styleCta2,
      cta1InFrame: effectiveTextInFrames.cta1,
      ctaSwapFrame,
      cta2InFrame: effectiveTextInFrames.cta2,
      logosInFrame,
      background: {
        videoSrc: bgVideo || undefined,
        mediaType: bgVideo && /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(bgVideo) ? 'image' : 'video',
        videoStartFrame: Math.floor(bgVideoStartSec * 30),
        videoDurationSec: bgVideoDuration || undefined,
        videoNeedsTrim: bgVideoNeedsTrim || undefined,
        videoOriginalName: bgVideoOriginalName || undefined,
        localAsset: bgVideoLocalAsset ?? undefined,
        videoOpacity: bgVideoOpacity,
        bgColor,
        videoBlur: bgVideoBlur,
        videoSaturation: bgVideoSaturation,
        audioSrc: audioSrc || undefined,
        audioStartSec,
        audioDurationSec: audioDuration || undefined,
        audioOriginalName: audioOriginalName || undefined,
        audioVolume,
        audioFadeInSec: audioFadeIn,
        audioFadeOutSec: audioFadeOut,
        useVideoAudio,
      },
      customLogos: normalizeCustomLogos(effectiveCustomLogos),
      platformLogoSize,
      platformLogoGap,
      platformLogoScales,
      platformLogoX,
      platformLogoY,
      milestoneLogoSize,
      milestoneLogoX,
      milestoneLogoY,
      platformLogoPack,
      platformLogoTintEnabled,
      platformLogoTintColor,
      platformLogoWiggle: factoryMotion.platformLogoWiggle ?? 0.065,
      platformLogoWiggleSpeed: factoryMotion.platformLogoWiggleSpeed ?? 1,
      overlays,
    }),
    [
      fontHeadline,
      fontDate,
      fontCta,
      fontCta1,
      fontCta2,
      layoutPreset,
      userFonts,
      strokeHeadline,
      strokeDate,
      strokeCta,
      strokeCta1,
      strokeCta2,
      textOpacity,
      previewNonce,
      coverMotion,
      coverSize,
      coverY,
      coverX,
      coverInFrame,
      spinTurns,
      wiggleIntensity,
      wiggleH,
      wiggleD,
      wiggleC,
      wiggleCta1,
      wiggleCta2,
      particlesEnabled,
      finalFlash,
      glowColor,
      durationSeconds,
      trHeadline,
      trDate,
      trCta,
      trCta1,
      trCta2,
      effectiveTextInFrames.headline,
      effectiveTextInFrames.date,
      effectiveTextInFrames.cta1,
      effectiveTextInFrames.cta2,
      transitionTuning,
      styleHeadline,
      styleDate,
      styleCta,
      styleCta1,
      styleCta2,
      cta1InFrame,
      ctaSwapFrame,
      cta2InFrame,
      logosInFrame,
      bgVideo,
      bgVideoStartSec,
      bgVideoDuration,
      bgVideoNeedsTrim,
      bgVideoOriginalName,
      bgVideoLocalAsset,
      bgVideoOpacity,
      bgColor,
      bgVideoBlur,
      bgVideoSaturation,
      audioSrc,
      audioStartSec,
      audioDuration,
      audioOriginalName,
      audioVolume,
      audioFadeIn,
      audioFadeOut,
      useVideoAudio,
      effectiveCustomLogos,
      platformLogoScales,
      platformLogoGap,
      platformLogoSize,
      platformLogoX,
      platformLogoY,
      milestoneLogoSize,
      milestoneLogoX,
      milestoneLogoY,
      platformLogoPack,
      platformLogoTintEnabled,
      platformLogoTintColor,
      overlays,
      phoneSize,
      phoneX,
      phoneY,
      phoneTilt,
      phoneMotion,
      phoneInFrame,
      phoneSpinTurns,
      phoneWiggle,
      phoneDynamicIsland,
    ]
  );

  const ctaTimingPreset = useMemo(() => {
    if (cta1InFrame === 78 && ctaSwapFrame === 124 && cta2InFrame === 138 && logosInFrame === 158) {
      return 'padrao';
    }
    if (cta1InFrame === 62 && ctaSwapFrame === 106 && cta2InFrame === 118 && logosInFrame === 138) {
      return 'comercial';
    }
    if (cta1InFrame === 92 && ctaSwapFrame === 138 && cta2InFrame === 156 && logosInFrame === 176) {
      return 'musical';
    }
    return 'custom';
  }, [cta1InFrame, ctaSwapFrame, cta2InFrame, logosInFrame]);

  const motionWithStyles = React.useMemo(() => {
    const h: any = styleHeadline;
    const d: any = styleDate;
    const c: any = styleCta;
    const c1: any = styleCta1;
    const c2: any = styleCta2;

    return {
      ...motion,
      strokeHeadline: strokeHeadline,
      strokeDate: strokeDate,
      strokeCta: strokeCta,
      strokeCta1: strokeCta1,
      strokeCta2: strokeCta2,
      styleHeadline: {
        ...styleHeadline,
        scale: txScale.headline ?? h.scale ?? 1,
        letterSpacing: txLS.headline ?? h.letterSpacing ?? 0,
        lineHeight: txLH.headline ?? h.lineHeight ?? 1.2,
        offsetX: txOX.headline ?? h.offsetX ?? 0,
        offsetY: txOY.headline ?? h.offsetY ?? 0,
      },
      styleDate: {
        ...styleDate,
        scale: txScale.date ?? d.scale ?? 1,
        letterSpacing: txLS.date ?? d.letterSpacing ?? 0,
        lineHeight: txLH.date ?? d.lineHeight ?? 1.2,
        offsetX: txOX.date ?? d.offsetX ?? 0,
        offsetY: txOY.date ?? d.offsetY ?? 0,
      },
      styleCta: {
        ...styleCta,
        scale: txScale.cta ?? c.scale ?? 1,
        letterSpacing: txLS.cta ?? c.letterSpacing ?? 0,
        lineHeight: txLH.cta ?? c.lineHeight ?? 1.3,
        offsetX: txOX.cta ?? c.offsetX ?? 0,
        offsetY: txOY.cta ?? c.offsetY ?? 0,
      },
      styleCta1: {
        ...styleCta1,
        scale: txScale.cta1 ?? txScale.cta ?? c1.scale ?? 1,
        letterSpacing: txLS.cta1 ?? c1.letterSpacing ?? 0,
        lineHeight: txLH.cta1 ?? c1.lineHeight ?? 1.3,
        offsetX: txOX.cta1 ?? c1.offsetX ?? 0,
        offsetY: txOY.cta1 ?? c1.offsetY ?? 0,
      },
      styleCta2: {
        ...styleCta2,
        scale: txScale.cta2 ?? txScale.cta ?? c2.scale ?? 1,
        letterSpacing: txLS.cta2 ?? c2.letterSpacing ?? 0,
        lineHeight: txLH.cta2 ?? c2.lineHeight ?? 1.3,
        offsetX: txOX.cta2 ?? c2.offsetX ?? 0,
        offsetY: txOY.cta2 ?? c2.offsetY ?? 0,
      },
    };
  }, [motion, fontHeadline, fontDate, fontCta, fontCta1, fontCta2, userFonts, styleHeadline, styleDate, styleCta, styleCta1, styleCta2, strokeHeadline, strokeDate, strokeCta, strokeCta1, strokeCta2, txScale, txLS, txLH, txOX, txOY]);

  const project = useMemo(() => {
    const base = getProject(template);
    return {
      ...base,
      releaseDate,
      headline,
      cta: showCta1 ? cta : '',
      cta2: showCta2 ? cta2 : '',
      showCover,
      channelName,
      metricPrefix,
      metricNumber,
      metricLabel,
      platforms: platformsSel,
      coverImage: normalizeAssetUrl(coverImage) ?? coverImage,
      motion: motionWithStyles,
      media: {
        type: 'image' as const,
        file: normalizeAssetUrl(coverImage) ?? coverImage,
        sourceFormat: 'square' as const,
        framingMode: 'background_blur' as const,
      },
      renderTarget: target,
    } satisfies TemplateProps;
  }, [
    template, releaseDate, headline, cta, cta2, showCta1, showCta2, showCover, channelName, metricPrefix,
    metricNumber, metricLabel, platformsSel, coverImage, motionWithStyles, target,
  ]);

  const liveProject = React.useMemo(() => {
    const motionForPreview = motionWithStyles as MotionConfig & {
      background?: NonNullable<MotionConfig['background']> & { previewQuality?: 'full' | 'light' };
      overlays?: OverlayPlacement[];
    };
    const hasVideoBackground = Boolean(
      motionForPreview.background?.videoSrc &&
      motionForPreview.background.mediaType !== 'image'
    );
    const backgroundAsset = motionForPreview.background?.localAsset as LocalAssetRef | undefined;
    const backgroundDurationSec =
      motionForPreview.background?.videoDurationSec ??
      backgroundAsset?.durationSec ??
      durationSeconds;
    const backgroundIsVertical =
      Number(backgroundAsset?.height || 0) > Number(backgroundAsset?.width || 0);
    const backgroundNeedsLightPreview = hasVideoBackground && (
      Boolean(motionForPreview.background?.videoNeedsTrim) ||
      Boolean(backgroundAsset?.requiresOptimization) ||
      Number(backgroundAsset?.size || 0) >= HEAVY_BACKGROUND_VIDEO_BYTES ||
      backgroundDurationSec >= LONG_BACKGROUND_VIDEO_SECONDS ||
      backgroundIsVertical
    );
    const hasVideoOverlay = (motionForPreview.overlays ?? []).some((overlay) => {
      const src = overlay.src || '';
      return overlay.type === 'video' || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(src);
    });
    const hasLongOverlay = (motionForPreview.overlays ?? []).some((overlay) => {
      return overlay.type === 'video' && Math.max(overlay.durationSec ?? 0, overlay.sourceDurationSec ?? 0) >= 20;
    });
    const useLightPreview =
      backgroundNeedsLightPreview ||
      (hasVideoOverlay && (hasVideoBackground || hasLongOverlay || durationSeconds >= 40));
    const suppressHeavyBackgroundVideo =
      backgroundNeedsLightPreview &&
      (Boolean(motionForPreview.background?.videoNeedsTrim) || Boolean(backgroundAsset?.requiresOptimization));
    const previewOverlays = useLightPreview
      ? (motionForPreview.overlays ?? []).map((overlay) => (
          overlay.type === 'video' ? { ...overlay, previewQuality: 'light' as const } : overlay
        ))
      : motionForPreview.overlays;

    return {
      ...project,
      durationSeconds,
      motion: {
        ...motionWithStyles,
        background: {
          ...motionForPreview.background,
          videoSrc: suppressHeavyBackgroundVideo ? undefined : motionForPreview.background?.videoSrc,
          previewQuality: useLightPreview ? ('light' as const) : ('full' as const),
        },
        overlays: previewOverlays,
        // Studio Player SEMPRE em previewMode=true (textos não somem durante transição).
        // Render REAL seta previewMode=false explicitamente em /api/render.
        previewMode: true,
      },
      renderTarget: target,
    };
  }, [project, durationSeconds, motionWithStyles, target]);


  // O player só REMONTA (volta pra frame 0) em mudanças ESTRUTURAIS: troca de
  // template/formato, novo vídeo de fundo, ou restart manual (previewNonce).
  // Transições, textInFrames e coverMotion fluem por inputProps (motion memo) e
  // atualizam o preview AO VIVO — não entram aqui, senão editar qualquer um
  // desses (ou undo/redo / aplicar preset) jogava o player de volta pra 0.
  const playerRemountKey = [
    template,
    target,
    previewNonce,
    showCover,
    bgVideo,
    bgVideoDuration,
    bgVideoNeedsTrim,
  ].join('|');

  // Pausa o player quando o usuário clica/arrasta a timeline depois de dar play.
  // O Remotion tenta retomar automaticamente se o seek acontece com o player
  // tocando; por isso pausamos também no próximo frame para limpar esse resume.
  React.useEffect(() => {
    const player = playerRef.current;
    if (!player?.addEventListener) return;
    const pauseAfterUserSeek = () => {
      try { player.pause?.(); } catch { /* noop */ }
      window.requestAnimationFrame(() => {
        try { player.pause?.(); } catch { /* noop */ }
      });
    };
    const onSeeked = () => {
      if (programmaticSeekRef.current) {
        programmaticSeekRef.current = false;
        return;
      }
      pauseAfterUserSeek();
    };
    player.addEventListener('seeked', onSeeked);
    return () => {
      try { player.removeEventListener?.('seeked', onSeeked); } catch { /* noop */ }
    };
    // isClientReady garante que o efeito re-rode quando o <Player> finalmente
    // monta (antes disso playerRef.current é null e o listener não anexa).
  }, [playerRemountKey, isClientReady]);

  const Component = componentByTemplate[template];

  const compositionHeight = target === 'story' ? 1920 : 1350;
  const shouldUseFocusedPreviewLoop = Boolean(editPreviewLoop) && activeStudioTool !== 'overlay' && !selectedOverlayId;
  const focusedPreviewLoop = shouldUseFocusedPreviewLoop ? editPreviewLoop : null;
  const bgIsImage = Boolean(bgVideo && /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(bgVideo));
  const bgClipDuration = Math.min(durationSeconds, MAX_BACKGROUND_CLIP_SECONDS);
  const bgVideoRequiresOptimization = Boolean(bgVideoNeedsTrim && bgVideoLocalAsset?.requiresOptimization);
  const bgVideoNeedsOnlyOptimization =
    bgVideoRequiresOptimization &&
    bgVideoDuration > 0 &&
    bgVideoDuration <= bgClipDuration + 0.5;
  const bgVideoStartMax = bgVideoNeedsTrim
    ? Math.max(0, bgVideoDuration - bgClipDuration)
    : Math.max(0.1, bgVideoDuration);
  const bgTrimStartPct = bgVideoDuration > 0 ? Math.min(100, (bgVideoStartSec / bgVideoDuration) * 100) : 0;
  const bgTrimWidthPct = bgVideoDuration > 0
    ? Math.min(100 - bgTrimStartPct, (bgClipDuration / bgVideoDuration) * 100)
    : 0;

  function clampBgVideoStart(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(bgVideoStartMax, value));
  }

  function formatTimecode(seconds: number) {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const mins = Math.floor(safe / 60);
    const secs = safe - mins * 60;
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
  }

  function parseTimecode(value: string) {
    const clean = value.trim().replace(',', '.');
    if (!clean) return null;
    if (/^\d+(\.\d+)?$/.test(clean)) return Number(clean);
    const parts = clean.split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  function setBgVideoStartAndPreview(value: number, shouldSeek = true) {
    const next = clampBgVideoStart(value);
    bgTrimPreviewCursorRef.current = next;
    setBgVideoStartSec(next);
    setBgTrimPreviewTime(next);
    setBgTrimTimecodeInput(formatTimecode(next));
    if (shouldSeek && bgTrimVideoRef.current) {
      bgTrimProgrammaticSeekRef.current = true;
      bgTrimVideoRef.current.currentTime = next;
    }
  }

  function seekBgTrimPreview(value: number) {
    const max = Math.max(0, bgVideoDuration || 0);
    const next = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
    bgTrimSelectionEndRef.current = null;
    bgTrimPreviewCursorRef.current = next;
    setBgTrimPreviewTime(next);
    if (bgTrimVideoRef.current) {
      bgTrimVideoRef.current.currentTime = next;
    }
  }

  function nudgeBgVideoStart(delta: number) {
    setBgVideoStartAndPreview(bgVideoStartSec + delta);
  }

  function useCurrentBgPreviewTime() {
    const current = bgTrimVideoRef.current?.currentTime ?? bgTrimPreviewTime;
    bgTrimSelectionEndRef.current = null;
    setBgVideoStartAndPreview(current, false);
  }

  function playBgTrimSelection() {
    const video = bgTrimVideoRef.current;
    if (!video) return;
    const current = Number.isFinite(video.currentTime) ? video.currentTime : bgTrimPreviewCursorRef.current;
    const start = Math.max(0, Math.min(bgVideoDuration || current, current));
    bgTrimSelectionEndRef.current = Math.min(bgVideoDuration || start + bgClipDuration, start + bgClipDuration);
    bgTrimPreviewCursorRef.current = start;
    setBgTrimPreviewTime(start);

    const play = () => {
      setBgTrimPreviewTime(video.currentTime || start);
      video.play().catch(() => {});
    };

    video.pause();
    if (Math.abs((video.currentTime || 0) - start) < 0.08) {
      play();
      return;
    }

    bgTrimProgrammaticSeekRef.current = true;
    video.addEventListener('seeked', play, { once: true });
    video.currentTime = start;
    window.setTimeout(() => {
      if (Math.abs((video.currentTime || 0) - start) < 0.25 && video.paused) {
        play();
      }
    }, 120);
  }

  const audioStartMax = audioDuration > 0 ? Math.max(0, audioDuration - 0.1) : 0;

  function clampAudioStart(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(audioStartMax, value));
  }

  function setAudioStartAndPreview(value: number, shouldSeek = true) {
    const next = clampAudioStart(value);
    setAudioStartSec(next);
    setAudioPreviewTime(next);
    setAudioStartTimecodeInput(formatTimecode(next));
    if (shouldSeek && audioPreviewRef.current) {
      audioPreviewRef.current.currentTime = next;
    }
  }

  function seekAudioPreview(value: number) {
    const max = Math.max(0, audioDuration || 0);
    const next = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
    setAudioPreviewTime(next);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.currentTime = next;
    }
  }

  function nudgeAudioStart(delta: number) {
    setAudioStartAndPreview(audioStartSec + delta);
  }

  function useCurrentAudioPreviewTime() {
    const current = audioPreviewRef.current?.currentTime ?? audioPreviewTime;
    setAudioStartAndPreview(current, false);
  }

  function playAudioFromPreview() {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    audio.currentTime = audioPreviewTime;
    audio.play().catch(() => {});
  }

  // ─── HANDLERS ────────────────────────────────────────────
  function setPlatformScale(platform: string, value: number) {
    setPlatformLogoScales((prev) => ({ ...prev, [platform]: value }));
  }

  function clearManualPlatformLogos(platforms: PlatformName[] = platformsSel) {
    setCustomLogos((current) => {
      const next = { ...current };
      for (const platform of platforms) {
        if (next[platform] && !isFactoryPlatformLogoPath(next[platform])) {
          delete next[platform];
        }
      }
      return next;
    });
    // Logos fluem por inputProps (effectiveCustomLogos) e re-medem os rects;
    // não precisa remontar o player (não resetar a minutagem ao trocar logo).
  }

  function selectPlatformLogoPack(pack: PlatformLogoPackId) {
    setPlatformLogoPack(pack);
    clearManualPlatformLogos(allPlatforms);
  }

  function addPlatformFromPack(platform: PlatformName) {
    setPlatformsSel((current) => (current.includes(platform) ? current : [...current, platform]));
    setCustomLogos((current) => {
      if (!current[platform] || isFactoryPlatformLogoPath(current[platform])) return current;
      const next = { ...current };
      delete next[platform];
      return next;
    });
    // sem remount: o logo entra ao vivo via inputProps, preserva o tempo do player
  }

  function startEditPreviewLoop(range: EditPreviewLoop) {
    setEditPreviewLoop(range);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          programmaticSeekRef.current = true;
          playerRef.current?.seekTo?.(range.startFrame);
          playerRef.current?.play?.();
        } catch {
          // fallback silencioso
        }
      });
    });
  }

  function stopTransitionPreviewLoopForManualEdit() {
    if (!editPreviewLoop) return;

    setEditPreviewLoop(null);

    requestAnimationFrame(() => {
      try {
        playerRef.current?.pause?.();
      } catch {
        // fallback silencioso
      }
    });
  }

  function normalizeTextPreviewRole(role: FontRole | TextPreviewRole | string): TextPreviewRole {
    if (role === 'date') return 'date';
    if (role === 'cta2') return 'cta2';
    if (role === 'cta' || role === 'cta1') return 'cta1';
    return 'headline';
  }

  function getTextPreviewFrameRange(role: TextPreviewRole, frameOverride?: number): EditPreviewLoop {
    const startFrame =
      typeof frameOverride === 'number' ? frameOverride :
      role === 'date' ? effectiveTextInFrames.date :
      role === 'cta1' ? effectiveTextInFrames.cta1 :
      role === 'cta2' ? effectiveTextInFrames.cta2 :
      effectiveTextInFrames.headline;
    const naturalEndFrame =
      role === 'cta1'
        ? Math.min(ctaSwapFrame - 2, startFrame + TEXT_TRANSITION_PREVIEW_LOOP_FRAMES)
        : startFrame + TEXT_TRANSITION_PREVIEW_LOOP_FRAMES;
    const maxFrame = Math.max(0, Math.round(durationSeconds * 30) - 1);
    const safeStartFrame = Math.min(Math.max(0, maxFrame - 1), Math.max(0, startFrame - TEXT_TRANSITION_PREVIEW_LEAD_FRAMES));
    const endFrame = Math.max(
      safeStartFrame + 1,
      Math.min(maxFrame, Math.max(startFrame + 12, naturalEndFrame))
    );

    return {
      startFrame: safeStartFrame,
      endFrame,
      kind: 'text',
      role,
    };
  }

  function getCoverPreviewFrameRange(): EditPreviewLoop {
    const maxFrame = Math.max(0, Math.round(durationSeconds * 30) - 1);
    const startFrame = Math.max(0, COVER_TRANSITION_IN_FRAME - COVER_TRANSITION_PREVIEW_LEAD_FRAMES);
    const naturalEndFrame =
      COVER_TRANSITION_IN_FRAME +
      COVER_TRANSITION_DURATION_FRAMES +
      COVER_TRANSITION_PREVIEW_TAIL_FRAMES;

    const safeStartFrame = Math.min(Math.max(0, maxFrame - 1), startFrame);
    const endFrame = Math.max(
      safeStartFrame + 1,
      Math.min(maxFrame, naturalEndFrame)
    );

    return {
      startFrame: safeStartFrame,
      endFrame,
      kind: 'cover',
    };
  }

  function startCoverPreviewLoop() {
    startEditPreviewLoop(getCoverPreviewFrameRange());
  }

  function startTextElementPreviewLoop(role: FontRole | TextPreviewRole | string) {
    const previewRole = normalizeTextPreviewRole(role);
    const range = getTextPreviewFrameRange(previewRole);

    lastTextPreviewRoleRef.current = previewRole;
    startEditPreviewLoop(range);
  }

  function changeTextInFrame(role: TextPreviewRole, nextFrame: number) {
    const frame = Math.max(0, Math.min(Math.round(durationSeconds * 30) - 1, Math.round(nextFrame)));

    setTextInFrames((prev) => ({ ...prev, [role]: frame }));
    if (template === 'available_now') {
      if (role === 'cta1') setCta1InFrame(frame);
      if (role === 'cta2') setCta2InFrame(frame);
    }

    setPreviewNonce((n) => n + 1);
    startEditPreviewLoop(getTextPreviewFrameRange(role, frame));
  }

  function changeTextTransition(role: 'headline' | 'date' | 'cta1' | 'cta2', next: TextTransitionId) {
    if (role === 'headline') {
      setTrHeadline(next);
    }

    if (role === 'date') {
      setTrDate(next);
    }

    if (role === 'cta1') {
      setTrCta1(next);
    }

    if (role === 'cta2') {
      setTrCta2(next);
    }

    setPreviewNonce((n) => n + 1);
    startTextElementPreviewLoop(role);
  }

  function changeTextTransitionTuning(role: TextPreviewRole, patch: Partial<TextTransitionTuning>) {
    setTransitionTuning((prev) => ({
      ...prev,
      [role]: normalizeTextTransitionTuning({
        ...prev[role],
        ...patch,
      }),
    }));
    setPreviewNonce((n) => n + 1);

    if (editPreviewLoop?.kind === 'text' && editPreviewLoop.role === role) return;

    startTextElementPreviewLoop(role);
  }

  function applyTextTransitionTuningPreset(role: TextPreviewRole, values: TextTransitionTuning) {
    setTransitionTuning((prev) => ({
      ...prev,
      [role]: normalizeTextTransitionTuning(values),
    }));
    setPreviewNonce((n) => n + 1);

    if (editPreviewLoop?.kind === 'text' && editPreviewLoop.role === role) return;

    startTextElementPreviewLoop(role);
  }

  function applyTimelineTransitionTool(kind: TimelineTool['icon']) {
    stopTransitionPreviewLoopForManualEdit();

    const maxFrame = Math.max(0, Math.round(durationSeconds * 30) - 1);
    const frame = (value: number) => Math.max(0, Math.min(maxFrame, value));
    const sec = (value: number) => Math.round((frame(value) / 30) * 10) / 10;
    const config: {
      textTransition: TextTransitionId;
      coverMotion: CoverMotionId;
      overlayTransition: NonNullable<OverlayPlacement['entryTransition']>;
      overlayEntryDurationFrames: number;
      tuning: Required<TextTransitionTuning>;
      frames: Record<TextPreviewRole, number>;
      coverFrame: number;
      phoneFrame: number;
      logosFrame: number;
    } =
      kind === 'pop'
        ? {
            textTransition: 'scale_pop',
            coverMotion: 'zoom_bounce',
            overlayTransition: 'zoom-pop',
            overlayEntryDurationFrames: 22,
            tuning: { intensity: 1.65, speed: 1.05, stagger: 0.45 },
            frames: { headline: 0, date: 28, cta1: 68, cta2: 120 },
            coverFrame: 44,
            phoneFrame: 84,
            logosFrame: 140,
          }
        : kind === 'letters'
          ? {
              textTransition: 'split_letters',
              coverMotion: 'slide_up',
              overlayTransition: 'slide-up',
              overlayEntryDurationFrames: 32,
              tuning: { intensity: 1.35, speed: 0.86, stagger: 1.35 },
              frames: { headline: 0, date: 42, cta1: 88, cta2: 150 },
              coverFrame: 58,
              phoneFrame: 104,
              logosFrame: 170,
            }
          : {
              textTransition: 'mask_reveal',
              coverMotion: 'flip_card',
              overlayTransition: 'fade',
              overlayEntryDurationFrames: 28,
              tuning: { intensity: 1.42, speed: 0.82, stagger: 0.9 },
              frames: { headline: 0, date: 38, cta1: 78, cta2: 138 },
              coverFrame: 54,
              phoneFrame: 98,
              logosFrame: 158,
            };
    const nextFrames: Record<TextPreviewRole, number> = {
      headline: frame(config.frames.headline),
      date: frame(config.frames.date),
      cta1: frame(config.frames.cta1),
      cta2: frame(config.frames.cta2),
    };
    const nextTuning = normalizeTransitionTuningState({
      headline: config.tuning,
      date: config.tuning,
      cta1: config.tuning,
      cta2: config.tuning,
    });

    setTrHeadline(config.textTransition);
    setTrDate(config.textTransition);
    setTrCta(config.textTransition);
    setTrCta1(config.textTransition);
    setTrCta2(config.textTransition);
    setTransitionTuning(nextTuning);
    setCoverMotion(config.coverMotion);
    setCoverInFrame(frame(config.coverFrame));
    setPhoneInFrame(frame(config.phoneFrame));
    setLogosInFrame(frame(config.logosFrame));
    setCta1InFrame(nextFrames.cta1);
    setCtaSwapFrame(frame(nextFrames.cta1 + 44));
    setCta2InFrame(nextFrames.cta2);
    setTextInFrames(nextFrames);
    setOverlays((items) =>
      items.map((overlay, index) => ({
        ...overlay,
        startSec: typeof overlay.startSec === 'number' ? overlay.startSec : sec(config.logosFrame + index * 10),
        entryTransition: config.overlayTransition,
        entryDurationFrames: config.overlayEntryDurationFrames,
      }))
    );
    setSelectedOverlayId(null);
    setActiveTextRole('headline');
    setTextPanelTab('entrada');
    setActiveStudioTool('text');
    setPreviewNonce((n) => n + 1);
    setTimelineSec(sec(nextFrames.headline));
    startEditPreviewLoop(getTextPreviewFrameRange('headline', nextFrames.headline));
  }




  function previewCoverMotionChange(value: unknown) {
    const next = normalizeCoverMotionId(value);
    setCoverMotion(next);
    startCoverPreviewLoop();
  }

  function normalizeCoverMotionId(value: unknown): CoverMotionId {
    const raw = String(value || 'zoom_bounce');

    if (raw === 'slide_up_glow') return 'slide_up';
    if (raw === 'zoom_bounce_intro') return 'zoom_bounce';
    if (raw === 'flip_card_premium') return 'flip_card';
    if (raw === 'slide_left_in') return 'slide_left';
    if (raw === 'slide_right_in') return 'slide_right';

    if (
      raw === 'zoom_bounce' ||
      raw === 'slide_up' ||
      raw === 'slide_left' ||
      raw === 'slide_right' ||
      raw === 'flip_card' ||
      raw === 'vinyl_reveal'
    ) {
      return raw as CoverMotionId;
    }

    return 'zoom_bounce';
  }

  function runQuickAction(id: string) {
    if (id === 'safe') {
      setShowSafeArea(true);
      setCoverSize((v) => Math.min(v, 560));
    }

    if (id === 'impact') {
      setParticlesEnabled(true);
      setFinalFlash(true);
      setWiggleIntensity(1.25);
      setCoverSize((v) => Math.min(680, v + 36));
    }

    if (id === 'clean') {
      setParticlesEnabled(false);
      setFinalFlash(false);
      setWiggleIntensity(0.35);
      setGlowColor('rgba(255, 255, 255, 0.20)');
    }

    if (id === 'premium') {
      setParticlesEnabled(true);
      setFinalFlash(true);
      setGlowColor('rgba(255, 205, 100, 0.35)');
      setTrHeadline('mask_reveal');
      setTrCta('split_letters');
      setCoverMotion('flip_card' as CoverMotionId);
    }

    if (id === 'readable') {
      setShowSafeArea(true);
      setStyleHeadline((s) => ({ ...s, color: '#ffffff', useGradient: false, letterSpacing: -1 }));
      setStyleCta((s) => ({ ...s, color: '#ffffff', useGradient: false, letterSpacing: 2 }));
    }
  }

  function togglePlatform(p: PlatformName) {
    setPlatformsSel((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));
  }

  async function createArtist(name: string) {
    const r = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const d = await r.json();
    if (d.ok) {
      setArtists((a) => [d.artist, ...a]);
      setActiveSlug(d.artist.slug);
      setShowArtistModal(false);
    }
  }

  async function updateArtistDrive() {
    if (!activeSlug) return;
    const r = await fetch(`/api/artists/${activeSlug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driveFolderPath }),
    });
    const d = await r.json();
    if (d.ok) {
      setArtists((a) => a.map((x) => (x.slug === activeSlug ? { ...x, driveFolderPath } : x)));
    }
  }

  async function uploadPhotos(files: FileList) {
    if (!activeSlug || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('photos', f));
    const r = await fetch(`/api/artists/${activeSlug}/photos`, {
      method: 'POST',
      body: formData,
    });
    const d = await r.json();
    if (d.ok) {
      setPhotos((p) => [...d.uploaded, ...p]);
    }
  }

  async function deletePhoto(id: string) {
    if (!activeSlug) return;
    await fetch(`/api/artists/${activeSlug}/photos?id=${id}`, { method: 'DELETE' });
    setPhotos((p) => p.filter((x) => x.id !== id));
  }

  async function saveToGallery() {
    if (!activeSlug) {
      alert('Selecione um artista primeiro.');
      return;
    }
    const title = prompt('Título dessa arte:', `${templateLabels[template]} – ${headline}`);
    if (!title) return;
    const r = await fetch(`/api/artists/${activeSlug}/gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        template,
        thumbnailPath: coverImage,
        projectSnapshot: { ...project, motion: motionWithStyles },
      }),
    });
    const d = await r.json();
    if (d.ok) {
      setGallery((g) => [d.item, ...g]);
      alert('Salvo na galeria!');
    }
  }

  async function loadFromGallery(item: GalleryItem) {
    // recupera o snapshot completo via fetch (gallery list não inclui)
    const r = await fetch(`/api/artists/${activeSlug}/gallery`);
    const d = await r.json();
    const full = d.items.find((g: any) => g.id === item.id);
    const snap = full?.projectSnapshot;
    if (!snap) return;
    switchTemplate(snap.template ?? snap.type);
    setReleaseDate(snap.releaseDate ?? '');
    setHeadline(snap.headline ?? '');
    setCta(snap.cta ?? '');
    setCta2(snap.cta2 ?? snap.cta ?? '');
    setShowCover(snap.showCover ?? true);
    setCoverImage(snap.coverImage ?? '');
    if (snap.motion) {
      const m = snap.motion;
      setFontHeadline(m.fontHeadline ?? DEFAULT_FONTS.headline);
      setFontDate(m.fontDate ?? DEFAULT_FONTS.date);
      setFontCta(m.fontCta ?? DEFAULT_FONTS.cta);
      setFontCta1(m.fontCta1 ?? m.fontCta ?? DEFAULT_FONTS.cta);
      setFontCta2(m.fontCta2 ?? m.fontCta ?? DEFAULT_FONTS.cta);
      setCoverSize(m.coverSize ?? 510);
      setCoverY(m.coverY ?? 0);
      setCoverX(m.coverX ?? 0);
      setPhoneSize(m.phoneSize ?? 520);
      setPhoneX(m.phoneX ?? 0);
      setPhoneY(m.phoneY ?? 0);
      setPhoneTilt(m.phoneTilt ?? -6);
      setPhoneMotion((m.phoneMotion ?? 'zoom_bounce') as typeof phoneMotion);
      setPhoneSpinTurns(m.phoneSpinTurns ?? 0);
      setPhoneWiggle(m.phoneWiggle ?? 0.7);
      setPhoneDynamicIsland(m.phoneDynamicIsland ?? true);
      setPlatformLogoSize(m.platformLogoSize ?? 58);
      setPlatformLogoGap(m.platformLogoGap ?? 18);
      setPlatformLogoScales(m.platformLogoScales ?? {});
      setPlatformLogoX(m.platformLogoX ?? 0);
      setPlatformLogoY(m.platformLogoY ?? 0);
      setMilestoneLogoSize(m.milestoneLogoSize ?? 84);
      setMilestoneLogoX(m.milestoneLogoX ?? 0);
      setMilestoneLogoY(m.milestoneLogoY ?? 0);
      setPlatformLogoPack((m.platformLogoPack ?? 'round') as PlatformLogoPackId);
      setPlatformLogoTintEnabled(m.platformLogoTintEnabled ?? false);
      setPlatformLogoTintColor(m.platformLogoTintColor ?? '#ffffff');
      setCoverMotion(normalizeCoverMotionId(m.coverMotion));
      setSpinTurns(m.spinTurns ?? 2);
      setWiggleIntensity(m.wiggleIntensity ?? 1);
      setWiggleH(m.wiggleHeadline ?? DEFAULT_TEXT_WIGGLE_VALUES.headline);
      setWiggleD(m.wiggleDate ?? DEFAULT_TEXT_WIGGLE_VALUES.date);
      setWiggleC(m.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta);
      setWiggleCta1(m.wiggleCta1 ?? m.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta1);
      setWiggleCta2(m.wiggleCta2 ?? m.wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta2);
      setTextInFrames({
        headline: typeof m.headlineInFrame === 'number' ? m.headlineInFrame : undefined,
        date: typeof m.dateInFrame === 'number' ? m.dateInFrame : undefined,
        cta1: typeof m.cta1InFrame === 'number' ? m.cta1InFrame : undefined,
        cta2: typeof m.cta2InFrame === 'number' ? m.cta2InFrame : undefined,
      });
      setTrHeadline(m.transitionHeadline ?? 'mask_reveal');
      setTrDate(m.transitionDate ?? 'scale_pop');
      setTrCta(m.transitionCta ?? 'split_letters');
      setTrCta1(m.transitionCta1 ?? m.transitionCta ?? 'scale_pop');
      setTrCta2(m.transitionCta2 ?? m.transitionCta ?? 'split_letters');
      setTransitionTuning(transitionTuningFromMotion(m));
      setStyleHeadline(mergeTextStyle(HEADLINE_STYLE_DEFAULTS, m.styleHeadline));
      setStyleDate(mergeTextStyle(DATE_STYLE_DEFAULTS, m.styleDate));
      setStyleCta(mergeTextStyle(CTA_STYLE_DEFAULTS, m.styleCta));
      setStyleCta1(mergeTextStyle(CTA_STYLE_DEFAULTS, m.styleCta1 ?? m.styleCta));
      setStyleCta2(mergeTextStyle(CTA_STYLE_DEFAULTS, m.styleCta2 ?? m.styleCta));
      applyTextMetricsFromStyle('headline', m.styleHeadline);
      applyTextMetricsFromStyle('date', m.styleDate);
      applyTextMetricsFromStyle('cta', m.styleCta);
      applyTextMetricsFromStyle('cta1', m.styleCta1 ?? m.styleCta);
      applyTextMetricsFromStyle('cta2', m.styleCta2 ?? m.styleCta);
      setStrokeHeadline(m.strokeHeadline ?? defaultTextStroke);
      setStrokeDate(m.strokeDate ?? defaultTextStroke);
      setStrokeCta(m.strokeCta ?? defaultTextStroke);
      setStrokeCta1(m.strokeCta1 ?? m.strokeCta ?? defaultTextStroke);
      setStrokeCta2(m.strokeCta2 ?? m.strokeCta ?? defaultTextStroke);
      setCta1InFrame(m.cta1InFrame ?? CTA_TIMING_DEFAULTS.cta1InFrame);
      setCtaSwapFrame(m.ctaSwapFrame ?? CTA_TIMING_DEFAULTS.ctaSwapFrame);
      setCta2InFrame(m.cta2InFrame ?? CTA_TIMING_DEFAULTS.cta2InFrame);
      setLogosInFrame(m.logosInFrame ?? CTA_TIMING_DEFAULTS.logosInFrame);
      setDurationSeconds(m.durationSeconds ?? 8);
      setGlowColor(m.glowColor ?? GLOW_PRESETS[0].color);
      if (m.background) {
        setBgVideo(m.background.videoSrc ?? '');
        setBgVideoStartSec((m.background.videoStartFrame ?? 0) / 30);
        setBgVideoDuration(m.background.videoDurationSec ?? 0);
        setBgVideoNeedsTrim(Boolean(m.background.videoNeedsTrim));
        setBgVideoOriginalName(m.background.videoOriginalName ?? '');
        setBgVideoLocalAsset((m.background.localAsset as LocalAssetRef | undefined) ?? null);
        setBgVideoOpacity(m.background.videoOpacity ?? 1);
        setBgColor(m.background.bgColor ?? '#030205');
        setBgVideoBlur(m.background.videoBlur ?? 22);
        setBgVideoSaturation(m.background.videoSaturation ?? 1.15);
      }
      setOverlays(m.overlays ?? []);
    }
    setActiveTab('studio');
  }

  async function deleteGalleryItem(id: string) {
    if (!activeSlug) return;
    if (!confirm('Remover essa arte da galeria?')) return;
    await fetch(`/api/artists/${activeSlug}/gallery?id=${id}`, { method: 'DELETE' });
    setGallery((g) => g.filter((x) => x.id !== id));
  }


  async function deleteRender(name: string) {
    if (!confirm(`Excluir ${name}?`)) return;
    const r = await fetch(`/api/render-files?file=${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (r.ok) {
      const d = await fetch('/api/render-files').then(x => x.json());
      setRenderFiles(d.files ?? []);
    } else {
      alert('Erro ao excluir');
    }
  }

  async function deleteAllRenders() {
    if (!confirm('Excluir TODOS os arquivos renderizados? Esta acao nao pode ser desfeita.')) return;
    const r = await fetch('/api/render-files?all=true', { method: 'DELETE' });
    if (r.ok) {
      setRenderFiles([]);
    } else {
      alert('Erro ao excluir');
    }
  }

  function uploadRawVideoWithProgress(file: File) {
    return new Promise<any>((resolve, reject) => {
      const uploadUrl = `/api/upload-video/raw?filename=${encodeURIComponent(file.name)}`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.responseType = 'json';
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || event.total <= 0) return;
        const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
        setVideoUploadProgress(progress);
        if (progress >= 100) {
          setVideoUploadMsg('Upload concluído. Preparando preview leve para navegação…');
        }
      };

      xhr.onload = () => {
        const data = xhr.response || (() => {
          try {
            return JSON.parse(xhr.responseText || '{}');
          } catch {
            return null;
          }
        })();

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
          return;
        }

        const detail = data?.detail ? ` (${String(data.detail).slice(0, 180)})` : '';
        reject(new Error(data?.error ? `${data.error}${detail}` : `Upload falhou (${xhr.status}).`));
      };

      xhr.onerror = () => reject(new Error('Falha de rede durante o upload.'));
      xhr.onabort = () => reject(new Error('Upload cancelado.'));
      xhr.send(file);
    });
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setVideoUploadProgress(0);
    setVideoUploadMsg('Enviando bruto pesado sem compactar na memória…');
    let localPreviewUrl = '';

    try {
      localPreviewUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = localPreviewUrl;
      await new Promise<void>((resolve) => {
        tempVideo.onloadedmetadata = () => resolve();
        tempVideo.onerror = () => resolve();
      });
      const browserDuration = Number.isFinite(tempVideo.duration) ? tempVideo.duration : 0;

      const d = await uploadRawVideoWithProgress(file);

      if (!d.ok) {
        setVideoUploadMsg(`Erro: ${d.error}${d.detail ? ` (${String(d.detail).slice(0, 180)})` : ''}`);
        return;
      }

      const totalDuration = Number(d.durationSec) || browserDuration || 0;
      const clipDuration = Math.min(durationSeconds, MAX_BACKGROUND_CLIP_SECONDS);
      const uploadedWidth = Number(d.width || 0);
      const uploadedHeight = Number(d.height || 0);
      const uploadedSize = Number(d.size || file.size || 0);
      const isVerticalUpload = uploadedHeight > uploadedWidth;
      const previewFellBackToSource =
        Boolean(d.previewFailed) ||
        d.previewMode === 'source' ||
        (typeof d.previewSrc === 'string' && d.previewSrc === d.sourcePath);
      const shouldOptimizeFullLength =
        Boolean(d.requiresOptimization) ||
        previewFellBackToSource ||
        uploadedSize >= HEAVY_BACKGROUND_VIDEO_BYTES ||
        totalDuration >= Math.max(LONG_BACKGROUND_VIDEO_SECONDS, clipDuration - 0.5) ||
        (isVerticalUpload && totalDuration >= 20);
      const shouldTrim = totalDuration > clipDuration + 0.5 || shouldOptimizeFullLength;
      const needsOnlyOptimization = shouldTrim && totalDuration <= clipDuration + 0.5;
      const sourcePath = d.sourcePath || d.videoSrc;
      const serverPreviewSrc = d.previewSrc || d.videoSrc;
      const previewSrc = d.previewFailed ? localPreviewUrl : serverPreviewSrc;
      if (!d.previewFailed && localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
        localPreviewUrl = '';
      }
      const uploadedAsset: LocalAssetRef = {
        id: `local-bg-${file.size}-${file.lastModified}`,
        kind: 'backgroundVideo',
        name: file.name,
        size: file.size,
        type: file.type || 'video/mp4',
        durationSec: totalDuration,
        width: uploadedWidth || undefined,
        height: uploadedHeight || undefined,
        lastModified: file.lastModified,
        sourcePath,
        previewSrc,
        serverPreviewSrc,
        previewMode: d.previewMode,
        requiresOptimization: shouldOptimizeFullLength,
      };
      const videoPatch: SharedBackgroundVideoPatch = {
        bgVideo: previewSrc,
        bgVideoStartSec: 0,
        bgVideoDuration: totalDuration,
        bgVideoNeedsTrim: shouldTrim,
        bgVideoOriginalName: file.name,
        bgVideoLocalAsset: uploadedAsset,
        bgVideoOpacity,
        bgVideoBlur,
        bgVideoSaturation,
        useVideoAudio: audioSrc ? false : useVideoAudio,
      };
      applyBackgroundVideoPatchToState(videoPatch);
      shareBackgroundVideoWithTemplates(videoPatch);
      setVideoUploadMsg(
        shouldTrim && needsOnlyOptimization
          ? `Vídeo recebido e aplicado aos templates (${(file.size / 1024 / 1024).toFixed(1)} MB, ${totalDuration.toFixed(1)}s). Otimize antes de exportar para gerar um arquivo ${target === 'story' ? '1080×1920' : '1080×1350'} leve.`
          : shouldTrim
            ? `Bruto recebido e aplicado aos templates (${(file.size / 1024 / 1024).toFixed(1)} MB, ${totalDuration.toFixed(1)}s). Escolha o início, ajuste o visual ou use inteiro.`
            : `Vídeo pronto aplicado aos templates (${(file.size / 1024 / 1024).toFixed(1)} MB, ${totalDuration.toFixed(1)}s). Ajustes visuais liberados.`
      );
    } catch (error) {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      setVideoUploadMsg(`Erro no upload/processamento: ${message}`);
    } finally {
      setUploadingVideo(false);
      setVideoUploadProgress(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  function useBgVideoWithoutTrim() {
    if (!bgVideo) return;
    if (bgVideoLocalAsset?.requiresOptimization) {
      setVideoUploadMsg('Esse vídeo precisa ser otimizado antes de usar inteiro. Clique em otimizar para gerar o arquivo final leve.');
      return;
    }
    const wholePatch: SharedBackgroundVideoPatch = {
      bgVideo,
      bgVideoStartSec: 0,
      bgVideoDuration: bgVideoDuration || durationSeconds,
      bgVideoNeedsTrim: false,
      bgVideoOriginalName,
      bgVideoLocalAsset: bgVideoLocalAsset
        ? { ...bgVideoLocalAsset, trimStartSec: 0, trimDurationSec: bgVideoDuration || durationSeconds, renderReadySrc: bgVideo }
        : null,
      bgVideoOpacity,
      bgVideoBlur,
      bgVideoSaturation,
      useVideoAudio,
    };
    applyBackgroundVideoPatchToState(wholePatch);
    shareBackgroundVideoWithTemplates(wholePatch);
    setVideoUploadMsg('Vídeo inteiro aplicado como fundo. Ajuste opacidade, blur e saturação abaixo.');
  }

  async function processBgVideoClip(): Promise<SharedBackgroundVideoPatch | null> {
    if (!bgVideo || !bgVideoNeedsTrim) return null;

    const clipDuration = Math.min(durationSeconds, MAX_BACKGROUND_CLIP_SECONDS);
    setProcessingVideoClip(true);
    setVideoUploadMsg(`Cortando ${clipDuration}s e convertendo para ${target === 'story' ? '1080×1920' : '1080×1350'}…`);

    try {
      const sourcePath = bgVideoLocalAsset?.sourcePath || bgVideo;
      const cleanupPreviewPath = bgVideoLocalAsset?.serverPreviewSrc || '';
      const previewPath = cleanupPreviewPath.startsWith('/api/uploads/') ? cleanupPreviewPath : '';
      const r = await fetch('/api/video/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath,
          previewPath: previewPath !== sourcePath ? previewPath : undefined,
          startSec: bgVideoStartSec,
          durationSec: clipDuration,
          target,
          deleteSource: true,
        }),
      });
      const d = await r.json();

      if (!d.ok) {
        setVideoUploadMsg(`Erro: ${d.error}`);
        return null;
      }

      const trimStartSec = bgVideoStartSec;
      const optimizedAsset = bgVideoLocalAsset ? {
        ...bgVideoLocalAsset,
        trimStartSec,
        trimDurationSec: d.durationSec ?? clipDuration,
        renderReadySrc: d.videoSrc,
        sourcePath: undefined,
        previewSrc: d.videoSrc,
        serverPreviewSrc: d.videoSrc,
        requiresOptimization: false,
      } : null;
      const optimizedPatch: SharedBackgroundVideoPatch = {
        bgVideo: d.videoSrc,
        bgVideoStartSec: 0,
        bgVideoDuration: d.durationSec ?? clipDuration,
        bgVideoNeedsTrim: false,
        bgVideoOriginalName: '',
        bgVideoLocalAsset: optimizedAsset,
        bgVideoOpacity,
        bgVideoBlur,
        bgVideoSaturation,
        useVideoAudio,
      };
      applyBackgroundVideoPatchToState(optimizedPatch);
      shareBackgroundVideoWithTemplates(optimizedPatch);
      setVideoUploadMsg(
        `Trecho otimizado pronto (${(d.size / 1024 / 1024).toFixed(1)} MB). O bruto foi descartado.`
      );
      return optimizedPatch;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      setVideoUploadMsg(`Erro: ${message}`);
      return null;
    } finally {
      setProcessingVideoClip(false);
    }
  }

  function clearBgVideo() {
    setBgVideo('');
    setBgVideoStartSec(0);
    setBgTrimPreviewTime(0);
    setBgTrimTimecodeInput(formatTimecode(0));
    setBgVideoDuration(0);
    setBgVideoNeedsTrim(false);
    setBgVideoOriginalName('');
    setBgVideoLocalAsset(null);
    setVideoUploadMsg('');
  }

  async function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setVideoUploadMsg('Enviando imagem de fundo…');

    try {
      const formData = new FormData();
      formData.append('background', file);
      const r = await fetch('/api/upload-background', { method: 'POST', body: formData });
      const d = await r.json();

      if (!d.ok) {
        setVideoUploadMsg(`Erro: ${d.error}`);
        return;
      }

      setBgVideo(d.backgroundSrc);
      setBgVideoStartSec(0);
      setBgTrimPreviewTime(0);
      setBgTrimTimecodeInput(formatTimecode(0));
      setBgVideoDuration(0);
      setBgVideoNeedsTrim(false);
      setBgVideoOriginalName(file.name);
      setBgVideoLocalAsset(null);
      setVideoUploadMsg(`Imagem de fundo pronta: ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      setVideoUploadMsg(`Erro: ${message}`);
    } finally {
      setUploadingVideo(false);
      if (bgImageInputRef.current) bgImageInputRef.current.value = '';
    }
  }

  function readMediaDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mpeg|mpg|mkv|avi|3gp|3gpp)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|aif|aiff)$/i.test(file.name);

      if (!isVideo && !isAudio) {
        resolve(0);
        return;
      }

      const mediaUrl = URL.createObjectURL(file);
      const media: HTMLMediaElement = isVideo
        ? document.createElement('video')
        : document.createElement('audio');
      media.preload = 'metadata';
      media.src = mediaUrl;
      media.onloadedmetadata = () => {
        const duration = Number.isFinite(media.duration) ? media.duration : 0;
        URL.revokeObjectURL(mediaUrl);
        resolve(duration);
      };
      media.onerror = () => {
        URL.revokeObjectURL(mediaUrl);
        resolve(0);
      };
    });
  }

  function readVideoDuration(file: File): Promise<number> {
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mpeg|mpg|mkv|avi|3gp|3gpp)$/i.test(file.name)) {
      return Promise.resolve(0);
    }
    return readMediaDuration(file);
  }

  async function uploadFont(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = prompt('Nome da fonte:', file.name.replace(/\.[^/.]+$/, ''));
    if (!label) return;
    const category = prompt(
      'Categoria? (display / sans / special)',
      'display'
    ) as 'display' | 'sans' | 'special';
    const weight = parseInt(prompt('Peso (ex: 400, 700, 900):', '700') ?? '700', 10);
    const formData = new FormData();
    formData.append('font', file);
    formData.append('label', label);
    formData.append('category', category || 'display');
    formData.append('weight', String(weight));
    const r = await fetch('/api/fonts/upload', { method: 'POST', body: formData });
    const d = await r.json();
    if (d.ok) {
      setUserFonts((u) => [d.font, ...u]);
      // Recarrega o CSS dinâmico
      const linkEl = document.querySelector(
        'link[href="/api/fonts/css"]'
      ) as HTMLLinkElement | null;
      if (linkEl) {
        linkEl.href = `/api/fonts/css?t=${Date.now()}`;
      }
    } else {
      alert(`Erro: ${d.error}`);
    }
    if (fontInputRef.current) fontInputRef.current.value = '';
  }

  async function deleteUserFont(id: string) {
    if (!confirm('Remover essa fonte?')) return;
    await fetch(`/api/fonts/upload?id=${id}`, { method: 'DELETE' });
    setUserFonts((u) => u.filter((f) => f.id !== id));
  }

  function uploadOverlayChunkWithProgress(
    chunk: Blob,
    uploadUrl: string,
    contentType: string,
    onChunkProgress: (progress: number) => void
  ) {
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.responseType = 'json';
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || event.total <= 0) return;
        onChunkProgress(Math.min(1, event.loaded / event.total));
      };

      xhr.onload = () => {
        const data = xhr.response || (() => {
          try {
            return JSON.parse(xhr.responseText || '{}');
          } catch {
            return null;
          }
        })();

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
          return;
        }

        reject(new Error(data?.error || `Upload falhou (${xhr.status}).`));
      };

      xhr.onerror = () => reject(new Error('Falha de rede durante o upload do overlay.'));
      xhr.onabort = () => reject(new Error('Upload de overlay cancelado.'));
      xhr.send(chunk);
    });
  }

  async function uploadOverlayVideoInChunks(file: File, label: string, durationSec: number) {
    const chunkSize = 8 * 1024 * 1024;
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
    const uploadId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let finalData: any = null;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const isLastChunk = chunkIndex === totalChunks - 1;
      const params = new URLSearchParams({
        chunked: '1',
        uploadId,
        chunkIndex: String(chunkIndex),
        totalChunks: String(totalChunks),
        totalSize: String(file.size),
        filename: file.name,
        label,
        blendMode: 'screen',
        ...(durationSec > 0 ? { durationSec: String(durationSec) } : {}),
      });

      setOverlayUploadMsg(
        isLastChunk
          ? 'Enviando ultima parte. Depois vou converter o alpha para o player...'
          : `Enviando overlay pesado em partes (${chunkIndex + 1}/${totalChunks})...`
      );

      const data = await uploadOverlayChunkWithProgress(
        chunk,
        `/api/upload-overlay?${params.toString()}`,
        file.type || 'application/octet-stream',
        (chunkProgress) => {
          const overall = ((chunkIndex + chunkProgress) / totalChunks) * 100;
          setOverlayUploadProgress(Math.min(99, Math.round(overall)));
        }
      );

      if (!data?.ok) {
        throw new Error(data?.error || 'Falha ao subir overlay.');
      }

      if (isLastChunk) {
        setOverlayUploadMsg('Upload completo. Processando overlay alpha na VPS...');
      }

      if (data.overlay) {
        finalData = data;
      }
    }

    return finalData || { ok: false, error: 'Upload terminou sem retornar o overlay processado.' };
  }

  async function uploadOverlay(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = prompt('Nome do overlay (ex: Film Burn 01):', file.name);
    if (!label) return;
    setUploadingOverlay(true);
    setOverlayUploadProgress(0);
    setOverlayUploadMsg('Preparando overlay...');

    try {
      const durationSec = await readVideoDuration(file);
      const isVideoOverlay = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
      const d = isVideoOverlay
        ? await uploadOverlayVideoInChunks(file, label, durationSec)
        : await (async () => {
          const formData = new FormData();
          formData.append('overlay', file);
          formData.append('label', label);
          formData.append('blendMode', 'screen');
          if (durationSec > 0) formData.append('durationSec', String(durationSec));
          const r = await fetch('/api/upload-overlay', { method: 'POST', body: formData });
          return r.json();
        })();

      if (d.ok) {
        setOverlayAssets((o) => [d.overlay, ...o]);
        setOverlayUploadProgress(100);
        setOverlayUploadMsg('Overlay pronto na biblioteca.');
      } else {
        alert(`Erro: ${d.error}`);
      }
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : 'Falha ao subir overlay.'}`);
    } finally {
      setUploadingOverlay(false);
      setTimeout(() => {
        setOverlayUploadProgress(null);
        setOverlayUploadMsg('');
      }, 900);
      if (overlayInputRef.current) overlayInputRef.current.value = '';
    }
  }

  function addOverlayInstance(asset: OverlayAsset) {
    const isElement = asset.type === 'image';
    const id = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setOverlays((arr) => [
      ...arr,
      {
        id,
        src: asset.path,
        type: asset.type,
        startSec: 0,
        durationSec: durationSeconds,
        opacity: isElement ? 1 : 0.45,
        blendMode: isElement ? 'normal' : 'screen',
        loopMode: 'normal',
        loopEnabled: false,
        sourceDurationSec: asset.type === 'video' ? asset.durationSec ?? durationSeconds : undefined,
        layout: isElement ? 'element' : 'cover',
        x: 0,
        y: 0,
        scale: isElement ? 0.42 : 1,
        rotate: 0,
        entryTransition: isElement ? 'bounce-left' : 'none',
        entryDurationFrames: 18,
        wigglePosition: isElement ? 8 : 0,
        wiggleRotate: isElement ? 2.5 : 0,
        wiggleSpeed: 1,
        shadowBlur: 0,
        shadowOpacity: 0,
        shadowColor: '#000000',
        outlineWidth: 0,
        outlineColor: '#ffffff',
        gradientEnabled: false,
        gradientFrom: '#1ed760',
        gradientTo: '#8b5cf6',
        gradientOpacity: 0.35,
        tintEnabled: false,
        tintColor: '#ffffff',
        tintOpacity: 1,
        label: asset.label,
      },
    ]);
    if (isElement) {
      setSelectedOverlayId(id);
      selectStudioTool('overlay');
    }
  }

  async function deleteOverlayAsset(id: string) {
    if (!confirm('Remover esse overlay da biblioteca? (Instâncias já no projeto continuam.)')) return;
    await fetch(`/api/upload-overlay?id=${id}`, { method: 'DELETE' });
    setOverlayAssets((arr) => arr.filter((o) => o.id !== id));
  }

  // ── OVERLAY PRESETS (biblioteca reutilizável por template) ──────────────
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/overlay-presets?template=${template}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok) setOverlayPresets(d.presets ?? []);
      })
      .catch(() => {
        /* silencioso */
      });
    return () => {
      cancelled = true;
    };
  }, [template]);

  // Captura um frame do overlay (vídeo) num <video> offscreen → JPEG dataURL.
  // É same-origin (uploads servidos pelo próprio app), então o canvas não é
  // "tainted" e o toDataURL funciona.
  async function captureOverlayThumb(src: string, localSec: number): Promise<string | undefined> {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.src = src;
      await new Promise<void>((res, rej) => {
        video.onloadeddata = () => res();
        video.onerror = () => rej(new Error('load'));
        window.setTimeout(() => rej(new Error('timeout')), 8000);
      });
      const t = Math.max(0, Math.min((video.duration || 0.1) - 0.05, localSec));
      await new Promise<void>((res) => {
        video.onseeked = () => res();
        video.currentTime = t;
        window.setTimeout(() => res(), 3000);
      });
      const w = 240;
      const ratio = (video.videoHeight || 16) / (video.videoWidth || 9);
      const h = Math.max(1, Math.round(w * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.fillStyle = '#0a0a0e';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch {
      return undefined;
    }
  }

  async function saveOverlayPreset() {
    const ov = (overlays.find((o) => o.id === selectedOverlayId) ?? overlays[0]) as any;
    if (!ov) {
      alert('Aplique um overlay no projeto antes de salvar como preset.');
      return;
    }
    const label = window.prompt('Nome do preset (aparece pro cliente):', ov.label || 'Overlay');
    if (!label) return;

    setSavingOverlayPreset(true);
    try {
      const localSec = Math.max(0, timelineSec - (ov.startSec ?? 0));
      const thumbnail =
        ov.type === 'video' ? await captureOverlayThumb(ov.src, localSec) : (ov.src as string);
      const { id: _omitId, ...placement } = ov;
      const r = await fetch('/api/overlay-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          template,
          type: ov.type === 'image' ? 'image' : 'video',
          thumbnail,
          placement,
        }),
      }).then((x) => x.json());
      if (!r.ok) throw new Error(r.error || 'Falha ao salvar.');
      setOverlayPresets((prev) => [r.preset, ...prev]);
    } catch (e) {
      alert('Erro ao salvar preset: ' + (e instanceof Error ? e.message : 'desconhecido'));
    } finally {
      setSavingOverlayPreset(false);
    }
  }

  function applyOverlayPreset(preset: OverlayPresetItem) {
    const id = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setOverlays((arr) => [...arr, { ...(preset.placement as any), id }]);
    setSelectedOverlayId(id);
  }

  async function removeOverlayPreset(id: string) {
    if (!confirm('Remover esse preset da biblioteca deste template?')) return;
    try {
      await fetch(`/api/overlay-presets?id=${id}`, { method: 'DELETE' });
    } catch {
      /* silencioso */
    }
    setOverlayPresets((prev) => prev.filter((p) => p.id !== id));
  }

  function updateOverlay(id: string, patch: Partial<OverlayPlacement>) {
    setOverlays((arr) => arr.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function removeOverlay(id: string) {
    setOverlays((arr) => arr.filter((o) => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  }

  const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null;
  const selectedElement = selectedOverlay?.type === 'image' && (selectedOverlay.layout ?? 'element') === 'element'
    ? selectedOverlay
    : null;

  function uploadAudioChunkWithProgress(
    chunk: Blob,
    uploadUrl: string,
    contentType: string,
    onChunkProgress: (progress: number) => void
  ) {
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.responseType = 'json';
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || event.total <= 0) return;
        onChunkProgress(Math.min(1, event.loaded / event.total));
      };

      xhr.onload = () => {
        const data = xhr.response || (() => {
          try {
            return JSON.parse(xhr.responseText || '{}');
          } catch {
            return null;
          }
        })();

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
          return;
        }

        reject(new Error(data?.error || `Upload de áudio falhou (${xhr.status}).`));
      };

      xhr.onerror = () => reject(new Error('Falha de rede durante o upload do áudio.'));
      xhr.onabort = () => reject(new Error('Upload de áudio cancelado.'));
      xhr.send(chunk);
    });
  }

  async function uploadAudioInChunks(file: File, durationSec: number) {
    const chunkSize = 8 * 1024 * 1024;
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
    const uploadId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let finalData: any = null;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const isLastChunk = chunkIndex === totalChunks - 1;
      const params = new URLSearchParams({
        chunked: '1',
        uploadId,
        chunkIndex: String(chunkIndex),
        totalChunks: String(totalChunks),
        totalSize: String(file.size),
        filename: file.name,
        ...(durationSec > 0 ? { durationSec: String(durationSec) } : {}),
      });

      setAudioUploadMsg(
        isLastChunk
          ? 'Enviando última parte. Depois vou extrair e normalizar o áudio...'
          : `Enviando áudio/vídeo em partes (${chunkIndex + 1}/${totalChunks})...`
      );

      const data = await uploadAudioChunkWithProgress(
        chunk,
        `/api/upload-audio?${params.toString()}`,
        file.type || 'application/octet-stream',
        (chunkProgress) => {
          const overall = ((chunkIndex + chunkProgress) / totalChunks) * 100;
          setAudioUploadProgress(Math.min(99, Math.round(overall)));
        }
      );

      if (!data?.ok) {
        throw new Error(data?.error || 'Falha ao subir áudio.');
      }

      if (isLastChunk) {
        setAudioUploadMsg('Upload completo. Preparando faixa de áudio na VPS...');
      }

      if (data.audioSrc) {
        finalData = data;
      }
    }

    return finalData || { ok: false, error: 'Upload terminou sem retornar o áudio processado.' };
  }

  async function uploadAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    setAudioUploadProgress(0);
    setAudioUploadMsg('Preparando arquivo...');

    try {
      const localDuration = await readMediaDuration(file);
      const d = await uploadAudioInChunks(file, localDuration);

      if (!d.ok || !d.audioSrc) {
        throw new Error(d.error || 'Falha ao preparar áudio.');
      }

      const nextDuration = Number(d.durationSec || localDuration || 0);
      const nextAudioPatch: SharedAudioPatch = {
        audioSrc: d.audioSrc,
        audioDuration: nextDuration,
        audioOriginalName: d.originalName || file.name,
        audioStartSec: 0,
        audioVolume,
        audioFadeIn,
        audioFadeOut,
        useVideoAudio: false,
      };
      applyAudioPatchToState(nextAudioPatch);
      shareAudioWithTemplates(nextAudioPatch);
      setAudioUploadProgress(100);
      setAudioUploadMsg(d.sourceKind === 'video' ? 'Áudio extraído do vídeo e aplicado aos templates.' : 'Áudio aplicado aos templates.');
    } catch (err) {
      alert(`Erro no upload/processamento do áudio: ${err instanceof Error ? err.message : 'Falha desconhecida.'}`);
    } finally {
      setUploadingAudio(false);
      window.setTimeout(() => {
        setAudioUploadProgress(null);
        setAudioUploadMsg('');
      }, 1200);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  }

  function clearAudio() {
    setAudioSrc('');
    setAudioDuration(0);
    setAudioOriginalName('');
    setAudioStartSec(0);
    setAudioPreviewTime(0);
    setAudioStartTimecodeInput(formatTimecode(0));
    if (bgVideo) setUseVideoAudio(true);
  }

  async function uploadPlatformLogo(platform: string, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('platform', platform);
    const r = await fetch('/api/platform-logos', { method: 'POST', body: formData });
    const d = await r.json();
    if (d.ok) {
      setCustomLogos((m) => ({ ...m, [platform]: d.logo.path }));
      setPlatformsSel((prev) => prev.includes(platform as PlatformName) ? prev : [...prev, platform as PlatformName]);
    } else {
      alert(`Erro: ${d.error}`);
    }
    const ref = platformLogoInputRefs.current[platform];
    if (ref) ref.value = '';
  }

  async function removePlatformLogo(platform: string) {
    if (!confirm(`Remover logo customizado de ${platform}?`)) return;
    await fetch(`/api/platform-logos?platform=${encodeURIComponent(platform)}`, { method: 'DELETE' });
    setCustomLogos((m) => {
      const cp = { ...m };
      delete cp[platform];
      return cp;
    });
  }

  function resetMotion() {
    const useFactory = template === 'available_now';
    const m = useFactory ? factoryMotion : {};
    const bg = ((m as any).background ?? {}) as Record<string, any>;
    const poster = useFactory ? factoryPosterFrame : {};

    setFontHeadline((m as any).fontHeadline ?? DEFAULT_FONTS.headline);
    setFontDate((m as any).fontDate ?? DEFAULT_FONTS.date);
    setFontCta((m as any).fontCta ?? DEFAULT_FONTS.cta);
    setFontCta1((m as any).fontCta1 ?? (m as any).fontCta ?? DEFAULT_FONTS.cta);
    setFontCta2((m as any).fontCta2 ?? (m as any).fontCta ?? DEFAULT_FONTS.cta);
    setCoverSize((m as any).coverSize ?? 510);
    setCoverY((m as any).coverY ?? 0);
    setCoverX((m as any).coverX ?? 0);
    setCoverMotion(normalizeCoverMotionId((m as any).coverMotion));
    setSpinTurns((m as any).spinTurns ?? 2);
    setWiggleIntensity((m as any).wiggleIntensity ?? 1);
    setWiggleH((m as any).wiggleHeadline ?? DEFAULT_TEXT_WIGGLE_VALUES.headline);
    setWiggleD((m as any).wiggleDate ?? DEFAULT_TEXT_WIGGLE_VALUES.date);
    setWiggleC((m as any).wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta);
    setWiggleCta1((m as any).wiggleCta1 ?? (m as any).wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta1);
    setWiggleCta2((m as any).wiggleCta2 ?? (m as any).wiggleCta ?? DEFAULT_TEXT_WIGGLE_VALUES.cta2);
    setParticlesEnabled((m as any).particlesEnabled ?? true);
    setFinalFlash((m as any).finalFlash ?? true);
    setGlowColor((m as any).glowColor ?? GLOW_PRESETS[0].color);
    setTrHeadline((m as any).transitionHeadline ?? 'mask_reveal');
    setTrDate((m as any).transitionDate ?? 'scale_pop');
    setTrCta((m as any).transitionCta ?? 'split_letters');
    setTrCta1((m as any).transitionCta1 ?? (m as any).transitionCta ?? 'scale_pop');
    setTrCta2((m as any).transitionCta2 ?? (m as any).transitionCta ?? 'split_letters');
    setTransitionTuning(useFactory ? transitionTuningFromMotion(m as any) : createDefaultTransitionTuningState());
    setStyleHeadline(mergeTextStyle(HEADLINE_STYLE_DEFAULTS, (m as any).styleHeadline));
    setStyleDate(mergeTextStyle(DATE_STYLE_DEFAULTS, (m as any).styleDate));
    setStyleCta(mergeTextStyle(CTA_STYLE_DEFAULTS, (m as any).styleCta));
    setStyleCta1(mergeTextStyle(CTA_STYLE_DEFAULTS, (m as any).styleCta1 ?? (m as any).styleCta));
    setStyleCta2(mergeTextStyle(CTA_STYLE_DEFAULTS, (m as any).styleCta2 ?? (m as any).styleCta));
    setTxScale(useFactory ? factoryTextMetrics.scale : { headline: 1, date: 1, cta: 1, cta1: 1, cta2: 1 });
    setTxLS(useFactory ? factoryTextMetrics.letterSpacing : { headline: 0, date: 0, cta: 0, cta1: 0, cta2: 0 });
    setTxLH(useFactory ? factoryTextMetrics.lineHeight : { headline: 1.2, date: 1.2, cta: 1.3, cta1: 1.3, cta2: 1.3 });
    setTxOX(useFactory ? factoryTextMetrics.offsetX : { headline: 0, date: 0, cta: 0, cta1: 0, cta2: 0 });
    setTxOY(useFactory ? factoryTextMetrics.offsetY : { headline: 0, date: 0, cta: 0, cta1: 0, cta2: 0 });
    setStrokeHeadline(textStrokeFromFactory((m as any).strokeHeadline));
    setStrokeDate(textStrokeFromFactory((m as any).strokeDate));
    setStrokeCta(textStrokeFromFactory((m as any).strokeCta));
    setStrokeCta1(textStrokeFromFactory((m as any).strokeCta1 ?? (m as any).strokeCta));
    setStrokeCta2(textStrokeFromFactory((m as any).strokeCta2 ?? (m as any).strokeCta));
    setTextOpacity((m as any).textOpacity ?? 1);
    setCta1InFrame((m as any).cta1InFrame ?? CTA_TIMING_DEFAULTS.cta1InFrame);
    setCtaSwapFrame((m as any).ctaSwapFrame ?? CTA_TIMING_DEFAULTS.ctaSwapFrame);
    setCta2InFrame((m as any).cta2InFrame ?? CTA_TIMING_DEFAULTS.cta2InFrame);
    setTextInFrames(useFactory ? {
      headline: (m as any).headlineInFrame,
      date: (m as any).dateInFrame,
      cta1: (m as any).cta1InFrame,
      cta2: (m as any).cta2InFrame,
    } : {});
    setLogosInFrame((m as any).logosInFrame ?? CTA_TIMING_DEFAULTS.logosInFrame);
    setPlatformLogoPack(((m as any).platformLogoPack ?? 'round') as PlatformLogoPackId);
    setCustomLogos((m as any).customLogos ?? {});
    setPlatformLogoSize((m as any).platformLogoSize ?? 58);
    setPlatformLogoGap((m as any).platformLogoGap ?? 18);
    setPlatformLogoScales((m as any).platformLogoScales ?? {});
    setPlatformLogoX((m as any).platformLogoX ?? 0);
    setPlatformLogoY((m as any).platformLogoY ?? 0);
    setMilestoneLogoSize((m as any).milestoneLogoSize ?? 84);
    setMilestoneLogoX((m as any).milestoneLogoX ?? 0);
    setMilestoneLogoY((m as any).milestoneLogoY ?? 0);
    setPlatformLogoTintEnabled((m as any).platformLogoTintEnabled ?? false);
    setPlatformLogoTintColor((m as any).platformLogoTintColor ?? '#ffffff');
    setDurationSeconds((factoryAvailableNow.durationSeconds ?? (m as any).durationSeconds) ?? 8);
    setPosterFrameEnabled(poster.enabled ?? false);
    setPosterFrameSec(poster.frameSec ?? 3);
    setPosterHoldSec(poster.holdSec ?? 1);
    setPosterOutroEnabled(poster.outroEnabled ?? true);
    setBgVideo(bg.videoSrc ?? '');
    setBgVideoStartSec(typeof bg.videoStartFrame === 'number' ? bg.videoStartFrame / 30 : 0);
    setBgVideoDuration(bg.videoDurationSec ?? 0);
    setBgVideoLocalAsset((bg.localAsset as LocalAssetRef | undefined) ?? null);
    setBgVideoOpacity(bg.videoOpacity ?? 1);
    setBgColor(bg.bgColor ?? '#030205');
    setBgVideoBlur(bg.videoBlur ?? 22);
    setBgVideoSaturation(bg.videoSaturation ?? 1.15);
    setOverlays((m as any).overlays ?? []);
    setAudioSrc(bg.audioSrc ?? '');
    setAudioStartSec(bg.audioStartSec ?? 0);
    setAudioVolume(bg.audioVolume ?? 0.8);
    setAudioFadeIn(bg.audioFadeInSec ?? 0.5);
    setAudioFadeOut(bg.audioFadeOutSec ?? 1);
    setAudioDuration(bg.audioDurationSec ?? 0);
    setAudioOriginalName(bg.audioOriginalName ?? '');
    setAudioPreviewTime(bg.audioStartSec ?? 0);
    setAudioStartTimecodeInput(formatTimecode(bg.audioStartSec ?? 0));
    setUseVideoAudio(bg.useVideoAudio ?? true);
  }

  function useCurrentPlayerFrameAsPoster() {
    const player = playerRef.current as any;
    const frame = typeof player?.getCurrentFrame === 'function' ? player.getCurrentFrame() : 0;
    const seconds = Math.max(0, Number((frame / 30).toFixed(2)));

    setPosterFrameSec(seconds);
    setPosterFrameEnabled(true);
    setSaveMessage(`Frame ${frame} (${seconds}s) salvo como capa do vídeo.`);
  }

  // ============================================================
  // GÊNERO MUSICAL — aplica preset de estilo na config atual
  // ============================================================
  function applyGenrePreset(preset: GenrePreset) {
    const c = preset.config ?? {};
    const applyTextMetrics = (role: string, style?: Record<string, any>) => {
      if (!style) return;

      if (typeof style.scale === 'number') {
        setTxScale((prev) => ({ ...prev, [role]: style.scale }));
      }
      if (typeof style.letterSpacing === 'number') {
        setTxLS((prev) => ({ ...prev, [role]: style.letterSpacing }));
      }
      if (typeof style.lineHeight === 'number') {
        setTxLH((prev) => ({ ...prev, [role]: style.lineHeight }));
      }
      if (typeof style.offsetX === 'number') {
        setTxOX((prev) => ({ ...prev, [role]: style.offsetX }));
      }
      if (typeof style.offsetY === 'number') {
        setTxOY((prev) => ({ ...prev, [role]: style.offsetY }));
      }
    };

    if (typeof c.template === 'string' && templateOrder.includes(c.template as TemplateId)) {
      switchTemplate(c.template as TemplateId);
    } else if (preset.id === 'brazu_phone_spotify') {
      switchTemplate('spotify_print');
    }

    if (typeof c.metricPrefix === 'string') setMetricPrefix(c.metricPrefix);
    if (typeof c.metricNumber === 'string') setMetricNumber(c.metricNumber);
    if (typeof c.metricLabel === 'string') setMetricLabel(c.metricLabel);
    if (Array.isArray(c.platformsSel)) setPlatformsSel(c.platformsSel);

    if (c.fontHeadline) setFontHeadline(c.fontHeadline);
    if (c.fontDate) setFontDate(c.fontDate);
    if (c.fontCta) setFontCta(c.fontCta);
    if (c.fontCta1) setFontCta1(c.fontCta1);
    if (c.fontCta2) setFontCta2(c.fontCta2);

    if (c.trHeadline) setTrHeadline(c.trHeadline);
    if (c.trDate) setTrDate(c.trDate);
    if (c.trCta1) setTrCta1(c.trCta1);
    if (c.trCta2) setTrCta2(c.trCta2);

    if (c.coverMotion) setCoverMotion(c.coverMotion);
    if (typeof c.coverSize === 'number') setCoverSize(c.coverSize);
    if (typeof c.coverY === 'number') setCoverY(c.coverY);
    if (typeof c.coverX === 'number') setCoverX(c.coverX);
    if (typeof c.spinTurns === 'number') setSpinTurns(c.spinTurns);
    if (typeof c.phoneSize === 'number') setPhoneSize(c.phoneSize);
    if (typeof c.phoneX === 'number') setPhoneX(c.phoneX);
    if (typeof c.phoneY === 'number') setPhoneY(c.phoneY);
    if (typeof c.phoneTilt === 'number') setPhoneTilt(c.phoneTilt);
    if (c.phoneMotion) setPhoneMotion(c.phoneMotion);
    if (typeof c.phoneSpinTurns === 'number') setPhoneSpinTurns(c.phoneSpinTurns);
    if (typeof c.phoneWiggle === 'number') setPhoneWiggle(c.phoneWiggle);
    if (typeof c.phoneDynamicIsland === 'boolean') setPhoneDynamicIsland(c.phoneDynamicIsland);
    if (typeof c.platformLogoSize === 'number') setPlatformLogoSize(c.platformLogoSize);
    if (typeof c.platformLogoGap === 'number') setPlatformLogoGap(c.platformLogoGap);
    if (c.platformLogoScales && typeof c.platformLogoScales === 'object') setPlatformLogoScales(c.platformLogoScales);
    if (typeof c.platformLogoX === 'number') setPlatformLogoX(c.platformLogoX);
    if (typeof c.platformLogoY === 'number') setPlatformLogoY(c.platformLogoY);
    if (typeof c.milestoneLogoSize === 'number') setMilestoneLogoSize(c.milestoneLogoSize);
    if (typeof c.milestoneLogoX === 'number') setMilestoneLogoX(c.milestoneLogoX);
    if (typeof c.milestoneLogoY === 'number') setMilestoneLogoY(c.milestoneLogoY);
    if (typeof c.platformLogoTintEnabled === 'boolean') setPlatformLogoTintEnabled(c.platformLogoTintEnabled);
    if (typeof c.platformLogoTintColor === 'string') setPlatformLogoTintColor(c.platformLogoTintColor);
    if (typeof c.platformLogoPack === 'string') setPlatformLogoPack(c.platformLogoPack as PlatformLogoPackId);
    if (typeof c.wiggleIntensity === 'number') setWiggleIntensity(c.wiggleIntensity);
    if (typeof c.particlesEnabled === 'boolean') setParticlesEnabled(c.particlesEnabled);
    if (typeof c.finalFlash === 'boolean') setFinalFlash(c.finalFlash);
    if (c.glowColor) setGlowColor(c.glowColor);
    if (c.bgColor) setBgColor(c.bgColor);
    if (typeof c.durationSeconds === 'number') setDurationSeconds(c.durationSeconds);

    if (c.styleHeadline) setStyleHeadline((prev) => ({ ...prev, ...c.styleHeadline }));
    if (c.styleCta) setStyleCta((prev) => ({ ...prev, ...c.styleCta }));
    if (c.styleDate) setStyleDate((prev) => ({ ...prev, ...c.styleDate }));
    if (c.styleCta1) setStyleCta1((prev) => ({ ...prev, ...c.styleCta1 }));
    if (c.styleCta2) setStyleCta2((prev) => ({ ...prev, ...c.styleCta2 }));
    applyTextMetrics('headline', c.styleHeadline);
    applyTextMetrics('date', c.styleDate);
    applyTextMetrics('cta', c.styleCta);
    applyTextMetrics('cta1', c.styleCta1);
    applyTextMetrics('cta2', c.styleCta2);
    if (c.txScale) setTxScale((prev) => ({ ...prev, ...c.txScale }));
    if (c.txLS) setTxLS((prev) => ({ ...prev, ...c.txLS }));
    if (c.txLH) setTxLH((prev) => ({ ...prev, ...c.txLH }));
    if (c.txOX) setTxOX((prev) => ({ ...prev, ...c.txOX }));
    if (c.txOY) setTxOY((prev) => ({ ...prev, ...c.txOY }));

    // Strokes (contorno) — característica visual forte de cada gênero
    if (c.strokeHeadline) setStrokeHeadline((prev) => ({ ...prev, ...c.strokeHeadline }));
    if (c.strokeDate) setStrokeDate((prev) => ({ ...prev, ...c.strokeDate }));
    if (c.strokeCta) setStrokeCta((prev) => ({ ...prev, ...c.strokeCta }));
    if (c.strokeCta1) {
      setStrokeCta1((prev) => ({ ...prev, ...c.strokeCta1 }));
      setStrokeCta2((prev) => ({ ...prev, ...c.strokeCta1 }));
    }
    if (c.strokeCta2) setStrokeCta2((prev) => ({ ...prev, ...c.strokeCta2 }));

    setActiveGenreId(preset.id);
    setSaveMessage(`Estilo "${preset.label}" aplicado · fontes, cores, contorno e motion atualizados.`);
  }

  // ============================================================
  // AI AUTO-TEMPLATE — analisa capa + gera plano + aplica
  // ============================================================
  // AGENTE BG GENERATOR — OpenAI gpt-image-1 gera background cinematográfico
  // AGENTE REFERENCE ANALYZER — sobe imagem de motion e Claude extrai estética
  async function uploadReferenceImage(file: File) {
    setAiReferenceBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('briefing', `Headline: ${headline}. Estilo desejado: extrair fielmente.`);
      const res = await fetch('/api/ai/analyze-reference', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.ok) {
        alert(`Falha ao analisar referência: ${data.error}`);
        return;
      }
      setAiReferenceUrl(data.referenceUrl);
      setAiReferenceAnalysis(data.analysis.motionDirectorBrief ?? '');
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`);
    } finally {
      setAiReferenceBusy(false);
    }
  }

  function clearReference() {
    setAiReferenceUrl('');
    setAiReferenceAnalysis('');
  }

  async function runAiGenerateBg() {
    if (!coverImage) {
      setAiBgMessage('Faça upload da capa primeiro.');
      return;
    }
    setAiBgBusy(true);
    setAiBgMessage('🎨 Gerando fundo cinematográfico (Claude analisa + DALL-E cria)…');
    try {
      const res = await fetch('/api/ai/generate-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverUrl: coverImage,
          briefing: `Motion graphic pra ${template}. Headline: "${headline}".`,
          quality: 'medium',
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAiBgMessage(`❌ ${data.error}`);
        return;
      }
      // Aplica o BG gerado — defaults otimizados pra IMAGEM (não vídeo borrado)
      // URL absoluta funciona melhor no Remotion player
      const bgFinalUrl = data.bg.url.startsWith('/') ? `${window.location.origin}${data.bg.url}` : data.bg.url;
      setBgVideo(bgFinalUrl);
      setBgVideoStartSec(0);
      setBgVideoDuration(durationSeconds);
      setBgVideoOpacity(1.0);     // 100% visível
      setBgVideoBlur(2);           // blur mínimo (era 22 = manchão)
      setBgVideoSaturation(1.05);  // saturação quase normal
      setAiBgMessage(`✨ Fundo aplicado (mood: ${data.visual.mood?.[0] ?? 'auto'}) · ~$${data.bg.costEstimateUsd.toFixed(3)} · recarregue se não aparecer (Cmd+R)`);
    } catch (e) {
      setAiBgMessage(`❌ ${e instanceof Error ? e.message : 'erro'}`);
    } finally {
      setAiBgBusy(false);
    }
  }

  async function runAiAutoTemplate() {
    if (!coverImage) {
      setAiMessage('Faça upload da capa antes de usar a IA.');
      return;
    }

    setAiBusy(true);
    setAiMessage('🎨 Analisando a capa…');

    try {
      const briefing = `Headline atual: "${headline}". CTA: "${cta}". Plataformas: ${platformsSel.join(', ')}. Template atual: ${template}.`;
      const targetFormats = target === 'feed' ? ['square'] : ['story'];
      const texts = { headline, cta, date: releaseDate, label: metricLabel, number: metricNumber, title: metricPrefix };

      setAiMessage('🎨 Cascata IA: análise → decisão criativa…');
      const res = await fetch('/api/ai/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverUrl: coverImage,
          texts,
          briefing,
          targetFormats,
          referenceUrl: aiReferenceUrl || undefined,
          referenceAnalysis: aiReferenceAnalysis || undefined,
          noCache: true,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setAiMessage(`❌ Falha: ${data.error ?? 'erro desconhecido'}`);
        return;
      }

      setAiMessage('🎨 Aplicando no Studio…');
      const plan = data.plan;
      const styleColors = plan.style ?? {};
      // Payload completo retornado pelo Claude (com motion config rico)
      const full = (plan as any)._fullMotion ?? {};
      const fm = full.motion ?? {};

      // ─── Template ────────────────────────────────────────
      const newTemplate = full.template ?? plan.templateId;
      if (newTemplate && ['available_now','watch_youtube','youtube_subscribe','youtube_views','milestone','out_now','spotify_print'].includes(newTemplate)) {
        switchTemplate(newTemplate as TemplateId);
      }

      // ─── Duração ────────────────────────────────────────
      if (typeof full.durationSeconds === 'number' && full.durationSeconds > 0 && full.durationSeconds <= 60) {
        setDurationSeconds(full.durationSeconds);
      } else if (typeof plan.durationSeconds === 'number' && plan.durationSeconds > 0) {
        setDurationSeconds(plan.durationSeconds);
      }

      // ─── Textos ──────────────────────────────────────────
      if (full.headline) setHeadline(full.headline);
      if (full.cta) setCta(full.cta);
      if (full.cta2) setCta2(full.cta2);
      if (full.releaseDate) setReleaseDate(full.releaseDate);
      if (full.channelName) setChannelName(full.channelName);
      if (full.metricPrefix) setMetricPrefix(full.metricPrefix);
      if (full.metricNumber) setMetricNumber(full.metricNumber);
      if (full.metricLabel) setMetricLabel(full.metricLabel);

      // ─── Plataformas ────────────────────────────────────
      if (Array.isArray(full.platforms) && full.platforms.length > 0) {
        const valid = full.platforms.filter((p: string) => allPlatforms.includes(p as PlatformName));
        if (valid.length > 0) setPlatformsSel(valid as PlatformName[]);
      }

      // ─── Coleta DECISÕES da IA (valida IDs + registra pra UI) ──────
      const decisions: AiDecision[] = [];
      const validFontIds = new Set(allFonts.map((f) => f.id));
      const validTransitions = ['mask_reveal','blur_focus','split_letters','type_writer','slide_stagger','glitch_rgb','scale_pop','rise_clean'];
      const validCoverMotions = ['zoom_bounce','slide_up','slide_left','slide_right','flip_card','vinyl_reveal','slide_up_glow','flip_card_premium','zoom_bounce_intro'];

      const applyFont = (field: string, label: string, value: string | undefined, setter: (v: string) => void) => {
        if (!value) return;
        if (validFontIds.has(value)) {
          setter(value);
          decisions.push({ field, label, chosen: value, applied: true });
        } else {
          decisions.push({ field, label, chosen: value, applied: false, reason: 'ID não existe no catálogo' });
        }
      };
      const applyEnum = (field: string, label: string, value: string | undefined, allowed: string[], setter: (v: any) => void) => {
        if (!value) return;
        if (allowed.includes(value)) {
          setter(value);
          decisions.push({ field, label, chosen: value, applied: true });
        } else {
          decisions.push({ field, label, chosen: value, applied: false, reason: 'valor inválido' });
        }
      };

      // ─── Fontes (escolhidas do catálogo real) ───────────
      applyFont('fontHeadline', 'Fonte Headline', fm.fontHeadline, setFontHeadline);
      applyFont('fontDate', 'Fonte Data', fm.fontDate, setFontDate);
      applyFont('fontCta', 'Fonte CTA', fm.fontCta, setFontCta);
      applyFont('fontCta1', 'Fonte CTA 1', fm.fontCta1, setFontCta1);
      applyFont('fontCta2', 'Fonte CTA 2', fm.fontCta2, setFontCta2);

      // ─── Cover motion + size + Y ────────────────────────
      applyEnum('coverMotion', 'Cover motion', fm.coverMotion, validCoverMotions, setCoverMotion);
      if (typeof fm.coverSize === 'number') {
        const v = Math.max(200, Math.min(900, fm.coverSize));
        setCoverSize(v);
        decisions.push({ field: 'coverSize', label: 'Tamanho da capa', chosen: `${v}px`, applied: true });
      }
      if (typeof fm.coverY === 'number') {
        const v = Math.max(-300, Math.min(300, fm.coverY));
        setCoverY(v);
        decisions.push({ field: 'coverY', label: 'Posição Y da capa', chosen: `${v}px`, applied: true });
      }

      // ─── Transições por elemento ────────────────────────
      applyEnum('transitionHeadline', 'Transição Headline', fm.transitionHeadline, validTransitions, setTrHeadline);
      applyEnum('transitionDate', 'Transição Data', fm.transitionDate, validTransitions, setTrDate);
      applyEnum('transitionCta', 'Transição CTA', fm.transitionCta, validTransitions, setTrCta);
      applyEnum('transitionCta1', 'Transição CTA 1', fm.transitionCta1, validTransitions, setTrCta1);
      applyEnum('transitionCta2', 'Transição CTA 2', fm.transitionCta2, validTransitions, setTrCta2);

      // ─── Wiggle, particles, flash, glow ─────────────────
      if (typeof fm.wiggleIntensity === 'number') {
        const v = Math.max(0, Math.min(2, fm.wiggleIntensity));
        setWiggleIntensity(v);
        decisions.push({ field: 'wiggleIntensity', label: 'Wiggle (intensidade)', chosen: v.toFixed(2), applied: true });
      }
      if (typeof fm.particlesEnabled === 'boolean') {
        setParticlesEnabled(fm.particlesEnabled);
        decisions.push({ field: 'particles', label: 'Partículas', chosen: fm.particlesEnabled ? 'ON' : 'OFF', applied: true });
      }
      if (typeof fm.finalFlash === 'boolean') {
        setFinalFlash(fm.finalFlash);
        decisions.push({ field: 'finalFlash', label: 'Flash final', chosen: fm.finalFlash ? 'ON' : 'OFF', applied: true });
      }
      if (typeof fm.spinTurns === 'number') {
        setSpinTurns(fm.spinTurns);
        decisions.push({ field: 'spinTurns', label: 'Spin turns', chosen: `${fm.spinTurns}`, applied: true });
      }
      if (fm.glowColor) {
        setGlowColor(fm.glowColor);
        decisions.push({ field: 'glow', label: 'Glow color', chosen: fm.glowColor, applied: true });
      }

      // ─── Estilo de cores por elemento (gradiente) ──────
      const mergeStyle = (s: any) => {
        if (!s) return null;
        return {
          color: s.color ?? '#ffffff',
          useGradient: !!s.useGradient,
          gradientColor1: s.gradientColor1 ?? s.gradientFrom ?? '#ffffff',
          gradientColor2: s.gradientColor2 ?? s.gradientTo ?? '#cccccc',
          gradientFrom: s.gradientColor1 ?? s.gradientFrom ?? '#ffffff',
          gradientTo: s.gradientColor2 ?? s.gradientTo ?? '#cccccc',
          gradientAngle: typeof s.gradientAngle === 'number' ? s.gradientAngle : 120,
          letterSpacing: typeof s.letterSpacing === 'number' ? s.letterSpacing : undefined,
        };
      };
      const h = mergeStyle(fm.styleHeadline); if (h) setStyleHeadline((prev) => ({ ...prev, ...h }));
      const d = mergeStyle(fm.styleDate); if (d) setStyleDate((prev) => ({ ...prev, ...d }));
      const c1 = mergeStyle(fm.styleCta1); if (c1) setStyleCta1((prev) => ({ ...prev, ...c1 }));
      const c2 = mergeStyle(fm.styleCta2); if (c2) setStyleCta2((prev) => ({ ...prev, ...c2 }));

      // ─── Strokes (contornos) ────────────────────────────
      const mergeStroke = (s: any) => {
        if (!s) return null;
        return {
          mode: s.mode ?? 'none',
          width: typeof s.width === 'number' ? s.width : 2,
          color: s.color ?? '#ffffff',
          fillKind: s.fillKind ?? 'solid',
          opacity: typeof s.opacity === 'number' ? s.opacity : 1,
        };
      };
      const sh = mergeStroke(fm.strokeHeadline); if (sh) setStrokeHeadline((prev: any) => ({ ...prev, ...sh }));

      // ─── Estilo headline (cor + gradient) ──────────────
      if (fm.styleHeadline) {
        const c = fm.styleHeadline.color || fm.styleHeadline.gradientColor1;
        const grad = fm.styleHeadline.useGradient ? ` (gradient ${fm.styleHeadline.gradientColor1}→${fm.styleHeadline.gradientColor2})` : '';
        decisions.push({ field: 'styleHeadline', label: 'Cor da headline', chosen: `${c}${grad}`, applied: true });
      }
      if (fm.styleDate?.color) decisions.push({ field: 'styleDate', label: 'Cor da data', chosen: fm.styleDate.color, applied: true });
      if (fm.styleCta1?.color) decisions.push({ field: 'styleCta1', label: 'Cor CTA 1', chosen: fm.styleCta1.color, applied: true });
      if (fm.styleCta2?.color) decisions.push({ field: 'styleCta2', label: 'Cor CTA 2', chosen: fm.styleCta2.color, applied: true });

      // ─── BG color ───────────────────────────────────────
      if (fm.background?.bgColor) {
        setBgColor(fm.background.bgColor);
        decisions.push({ field: 'bgColor', label: 'Cor de fundo', chosen: fm.background.bgColor, applied: true });
      } else if (styleColors.backgroundColor && /^#[0-9a-fA-F]{3,8}$/.test(styleColors.backgroundColor)) {
        setBgColor(styleColors.backgroundColor);
        decisions.push({ field: 'bgColor', label: 'Cor de fundo', chosen: styleColors.backgroundColor, applied: true });
      }

      // ─── Textos ─────────────────────────────────────────
      if (full.headline) decisions.push({ field: 'headline', label: 'Headline', chosen: `"${full.headline}"`, applied: true });
      if (full.cta) decisions.push({ field: 'cta', label: 'CTA', chosen: `"${full.cta}"`, applied: true });
      if (full.template) decisions.push({ field: 'template', label: 'Template', chosen: full.template, applied: true });
      if (typeof full.durationSeconds === 'number') decisions.push({ field: 'duration', label: 'Duração', chosen: `${full.durationSeconds}s`, applied: true });

      // SALVA decisões + rationale + pipeline no state pra UI mostrar
      setAiDecisions(decisions);
      setAiRationale(full.rationale ?? '');
      setAiDecisionsOpen(true);
      if (Array.isArray(data.pipeline)) setAiPipeline(data.pipeline);
      if (typeof data.totalCostEstimateUsd === 'number') setAiTotalCost(data.totalCostEstimateUsd);

      const okCount = decisions.filter((d) => d.applied).length;
      const rejCount = decisions.filter((d) => !d.applied).length;
      const costStr = data.totalCostEstimateUsd != null ? ` · custo ~$${data.totalCostEstimateUsd.toFixed(3)}` : '';
      setAiMessage(`✨ ${okCount} mudanças aplicadas${rejCount > 0 ? ` · ${rejCount} rejeitadas` : ''}${costStr}`);
      return;

      // Mapeia mood -> genre preset (aplica fontes, transições, contorno)
      const categoryToGenre: Record<string, string> = {
        spotify_milestone: 'spotify_cover_plays_stage',
        spotify_single: 'spotify_single_green_halftone',
        spotify_print: 'brazu_phone_spotify',
        spotify_listeners: 'spotify_artist_blue_listeners',
      };
      const moodToGenre: Record<string, string> = {
        neon: 'spotify_single_green_halftone',
        stage: 'spotify_cover_plays_stage',
        premium: 'brazu_phone_spotify',
        elegant: 'indie',
        clean: 'indie',
        gospel: 'gospel',
        sertanejo: 'sertanejo',
        romantic: 'sertanejo',
        youtube: 'pop',
      };
      const detectedMood = String(styleColors.mood ?? '').toLowerCase();
      const detectedCategory = String(plan.category ?? '').toLowerCase();
      const wantsSpotify =
        detectedCategory.includes('spotify') ||
        template === 'spotify_print' ||
        platformsSel.includes('Spotify');
      const targetGenreId =
        categoryToGenre[detectedCategory] ??
        (wantsSpotify ? moodToGenre[detectedMood] : undefined) ??
        moodToGenre[detectedMood] ??
        'spotify_single_green_halftone';
      const matchedGenre = genrePresets.find((g) => g.id === targetGenreId);

      if (matchedGenre) {
        applyGenrePreset(matchedGenre as GenrePreset);
      }

      // Sobrescreve cores/duração com o que a IA propôs (mais específico)
      if (styleColors.backgroundColor && /^#[0-9a-fA-F]{3,8}$/.test(styleColors.backgroundColor)) {
        setBgColor(styleColors.backgroundColor);
      }
      if (styleColors.primaryColor && /^#[0-9a-fA-F]{3,8}$/.test(styleColors.primaryColor)) {
        setGlowColor(styleColors.primaryColor);
      }
      if (typeof plan.durationSeconds === 'number' && plan.durationSeconds > 0 && plan.durationSeconds <= 60) {
        setDurationSeconds(plan.durationSeconds);
      }

      // Aplica textos sugeridos quando vierem da IA
      const aiTexts = plan.texts ?? {};
      if (typeof aiTexts.headline === 'string' && aiTexts.headline.trim()) setHeadline(aiTexts.headline);
      if (typeof aiTexts.number === 'string' && aiTexts.number.trim()) setMetricNumber(aiTexts.number);
      if (typeof aiTexts.label === 'string' && aiTexts.label.trim()) setMetricLabel(aiTexts.label);
      if (typeof aiTexts.title === 'string' && aiTexts.title.trim()) setMetricPrefix(aiTexts.title);

      setAiMessage(`✨ ${detectedCategory || detectedMood || 'auto'} detectado · estilo ${matchedGenre?.label ?? 'genérico'} aplicado`);
    } catch (error) {
      setAiMessage(`Erro: ${error instanceof Error ? error.message : 'desconhecido'}`);
    } finally {
      setAiBusy(false);
    }
  }

  // ============================================================
  // TEMPLATE BUILDER — salva a config atual como preset reutilizável
  // ============================================================
  async function loadSavedTemplates() {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      setSavedTemplates(Array.isArray(data.presets) ? data.presets : []);
    } catch {
      setSavedTemplates([]);
    }
  }

  async function saveAsTemplate() {
    const name = templateBuilderName.trim();
    if (!name) {
      setTemplateBuilderMessage('Dê um nome ao template antes de salvar.');
      return;
    }

    setTemplateBuilderBusy(true);
    setTemplateBuilderMessage('Salvando…');

    try {
      const snapshot = createEditorSnapshot();
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          config: {
            version: 'novacena-template-v1',
            createdAt: new Date().toISOString(),
            app: 'novacena-motion',
            snapshot,
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setTemplateBuilderMessage(`✓ Template "${name}" salvo.`);
        setTemplateBuilderName('');
        await loadSavedTemplates();
      } else {
        setTemplateBuilderMessage(`Falha: ${data.error ?? 'erro desconhecido'}`);
      }
    } catch (error) {
      setTemplateBuilderMessage(`Erro: ${error instanceof Error ? error.message : 'desconhecido'}`);
    } finally {
      setTemplateBuilderBusy(false);
    }
  }

  async function deleteSavedTemplate(id: string) {
    const ok = window.confirm('Excluir este template salvo?');
    if (!ok) return;

    try {
      const res = await fetch(`/api/presets?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setTemplateBuilderMessage('Template excluído.');
        await loadSavedTemplates();
      } else {
        setTemplateBuilderMessage(`Falha ao excluir: ${data.error ?? 'erro desconhecido'}`);
      }
    } catch (error) {
      setTemplateBuilderMessage(`Erro ao excluir: ${error instanceof Error ? error.message : 'desconhecido'}`);
    }
  }

  function downloadSavedTemplate(preset: SavedTemplatePreset) {
    const link = document.createElement('a');
    link.href = `/api/presets?id=${encodeURIComponent(preset.id)}&download=1`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function selectStudioTool(
    tool: StudioToolId,
    options?: {
      sectionOverride?: string;
      textPanelTab?: 'fontes' | 'entrada' | 'cor' | 'layout';
      textRole?: FontRole;
      keepTimelineOpen?: boolean;
    }
  ) {
    // Timeline é um painel flutuante (não uma seção do painel direito):
    // alterna ao clicar e não dispara o scroll de seção.
    if (tool === 'timeline') {
      setActiveStudioTool('timeline');
      setShowTimeline((open) => !open);
      return;
    }
    if (!options?.keepTimelineOpen) {
      setShowTimeline(false);
    }
    setActiveStudioTool(tool);

    if (tool === 'text') {
      setTextPanelTab(options?.textPanelTab ?? 'entrada');
    }

    window.setTimeout(() => {
      const rightPanel = document.querySelector('[data-novacena-right-panel="true"]') as HTMLElement | null;

      // Mapeia tool -> section title via STUDIO_TOOL_DOCK e acha a seção real
      // pelo data-right-panel-section (que se move junto com a ordem drag/drop).
      const dockEntry = STUDIO_TOOL_DOCK.find((entry) => entry.id === tool);
      const sectionTitle = options?.sectionOverride ?? dockEntry?.section;
      const scopedQuery = (selector: string) => rightPanel?.querySelector(selector) as HTMLElement | null;
      const target = tool === 'text'
        ? scopedQuery(`[data-text-panel-anchor="role-${options?.textRole ?? activeTextRole}"]`)
          ?? scopedQuery(`[data-text-panel-anchor="${options?.textPanelTab ?? 'entrada'}"]`)
        : options?.sectionOverride
          ? scopedQuery(`[data-right-panel-section="${options.sectionOverride}"]`)
        : tool === 'motion'
          ? scopedQuery('[data-text-panel-anchor="transition"]')
        : sectionTitle
          ? scopedQuery(`[data-right-panel-section="${sectionTitle}"]`)
          : null;

      if (!rightPanel || !target) {
        rightPanel?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Desconta a altura do dock sticky pra evitar que ele cubra o título da seção.
      const stickyDock = rightPanel.querySelector('[data-studio-tool-dock="right"]') as HTMLElement | null;
      const dockHeight = stickyDock?.getBoundingClientRect().height ?? 0;

      target.scrollIntoView({ block: 'start', inline: 'nearest' });

      const panelRect = rightPanel.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const correction = (targetRect.top - panelRect.top) - dockHeight - 8;

      if (Math.abs(correction) > 1) {
        rightPanel.scrollTop = Math.max(0, rightPanel.scrollTop + correction);
      }
    }, 80);
  }

  type PreviewLayerHotspot = {
    id: string;
    kind: 'text' | 'cover' | 'phone' | 'logos' | 'element';
    role?: FontRole;
    overlayId?: string;
    label: string;
    rect: React.CSSProperties;
  };

  function previewLayerAccent(kind: PreviewLayerHotspot['kind']) {
    if (kind === 'text') return '#ff4fd8';
    if (kind === 'cover') return '#38bdf8';
    if (kind === 'logos') return '#22c55e';
    if (kind === 'phone') return '#f59e0b';
    return '#a78bfa';
  }

  function previewLayerKindLabel(layer: PreviewLayerHotspot) {
    if (layer.kind === 'text') return `Texto · ${layer.label}`;
    if (layer.kind === 'cover') return 'Capa';
    if (layer.kind === 'logos') return 'Logos';
    if (layer.kind === 'phone') return 'Celular';
    return layer.label || 'Elemento';
  }

  useEffect(() => {
    let raf = 0;
    let cancelled = false;

    const round = (value: number) => Math.round(value * 10) / 10;
    const pct = (value: number) => `${round(value)}%`;
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const measure = () => {
      if (cancelled) return;

      const frame = previewFrameRef.current;
      const frameRect = frame?.getBoundingClientRect();

      if (!frame || !frameRect?.width || !frameRect?.height) {
        raf = window.requestAnimationFrame(measure);
        return;
      }

      const nodes = Array.from(frame.querySelectorAll<HTMLElement>('[data-novacena-preview-layer]'));
      const next: Record<string, React.CSSProperties> = {};

      for (const node of nodes) {
        const id = node.dataset.novacenaPreviewLayer;
        if (!id) continue;

        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;

        const padX = Math.min(8, Math.max(2, rect.width * 0.05));
        const padY = Math.min(6, Math.max(2, rect.height * 0.12));
        const left = ((rect.left - frameRect.left - padX) / frameRect.width) * 100;
        const top = ((rect.top - frameRect.top - padY) / frameRect.height) * 100;
        const width = ((rect.width + padX * 2) / frameRect.width) * 100;
        const height = ((rect.height + padY * 2) / frameRect.height) * 100;

        next[id] = {
          left: pct(clamp(left, -20, 116)),
          top: pct(clamp(top, -20, 116)),
          width: pct(clamp(width, 2, 120)),
          height: pct(clamp(height, 2, 120)),
        };
      }

      const key = JSON.stringify(next);
      if (key !== measuredPreviewRectsKeyRef.current) {
        measuredPreviewRectsKeyRef.current = key;
        setMeasuredPreviewRects(next);
      }

      raf = window.requestAnimationFrame(measure);
    };

    raf = window.requestAnimationFrame(measure);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const previewLayerHotspots = React.useMemo<PreviewLayerHotspot[]>(() => {
    const pct = (value: number) => `${Math.round(value * 10) / 10}%`;
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const textValueForRole = (role: FontRole) => {
      if (template === 'spotify_print' || template === 'milestone') {
        if (role === 'headline') return metricNumber;
        if (role === 'date') return metricPrefix;
        if (role === 'cta' || role === 'cta1') return metricLabel;
        return cta2;
      }

      if (template === 'watch_youtube') {
        if (role === 'headline') return 'ASSISTA NO YOUTUBE';
        if (role === 'date') return channelName;
        if (role === 'cta' || role === 'cta1') return cta;
        return cta2;
      }

      if (template === 'out_now') {
        if (role === 'headline') return headline;
        if (role === 'cta2') return cta2;
        if (role === 'cta' || role === 'cta1') return cta;
        return releaseDate;
      }

      if (role === 'date') return releaseDate;
      if (role === 'cta2') return cta2;
      if (role === 'cta' || role === 'cta1') return cta;
      return headline;
    };
    const roleRect = (left: number, top: number, width: number, height: number, role: FontRole): React.CSSProperties => {
      const scale = clamp(Number(txScale[role] ?? 1), 0.2, 4);
      const offsetX = (Number(txOX[role] ?? 0) / 1080) * 100;
      const offsetY = (Number(txOY[role] ?? 0) / compositionHeight) * 100;
      const textValue = String(textValueForRole(role) || '');
      const lines = textValue.split('\n').map((line) => line.trim()).filter(Boolean);
      const longestLine = Math.max(1, ...lines.map((line) => line.length));
      const lineCount = Math.max(1, lines.length);
      const widthFactor = role === 'headline'
        ? 2.75
        : role === 'date'
          ? 1.45
          : role === 'cta1' || role === 'cta'
            ? 1.7
            : 1.15;
      const lineHeightPct = role === 'headline' ? 4.9 : role === 'date' ? 3.2 : 3.45;
      const estimatedWidth = longestLine * widthFactor + (role === 'cta1' || role === 'cta' ? 6 : 3);
      const scaledWidth = clamp(Math.min(width, estimatedWidth) * scale, 8, 96);
      const scaledHeight = clamp(Math.min(height, lineCount * lineHeightPct) * scale, 2.2, 36);
      const centerX = left + width / 2 + offsetX;
      const centerY = top + height / 2 + offsetY;

      return {
        left: pct(clamp(centerX - scaledWidth / 2, -12, 112)),
        top: pct(clamp(centerY - scaledHeight / 2, -12, 112)),
        width: pct(scaledWidth),
        height: pct(scaledHeight),
      };
    };
    const mediaRect = (centerX: number, centerY: number, width: number, height: number, offsetX = 0, offsetY = 0): React.CSSProperties => ({
      left: pct(clamp(centerX + (offsetX / 1080) * 100 - width / 2, -12, 112)),
      top: pct(clamp(centerY + (offsetY / compositionHeight) * 100 - height / 2, -12, 112)),
      width: pct(clamp(width, 4, 96)),
      height: pct(clamp(height, 3, 92)),
    });
    const measuredRect = (id: string, fallback: React.CSSProperties): React.CSSProperties =>
      measuredPreviewRects[id] ?? fallback;
    const visibleLogoPlatforms = platformsSel;
    const logoSizes = visibleLogoPlatforms.map((p) =>
      Math.round(platformLogoSize * (platformLogoScales[p] ?? 1))
    );
    const maxLogoSize = Math.max(44, ...logoSizes);
    const logoBoxMultiplier = platformLogoPack === 'standard' || platformLogoPack === 'rectangular' ? 2.15 : 1;
    const totalLogoWidth = logoSizes.reduce((sum, size) => sum + size * logoBoxMultiplier, 0) + Math.max(0, logoSizes.length - 1) * platformLogoGap;

    const makeAvailableNowLogosRect = (): React.CSSProperties => {
      const stageTop = target === 'story' ? 245 : 88;
      const stageHeight = target === 'story' ? 1450 : 1220;
      const stageGap = target === 'story' ? 42 : 34;
      const headlineLines = Math.max(1, String(headline || 'LANÇAMENTO').split('\n').length);
      const headlineFont = String(headline || '').length > 14 ? 76 : 92;
      const headerHeight = headlineFont * 0.96 * headlineLines + 10 + (releaseDate ? 35 : 0);
      const ctaBlockBeforeLogos = 44 + 52 + 16;
      const totalStackHeight = headerHeight + stageGap + coverSize + stageGap + ctaBlockBeforeLogos + maxLogoSize;
      const stackTop = stageTop + Math.max(0, (stageHeight - totalStackHeight) / 2);
      const logoTopPx = stackTop + headerHeight + stageGap + coverSize + stageGap + ctaBlockBeforeLogos + 36;
      const logoWidthPct = clamp(((totalLogoWidth + 56) / 1080) * 100, 24, 90);
      const logoHeightPct = clamp(((maxLogoSize + 20) / compositionHeight) * 100, 5.2, 14);

      return {
        left: pct((100 - logoWidthPct) / 2),
        top: pct(clamp((logoTopPx / compositionHeight) * 100, 65, 88)),
        width: pct(logoWidthPct),
        height: pct(logoHeightPct),
      };
    };

    const elementHotspots: PreviewLayerHotspot[] = overlays
      .filter((overlay) => overlay.type === 'image' && (overlay.layout ?? 'element') === 'element')
      .map((overlay) => {
        const scale = overlay.scale ?? 0.42;
        const widthPct = clamp(((320 * scale) / 1080) * 100, 4, 80);
        const heightPct = clamp(((320 * scale) / compositionHeight) * 100, 3, 80);
        const centerXPct = 50 + (((overlay.x ?? 0) / 1080) * 100);
        const centerYPct = 50 + (((overlay.y ?? 0) / compositionHeight) * 100);

        return {
          id: `element-${overlay.id}`,
          kind: 'element',
          overlayId: overlay.id,
          label: overlay.label || 'Elemento',
          rect: {
            left: pct(clamp(centerXPct - widthPct / 2, -20, 116)),
            top: pct(clamp(centerYPct - heightPct / 2, -20, 116)),
            width: pct(widthPct),
            height: pct(heightPct),
          },
        };
      });

    if (template === 'spotify_print') {
      const phoneWidthPct = clamp((phoneSize / 1080) * 100, 26, 78);
      return [
        { id: 'spotify-date', kind: 'text', role: 'date', label: 'Texto acima', rect: measuredRect('spotify-date', roleRect(12, 15, 76, 8, 'date')) },
        { id: 'spotify-number', kind: 'text', role: 'headline', label: 'Número', rect: measuredRect('spotify-number', roleRect(7, 22, 86, 16, 'headline')) },
        { id: 'spotify-metric', kind: 'text', role: 'cta1', label: 'Métrica', rect: measuredRect('spotify-metric', roleRect(12, 37, 76, 8, 'cta1')) },
        { id: 'spotify-phone', kind: 'phone', label: 'Celular', rect: measuredRect('spotify-phone', mediaRect(50, 62, phoneWidthPct, 40, phoneX, phoneY)) },
        { id: 'spotify-logo', kind: 'logos', label: 'Logos', rect: { left: '34%', top: '82%', width: '32%', height: '8%' } },
        ...elementHotspots,
      ];
    }

    if (template === 'milestone') {
      const coverPct = clamp((Math.min(coverSize, 460) / 1080) * 100, 22, 64);
      const coverHeightPct = clamp((Math.min(coverSize, 460) / compositionHeight) * 100, 14, 38);
      const milestoneLogoPct = clamp((milestoneLogoSize / 1080) * 100, 4, 22);
      const milestoneLogoHeightPct = clamp((milestoneLogoSize / compositionHeight) * 100, 3, 16);
      return [
        { id: 'milestone-date', kind: 'text', role: 'date', label: 'Texto acima', rect: measuredRect('milestone-date', roleRect(12, 12, 76, 8, 'date')) },
        { id: 'milestone-cover', kind: 'cover', label: 'Capa', rect: measuredRect('milestone-cover', mediaRect(50, 37, coverPct, coverHeightPct, coverX, coverY)) },
        { id: 'milestone-number', kind: 'text', role: 'headline', label: 'Número', rect: measuredRect('milestone-number', roleRect(6, 52, 88, 16, 'headline')) },
        { id: 'milestone-label', kind: 'text', role: 'cta1', label: 'Métrica', rect: measuredRect('milestone-label', roleRect(14, 68, 72, 9, 'cta1')) },
        { id: 'milestone-logo', kind: 'logos', label: 'Logo Spotify', rect: measuredRect('milestone-logo', mediaRect(50, 74, milestoneLogoPct, milestoneLogoHeightPct, milestoneLogoX, milestoneLogoY)) },
        ...elementHotspots,
      ];
    }

    const coverPct = clamp((coverSize / 1080) * 100, 18, 86);
    const coverHeightPct = clamp((coverSize / compositionHeight) * 100, 12, 66);

    if (template === 'watch_youtube') {
      const youtubeCoverSize = clamp(coverSize, 420, 660);
      const youtubeCoverTopPx = clamp(620 + coverY, 285 + 230, 1635 - youtubeCoverSize - 250);
      const youtubeCoverCenterY = (youtubeCoverTopPx + youtubeCoverSize / 2) / compositionHeight * 100;
      const youtubeCoverWidthPct = clamp((youtubeCoverSize / 1080) * 100, 38, 62);
      const youtubeCoverHeightPct = clamp((youtubeCoverSize / compositionHeight) * 100, 22, 36);
      const channelText = String(channelName || 'CANAL OFICIAL');
      const channelChars = Math.max(16, channelText.replace(/\s+/g, '').length);
      const channelFont = clamp(640 / channelChars, 25, 36);
      const channelWidthPx = clamp(channelChars * channelFont * 0.82 + 76, 300, 720);
      const channelWidthPct = clamp((channelWidthPx / 1080) * 100, 28, 67);
      const channelTopPct = clamp(((youtubeCoverTopPx + youtubeCoverSize + 34) / compositionHeight) * 100, 52, 75);
      const ctaTopPct = clamp(((youtubeCoverTopPx + youtubeCoverSize + 118) / compositionHeight) * 100, 58, 80);

      return [
        { id: 'youtube-title', kind: 'text', role: 'headline', label: 'Titulo fixo', rect: measuredRect('youtube-title', roleRect(12, 16, 76, 13, 'headline')) },
        ...(showCover ? [{ id: 'cover', kind: 'cover' as const, label: 'Capa', rect: measuredRect('cover', mediaRect(50, youtubeCoverCenterY, youtubeCoverWidthPct, youtubeCoverHeightPct, coverX, 0)) }] : []),
        { id: 'youtube-channel', kind: 'text', role: 'date', label: 'Canal do YouTube', rect: measuredRect('youtube-channel', roleRect((100 - channelWidthPct) / 2, channelTopPct, channelWidthPct, 4.8, 'date')) },
        ...(showCta1 ? [{ id: 'youtube-cta', kind: 'text' as const, role: 'cta1' as const, label: 'CTA do video', rect: measuredRect('youtube-cta', roleRect(12, ctaTopPct, 76, 5.8, 'cta1')) }] : []),
        ...elementHotspots,
      ];
    }

    if (template === 'youtube_subscribe') {
      return [
        { id: 'ytsub-headline', kind: 'text', role: 'headline', label: 'INSCREVA-SE', rect: measuredRect('ytsub-headline', roleRect(10, 66, 80, 12, 'headline')) },
        { id: 'ytsub-text1', kind: 'text', role: 'cta1', label: 'Texto 1', rect: measuredRect('ytsub-text1', roleRect(14, 75, 72, 7, 'cta1')) },
        { id: 'ytsub-channel', kind: 'text', role: 'date', label: '@ do canal', rect: measuredRect('ytsub-channel', roleRect(20, 82, 60, 6, 'date')) },
        ...elementHotspots,
      ];
    }

    if (template === 'youtube_views') {
      return [
        { id: 'ytviews-prefix', kind: 'text', role: 'date', label: 'ULTRAPASSAMOS', rect: measuredRect('ytviews-prefix', roleRect(14, 47, 72, 6, 'date')) },
        { id: 'ytviews-number', kind: 'text', role: 'headline', label: 'Numero', rect: measuredRect('ytviews-number', roleRect(8, 54, 84, 14, 'headline')) },
        { id: 'ytviews-label', kind: 'text', role: 'cta1', label: 'Metrica', rect: measuredRect('ytviews-label', roleRect(16, 69, 68, 5, 'cta1')) },
        { id: 'ytviews-channel', kind: 'text', role: 'cta2', label: '@ do canal', rect: measuredRect('ytviews-channel', roleRect(24, 76, 52, 5, 'cta2')) },
        ...elementHotspots,
      ];
    }

    if (template === 'out_now') {
      return [
        { id: 'outnow-title', kind: 'text', role: 'headline', label: 'Headline', rect: measuredRect('outnow-title', roleRect(6, 11, 88, 18, 'headline')) },
        { id: 'cover', kind: 'cover', label: 'Capa', rect: measuredRect('cover', mediaRect(50, 48, coverPct, coverHeightPct, coverX, coverY)) },
        { id: 'outnow-cta', kind: 'text' as const, role: 'cta2' as const, label: 'CTA de plataformas', rect: measuredRect('outnow-cta', roleRect(10, 72, 80, 8, 'cta2')) },
        { id: 'logos', kind: 'logos', label: 'Logos', rect: measuredRect('logos', { left: '30%', top: '84%', width: '40%', height: '8%' }) },
        ...elementHotspots,
      ];
    }

    return [
      { id: 'headline', kind: 'text', role: 'headline', label: textRoleLabels.headline ?? 'Headline', rect: measuredRect('headline', roleRect(8, 11, 84, 9, 'headline')) },
      { id: 'date', kind: 'text', role: 'date', label: textRoleLabels.date ?? 'Data', rect: measuredRect('date', roleRect(22, 19, 56, 6, 'date')) },
      { id: 'cover', kind: 'cover', label: 'Capa', rect: measuredRect('cover', mediaRect(50, 49, coverPct, coverHeightPct, coverX, coverY)) },
      ...(showCta1 ? [{ id: 'cta1', kind: 'text' as const, role: 'cta1' as const, label: textRoleLabels.cta1 ?? 'Chamada 1', rect: measuredRect('cta1', roleRect(8, 68, 84, 8, 'cta1')) }] : []),
      ...(showCta2 ? [{ id: 'cta2', kind: 'text' as const, role: 'cta2' as const, label: textRoleLabels.cta2 ?? 'Chamada 2', rect: measuredRect('cta2', roleRect(8, 77, 84, 8, 'cta2')) }] : []),
      { id: 'logos', kind: 'logos', label: 'Logos', rect: measuredRect('logos', makeAvailableNowLogosRect()) },
      ...elementHotspots,
    ];
  }, [template, platformsSel, effectiveCustomLogos, platformLogoSize, platformLogoGap, platformLogoScales, platformLogoX, platformLogoY, milestoneLogoSize, milestoneLogoX, milestoneLogoY, platformLogoPack, target, headline, releaseDate, cta, cta2, metricNumber, metricPrefix, metricLabel, channelName, showCta1, showCta2, showCover, coverSize, coverX, coverY, phoneSize, phoneX, phoneY, compositionHeight, overlays, txScale, txOX, txOY, textRoleLabels, measuredPreviewRects]);

  // ── TIMELINE: playhead sincronizado com o player (só roda com o painel aberto)
  React.useEffect(() => {
    if (!showTimeline) return;
    let raf = 0;
    const tick = () => {
      const p = playerRef.current as any;
      const f = typeof p?.getCurrentFrame === 'function' ? p.getCurrentFrame() : 0;
      const s = f / 30;
      setTimelineSec((prev) => (Math.abs(prev - s) >= 0.04 ? s : prev));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [showTimeline]);

  const seekTimeline = React.useCallback((sec: number) => {
    const frame = Math.max(0, Math.round(sec * 30));
    setTimelineSec(sec);
    const player = playerRef.current;
    try {
      player?.seekTo?.(frame);
      player?.pause?.();
      window.requestAnimationFrame(() => {
        try { player?.pause?.(); } catch { /* noop */ }
      });
    } catch {
      /* noop */
    }
  }, []);

  // Faixas da timeline: textos (entram no tempo X), logos e overlays (start +
  // duração arrastável). Reaproveita previewLayerHotspots p/ saber as layers do
  // template atual. Atualiza tudo AO VIVO via inputProps (sem resetar o player).
  const timelineTracks = React.useMemo<TimelineTrack[]>(() => {
    const dur = durationSeconds;
    const tracks: TimelineTrack[] = [];

    for (const layer of previewLayerHotspots) {
      if (layer.kind === 'text' && layer.role) {
        const role = (layer.role === 'cta' ? 'cta1' : layer.role) as TextPreviewRole;
        const f = effectiveTextInFrames[role] ?? 0;
        tracks.push({
          id: layer.id,
          label: layer.label,
          color: '#c084fc',
          startSec: f / 30,
          endSec: null,
          resizable: false,
          selected: activeStudioTool === 'text' && activeTextRole === layer.role,
          onChangeStart: (sec) => {
            const fr = Math.max(0, Math.round(sec * 30));
            setTextInFrames((prev) => ({ ...prev, [role]: fr }));
            if (template === 'available_now') {
              if (role === 'cta1') setCta1InFrame(fr);
              if (role === 'cta2') setCta2InFrame(fr);
            }
          },
          onSelect: () => selectPreviewLayer(layer),
        });
      } else if (layer.kind === 'cover') {
        tracks.push({
          id: layer.id,
          label: layer.label,
          color: '#38bdf8',
          startSec: coverInFrame / 30,
          endSec: null,
          resizable: false,
          selected: activeStudioTool === 'cover',
          onChangeStart: (sec) => {
            const fr = Math.max(0, Math.round(sec * 30));
            setCoverInFrame(fr);
          },
          onSelect: () => selectPreviewLayer(layer),
        });
      } else if (layer.kind === 'phone') {
        tracks.push({
          id: layer.id,
          label: layer.label,
          color: '#f59e0b',
          startSec: phoneInFrame / 30,
          endSec: null,
          resizable: false,
          selected: activeStudioTool === 'motion',
          onChangeStart: (sec) => {
            const fr = Math.max(0, Math.round(sec * 30));
            setPhoneInFrame(fr);
          },
          onSelect: () => selectPreviewLayer(layer),
        });
      } else if (layer.kind === 'logos') {
        tracks.push({
          id: layer.id,
          label: layer.label,
          color: '#fbbf24',
          startSec: (logosInFrame ?? 0) / 30,
          endSec: null,
          resizable: false,
          selected: activeStudioTool === 'logos',
          onChangeStart: (sec) => setLogosInFrame(Math.max(0, Math.round(sec * 30))),
          onSelect: () => selectPreviewLayer(layer),
        });
      }
    }

    (overlays ?? []).forEach((ov, i) => {
      const start = Math.max(0, ov.startSec ?? 0);
      const ovDur = ov.durationSec && ov.durationSec > 0 ? ov.durationSec : Math.max(0.2, dur - start);
      tracks.push({
        id: `ov-${ov.id}`,
        label: ov.label ? `▦ ${ov.label}` : `Overlay ${i + 1}`,
        color: '#22d3ee',
        startSec: start,
        endSec: Math.min(dur, start + ovDur),
        resizable: true,
        selected: selectedOverlayId === ov.id,
        onChangeStart: (sec) => updateOverlay(ov.id, { startSec: Math.max(0, Math.round(sec * 10) / 10) }),
        onChangeEnd: (sec) =>
          updateOverlay(ov.id, { durationSec: Math.max(0.2, Math.round((sec - (ov.startSec ?? 0)) * 10) / 10) }),
        onSelect: () => {
          setSelectedOverlayId(ov.id);
          selectStudioTool('overlay', { keepTimelineOpen: true });
        },
      });
    });

    return tracks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    previewLayerHotspots,
    effectiveTextInFrames,
    overlays,
    logosInFrame,
    coverInFrame,
    phoneInFrame,
    durationSeconds,
    template,
    activeStudioTool,
    activeTextRole,
    selectedOverlayId,
  ]);

  const timelineTools: TimelineTool[] = [
    {
      id: 'timeline-transition-reveal',
      label: 'Aplicar transição reveal nas layers',
      icon: 'reveal',
      active: trHeadline === 'mask_reveal' && trDate === 'mask_reveal' && trCta === 'mask_reveal' && trCta1 === 'mask_reveal' && trCta2 === 'mask_reveal',
      onClick: () => applyTimelineTransitionTool('reveal'),
    },
    {
      id: 'timeline-transition-pop',
      label: 'Aplicar transição pop nas layers',
      icon: 'pop',
      active: trHeadline === 'scale_pop' && trDate === 'scale_pop' && trCta === 'scale_pop' && trCta1 === 'scale_pop' && trCta2 === 'scale_pop',
      onClick: () => applyTimelineTransitionTool('pop'),
    },
    {
      id: 'timeline-transition-letters',
      label: 'Aplicar transição de letras nas layers',
      icon: 'letters',
      active: trHeadline === 'split_letters' && trDate === 'split_letters' && trCta === 'split_letters' && trCta1 === 'split_letters' && trCta2 === 'split_letters',
      onClick: () => applyTimelineTransitionTool('letters'),
    },
  ];

  function selectPreviewLayer(layer: PreviewLayerHotspot) {
    if (layer.kind === 'text' && layer.role) {
      setActiveTextRole(layer.role);
      selectStudioTool('text', { textPanelTab: 'entrada', textRole: layer.role, keepTimelineOpen: true });
      return;
    }

    setEditingPreviewTextRole(null);

    if (layer.kind === 'phone') {
      selectStudioTool('motion', { sectionOverride: 'Celular', keepTimelineOpen: true });
      return;
    }

    if (layer.kind === 'logos') {
      selectStudioTool('logos', { keepTimelineOpen: true });
      return;
    }

    if (layer.kind === 'element' && layer.overlayId) {
      setSelectedOverlayId(layer.overlayId);
      selectStudioTool('overlay', { keepTimelineOpen: true });
      return;
    }

    selectStudioTool('cover', { keepTimelineOpen: true });
  }

  function getPreviewLayerOffset(layer: PreviewLayerHotspot) {
    if (layer.kind === 'text' && layer.role) {
      return {
        x: Number(txOX[layer.role] ?? 0),
        y: Number(txOY[layer.role] ?? 0),
      };
    }

    if (layer.kind === 'phone') {
      return { x: phoneX, y: phoneY };
    }

    if (layer.kind === 'cover') {
      return { x: coverX, y: coverY };
    }

    if (layer.kind === 'logos') {
      if (layer.id === 'milestone-logo') {
        return { x: milestoneLogoX, y: milestoneLogoY };
      }
      return { x: platformLogoX, y: platformLogoY };
    }

    if (layer.kind === 'element' && layer.overlayId) {
      const overlay = overlays.find((item) => item.id === layer.overlayId);
      return { x: overlay?.x ?? 0, y: overlay?.y ?? 0 };
    }

    return { x: 0, y: 0 };
  }

  function setPreviewLayerOffset(layer: PreviewLayerHotspot, x: number, y: number) {
    if (layer.kind === 'text' && layer.role) {
      updTxN(setTxOX, layer.role, x);
      updTxN(setTxOY, layer.role, y);
      return;
    }

    if (layer.kind === 'phone') {
      setPhoneX(x);
      setPhoneY(y);
      return;
    }

    if (layer.kind === 'cover') {
      setCoverX(x);
      setCoverY(y);
      return;
    }

    if (layer.kind === 'logos') {
      if (layer.id === 'milestone-logo') {
        setMilestoneLogoX(x);
        setMilestoneLogoY(y);
        return;
      }
      setPlatformLogoX(x);
      setPlatformLogoY(y);
      return;
    }

    if (layer.kind === 'element' && layer.overlayId) {
      updateOverlay(layer.overlayId, { x, y });
    }
  }

  function getPreviewLayerScale(layer: PreviewLayerHotspot) {
    if (layer.kind === 'text' && layer.role) {
      return Number(txScale[layer.role] ?? 1);
    }

    if (layer.kind === 'element' && layer.overlayId) {
      return overlays.find((item) => item.id === layer.overlayId)?.scale ?? 0.42;
    }

    if (layer.kind === 'logos') {
      if (layer.id === 'milestone-logo') {
        return milestoneLogoSize / 84;
      }
      return platformLogoSize / 89;
    }

    return 1;
  }

  function setPreviewLayerScale(layer: PreviewLayerHotspot, scale: number) {
    if (layer.kind === 'text' && layer.role) {
      updTxN(setTxScale, layer.role, Math.max(0.2, Math.min(4, Math.round(scale * 100) / 100)));
      return;
    }

    if (layer.kind === 'logos') {
      if (layer.id === 'milestone-logo') {
        setMilestoneLogoSize(Math.max(24, Math.min(240, Math.round(scale * 84))));
        return;
      }
      setPlatformLogoSize(Math.max(24, Math.min(240, Math.round(scale * 89))));
      return;
    }

    if (layer.kind !== 'element' || !layer.overlayId) return;
    updateOverlay(layer.overlayId, { scale: Math.max(0.05, Math.min(4, Math.round(scale * 100) / 100)) });
  }

  function beginPreviewLayerDrag(event: React.PointerEvent<HTMLButtonElement>, layer: PreviewLayerHotspot) {
    if (event.button !== 0) return;

    selectPreviewLayer(layer);

    const previewRect = previewFrameRef.current?.getBoundingClientRect();
    if (!previewRect?.width || !previewRect?.height) return;

    const offset = getPreviewLayerOffset(layer);
    previewDragRef.current = {
      layerId: layer.id,
      kind: layer.kind,
      role: layer.role,
      overlayId: layer.overlayId,
      mode: (layer.kind === 'element' || layer.kind === 'text' || layer.kind === 'logos') && event.shiftKey ? 'scale' : 'move',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      startScale: getPreviewLayerScale(layer),
      previewWidth: previewRect.width,
      previewHeight: previewRect.height,
      moved: false,
    };
    setPreviewDraggingLayerId(layer.id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function movePreviewLayer(event: React.PointerEvent<HTMLButtonElement>, layer: PreviewLayerHotspot) {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.layerId !== layer.id) return;

    const dxPreview = event.clientX - drag.startClientX;
    const dyPreview = event.clientY - drag.startClientY;
    if (Math.abs(dxPreview) + Math.abs(dyPreview) > 2) {
      drag.moved = true;
    }

    const dx = dxPreview * (1080 / drag.previewWidth);
    const dy = dyPreview * (compositionHeight / drag.previewHeight);

    if (drag.mode === 'scale' && (layer.kind === 'element' || layer.kind === 'text' || layer.kind === 'logos')) {
      const delta = (dxPreview - dyPreview) / Math.max(120, drag.previewWidth * 0.35);
      setPreviewLayerScale(layer, (drag.startScale ?? 1) + delta);
    } else {
      setPreviewLayerOffset(layer, Math.round((drag.startOffsetX + dx) * 10) / 10, Math.round((drag.startOffsetY + dy) * 10) / 10);
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function endPreviewLayerDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      suppressPreviewClickRef.current = true;
      window.setTimeout(() => {
        suppressPreviewClickRef.current = false;
      }, 0);
    }

    previewDragRef.current = null;
    setPreviewDraggingLayerId(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function getPreviewTextValue(role: FontRole) {
    if (template === 'spotify_print' || template === 'milestone') {
      if (role === 'headline') return metricNumber;
      if (role === 'date') return metricPrefix;
      if (role === 'cta' || role === 'cta1') return metricLabel;
      return cta2;
    }

    if (template === 'watch_youtube') {
      if (role === 'headline') return 'ASSISTA NO YOUTUBE';
      if (role === 'date') return channelName;
      if (role === 'cta' || role === 'cta1') return cta;
      return cta2;
    }

    if (template === 'out_now') {
      if (role === 'headline') return headline;
      if (role === 'cta' || role === 'cta1') return cta;
      return cta2;
    }

    if (role === 'date') return releaseDate;
    if (role === 'cta2') return cta2;
    if (role === 'cta' || role === 'cta1') return cta;
    return headline;
  }

  function setPreviewTextValue(role: FontRole, value: string) {
    if (template === 'spotify_print' || template === 'milestone') {
      if (role === 'headline') setMetricNumber(value);
      else if (role === 'date') setMetricPrefix(value);
      else if (role === 'cta' || role === 'cta1') setMetricLabel(value);
      else setCta2(value);
      return;
    }

    if (template === 'watch_youtube') {
      if (role === 'date') setChannelName(value);
      else if (role === 'cta' || role === 'cta1') setCta(value);
      return;
    }

    if (template === 'out_now') {
      if (role === 'headline') setHeadline(value);
      else if (role === 'cta2') setCta2(value);
      else if (role === 'cta' || role === 'cta1') setCta(value);
      return;
    }

    if (role === 'date') setReleaseDate(value);
    else if (role === 'cta2') setCta2(value);
    else if (role === 'cta' || role === 'cta1') setCta(value);
    else setHeadline(value);
  }

  function buildRenderInputProps(overrides?: {
    background?: Partial<NonNullable<MotionConfig['background']>>;
  }) {
    const motionSource = motionWithStyles ?? {};
    const renderBackground = {
      ...(motionSource.background ?? {}),
      ...(overrides?.background ?? {}),
    };
    const activeFontIds = new Set(
      [
        motionSource.fontHeadline,
        motionSource.fontDate,
        motionSource.fontCta,
        motionSource.fontCta1,
        motionSource.fontCta2,
      ].filter((id): id is string => typeof id === 'string' && id.length > 0)
    );
    const customFontsForRender = Array.isArray(motionSource.customFonts)
      ? motionSource.customFonts.filter((font: any) => activeFontIds.has(font.id))
      : [];

    return {
      ...project,
      durationSeconds,
      motion: {
        ...motionSource,
        background: renderBackground,
        customFonts: customFontsForRender,
        previewMode: false,
      },
      renderTarget: target,
      posterFrame: {
        enabled: SAAS_EXPORT_MODE ? false : posterFrameEnabled,
        frameSec: posterFrameSec,
        holdSec: posterHoldSec,
        outroEnabled: SAAS_EXPORT_MODE ? false : posterOutroEnabled,
      },
    };
  }

  function downloadJsonFile(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportForDesktop(label: string) {
    const inputProps = buildRenderInputProps();
    const assetWarnings: string[] = [];
    const backgroundAsset = inputProps.motion?.background?.localAsset as LocalAssetRef | undefined;

    if (inputProps.motion?.background?.videoSrc && !backgroundAsset && inputProps.motion.background.mediaType !== 'image') {
      assetWarnings.push('O vídeo de fundo está salvo como URL do servidor. O Exporter local pode pedir para localizar o arquivo original.');
    }

    const packageData = {
      schemaVersion: 1,
      kind: 'novacena-local-export',
      createdAt: new Date().toISOString(),
      appOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      render: {
        label,
        template,
        target,
        script: renderScriptFor(template, target),
        fps: 30,
        width: 1080,
        height: target === 'story' ? 1920 : 1350,
        durationSeconds,
      },
      project: inputProps,
      localAssets: {
        backgroundVideo: backgroundAsset ?? null,
      },
      assetWarnings,
    };

    const safeArtist = (activeArtist?.name || 'novacena').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'novacena';
    downloadJsonFile(`${safeArtist}-${target}.novacena-export.json`, packageData);
    setRenderLog(JSON.stringify(packageData, null, 2));
    setRenderStatus('done');
    setRenderProgress(100);
    setRenderMessage(
      assetWarnings.length > 0
        ? 'Pacote para Exporter local criado. O app local pode pedir para localizar assets pesados.'
        : 'Pacote para Exporter local criado. Pronto para renderizar no computador.'
    );
  }

  async function renderScript(script: string, label: string) {
    const optimizedPatch = await ensureBackgroundVideoReadyForExport();
    if (optimizedPatch === false) return;

    setRendering(true);
    setRenderMessage(`Gerando ${label}…`);
    setRenderLog('');
    setLambdaOutputUrl(null);
    try {
      const renderPropsForServer = buildRenderInputProps(
        optimizedPatch ? { background: backgroundOverrideFromPatch(optimizedPatch) } : undefined
      );

      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, props: renderPropsForServer, forceLocal: true }),
      });
      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        const preview = responseText.trim().slice(0, 500) || `HTTP ${response.status}`;
        throw new Error(`Resposta inválida do servidor de render: ${preview}`);
      }
      setRenderLog(result.output ?? '');
      if (!result.ok) {
        setRenderMessage(`Erro: ${result.error ?? 'falha'}`);
        return;
      }
      if (typeof result.outputFile === 'string' && /^https?:\/\//.test(result.outputFile)) {
        setLambdaOutputUrl(result.outputFile);
      }
      setRenderMessage(result.provider === 'lambda' ? `${label} gerado no Lambda. ✓` : `${label} gerado. ✓`);
      // Atualizar lista de arquivos disponíveis para download
      fetch('/api/render-files').then(r => r.json()).then(d => setRenderFiles(d.files ?? []));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha';
      setRenderMessage(`Erro: ${message}`);
      setRenderLog(String(error));
    } finally {
      setRendering(false);
    }
  }

  function formatSaasExportError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? 'falha');
    if (/demonstração|tokens|planos|comprar|pacote/i.test(message)) {
      return 'Seu teste gratuito acabou. Escolha um pacote para continuar exportando.';
    }
    if (/aws|lambda|concurrency|rate exceeded|quota|remotion|main function|chunk|timed out|timeout/i.test(message)) {
      return 'O serviço de exportação está ocupado no momento. Tente novamente em alguns minutos.';
    }
    return message;
  }

  async function ensureBackgroundVideoReadyForExport(): Promise<SharedBackgroundVideoPatch | null | false> {
    if (!bgVideoNeedsTrim) return null;

    setRenderStatus('rendering');
    setRenderProgress(3);
    setRenderMessage('Otimizando o trecho do vídeo antes de exportar...');
    const optimizedPatch = await processBgVideoClip();

    if (!optimizedPatch) {
      setRenderStatus('error');
      setRenderMessage('Não consegui otimizar o vídeo. Confira o trecho e tente novamente.');
      return false;
    }

    return optimizedPatch;
  }

  function openUpgradeOffer(message = '') {
    setUpgradeMessage(message);
    setUpgradePixPayment(null);
    setShowUpgradeModal(true);
  }

  async function chooseUpgradePlan(planId: string) {
    setLoadingUpgradePlan(planId);
    setUpgradeMessage('');
    setUpgradePixPayment(null);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle: upgradeCycle }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setUpgradeMessage(data.error || 'Não foi possível iniciar a compra.');
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.payment?.type === 'pix') {
        setUpgradePixPayment(data.payment);
        setUpgradeMessage('');
        return;
      }
      if (data.manual && data.user) {
        setSaasUser(data.user);
        setShowUpgradeModal(false);
        setRenderMessage('Pacote ativado. Você já pode exportar novamente.');
      }
    } catch {
      setUpgradeMessage('Não foi possível iniciar a compra.');
    } finally {
      setLoadingUpgradePlan(null);
    }
  }

  async function renderLambda(label: string) {
    const optimizedPatch = await ensureBackgroundVideoReadyForExport();
    if (optimizedPatch === false) return;

    setRendering(true);
    setRenderMessage(SAAS_EXPORT_MODE ? `Preparando exportação de ${label}…` : `☁ Lambda: iniciando ${label}…`);
    setRenderLog('');
    setRenderProgress(0);
    setRenderStatus('rendering');
    setLambdaOutputUrl(null);

    try {
      const inputProps = buildRenderInputProps(
        optimizedPatch ? { background: backgroundOverrideFromPatch(optimizedPatch) } : undefined
      );

      const startRes = await fetch('/api/render/lambda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, target, inputProps }),
      });
      const startData = await startRes.json();
      if (!startData.ok) {
        if (SAAS_EXPORT_MODE && startRes.status === 402) {
          setShowUpgradeModal(true);
          fetch('/api/auth/me')
            .then((response) => response.json())
            .then((data) => {
              if (data.ok && data.user) setSaasUser(data.user);
            })
            .catch(() => {});
        }
        setRenderMessage(
          SAAS_EXPORT_MODE
            ? `Erro ao exportar: ${formatSaasExportError(startData.error)}`
            : `Erro Lambda: ${startData.error}`
        );
        setRenderStatus('error');
        return;
      }

      const { renderId, bucketName } = startData;
      setRenderMessage(SAAS_EXPORT_MODE ? `Exportação iniciada (${renderId.slice(0, 8)}…)` : `☁ Lambda: render iniciado (${renderId.slice(0, 8)}…)`);

      // Poll progress
      let done = false;
      const startTime = Date.now();
      while (!done) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(`/api/render/lambda/status?renderId=${renderId}&bucketName=${bucketName}`);
        const status = await statusRes.json();

        if (!status.ok) {
          setRenderMessage(
            SAAS_EXPORT_MODE
              ? `Erro ao consultar progresso: ${formatSaasExportError(status.error)}`
              : `Erro ao consultar progresso: ${status.error}`
          );
          setRenderStatus('error');
          return;
        }

        const pct = status.progress ?? 0;
        setRenderProgress(pct);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setRenderMessage(SAAS_EXPORT_MODE ? `Exportando: ${pct}% (${elapsed}s)` : `☁ Lambda: ${pct}% (${elapsed}s)`);

        if (status.fatalErrorEncountered) {
          const errMsg = status.errors?.[0] ?? 'Erro fatal no render Lambda';
          setRenderMessage(
            SAAS_EXPORT_MODE
              ? `Erro ao exportar: ${formatSaasExportError(errMsg)}`
              : `Erro Lambda: ${errMsg}`
          );
          setRenderStatus('error');
          return;
        }

        if (status.done) {
          done = true;
          const totalTime = Math.round((Date.now() - startTime) / 1000);
          setLambdaOutputUrl(status.outputFile);
          setRenderMessage(SAAS_EXPORT_MODE ? `${label} exportado em ${totalTime}s ✓` : `☁ Lambda: ${label} concluído em ${totalTime}s ✓`);
          setRenderStatus('done');
          setRenderProgress(100);
          if (SAAS_EXPORT_MODE) {
            fetch('/api/auth/me')
              .then((response) => response.json())
              .then((data) => {
                if (data.ok && data.user) setSaasUser(data.user);
              })
              .catch(() => {});
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha';
      setRenderMessage(SAAS_EXPORT_MODE ? `Erro ao exportar: ${formatSaasExportError(error)}` : `Erro Lambda: ${message}`);
      setRenderStatus('error');
    } finally {
      setRendering(false);
    }
  }

  function handleRender() {
    const label = `${templateLabels[template]} ${target}`;
    if (SAAS_EXPORT_MODE) {
      renderLambda(label);
    } else if (renderEngine === 'desktop') {
      exportForDesktop(label);
    } else if (renderEngine === 'lambda') {
      renderLambda(label);
    } else {
      renderScript(renderScriptFor(template, target), label);
    }
  }

  function switchRenderEngine(engine: RenderEngine) {
    setRenderEngine(engine);
    localStorage.setItem('novacena:renderEngine', engine);
  }

  async function logoutSaas() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  async function openOutFolder() {
    await fetch('/api/open-out', { method: 'POST' });
  }

  async function saveProjectMain() {
    setSaving(true);
    setSaveMessage('Salvando…');
    const formData = new FormData();
    formData.append('template', template);
    formData.append('artistName', activeArtist?.name ?? '');
    formData.append('songTitle', headline);
    formData.append('releaseDate', releaseDate);
    formData.append('headline', headline);
    formData.append('cta', cta);
    formData.append('cta2', cta2);
    formData.append('channelName', channelName);
    formData.append('metricPrefix', metricPrefix);
    formData.append('metricNumber', metricNumber);
    formData.append('metricLabel', metricLabel);
    formData.append('platforms', JSON.stringify(platformsSel));
    formData.append('coverImage', coverImage);
    const r = await fetch('/api/project', { method: 'POST', body: formData });
    const d = await r.json();
    setSaving(false);
    if (!d.ok) {
      setSaveMessage(`Erro: ${d.error}`);
      return;
    }
    if (d.coverImage) setCoverImage(d.coverImage);
    setSaveMessage(SAAS_EXPORT_MODE ? 'Projeto salvo. Pronto para exportar.' : 'Projeto salvo. Pronto pra renderizar.');
  }

  // ============================================================
  // RENDER
  // ============================================================

  const presetImportInputRefV1 = React.useRef<HTMLInputElement | null>(null);
  const [presetImportStatusV1, setPresetImportStatusV1] = React.useState('');

  const exportStudioPresetV1 = React.useCallback(() => {
    if (bgVideoNeedsTrim) {
      setPresetImportStatusV1(
        bgVideoRequiresOptimization
          ? 'Otimize o vídeo antes de exportar o preset.'
          : 'Corte/otimize o trecho do vídeo antes de exportar o preset.'
      );
      window.setTimeout(() => setPresetImportStatusV1(''), 3000);
      return;
    }

    const timestamp = Date.now();
    const preset = {
      version: 'novacena-preset-v1',
      exportedAt: new Date().toISOString(),
      app: 'novacena-motion',
      project: {
        template,
        target,
        renderTarget: target,
        durationSeconds,
        releaseDate,
        headline,
        cta,
        cta2,
        showCta1,
        showCta2,
        showCover,
        coverImage,
        channelName,
        metricPrefix,
        metricNumber,
        metricLabel,
        platforms: platformsSel,
        posterFrame: {
          enabled: posterFrameEnabled,
          frameSec: posterFrameSec,
          holdSec: posterHoldSec,
          outroEnabled: posterOutroEnabled,
        },
        motion: motionWithStyles,
      },
    };

    const safeHeadline = String(headline || 'arte')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    const presetName = `novacena-preset-${String(template || 'template')}-${safeHeadline || 'arte'}-${timestamp}`;
    const fileName = `${presetName}.json`;
    const serializedPreset = JSON.stringify(preset, null, 2);

    const frameName = 'novacena-preset-download-frame';
    let frame = document.querySelector<HTMLIFrameElement>(`iframe[name="${frameName}"]`);

    if (!frame) {
      frame = document.createElement('iframe');
      frame.name = frameName;
      frame.style.display = 'none';
      document.body.appendChild(frame);
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/presets/export';
    form.target = frameName;
    form.style.display = 'none';

    const payloadInput = document.createElement('input');
    payloadInput.type = 'hidden';
    payloadInput.name = 'payload';
    payloadInput.value = serializedPreset;

    const fileNameInput = document.createElement('input');
    fileNameInput.type = 'hidden';
    fileNameInput.name = 'fileName';
    fileNameInput.value = fileName;

    form.appendChild(payloadInput);
    form.appendChild(fileNameInput);
    document.body.appendChild(form);
    form.submit();
    form.remove();

    setPresetImportStatusV1('Download do preset JSON iniciado.');
    window.setTimeout(() => setPresetImportStatusV1(''), 2200);
  }, [
    template,
    target,
    durationSeconds,
    releaseDate,
    headline,
    cta,
    cta2,
    showCta1,
    showCta2,
    coverImage,
    channelName,
    metricPrefix,
    metricNumber,
    metricLabel,
    platformsSel,
    posterFrameEnabled,
    posterFrameSec,
    posterHoldSec,
    posterOutroEnabled,
    motionWithStyles,
    bgVideoNeedsTrim,
    bgVideoRequiresOptimization,
  ]);


  const applyStudioPresetV1 = React.useCallback((rawPreset: any) => {
    const presetRoot = rawPreset?.config ?? rawPreset;
    const preset = presetRoot?.project ? presetRoot.project : presetRoot;
    const m = preset?.motion ?? presetRoot?.motion ?? {};

    if (!preset) {
      setPresetImportStatusV1('Preset inválido.');
      window.setTimeout(() => setPresetImportStatusV1(''), 3000);
      return;
    }

    const nextTemplate = preset.template ?? preset.type;
    if (['available_now', 'watch_youtube', 'youtube_subscribe', 'youtube_views', 'milestone', 'out_now', 'spotify_print'].includes(nextTemplate)) {
      switchTemplate(nextTemplate as TemplateId);
    }

    const nextTarget = preset.target ?? preset.renderTarget ?? m.renderTarget;
    if (['story', 'feed'].includes(nextTarget)) {
      setTarget(nextTarget as RenderTarget);
    }

    const nextDuration = preset.durationSeconds ?? m.durationSeconds;
    if (typeof nextDuration === 'number' && Number.isFinite(nextDuration)) {
      setDurationSeconds(Math.max(1, Math.min(60, nextDuration)));
    }

    if (typeof preset.coverImage === 'string') setCoverImage(preset.coverImage);
    if (typeof preset.channelName === 'string') setChannelName(preset.channelName);
    if (typeof preset.metricPrefix === 'string') setMetricPrefix(preset.metricPrefix);
    if (typeof preset.metricNumber === 'string') setMetricNumber(preset.metricNumber);
    if (typeof preset.metricLabel === 'string') setMetricLabel(preset.metricLabel);
    if (Array.isArray(preset.platforms)) {
      setPlatformsSel(preset.platforms.filter((p: any) => allPlatforms.includes(p)) as PlatformName[]);
    }

    if (preset.posterFrame && typeof preset.posterFrame === 'object') {
      if (typeof preset.posterFrame.enabled === 'boolean') setPosterFrameEnabled(preset.posterFrame.enabled);
      if (typeof preset.posterFrame.frameSec === 'number') setPosterFrameSec(preset.posterFrame.frameSec);
      if (typeof preset.posterFrame.holdSec === 'number') setPosterHoldSec(preset.posterFrame.holdSec);
      if (typeof preset.posterFrame.outroEnabled === 'boolean') setPosterOutroEnabled(preset.posterFrame.outroEnabled);
    }

    if (typeof preset.releaseDate === 'string') setReleaseDate(preset.releaseDate);
    if (typeof preset.headline === 'string') setHeadline(preset.headline);
    if (typeof preset.cta === 'string') setCta(preset.cta);
    if (typeof preset.cta2 === 'string') setCta2(preset.cta2);

    if (typeof preset.showCta1 === 'boolean') setShowCta1(preset.showCta1);
    if (typeof preset.showCta2 === 'boolean') setShowCta2(preset.showCta2);
    if (typeof preset.showCover === 'boolean') setShowCover(preset.showCover);

    if (m.fontHeadline) setFontHeadline(m.fontHeadline);
    if (m.fontDate) setFontDate(m.fontDate);
    if (m.fontCta) setFontCta(m.fontCta);
    if (m.fontCta1) setFontCta1(m.fontCta1);
    if (m.fontCta2) setFontCta2(m.fontCta2);

    if (m.styleHeadline) setStyleHeadline((s: any) => ({ ...s, ...m.styleHeadline }));
    if (m.styleDate) setStyleDate((s: any) => ({ ...s, ...m.styleDate }));
    if (m.styleCta) setStyleCta((s: any) => ({ ...s, ...m.styleCta }));
    if (m.styleCta1) setStyleCta1((s: any) => ({ ...s, ...m.styleCta1 }));
    if (m.styleCta2) setStyleCta2((s: any) => ({ ...s, ...m.styleCta2 }));
    applyTextMetricsFromStyle('headline', m.styleHeadline);
    applyTextMetricsFromStyle('date', m.styleDate);
    applyTextMetricsFromStyle('cta', m.styleCta);
    applyTextMetricsFromStyle('cta1', m.styleCta1 ?? m.styleCta);
    applyTextMetricsFromStyle('cta2', m.styleCta2 ?? m.styleCta);

    if (m.strokeHeadline) setStrokeHeadline(m.strokeHeadline);
    if (m.strokeDate) setStrokeDate(m.strokeDate);
    if (m.strokeCta) setStrokeCta(m.strokeCta);
    if (m.strokeCta1) setStrokeCta1(m.strokeCta1);
    if (m.strokeCta2) setStrokeCta2(m.strokeCta2);
    if (typeof m.textOpacity === 'number') setTextOpacity(m.textOpacity);

    if (m.transitionHeadline) setTrHeadline(m.transitionHeadline);
    if (m.transitionDate) setTrDate(m.transitionDate);
    if (m.transitionCta) setTrCta(m.transitionCta);

    if (typeof setTrCta1 === 'function' && m.transitionCta1) setTrCta1(m.transitionCta1);
    if (typeof setTrCta2 === 'function' && m.transitionCta2) setTrCta2(m.transitionCta2);
    setTransitionTuning(transitionTuningFromMotion(m));

    if (typeof m.cta1InFrame === 'number') setCta1InFrame(m.cta1InFrame);
    if (typeof m.ctaSwapFrame === 'number') setCtaSwapFrame(m.ctaSwapFrame);
    if (typeof m.cta2InFrame === 'number') setCta2InFrame(m.cta2InFrame);
    if (typeof m.logosInFrame === 'number') setLogosInFrame(m.logosInFrame);
    setTextInFrames({
      headline: typeof m.headlineInFrame === 'number' ? m.headlineInFrame : undefined,
      date: typeof m.dateInFrame === 'number' ? m.dateInFrame : undefined,
      cta1: typeof m.cta1InFrame === 'number' ? m.cta1InFrame : undefined,
      cta2: typeof m.cta2InFrame === 'number' ? m.cta2InFrame : undefined,
    });

    if (typeof m.coverSize === 'number') setCoverSize(m.coverSize);
    if (typeof m.coverX === 'number') setCoverX(m.coverX);
    if (typeof m.coverY === 'number') setCoverY(m.coverY);
    if (m.coverMotion) setCoverMotion(normalizeCoverMotionId(m.coverMotion));
    if (typeof m.phoneSize === 'number') setPhoneSize(m.phoneSize);
    if (typeof m.phoneX === 'number') setPhoneX(m.phoneX);
    if (typeof m.phoneY === 'number') setPhoneY(m.phoneY);
    if (typeof m.phoneTilt === 'number') setPhoneTilt(m.phoneTilt);
    if (m.phoneMotion) setPhoneMotion(m.phoneMotion);
    if (typeof m.phoneSpinTurns === 'number') setPhoneSpinTurns(m.phoneSpinTurns);
    if (typeof m.phoneWiggle === 'number') setPhoneWiggle(m.phoneWiggle);
    if (typeof m.phoneDynamicIsland === 'boolean') setPhoneDynamicIsland(m.phoneDynamicIsland);
    if (typeof m.spinTurns === 'number') setSpinTurns(m.spinTurns);
    if (typeof m.wiggleIntensity === 'number') setWiggleIntensity(m.wiggleIntensity);
    if (typeof m.wiggleHeadline === 'number') setWiggleH(m.wiggleHeadline);
    if (typeof m.wiggleDate === 'number') setWiggleD(m.wiggleDate);
    if (typeof m.wiggleCta === 'number') setWiggleC(m.wiggleCta);
    if (typeof m.wiggleCta1 === 'number') setWiggleCta1(m.wiggleCta1);
    else if (typeof m.wiggleCta === 'number') setWiggleCta1(m.wiggleCta);
    if (typeof m.wiggleCta2 === 'number') setWiggleCta2(m.wiggleCta2);
    else if (typeof m.wiggleCta === 'number') setWiggleCta2(m.wiggleCta);
    if (typeof m.particlesEnabled === 'boolean') setParticlesEnabled(m.particlesEnabled);
    if (typeof m.finalFlash === 'boolean') setFinalFlash(m.finalFlash);
    if (typeof m.glowColor === 'string') setGlowColor(m.glowColor);
    if (typeof m.platformLogoSize === 'number') setPlatformLogoSize(m.platformLogoSize);
    if (typeof m.platformLogoGap === 'number') setPlatformLogoGap(m.platformLogoGap);
    if (m.platformLogoScales && typeof m.platformLogoScales === 'object') setPlatformLogoScales(m.platformLogoScales);
    if (typeof m.platformLogoX === 'number') setPlatformLogoX(m.platformLogoX);
    if (typeof m.platformLogoY === 'number') setPlatformLogoY(m.platformLogoY);
    if (typeof m.milestoneLogoSize === 'number') setMilestoneLogoSize(m.milestoneLogoSize);
    if (typeof m.milestoneLogoX === 'number') setMilestoneLogoX(m.milestoneLogoX);
    if (typeof m.milestoneLogoY === 'number') setMilestoneLogoY(m.milestoneLogoY);
    if (typeof m.platformLogoTintEnabled === 'boolean') setPlatformLogoTintEnabled(m.platformLogoTintEnabled);
    if (typeof m.platformLogoTintColor === 'string') setPlatformLogoTintColor(m.platformLogoTintColor);
    if (typeof m.platformLogoPack === 'string') setPlatformLogoPack(m.platformLogoPack as PlatformLogoPackId);
    if (m.customLogos && typeof m.customLogos === 'object') setCustomLogos(m.customLogos);
    if (Array.isArray(m.overlays)) setOverlays(m.overlays);

    const background = m.background ?? m;
    if (typeof background.videoSrc === 'string') setBgVideo(background.videoSrc);
    if (typeof background.videoStartFrame === 'number') setBgVideoStartSec(background.videoStartFrame / 30);
    if (typeof background.videoDurationSec === 'number') setBgVideoDuration(background.videoDurationSec);
    if (typeof background.videoNeedsTrim === 'boolean') setBgVideoNeedsTrim(background.videoNeedsTrim);
    if (typeof background.videoOriginalName === 'string') setBgVideoOriginalName(background.videoOriginalName);
    setBgVideoLocalAsset((background.localAsset as LocalAssetRef | undefined) ?? null);
    if (typeof background.videoOpacity === 'number') setBgVideoOpacity(background.videoOpacity);
    if (typeof background.bgColor === 'string') setBgColor(background.bgColor);
    if (typeof background.videoBlur === 'number') setBgVideoBlur(background.videoBlur);
    if (typeof background.videoSaturation === 'number') setBgVideoSaturation(background.videoSaturation);
    if (typeof background.audioSrc === 'string') setAudioSrc(background.audioSrc);
    if (typeof background.audioStartSec === 'number') {
      setAudioStartSec(background.audioStartSec);
      setAudioPreviewTime(background.audioStartSec);
      setAudioStartTimecodeInput(formatTimecode(background.audioStartSec));
    }
    if (typeof background.audioDurationSec === 'number') setAudioDuration(background.audioDurationSec);
    if (typeof background.audioOriginalName === 'string') setAudioOriginalName(background.audioOriginalName);
    if (typeof background.audioVolume === 'number') setAudioVolume(background.audioVolume);
    if (typeof background.audioFadeInSec === 'number') setAudioFadeIn(background.audioFadeInSec);
    if (typeof background.audioFadeOutSec === 'number') setAudioFadeOut(background.audioFadeOutSec);
    if (typeof background.useVideoAudio === 'boolean') setUseVideoAudio(background.useVideoAudio);

    setPresetImportStatusV1('Preset importado.');
    window.setTimeout(() => setPresetImportStatusV1(''), 2500);
  }, []);

  const importStudioPresetV1 = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);

      if (parsed?.version && parsed.version !== 'novacena-preset-v1') {
        console.warn('Versão de preset diferente:', parsed.version);
      }

      applyStudioPresetV1(parsed);
    } catch (error) {
      console.error(error);
      setPresetImportStatusV1('Erro ao importar preset.');
      window.setTimeout(() => setPresetImportStatusV1(''), 3500);
    }
  }, [applyStudioPresetV1]);

  function applySavedTemplate(preset: SavedTemplatePreset) {
    const config = preset.config ?? {};
    const snapshot = config.snapshot ?? config.config?.snapshot;

    if (snapshot && typeof snapshot === 'object') {
      restoreEditorSnapshot(snapshot);
      setTemplateBuilderMessage(`✓ Template "${preset.name}" carregado.`);
      window.setTimeout(() => setTemplateBuilderMessage(''), 2500);
      return;
    }

    applyStudioPresetV1(config);
    setTemplateBuilderMessage(`✓ Template "${preset.name}" carregado.`);
    window.setTimeout(() => setTemplateBuilderMessage(''), 2500);
  }


  const presetExportButtonV1 = (
    <div
      style={{
        display: 'grid',
        gap: 8,
        padding: 10,
        borderRadius: 16,
        width: '100%',
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.65)',
          textTransform: 'uppercase',
          letterSpacing: 1.4,
          fontWeight: 900,
        }}
      >
        Presets
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          type="button"
          onClick={exportStudioPresetV1}
          title="Exportar preset JSON"
          style={{
            border: 0,
            borderRadius: 12,
            padding: '10px 12px',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 12,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #8f4df8, #f97316)',
          }}
        >
          Exportar
        </button>

        <button
          type="button"
          onClick={() => presetImportInputRefV1.current?.click()}
          title="Importar preset JSON"
          style={{
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 12,
            padding: '10px 12px',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 12,
            fontWeight: 900,
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          Importar
        </button>
      </div>

      {presetImportStatusV1 ? (
        <div style={{ color: '#fff', fontSize: 11, opacity: 0.8 }}>
          {presetImportStatusV1}
        </div>
      ) : null}

      <input
        ref={presetImportInputRefV1}
        type="file"
        accept="application/json,.json"
        onChange={importStudioPresetV1}
        style={{ display: 'none' }}
      />
    </div>
  );


return (
    <main
      data-novacena-editor-shell="true"
      style={{
        height: '100dvh',
        width: 'min(100vw, 2240px)',
        margin: '0 auto',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, clamp(260px, 20vw, 420px)) minmax(240px, 1fr) minmax(300px, clamp(320px, 22vw, 460px))',
        gridTemplateRows: '56px 1fr',
        gridTemplateAreas: `
          "topbar topbar topbar"
          "left center right"
        `,
        background: 'var(--bg-0)',
        borderLeft: '1px solid var(--border-1)',
        borderRight: '1px solid var(--border-1)',
      }}
    >
      {/* ─── TOPBAR ─── */}
      <header data-novacena-topbar="true" style={{ ...topbarStyle, overflow: 'visible', position: 'relative', zIndex: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BrandSmall />
          <div style={separator} />
          <ArtistSelector
            artists={artists}
            activeSlug={activeSlug}
            onSelect={setActiveSlug}
            onNew={() => setShowArtistModal(true)}
          />
        </div>
        <div
          data-novacena-template-menu="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 90,
          }}
        >
          <button
            type="button"
            onClick={() => setTemplatesMenuOpen((open) => !open)}
            style={{
              ...chip,
              minWidth: 168,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: templatesMenuOpen ? 'var(--surface-active)' : 'var(--surface-1)',
              color: 'var(--text-1)',
            }}
          >
            <span>Templates</span>
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
              {savedTemplates.length} {templatesMenuOpen ? '▲' : '▼'}
            </span>
          </button>

          {templatesMenuOpen && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 42,
                transform: 'translateX(-50%)',
                width: 420,
                maxWidth: 'calc(100vw - 48px)',
                padding: 12,
                borderRadius: 12,
                background: 'rgba(14,14,18,0.98)',
                border: '1px solid var(--border-1)',
                boxShadow: '0 22px 60px rgba(0,0,0,0.46)',
                backdropFilter: 'blur(18px)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  value={templateBuilderName}
                  onChange={(e) => setTemplateBuilderName(e.target.value)}
                  placeholder="Nome do template"
                  style={fieldInputStyle}
                />
                <button
                  type="button"
                  onClick={saveAsTemplate}
                  disabled={templateBuilderBusy || !templateBuilderName.trim()}
                  style={{
                    ...ghostBtnStyle,
                    height: 36,
                    padding: '0 14px',
                    opacity: (templateBuilderBusy || !templateBuilderName.trim()) ? 0.5 : 1,
                    cursor: (templateBuilderBusy || !templateBuilderName.trim()) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {templateBuilderBusy ? 'Salvando…' : 'Salvar'}
                </button>
              </div>

              {templateBuilderMessage && (
                <div style={{ marginTop: 7, fontSize: 10, color: 'var(--text-3)' }}>
                  {templateBuilderMessage}
                </div>
              )}

              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-1)', paddingTop: 10 }}>
                {savedTemplates.length === 0 ? (
                  <div style={{ color: 'var(--text-3)', fontSize: 11 }}>
                    Nenhum template salvo ainda.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                    {savedTemplates.map((preset) => (
                      <div
                        key={preset.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto 28px',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 8px',
                          borderRadius: 8,
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border-1)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preset.name}
                          </div>
                          <div style={{ color: 'var(--text-3)', fontSize: 9, marginTop: 2 }}>
                            {preset.createdAt ? new Date(preset.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}
                          </div>
                        </div>
                        <button type="button" onClick={() => applySavedTemplate(preset)} style={smallBtn}>
                          Carregar
                        </button>
                        <button type="button" onClick={() => downloadSavedTemplate(preset)} style={smallBtn}>
                          Baixar
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedTemplate(preset.id)}
                          title="Excluir template"
                          style={{ ...smallBtn, color: '#ff6b6b', padding: 0 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('studio')}
            style={activeTab === 'studio' ? topTabActive : topTab}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            style={activeTab === 'gallery' ? topTabActive : topTab}
          >
            Galeria {gallery.length > 0 && `(${gallery.length})`}
          </button>
          {SAAS_EXPORT_MODE && (
            <>
              <a
                href="/monitor"
                style={{
                  ...topTab,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Monitor
              </a>
              <button
                onClick={() => openUpgradeOffer('Escolha um pacote para carregar renders na sua conta.')}
                style={{
                  ...topTab,
                  borderColor: saasUser && saasUser.tokens <= 3 ? 'rgba(244,211,94,0.62)' : 'rgba(255,255,255,0.12)',
                  color: saasUser && saasUser.tokens <= 3 ? '#f4d35e' : 'rgba(255,255,255,0.72)',
                }}
              >
                {saasUser ? `${saasUser.tokens} ${saasUser.tokens === 1 ? 'render' : 'renders'}` : 'Planos'}
              </button>
              <button
                onClick={() => openUpgradeOffer('Compre renders agora e continue criando campanhas sem interromper o fluxo.')}
                style={{
                  ...topTabActive,
                  background: 'linear-gradient(90deg, #b855ff, #ff9244)',
                  color: '#fff',
                  borderColor: 'transparent',
                }}
              >
                Comprar renders
              </button>
              <button onClick={logoutSaas} style={topTab}>
                Sair
              </button>
            </>
          )}
        </div>
      </header>

      {/* ─── SIDEBAR ESQUERDA ─── */}
      <aside style={leftSidebar} data-novacena-left-panel="true">
        <Section title="Template">
          <div style={gridTwoCols}>
            {templateOrder.map((id) => (
              <TemplateButton key={id} active={template === id} onClick={() => switchTemplate(id)}>
                {templateLabels[id]}
              </TemplateButton>
            ))}
          </div>
        </Section>




        <Section title="Capa principal">
          <button
            style={uploadCardStyle}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={uploadThumbStyle}>
              {coverImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={coverImage} alt="capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Trocar capa</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>PNG/JPG quadrado</div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            id="cover-upload-input" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;

              const formData = new FormData();
              formData.append('cover', f);

              const r = await fetch('/api/upload-cover', {
                method: 'POST',
                body: formData,
              });

              const d = await r.json();

              if (!d.ok || !d.coverSrc) {
                alert(`Erro ao subir capa: ${d.error ?? 'falha desconhecida'}`);
                return;
              }

              setCoverImage(d.coverSrc);
            }}
            style={{ display: 'none' }}
          />
          {template === 'watch_youtube' && (
            <ToggleRow
              label="Mostrar capa no vídeo"
              value={showCover}
              onChange={setShowCover}
            />
          )}
        </Section>

        {activeArtist && (
          <Section title={`Fotos · ${activeArtist.name}`}>
            <button
              onClick={() => photoMultiRef.current?.click()}
              style={uploadCardStyleSmall}
            >
              + Adicionar fotos
            </button>
            <input
              ref={photoMultiRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginTop: 8 }}>
              {photos.slice(0, 12).map((ph) => (
                <div key={ph.id} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setCoverImage(ph.path)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: coverImage === ph.path ? '2px solid var(--brand)' : '1px solid var(--border-1)',
                      padding: 0,
                      background: 'var(--bg-2)',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.path} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                  <button
                    onClick={() => deletePhoto(ph.id)}
                    style={photoDelBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {photos.length > 12 && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                + {photos.length - 12} fotos
              </div>
            )}
          </Section>
        )}


        <Section title="Conteúdo">
          {template === 'watch_youtube' ? (
            <>
              <div style={{ marginBottom: 10, color: 'var(--text-3)', fontSize: 11, lineHeight: 1.45 }}>
                Arte de YouTube. O titulo "ASSISTA NO YOUTUBE" e fixo; aqui voce edita o canal, @handle e chamada do video.
              </div>
              <Field label="Canal do YouTube / @handle" value={channelName} onChange={setChannelName} placeholder="GRUPO FACANHA OFICIAL" />
              <ToggleRow label="Mostrar CTA do video" value={showCta1} onChange={setShowCta1} />
              {showCta1 && (
                <TextAreaField label="CTA do video" value={cta} onChange={setCta} placeholder="CLIPE OFICIAL DISPONIVEL" rows={2} />
              )}
            </>
          ) : template === 'youtube_subscribe' ? (
            <>
              <div style={{ marginBottom: 10, color: 'var(--text-3)', fontSize: 11, lineHeight: 1.45 }}>
                Arte de inscrição. Edite a chamada, o texto do canal e o @. Use video de fundo no painel Capa/Motion.
              </div>
              <Field label="Headline" value={headline} onChange={setHeadline} placeholder="INSCREVA-SE" />
              <Field label="Texto 1" value={cta} onChange={setCta} placeholder="NO CANAL" />
              <Field label="@ do canal" value={channelName} onChange={setChannelName} placeholder="@SEUCANAL" />
            </>
          ) : template === 'youtube_views' ? (
            <>
              <div style={{ marginBottom: 10, color: 'var(--text-3)', fontSize: 11, lineHeight: 1.45 }}>
                Marca de visualizações no YouTube. Use video de fundo no painel Capa/Motion.
              </div>
              <Field label="Texto acima" value={metricPrefix} onChange={setMetricPrefix} placeholder="ULTRAPASSAMOS" />
              <div style={gridTwoCols}>
                <Field label="Numero" value={metricNumber} onChange={setMetricNumber} placeholder="+ 20 MILHÕES" />
                <Field label="Metrica" value={metricLabel} onChange={setMetricLabel} placeholder="DE VISUALIZAÇÕES" />
              </div>
              <Field label="@ do canal" value={channelName} onChange={setChannelName} placeholder="@SEUCANAL" />
            </>
          ) : template === 'milestone' ? (
            <>
              <Field label="Texto acima" value={metricPrefix} onChange={setMetricPrefix} placeholder="ULTRAPASSAMOS" />
              <div style={gridTwoCols}>
                <Field label="Numero" value={metricNumber} onChange={setMetricNumber} placeholder="100K" />
                <Field label="Metrica" value={metricLabel} onChange={setMetricLabel} placeholder="PLAYS" />
              </div>
            </>
          ) : template === 'spotify_print' ? (
            <>
              <Field label="Texto acima" value={metricPrefix} onChange={setMetricPrefix} placeholder="ULTRAPASSAMOS" />
              <div style={gridTwoCols}>
                <Field label="Numero" value={metricNumber} onChange={setMetricNumber} placeholder="10.000" />
                <Field label="Metrica" value={metricLabel} onChange={setMetricLabel} placeholder="OUVINTES MENSAIS" />
              </div>
            </>
          ) : template === 'out_now' ? (
            <>
              <div style={{ marginBottom: 10, color: 'var(--text-3)', fontSize: 11, lineHeight: 1.45 }}>
                Arte de disponivel. Use depois que o single ja saiu: sem data e sem "faca o pre-save".
              </div>
              <Field label="Headline" value={headline} onChange={setHeadline} placeholder="DISPONIVEL ou OUCA AGORA" />
              <TextAreaField label="CTA de plataformas" value={cta2} onChange={setCta2} placeholder={"EM TODAS AS PLATAFORMAS DIGITAIS"} rows={2} />
            </>
          ) : (
            <>
              <Field label="Data de lancamento" value={releaseDate} onChange={setReleaseDate} placeholder="07.JANEIRO" />
              <TextAreaField label="Titulo" value={headline} onChange={setHeadline} placeholder={"LANCAMENTO"} rows={2} />
              <ToggleRow label="Mostrar CTA principal" value={showCta1} onChange={setShowCta1} />
              {showCta1 && (
                <TextAreaField label="CTA principal" value={cta} onChange={setCta} placeholder={"FACA O\nPRE-SAVE"} rows={2} />
              )}
              <ToggleRow label="Mostrar CTA secundario" value={showCta2} onChange={setShowCta2} />
              {showCta2 && (
                <TextAreaField label="CTA secundario" value={cta2} onChange={setCta2} placeholder={"EM TODAS AS\nPLATAFORMAS DIGITAIS"} rows={2} />
              )}
            </>
          )}
        </Section>

            {!SAAS_EXPORT_MODE && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Capa do vídeo / primeiro frame
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <button type="button" onClick={useCurrentPlayerFrameAsPoster} style={ghostBtnStyle}>
                    Usar frame atual como capa
                  </button>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                    <input
                      type="checkbox"
                      checked={posterFrameEnabled}
                      onChange={(event) => setPosterFrameEnabled(event.target.checked)}
                    />
                    Renderizar capa no início
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                    <input
                      type="checkbox"
                      checked={posterOutroEnabled}
                      onChange={(event) => setPosterOutroEnabled(event.target.checked)}
                    />
                    Repetir no final
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    Segundo da capa
                    <input
                      type="number"
                      min={0}
                      max={durationSeconds}
                      step={0.01}
                      value={posterFrameSec}
                      onChange={(event) => setPosterFrameSec(Number(event.target.value))}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-1)',
                        color: 'var(--text-1)',
                        padding: '7px 8px',
                        fontSize: 12,
                      }}
                    />
                  </label>

                  <label style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    Duração da capa
                    <input
                      type="number"
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={posterHoldSec}
                      onChange={(event) => setPosterHoldSec(Number(event.target.value))}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-1)',
                        color: 'var(--text-1)',
                        padding: '7px 8px',
                        fontSize: 12,
                      }}
                    />
                  </label>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  Atual: {posterFrameEnabled ? `${posterFrameSec}s por ${posterHoldSec}s` : 'desativada'}.
                  O PNG da capa será salvo junto com os vídeos prontos.
                </div>
              </div>
            )}


        <div
          style={{
            position: 'relative',
            marginTop: 14,
            padding: '14px 22px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'var(--bg-1)',
            borderTop: '1px solid var(--border-1)',
          }}
        >
          {SAAS_EXPORT_MODE && (
            <div
              style={{
                display: 'grid',
                gap: 8,
                padding: 12,
                borderRadius: 10,
                border: '1px solid rgba(244,211,94,0.34)',
                background: 'linear-gradient(135deg, rgba(244,211,94,0.13), rgba(184,85,255,0.12))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ color: '#f4d35e', fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Renders na conta
                  </div>
                  <div style={{ marginTop: 3, color: '#fff', fontSize: 17, fontWeight: 950 }}>
                    {saasUser ? `${saasUser.tokens} ${saasUser.tokens === 1 ? 'render' : 'renders'}` : 'Pacotes ativos'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openUpgradeOffer('Escolha um plano e pague via Pix para liberar mais renders.')}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    background: '#f4d35e',
                    color: '#111',
                    padding: '9px 11px',
                    fontSize: 12,
                    fontWeight: 950,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Comprar
                </button>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 11, lineHeight: 1.35 }}>
                Gostou do template? Carregue renders antes do lançamento e exporte story, feed e variações sem esperar.
              </div>
            </div>
          )}
          {presetExportButtonV1}
          <button onClick={saveToGallery} style={primaryBtn} disabled={!activeSlug}>
            ★ Salvar na galeria
          </button>
          {!SAAS_EXPORT_MODE && (
            <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-1)' }}>
              <button
                onClick={() => switchRenderEngine('desktop')}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: renderEngine === 'desktop' ? 'rgba(34,197,94,0.85)' : 'var(--bg-2)',
                  color: renderEngine === 'desktop' ? '#fff' : 'var(--text-3)',
                }}
              >
                Computador
              </button>
              <button
                onClick={() => switchRenderEngine('local')}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  borderLeft: '1px solid var(--border-1)',
                  background: renderEngine === 'local' ? 'rgba(168,85,247,0.85)' : 'var(--bg-2)',
                  color: renderEngine === 'local' ? '#fff' : 'var(--text-3)',
                }}
              >
                Servidor
              </button>
              <button
                onClick={() => switchRenderEngine('lambda')}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  borderLeft: '1px solid var(--border-1)',
                  background: renderEngine === 'lambda' ? 'rgba(249,115,22,0.85)' : 'var(--bg-2)',
                  color: renderEngine === 'lambda' ? '#fff' : 'var(--text-3)',
                }}
              >
                Lambda (AWS)
              </button>
            </div>
          )}
          <button
            disabled={rendering}
            onClick={handleRender}
            style={renderBtnStyle}
          >
            {SAAS_EXPORT_MODE
              ? (rendering ? `Exportando… ${renderProgress}%` : `Exportar vídeo (${target})`)
              : rendering
              ? (renderEngine === 'lambda' ? `☁ Renderizando… ${renderProgress}%` : 'Renderizando…')
              : renderEngine === 'desktop' ? `Exportar pacote (${target})` : renderEngine === 'local' ? `Renderizar no servidor (${target})` : `☁ Renderizar vídeo (${target})`}
          </button>
          {SAAS_EXPORT_MODE && (
            <button
              type="button"
              onClick={() => openUpgradeOffer('Pacotes maiores deixam sua equipe pronta para vários lançamentos.')}
              style={{
                ...ghostBtnStyle,
                borderColor: 'rgba(244,211,94,0.28)',
                color: '#f4d35e',
                fontWeight: 900,
              }}
            >
              Ver pacotes de renders
            </button>
          )}
          {lambdaOutputUrl && (SAAS_EXPORT_MODE || renderEngine === 'lambda') && (
            <a href={lambdaOutputUrl} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtnStyle, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              {SAAS_EXPORT_MODE ? 'Baixar vídeo' : 'Baixar vídeo Lambda'}
            </a>
          )}
          <button onClick={saveProjectMain} disabled={saving} style={ghostBtnStyle}>
            {saving ? 'Salvando…' : SAAS_EXPORT_MODE ? 'Salvar projeto' : 'Salvar projeto (render)'}
          </button>
          {renderMessage && (
            <div style={{ fontSize: 11, color: renderMessage.startsWith('Erro') ? 'var(--danger)' : 'var(--text-3)' }}>
              {renderMessage}
            </div>
          )}
          {saveMessage && (
            <div style={{ fontSize: 11, color: saveMessage.startsWith('Erro') ? 'var(--danger)' : 'var(--text-3)' }}>
              {saveMessage}
            </div>
          )}
        </div>
      </aside>

      {/* ─── ÁREA CENTRAL ─── */}
      <section
        style={{
          ...centerStyle,
          padding: 'clamp(8px, 1.1vw, 20px)',
          gap: 'clamp(8px, 1.1vh, 14px)',
        }}
        data-novacena-center-panel="true"
      >
        {activeTab === 'studio' ? (
          <>
            <div style={previewToolbarStyle}>
              <SegmentedControl
                options={[
                  { id: 'story', label: 'Story 1080×1920' },
                  { id: 'feed', label: 'Feed 1080×1350' },
                ]}
                value={target}
                onChange={(v) => setTarget(v as RenderTarget)}
              />

              <button onClick={() => setShowSafeArea((s) => !s)} style={showSafeArea ? chipActive : chip}>
                {showSafeArea ? '✓ ' : ''}Safe zone
              </button>
            </div>

            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 16,
              }}
            >
              <div
                data-preview-frame
                ref={previewFrameRef}
                onClickCapture={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (target?.closest('[data-preview-layer-hit="true"]')) return;
                  if (!editPreviewLoop) return;
                  event.preventDefault();
                  event.stopPropagation();
                  releaseEditPreviewLoopAndPlayFull();
                }}
                style={{
                  position: 'relative',
                  width: target === 'story'
                    ? `min(360px, 100%, calc((100dvh - ${showTimeline ? 466 : 270}px) * 9 / 16))`
                    : `min(430px, 100%, calc((100dvh - ${showTimeline ? 466 : 270}px) * 1080 / 1350))`,
                  flex: '0 1 auto',
                  aspectRatio: target === 'story' ? '9 / 16' : '1080 / 1350',
                  borderRadius: 22,
                  overflow: 'hidden',
                  boxShadow: '0 30px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
              {isClientReady ? (
                <Player
                  key={playerRemountKey}
                  acknowledgeRemotionLicense
                  ref={playerRef}
                  component={Component}
                  inputProps={liveProject}
                  durationInFrames={durationSeconds * 30}
                  compositionWidth={1080}
                  compositionHeight={compositionHeight}
                  fps={30}
                  style={{ width: '100%', height: '100%' }}
                  controls
                  loop
                  inFrame={focusedPreviewLoop?.startFrame ?? null}
                  outFrame={focusedPreviewLoop?.endFrame ?? null}
                  initialFrame={0}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#050507',
                  }}
                />
              )}
              {showSafeArea && target === 'story' && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${(285 / 1920) * 100}%`,
                    left: 0,
                    width: '100%',
                    height: `${(1350 / 1920) * 100}%`,
                    border: '2px dashed rgba(255, 80, 200, 0.95)',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.34), 0 0 0 9999px rgba(255, 80, 200, 0.10) inset',
                    zIndex: 42,
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 10,
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,0.72)',
                      border: '1px solid rgba(255,80,200,0.65)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    Safe zone
                  </span>
                </div>
              )}
              {previewLayerHotspots.map((layer) => {
                const selected =
                  (layer.kind === 'text' && layer.role === activeTextRole && activeStudioTool === 'text') ||
                  (layer.kind === 'cover' && activeStudioTool === 'cover') ||
                  (layer.kind === 'logos' && activeStudioTool === 'logos') ||
                  (layer.kind === 'phone' && activeStudioTool === 'motion') ||
                  (layer.kind === 'element' && layer.overlayId === selectedOverlayId);
                const dragging = previewDraggingLayerId === layer.id;
                const accent = previewLayerAccent(layer.kind);
                const draggableLayer =
                  layer.kind === 'element' ||
                  layer.kind === 'text' ||
                  layer.kind === 'cover' ||
                  layer.kind === 'phone' ||
                  layer.id === 'milestone-logo';

                return (
                  <button
                    key={layer.id}
                    type="button"
                    data-preview-layer-hit="true"
                    aria-label={`Selecionar ${previewLayerKindLabel(layer)}`}
                    title={draggableLayer ? `${previewLayerKindLabel(layer)} · arraste para mover · Shift+arraste para escalar` : `Selecionar ${previewLayerKindLabel(layer)}`}
                    onPointerDown={(event) => beginPreviewLayerDrag(event, layer)}
                    onPointerMove={(event) => movePreviewLayer(event, layer)}
                    onPointerUp={endPreviewLayerDrag}
                    onPointerCancel={endPreviewLayerDrag}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (layer.kind === 'text' && layer.role) {
                        setActiveTextRole(layer.role);
                        setEditingPreviewTextRole(layer.role);
                        selectStudioTool('text');
                      }
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (suppressPreviewClickRef.current) return;
                      selectPreviewLayer(layer);
                    }}
                    style={{
                      position: 'absolute',
                      zIndex: 90,
                      padding: 0,
                      borderRadius: 10,
                      border: selected ? `1px dashed ${accent}` : '1px solid transparent',
                      background: selected ? `${accent}18` : 'transparent',
                      boxShadow: dragging
                        ? `0 0 0 2px ${accent}66, 0 12px 28px rgba(0,0,0,0.32)`
                        : selected
                          ? `0 0 0 1px rgba(0,0,0,0.42), 0 0 24px ${accent}40`
                          : 'none',
                      cursor: draggableLayer ? (dragging ? 'grabbing' : 'grab') : 'pointer',
                      outline: 'none',
                      touchAction: 'none',
                      ...layer.rect,
                    }}
                  >
                    {selected && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 6,
                          top: -28,
                          maxWidth: 180,
                          padding: '5px 8px',
                          borderRadius: 7,
                          background: 'rgba(9,9,13,0.92)',
                          border: `1px solid ${accent}99`,
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 900,
                          lineHeight: 1,
                          letterSpacing: 0.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          pointerEvents: 'none',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
                        }}
                      >
                        {previewLayerKindLabel(layer)}
                      </span>
                    )}
                  </button>
                );
              })}
              {editingPreviewTextRole && (() => {
                const editingLayer = previewLayerHotspots.find((layer) => layer.kind === 'text' && layer.role === editingPreviewTextRole);
                if (!editingLayer?.role) return null;

                return (
                  <textarea
                    autoFocus
                    data-preview-inline-editor="true"
                    value={getPreviewTextValue(editingLayer.role)}
                    onChange={(event) => setPreviewTextValue(editingLayer.role!, event.target.value)}
                    onBlur={() => setEditingPreviewTextRole(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setEditingPreviewTextRole(null);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      zIndex: 120,
                      ...editingLayer.rect,
                      minHeight: 34,
                      padding: 8,
                      resize: 'none',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.55)',
                      outline: '2px solid rgba(255,80,200,0.55)',
                      background: 'rgba(10,10,14,0.72)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 800,
                      lineHeight: 1.15,
                      textAlign: 'center',
                      boxShadow: '0 14px 36px rgba(0,0,0,0.42)',
                    }}
                  />
                );
              })()}
              </div>

            </div>

            <div style={renderBarStyle}>
              {!SAAS_EXPORT_MODE && (
                <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => switchRenderEngine('desktop')}
                    style={{
                      flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: renderEngine === 'desktop' ? 'rgba(34,197,94,0.85)' : 'rgba(255,255,255,0.06)',
                      color: renderEngine === 'desktop' ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    Computador
                  </button>
                  <button
                    onClick={() => switchRenderEngine('local')}
                    style={{
                      flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      borderLeft: '1px solid rgba(255,255,255,0.1)',
                      background: renderEngine === 'local' ? 'rgba(168,85,247,0.85)' : 'rgba(255,255,255,0.06)',
                      color: renderEngine === 'local' ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    Servidor
                  </button>
                  <button
                    onClick={() => switchRenderEngine('lambda')}
                    style={{
                      flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      borderLeft: '1px solid rgba(255,255,255,0.1)',
                      background: renderEngine === 'lambda' ? 'rgba(249,115,22,0.85)' : 'rgba(255,255,255,0.06)',
                      color: renderEngine === 'lambda' ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    Lambda (AWS)
                  </button>
                </div>
              )}
              <button
                disabled={rendering}
                onClick={handleRender}
                style={renderBtnStyle}
              >
                {SAAS_EXPORT_MODE
                  ? (rendering ? `Exportando… ${renderProgress}%` : `Exportar ${target}`)
                  : rendering
                  ? (renderEngine === 'lambda' ? `☁ Renderizando… ${renderProgress}%` : 'Renderizando…')
                  : renderEngine === 'desktop' ? `Exportar pacote ${target}` : renderEngine === 'local' ? `Renderizar no servidor ${target}` : `☁ Renderizar ${target}`}
              </button>
              {renderStatus !== 'idle' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                    <span>{renderStatus === 'done' ? '✓ Concluído' : renderStatus === 'error' ? '✗ Erro' : `${SAAS_EXPORT_MODE ? 'Exportando' : 'Renderizando'}… ${renderProgress}%`}</span>
                    <span>{renderProgress}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${renderProgress}%`, borderRadius: 2,
                      background: renderStatus === 'done' ? '#22c55e' : renderStatus === 'error' ? '#ef4444' : 'linear-gradient(90deg,rgba(168,85,247,0.9),rgba(249,115,22,0.8))',
                      transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )}
              {lambdaOutputUrl && (SAAS_EXPORT_MODE || renderEngine === 'lambda') && (
                <a href={lambdaOutputUrl} target="_blank" rel="noopener noreferrer"
                  style={{ ...ghostBtnStyle, textAlign: 'center', textDecoration: 'none', display: 'block', color: '#f97316' }}>
                  {SAAS_EXPORT_MODE ? 'Baixar vídeo' : 'Baixar vídeo Lambda'}
                </a>
              )}

              {!SAAS_EXPORT_MODE && (
                <>
                  <button disabled={rendering} onClick={() => renderScript('render:all', 'todos')} style={ghostBtnStyle}>
                    Gerar todos
                  </button>
                  <button onClick={openOutFolder} style={ghostBtnStyle}>
                    Abrir pasta
                  </button>
                </>
              )}
            </div>
            {renderMessage && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-2)' }}>{renderMessage}</div>
            )}
            {lambdaOutputUrl && (
              <a
                href={lambdaOutputUrl}
                target="_blank"
                rel="noreferrer"
                style={downloadVideoWideBtnStyle}
              >
                {SAAS_EXPORT_MODE ? 'Abrir vídeo' : 'Abrir vídeo renderizado'}
              </a>
            )}
            {!SAAS_EXPORT_MODE && renderFiles[0] && (
              <a
                href={`/api/render-files?file=${encodeURIComponent(renderFiles[0].name)}`}
                download={renderFiles[0].name}
                style={downloadVideoWideBtnStyle}
              >
                Baixar vídeo
              </a>
            )}
            {!SAAS_EXPORT_MODE && renderFiles.length > 0 && (
              <div
                style={{
                  position: 'relative',
                  zIndex: 70,
                  marginTop: 12,
                  width: 'min(520px, 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 10,
                  borderRadius: 12,
                  border: '1px solid var(--border-1)',
                  background: 'rgba(255,255,255,0.035)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Histórico de vídeos ({renderFiles.length})
                  </div>

                  <button
                    type="button"
                    onClick={deleteAllRenders}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239,68,68,0.35)',
                      color: 'rgba(239,68,68,0.85)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                    title="Excluir todos os vídeos renderizados"
                  >
                    Limpar todos
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 6, maxHeight: 170, overflowY: 'auto', paddingRight: 2 }}>
                  {renderFiles.map(f => (
                    <div
                      key={f.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        gap: 8,
                      }}
                    >
                      <a
                        href={`/api/render-files?file=${encodeURIComponent(f.name)}`}
                        download={f.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flex: 1,
                          gap: 8,
                          color: 'var(--text-1)',
                          textDecoration: 'none',
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.name}
                        </span>

                        <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {(f.size / 1024 / 1024).toFixed(1)} MB ↓
                        </span>
                      </a>

                      <button
                        type="button"
                        onClick={() => deleteRender(f.name)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(239,68,68,0.75)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 18,
                          cursor: 'pointer',
                          lineHeight: 1,
                          fontWeight: 300,
                        }}
                        title={`Excluir ${f.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!SAAS_EXPORT_MODE && renderLog && (
              <details style={{ marginTop: 10, maxWidth: 520 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 12 }}>Log</summary>
                <pre style={logBoxStyle}>{renderLog.slice(-3000)}</pre>
              </details>
            )}
          </>
        ) : (
          <GalleryView
            artist={activeArtist}
            items={gallery}
            driveFolderPath={driveFolderPath}
            onDriveChange={setDriveFolderPath}
            onDriveSave={updateArtistDrive}
            onLoad={loadFromGallery}
            onDelete={deleteGalleryItem}
          />
        )}
      </section>

      {/* ─── SIDEBAR DIREITA ─── */}
      <aside style={rightSidebar} data-novacena-right-panel="true">
        <div style={{ padding: '18px 22px 6px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={miniLabel}>Studio</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>Motion Studio</div>
          </div>
          <button onClick={resetMotion} style={resetBtnStyle} title="Resetar tudo">↺</button>
        </div>

        <div
          data-studio-tool-dock="right"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: '10px 14px 12px',
            background: 'linear-gradient(180deg, rgba(14,14,18,0.98), rgba(14,14,18,0.88))',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}
          >
            {STUDIO_TOOL_DOCK.filter((tool) => tool.id !== 'render').map((tool) => {
              const active = activeStudioTool === tool.id;

              return (
                <button
                  key={`right-${tool.id}`}
                  type="button"
                  onClick={() => {
                    if (tool.id === 'text') {
                      selectStudioTool('text', { textPanelTab: 'entrada', textRole: activeTextRole, keepTimelineOpen: true });
                      return;
                    }
                    selectStudioTool(tool.id);
                  }}
                  style={{
                    minHeight: 34,
                    borderRadius: 10,
                    border: active ? '1px solid rgba(255,255,255,0.28)' : '1px solid var(--border-1)',
                    background: active
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.95), rgba(249,115,22,0.85))'
                      : 'rgba(255,255,255,0.045)',
                    color: active ? '#fff' : 'var(--text-2)',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: active ? '0 10px 26px rgba(168,85,247,0.22)' : 'none',
                  }}
                >
                  {tool.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* PROJETO */}
        <Section title="Projeto" draggablePanel>
          <div style={{ marginBottom: 12 }}>
            <div style={miniInputLabel}>Duração</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
              {[8, 15, 20, 30, 40, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationSeconds(d)}
                  style={durationSeconds === d ? segBtnActive : segBtn}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...miniInputLabel, display: 'flex', justifyContent: 'space-between' }}>
              <span>Vídeo de fundo</span>
              {bgVideo && <button onClick={clearBgVideo} style={linkBtnDanger}>remover</button>}
            </div>
            <button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo || processingVideoClip} style={dashedUpload}>
              {uploadingVideo
                ? videoUploadProgress !== null
                  ? `Enviando bruto… ${videoUploadProgress}%`
                  : 'Enviando bruto…'
                : bgVideo && !bgIsImage
                  ? bgVideoNeedsTrim
                    ? `✓ Bruto (${bgVideoDuration.toFixed(1)}s)`
                    : `✓ Clip otimizado (${bgVideoDuration.toFixed(1)}s)`
                  : bgIsImage
                    ? `✓ Imagem BG${bgVideoOriginalName ? ` · ${bgVideoOriginalName}` : ''}`
                  : '+ Carregar vídeo bruto pesado'}
            </button>
            <input ref={videoInputRef} type="file" accept="video/*,.mp4,.mov,.webm,.m4v,.mpeg,.mpg,.mkv,.avi,.3gp,.3gpp"
              onChange={handleVideoUpload} style={{ display: 'none' }} />
            {uploadingVideo && videoUploadProgress !== null && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${videoUploadProgress}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, rgba(168,85,247,0.95), rgba(249,115,22,0.95))',
                      transition: 'width 160ms ease',
                    }}
                  />
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-3)' }}>
                  {videoUploadProgress}% enviado. Pode demorar em vídeos grandes.
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => bgImageInputRef.current?.click()}
              disabled={uploadingVideo || processingVideoClip}
              style={{ ...dashedUpload, marginTop: 8 }}
            >
              + Usar imagem externa como BG
            </button>
            <input ref={bgImageInputRef} type="file" accept="image/png,image/jpeg,image/webp"
              onChange={handleBgImageUpload} style={{ display: 'none' }} />

            <div style={{ marginTop: 12 }}>
              <div style={miniLabel}>Áudio</div>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                disabled={uploadingAudio}
                style={dashedUpload}
              >
                {uploadingAudio
                  ? audioUploadProgress !== null
                    ? `Enviando… ${audioUploadProgress}%`
                    : 'Processando…'
                  : audioSrc
                    ? `✓ Áudio pronto${audioDuration ? ` (${audioDuration.toFixed(1)}s)` : ''}`
                    : '+ Carregar áudio ou extrair de vídeo'}
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,video/mp4,video/quicktime,video/webm,.mp3,.wav,.m4a,.aac,.ogg,.flac,.aif,.aiff,.mp4,.mov,.m4v,.webm,.mpeg,.mpg,.mkv,.avi,.3gp,.3gpp"
                onChange={uploadAudio}
                style={{ display: 'none' }}
              />
              {uploadingAudio && audioUploadProgress !== null && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${audioUploadProgress}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, rgba(168,85,247,0.95), rgba(249,115,22,0.95))',
                        transition: 'width 160ms ease',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-3)' }}>
                    {audioUploadMsg || 'Enviando arquivo em partes...'}
                  </div>
                </div>
              )}
              {!uploadingAudio && audioUploadMsg && (
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>
                  {audioUploadMsg}
                </div>
              )}
              {audioSrc && (
                <>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>
                      {audioOriginalName || 'Áudio do projeto'}
                      {audioDuration ? ` · ${formatTimecode(audioDuration)}` : ''}
                    </div>
                    <button onClick={clearAudio} style={linkBtnDanger}>remover áudio</button>
                  </div>

                  <audio
                    ref={audioPreviewRef}
                    src={audioSrc}
                    controls
                    preload="metadata"
                    onLoadedMetadata={(event) => {
                      const duration = event.currentTarget.duration;
                      if (Number.isFinite(duration) && duration > 0) setAudioDuration(duration);
                      event.currentTarget.currentTime = Math.min(audioPreviewTime, Math.max(0, duration || audioPreviewTime));
                    }}
                    onTimeUpdate={(event) => {
                      const current = event.currentTarget.currentTime;
                      if (Number.isFinite(current)) setAudioPreviewTime(current);
                    }}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      minHeight: 36,
                      borderRadius: 8,
                      background: '#000',
                    }}
                  />

                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>
                      Início no motion: {formatTimecode(audioStartSec)}
                    </div>
                    <button type="button" onClick={useCurrentAudioPreviewTime} style={smallBtn}>
                      Marcar início aqui
                    </button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-3)' }}>Percorrer áudio</span>
                      <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>
                        {formatTimecode(audioPreviewTime)} / {formatTimecode(audioDuration)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.1, audioDuration)}
                      step={0.05}
                      value={Math.min(audioPreviewTime, Math.max(0, audioDuration || audioPreviewTime || 0))}
                      onPointerDown={() => {
                        audioPreviewRef.current?.pause();
                      }}
                      onChange={(event) => seekAudioPreview(parseFloat(event.target.value))}
                      style={{ width: '100%', accentColor: '#f97316' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-3)' }}>Início do áudio</span>
                      <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>{formatTimecode(audioStartSec)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.1, audioStartMax)}
                      step={0.05}
                      value={audioStartSec}
                      onChange={(event) => setAudioStartAndPreview(parseFloat(event.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
                    {[-5, -1, 0, 1, 5].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => delta === 0 ? playAudioFromPreview() : nudgeAudioStart(delta)}
                        style={smallBtn}
                      >
                        {delta === 0 ? 'Play daqui' : delta > 0 ? `+${delta}s` : `${delta}s`}
                      </button>
                    ))}
                  </div>

                  <label style={{ display: 'grid', gap: 5, marginTop: 8 }}>
                    <span style={miniInputLabel}>Início exato</span>
                    <input
                      value={audioStartTimecodeInput}
                      onChange={(event) => setAudioStartTimecodeInput(event.target.value)}
                      onBlur={() => {
                        const parsed = parseTimecode(audioStartTimecodeInput);
                        setAudioStartAndPreview(parsed ?? audioStartSec);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        const parsed = parseTimecode(audioStartTimecodeInput);
                        setAudioStartAndPreview(parsed ?? audioStartSec);
                      }}
                      placeholder="01:23.4"
                      style={fieldInputStyle}
                    />
                  </label>

                  <SliderRow
                    label="Volume"
                    value={audioVolume}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={setAudioVolume}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <SliderRow
                    label="Fade in"
                    value={audioFadeIn}
                    min={0}
                    max={4}
                    step={0.1}
                    onChange={setAudioFadeIn}
                    format={(v) => `${v.toFixed(1)}s`}
                  />
                  <SliderRow
                    label="Fade out"
                    value={audioFadeOut}
                    min={0}
                    max={4}
                    step={0.1}
                    onChange={setAudioFadeOut}
                    format={(v) => `${v.toFixed(1)}s`}
                  />
                </>
              )}
              {bgVideo && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
                  <ToggleRow
                    label="🔇 Mutar áudio do vídeo BG"
                    value={!useVideoAudio}
                    onChange={(v) => setUseVideoAudio(!v)}
                  />
                </div>
              )}
            </div>

            <div data-right-panel-section="Overlay" style={{ marginTop: 12, scrollMarginTop: 78 }}>
              <div style={miniLabel}>Overlays / elementos livres</div>
              <button
                onClick={() => overlayInputRef.current?.click()}
                style={{ ...dashedUpload, opacity: uploadingOverlay ? 0.72 : 1, cursor: uploadingOverlay ? 'wait' : 'pointer' }}
                disabled={uploadingOverlay}
              >
                {uploadingOverlay ? `Enviando overlay ${overlayUploadProgress ?? 0}%` : '+ Subir overlay ou elemento'}
              </button>
              {uploadingOverlay && (
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${overlayUploadProgress ?? 0}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #c45cff, #ff7a3d)',
                        transition: 'width .18s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.35 }}>
                    {overlayUploadMsg || 'Enviando overlay...'}
                  </div>
                </div>
              )}
              <input ref={overlayInputRef} type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v,image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={uploadOverlay} style={{ display: 'none' }} />

              <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
                <ToggleRow label="Partículas bokeh" value={particlesEnabled} onChange={setParticlesEnabled} />
                <ToggleRow label="Flash final" value={finalFlash} onChange={setFinalFlash} />
              </div>

              {overlayAssets.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={miniLabel}>Biblioteca</div>
                  {overlayAssets.map((ov) => (
                    <div key={ov.id} style={overlayLibraryRow}>
                      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ov.type === 'video' ? '🎞' : '🖼'} {ov.label}
                      </span>
                      <button onClick={() => addOverlayInstance(ov)} style={tinyAddBtn}>Aplicar</button>
                      <button onClick={() => deleteOverlayAsset(ov.id)} style={tinyDelBtn} title="Remover da biblioteca">×</button>
                    </div>
                  ))}
                </div>
              )}

              {overlays.length > 0 && (
                <div data-right-panel-section="Layers de overlay" style={{ marginTop: 12 }}>
                  <OverlayTimeline
                    overlays={overlays}
                    durationSeconds={durationSeconds}
                    selectedId={selectedOverlayId}
                    onSelect={(id) => {
                      const overlay = overlays.find((item) => item.id === id);
                      setSelectedOverlayId(id);
                      selectStudioTool('overlay', { keepTimelineOpen: true });
                      if (overlay) seekTimeline(overlay.startSec ?? 0);
                    }}
                    onUpdate={updateOverlay}
                    onRemove={removeOverlay}
                  />
                </div>
              )}

              {/* PRESETS DE OVERLAY — por template, com thumbnail do frame escolhido */}
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={miniLabel}>Presets deste template</div>
                  <button
                    onClick={saveOverlayPreset}
                    disabled={savingOverlayPreset}
                    style={tinyAddBtn}
                    title="Salva o overlay atual + um print do frame em que a timeline está"
                  >
                    {savingOverlayPreset ? 'Salvando…' : '+ Salvar atual'}
                  </button>
                </div>
                {overlayPresets.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                    Nenhum preset ainda. Aplique um overlay, posicione o playhead da timeline no
                    momento bonito e clique “Salvar atual”.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {overlayPresets.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          position: 'relative',
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1px solid var(--border-1)',
                          background: '#0a0a0e',
                        }}
                      >
                        <button
                          onClick={() => applyOverlayPreset(p)}
                          style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                          title="Aplicar preset"
                        >
                          <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16', background: '#111' }}>
                            {p.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.thumbnail} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 22 }}>🎞</div>
                            )}
                          </div>
                          <div style={{ padding: '5px 6px', fontSize: 10, color: 'var(--text-1)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.label}
                          </div>
                        </button>
                        <button
                          onClick={() => removeOverlayPreset(p.id)}
                          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
                          title="Remover preset"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedElement && (
                <div
                  data-right-panel-section="Elemento selecionado"
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-1)',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={miniLabel}>Elemento selecionado</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedElement.label}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOverlayId(null)}
                      style={smallBtn}
                    >
                      limpar
                    </button>
                  </div>

                  <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>
                    Arraste no preview para posicionar. Segure Shift e arraste para escalar.
                  </div>

                  <div>
                    <div style={miniInputLabel}>Entrada</div>
                    <select
                      value={selectedElement.entryTransition ?? 'bounce-left'}
                      onChange={(event) => updateOverlay(selectedElement.id, { entryTransition: event.target.value as OverlayPlacement['entryTransition'] })}
                      style={{ ...fieldInputStyle, padding: '8px 10px', fontSize: 12 }}
                    >
                      <option value="none">Sem entrada</option>
                      <option value="fade">Fade</option>
                      <option value="slide-left">Slide da esquerda</option>
                      <option value="slide-right">Slide da direita</option>
                      <option value="slide-up">Slide de cima</option>
                      <option value="slide-down">Slide de baixo</option>
                      <option value="zoom-pop">Zoom pop</option>
                      <option value="bounce-left">Slide bounce esquerda</option>
                    </select>
                  </div>

                  <SliderRow
                    label="Escala"
                    value={selectedElement.scale ?? 0.42}
                    min={0.05}
                    max={3}
                    step={0.01}
                    onChange={(value) => updateOverlay(selectedElement.id, { scale: value })}
                    format={(value) => `${Math.round(value * 100)}%`}
                  />
                  <SliderRow
                    label="Rotação"
                    value={selectedElement.rotate ?? 0}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(value) => updateOverlay(selectedElement.id, { rotate: value })}
                    format={(value) => `${Math.round(value)}°`}
                  />
                  <SliderRow
                    label="Wiggle posição"
                    value={selectedElement.wigglePosition ?? 0}
                    min={0}
                    max={80}
                    step={1}
                    onChange={(value) => updateOverlay(selectedElement.id, { wigglePosition: value })}
                    format={(value) => `${Math.round(value)}px`}
                  />
                  <SliderRow
                    label="Wiggle rotação"
                    value={selectedElement.wiggleRotate ?? 0}
                    min={0}
                    max={20}
                    step={0.5}
                    onChange={(value) => updateOverlay(selectedElement.id, { wiggleRotate: value })}
                    format={(value) => `${value.toFixed(1)}°`}
                  />
                  <SliderRow
                    label="Velocidade do wiggle"
                    value={selectedElement.wiggleSpeed ?? 1}
                    min={0}
                    max={4}
                    step={0.1}
                    onChange={(value) => updateOverlay(selectedElement.id, { wiggleSpeed: value })}
                    format={(value) => value.toFixed(1)}
                  />
                  <SliderRow
                    label="Sombra"
                    value={selectedElement.shadowBlur ?? 0}
                    min={0}
                    max={80}
                    step={1}
                    onChange={(value) => updateOverlay(selectedElement.id, { shadowBlur: value, shadowOpacity: value > 0 ? (selectedElement.shadowOpacity || 0.35) : selectedElement.shadowOpacity })}
                    format={(value) => `${Math.round(value)}px`}
                  />
                  <SliderRow
                    label="Contorno"
                    value={selectedElement.outlineWidth ?? 0}
                    min={0}
                    max={24}
                    step={1}
                    onChange={(value) => updateOverlay(selectedElement.id, { outlineWidth: value })}
                    format={(value) => `${Math.round(value)}px`}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    <label style={{ display: 'grid', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
                      recolorir
                      <input
                        type="checkbox"
                        checked={Boolean(selectedElement.tintEnabled)}
                        onChange={(event) => updateOverlay(selectedElement.id, { tintEnabled: event.target.checked })}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
                      cor png
                      <input
                        type="color"
                        value={selectedElement.tintColor ?? '#ffffff'}
                        onChange={(event) => updateOverlay(selectedElement.id, { tintColor: event.target.value, tintEnabled: true })}
                        style={colorInputStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
                      sombra
                      <input
                        type="color"
                        value={selectedElement.shadowColor ?? '#000000'}
                        onChange={(event) => updateOverlay(selectedElement.id, { shadowColor: event.target.value })}
                        style={colorInputStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
                      contorno
                      <input
                        type="color"
                        value={selectedElement.outlineColor ?? '#ffffff'}
                        onChange={(event) => updateOverlay(selectedElement.id, { outlineColor: event.target.value })}
                        style={colorInputStyle}
                      />
                    </label>
                  </div>

                  {selectedElement.tintEnabled && (
                    <SliderRow
                      label="Força da cor"
                      value={selectedElement.tintOpacity ?? 1}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(value) => updateOverlay(selectedElement.id, { tintOpacity: value })}
                      format={(value) => `${Math.round(value * 100)}%`}
                    />
                  )}

                  <ToggleRow
                    label="Halo / degradê atrás"
                    value={Boolean(selectedElement.gradientEnabled)}
                    onChange={(value) => updateOverlay(selectedElement.id, { gradientEnabled: value })}
                  />

                  {selectedElement.gradientEnabled && (
                    <>
                      <SliderRow
                        label="Opacidade do halo"
                        value={selectedElement.gradientOpacity ?? 0.35}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(value) => updateOverlay(selectedElement.id, { gradientOpacity: value })}
                        format={(value) => `${Math.round(value * 100)}%`}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <label style={{ display: 'grid', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
                          halo 1
                          <input
                            type="color"
                            value={selectedElement.gradientFrom ?? '#1ed760'}
                            onChange={(event) => updateOverlay(selectedElement.id, { gradientFrom: event.target.value })}
                            style={colorInputStyle}
                          />
                        </label>
                        <label style={{ display: 'grid', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
                          halo 2
                          <input
                            type="color"
                            value={selectedElement.gradientTo ?? '#8b5cf6'}
                            onChange={(event) => updateOverlay(selectedElement.id, { gradientTo: event.target.value })}
                            style={colorInputStyle}
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {videoUploadMsg && <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)' }}>{videoUploadMsg}</div>}

            {bgVideo && (
              <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                {!bgIsImage && !bgVideoNeedsTrim && bgVideoDuration > 0 && (
                  <SliderRow label="Início (refrão)" value={bgVideoStartSec} min={0} max={bgVideoStartMax} step={0.1}
                    onChange={setBgVideoStartSec} format={(v) => `${v.toFixed(1)}s`} />
                )}
                <SliderRow label={bgIsImage ? 'Opacidade da imagem' : 'Opacidade do vídeo'} value={bgVideoOpacity} min={0} max={1} step={0.05}
                  onChange={setBgVideoOpacity} format={(v) => `${Math.round(v * 100)}%`} />
                <SliderRow label="Blur" value={bgVideoBlur} min={0} max={60} step={1}
                  onChange={setBgVideoBlur} format={(v) => `${v}px`} />
                <SliderRow label="Saturação" value={bgVideoSaturation} min={0} max={2} step={0.05}
                  onChange={setBgVideoSaturation} format={(v) => `${v.toFixed(2)}×`} />
              </div>
            )}

            {bgVideoNeedsTrim && (
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                <video
                  ref={bgTrimVideoRef}
                  src={bgVideo}
                  controls
                  preload="auto"
                  playsInline
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;
                    if (Number.isFinite(duration) && duration > 0) {
                      setBgVideoDuration((current) => {
                        if (current > 0 && duration + 1 < current * 0.8) return current;
                        return Math.max(current, duration);
                      });
                    }
                  }}
                  onTimeUpdate={(event) => {
                    const current = event.currentTarget.currentTime;
                    bgTrimPreviewCursorRef.current = current;
                    setBgTrimPreviewTime(current);
                    const selectionEnd = bgTrimSelectionEndRef.current;
                    if (selectionEnd !== null && current >= selectionEnd) {
                      bgTrimSelectionEndRef.current = null;
                      event.currentTarget.pause();
                    }
                  }}
                  onSeeked={(event) => {
                    const isProgrammaticSeek = bgTrimProgrammaticSeekRef.current;
                    bgTrimProgrammaticSeekRef.current = false;
                    if (!isProgrammaticSeek) {
                      // Arrastar no player nativo = navegação livre: limpa a janela
                      // de reprodução automática para não pausar num ponto antigo.
                      bgTrimSelectionEndRef.current = null;
                    }
                    const current = event.currentTarget.currentTime;
                    if (Number.isFinite(current)) {
                      bgTrimPreviewCursorRef.current = current;
                      setBgTrimPreviewTime(current);
                    }
                  }}
                  style={{
                    width: '100%',
                    aspectRatio: target === 'story' ? '9 / 16' : '4 / 5',
                    maxHeight: 260,
                    borderRadius: 10,
                    background: '#000',
                    objectFit: 'contain',
                    border: '1px solid var(--border-1)',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>
                    {bgVideoOriginalName ? `${bgVideoOriginalName} · ` : ''}
                    Janela: {formatTimecode(bgVideoStartSec)} até {formatTimecode(bgVideoStartSec + bgClipDuration)}
                  </div>
                  <button type="button" onClick={useCurrentBgPreviewTime} style={smallBtn}>
                    Marcar início aqui
                  </button>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-3)' }}>Percorrer vídeo bruto</span>
                    <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>
                      {formatTimecode(bgTrimPreviewTime)} / {formatTimecode(bgVideoDuration)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.1, bgVideoDuration)}
                    step={0.05}
                    value={Math.min(bgTrimPreviewTime, Math.max(0, bgVideoDuration || 0))}
                    onPointerDown={() => {
                      bgTrimSelectionEndRef.current = null;
                      bgTrimVideoRef.current?.pause();
                    }}
                    onChange={(event) => seekBgTrimPreview(parseFloat(event.target.value))}
                    style={{ width: '100%', accentColor: '#f97316' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-3)' }}>Início do corte</span>
                    <span style={{ color: 'var(--text-1)', fontWeight: 800 }}>
                      {formatTimecode(bgVideoStartSec)} até {formatTimecode(bgVideoStartSec + bgClipDuration)}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 28, display: 'grid', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: 8,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.10)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: `${bgTrimStartPct}%`,
                          width: `${bgTrimWidthPct}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, rgba(168,85,247,0.95), rgba(249,115,22,0.95))',
                          boxShadow: '0 0 18px rgba(249,115,22,0.35)',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={bgVideoStartMax}
                      step={0.05}
                      value={bgVideoStartSec}
                      onChange={(event) => setBgVideoStartAndPreview(parseFloat(event.target.value))}
                      style={{ position: 'relative', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
                  {[-5, -1, 0, 1, 5].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => delta === 0 ? playBgTrimSelection() : nudgeBgVideoStart(delta)}
                      style={smallBtn}
                    >
                      {delta === 0 ? 'Play daqui' : delta > 0 ? `+${delta}s` : `${delta}s`}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={miniInputLabel}>Início exato</span>
                    <input
                      value={bgTrimTimecodeInput}
                      onChange={(event) => setBgTrimTimecodeInput(event.target.value)}
                      onBlur={() => {
                        const parsed = parseTimecode(bgTrimTimecodeInput);
                        setBgVideoStartAndPreview(parsed ?? bgVideoStartSec);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        const parsed = parseTimecode(bgTrimTimecodeInput);
                        setBgVideoStartAndPreview(parsed ?? bgVideoStartSec);
                      }}
                      placeholder="01:23.4"
                      style={fieldInputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={miniInputLabel}>Duração final</span>
                    <input readOnly value={`${bgClipDuration}s`} style={{ ...fieldInputStyle, opacity: 0.78 }} />
                  </label>
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.35 }}>
                  {bgVideoNeedsOnlyOptimization
                    ? `Esse vídeo já tem a duração final. O sistema só vai otimizar em ${target === 'story' ? '1080×1920' : '1080×1350'} para o preview e o render não travarem.`
                    : `Escolha ouvindo/vendo o bruto. Depois o sistema corta só esse trecho, centraliza em ${target === 'story' ? '1080×1920' : '1080×1350'} e exclui o restante.`}
                </div>
                <button
                  type="button"
                  onClick={processBgVideoClip}
                  disabled={processingVideoClip || uploadingVideo}
                  style={{
                    ...dashedUpload,
                    borderStyle: 'solid',
                    background: processingVideoClip ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, rgba(168,85,247,0.95), rgba(249,115,22,0.95))',
                    color: '#fff',
                  }}
                >
                  {processingVideoClip
                    ? 'Otimizando trecho…'
                    : bgVideoNeedsOnlyOptimization
                      ? `Otimizar ${bgClipDuration}s`
                      : `Cortar/otimizar ${bgClipDuration}s`}
                </button>
                {!bgVideoRequiresOptimization ? (
                  <button
                    type="button"
                    onClick={useBgVideoWithoutTrim}
                    disabled={processingVideoClip || uploadingVideo}
                    style={smallBtn}
                  >
                    Usar vídeo inteiro
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={miniInputLabel}>Cor de fundo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {BG_COLORS.map((c) => (
                <button key={c} onClick={() => setBgColor(c)} title={c}
                  style={{
                    height: 26,
                    border: bgColor === c ? '1px solid var(--text-1)' : '1px solid var(--border-1)',
                    background: c, borderRadius: 6, cursor: 'pointer',
                  }} />
              ))}
            </div>
          </div>
        </Section>

        {/* LOGOS DAS PLATAFORMAS */}
        <Section title="Logos das plataformas" draggablePanel>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
            Escolha um pacote visual para manter todos os logos no mesmo estilo. Upload manual fica reservado para exceções.
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={miniLabel}>ESTILO DOS LOGOS</div>
            {PLATFORM_LOGO_PACK_OPTIONS.map((option) => {
              const active = platformLogoPack === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.available}
                  onClick={() => {
                    if (option.available) selectPlatformLogoPack(option.id);
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    alignItems: 'center',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border-1)',
                    background: active ? 'rgba(184, 77, 255, 0.14)' : 'var(--bg-2)',
                    color: option.available ? 'var(--text-1)' : 'var(--text-3)',
                    opacity: option.available ? 1 : 0.58,
                    cursor: option.available ? 'pointer' : 'not-allowed',
                  }}
                >
                  <span style={{ display: 'grid', gap: 3 }}>
                    <strong style={{ fontSize: 12 }}>{option.label}</strong>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{option.hint}</span>
                  </span>
                  {active && <span style={{ fontSize: 12, color: 'var(--accent)' }}>Ativo</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => clearManualPlatformLogos(allPlatforms)}
              style={{
                minHeight: 34,
                borderRadius: 8,
                border: '1px solid var(--border-1)',
                background: 'transparent',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 11,
              }}
            >
              Limpar logos manuais e usar pacote
            </button>
          </div>

          <div style={{ marginTop: 12, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
            <div style={miniLabel}>{template === 'milestone' ? 'CONTROLE DO LOGO SPOTIFY' : 'CONTROLE DO CONJUNTO'}</div>
            <SliderRow
              label={template === 'milestone' ? 'Tamanho do logo Spotify' : 'Tamanho geral dos logos'}
              value={template === 'milestone' ? milestoneLogoSize : platformLogoSize}
              min={24}
              max={template === 'milestone' ? 360 : 240}
              step={1}
              onChange={template === 'milestone' ? setMilestoneLogoSize : setPlatformLogoSize}
              format={(v) => `${Math.round(v)}px`}
            />
            {template === 'milestone' ? (
              <>
                <SliderRow
                  label="Posição X do logo Spotify"
                  value={milestoneLogoX}
                  min={-520}
                  max={520}
                  step={1}
                  onChange={setMilestoneLogoX}
                  format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}px`}
                />
                <SliderRow
                  label="Posição Y do logo Spotify"
                  value={milestoneLogoY}
                  min={-920}
                  max={920}
                  step={1}
                  onChange={setMilestoneLogoY}
                  format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}px`}
                />
              </>
            ) : (
              <SliderRow
                label="Distância entre logos"
                value={platformLogoGap}
                min={0}
                max={320}
                step={1}
                onChange={setPlatformLogoGap}
                format={(v) => `${Math.round(v)}px`}
              />
            )}
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <div style={miniLabel}>PLATAFORMAS ATIVAS</div>
            {platformsSel.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {platformsSel.map((p) => (
                  <button
                    key={`active-platform-${p}`}
                    type="button"
                    onClick={() => setPlatformsSel((current) => current.filter((item) => item !== p))}
                    title={`Remover ${p}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 34,
                      padding: '7px 9px 7px 12px',
                      borderRadius: 999,
                      border: '1px solid var(--border-2)',
                      background: 'var(--bg-2)',
                      color: 'var(--text-1)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {p}
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-grid',
                        placeItems: 'center',
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.08)',
                        color: 'var(--danger)',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Nenhuma plataforma ativa neste template.
              </div>
            )}
          </div>

          {allPlatforms.some((p) => !platformsSel.includes(p)) && (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              <div style={miniLabel}>ADICIONAR PLATAFORMA</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allPlatforms
                  .filter((p) => !platformsSel.includes(p))
                  .map((p) => (
                    <button
                      key={`add-platform-${p}`}
                      type="button"
                      onClick={() => addPlatformFromPack(p)}
                      style={{
                        minHeight: 32,
                        padding: '7px 10px',
                        borderRadius: 999,
                        border: '1px solid var(--border-1)',
                        background: 'transparent',
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      + {p}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {platformsSel.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginTop: 14, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
              <div style={miniLabel}>AVANCADO: SUBSTITUIR LOGO INDIVIDUAL</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Use apenas quando um logo precisar fugir do pacote. Para voltar ao conjunto, limpe o logo manual.
              </div>
              {platformsSel.map((p) => {
                const effectiveSrc = effectiveCustomLogos[p];
                const hasManualLogo = !!customLogos[p] && !isFactoryPlatformLogoPath(customLogos[p]);
                return (
                  <div key={p} style={platformLogoRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 6,
                        background: 'var(--bg-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {effectiveSrc ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={effectiveSrc}
                            alt={p}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>logo</span>
                        )}
                      </div>
                      <span style={{ display: 'grid', gap: 2 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-1)' }}>{p}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                          {hasManualLogo ? 'Logo manual' : 'Usando pacote'}
                        </span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {hasManualLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomLogos((current) => {
                              const next = { ...current };
                              delete next[p];
                              return next;
                            });
                          }}
                          style={tinyDelBtn}
                          title="Voltar para o pacote escolhido"
                        >
                          ×
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => platformLogoInputRefs.current[p]?.click()}
                        style={tinyAddBtn}
                      >
                        Trocar
                      </button>
                    </div>
                    <input
                      ref={(el) => { platformLogoInputRefs.current[p] = el; }}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPlatformLogo(p, f);
                      }}
                      style={{ display: 'none' }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
              <div style={miniLabel}>COR DOS LOGOS BRANCOS</div>
              <ToggleRow
                label="Recolorir logos brancos"
                value={platformLogoTintEnabled}
                onChange={setPlatformLogoTintEnabled}
              />
              <label style={{ display: 'grid', gap: 6, marginTop: 8, marginBottom: 10 }}>
                <span style={miniInputLabel}>Cor global dos logos</span>
                <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={platformLogoTintColor}
                    onChange={(event) => setPlatformLogoTintColor(event.target.value)}
                    style={{ ...colorInputStyle, width: 42, height: 34, padding: 2 }}
                  />
                  <input
                    value={platformLogoTintColor}
                    onChange={(event) => setPlatformLogoTintColor(event.target.value)}
                    placeholder="#ffffff"
                    style={fieldInputStyle}
                  />
                </div>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 12 }}>
                {['#ffffff', '#000000', '#20d66b', '#ff1f1f', '#ffcc33', '#7c5cff', '#ff7a2f', '#38bdf8'].map((c) => (
                  <button
                    key={`platform-tint-${c}`}
                    type="button"
                    onClick={() => {
                      setPlatformLogoTintEnabled(true);
                      setPlatformLogoTintColor(c);
                    }}
                    title={c}
                    style={{
                      height: 24,
                      border: platformLogoTintEnabled && platformLogoTintColor.toLowerCase() === c ? '1px solid var(--text-1)' : '1px solid var(--border-1)',
                      background: c,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
              <div style={{ ...miniLabel, marginTop: 12 }}>AJUSTE FINO POR PLATAFORMA</div>
              {platformsSel.map((p) => (
                <SliderRow
                  key={`platform-scale-${p}`}
                  label={`Escala ${p}`}
                  value={platformLogoScales[p] ?? 1}
                  min={0.3}
                  max={3}
                  step={0.05}
                  onChange={(v) => setPlatformScale(p, v)}
                  format={(v) => `${v.toFixed(2)}x`}
                />
              ))}
            </div>

        </Section>

                                        <Section title="Texto">
          <FontsPanel
            activeRole={activeTextRole}
            onActiveRoleChange={(role) => {
              setActiveTextRole(role);
              selectStudioTool('text', { textPanelTab: 'entrada', textRole: role, keepTimelineOpen: true });
            }}
            allFonts={allFonts}
            fontHeadline={fontHeadline} fontDate={fontDate} fontCta={fontCta} fontCta1={fontCta1} fontCta2={fontCta2}
            onChangeFont={applyFontTo}
            favoriteIds={favoriteFontIds} onToggleFavorite={toggleFavoriteFont}
            strokeHeadline={strokeHeadline} strokeDate={strokeDate} strokeCta={strokeCta} strokeCta1={strokeCta1} strokeCta2={strokeCta2}
            onChangeStroke={changeTextStroke}
            styleHeadline={styleHeadline}
            styleDate={styleDate}
            styleCta={styleCta}
            styleCta1={styleCta1}
            styleCta2={styleCta2}
            onChangeTextStyle={(role, next) => {
              if (role === 'headline') setStyleHeadline(next);
              if (role === 'date') setStyleDate(next);
              if (role === 'cta') {
                setStyleCta(next);
                setStyleCta1(next);
                setStyleCta2(next);
              }
              if (role === 'cta1') setStyleCta1(next);
              if (role === 'cta2') setStyleCta2(next);
            }}
            textOpacity={textOpacity} onChangeTextOpacity={setTextOpacityLive}
            uploadInputRef={fontInputRef} uploadFont={uploadFont}
            sampleHeadline={template === 'spotify_print' || template === 'milestone' || template === 'youtube_views' ? metricNumber : template === 'watch_youtube' ? 'ASSISTA NO YOUTUBE' : template === 'youtube_subscribe' ? (headline || 'INSCREVA-SE') : headline}
            sampleDate={template === 'spotify_print' || template === 'milestone' || template === 'youtube_views' ? metricPrefix : (template === 'watch_youtube' || template === 'youtube_subscribe') ? channelName : releaseDate}
            sampleCta={template === 'spotify_print' || template === 'milestone' ? metricLabel : cta}
            sampleCta2={cta2}
            txScale={txScale} txLS={txLS} txLH={txLH} txOX={txOX} txOY={txOY}
            txWiggle={{ headline: wiggleH, date: wiggleD, cta: wiggleC, cta1: wiggleCta1, cta2: wiggleCta2 }}
            transitionByRole={{ headline: trHeadline, date: trDate, cta1: trCta1, cta2: trCta2 }}
            transitionTuningByRole={transitionTuning}
            transitionInFrameByRole={effectiveTextInFrames}
            maxTransitionFrame={Math.max(1, durationSeconds * 30 - 1)}
            transitionPresets={TRANSITION_TUNING_PRESETS}
            onChangeTransition={changeTextTransition}
            onChangeTransitionTuning={changeTextTransitionTuning}
            onChangeTransitionInFrame={changeTextInFrame}
            onApplyTransitionPreset={applyTextTransitionTuningPreset}
            roleLabels={textRoleLabels}
            visibleRoles={visibleTextRoles}
            showCtaToggles={hasOptionalCta1 || hasOptionalCta2}
            showCta1={showCta1}
            showCta2={showCta2}
            onToggleCta1={() => setShowCta1((v) => !v)}
            onToggleCta2={() => setShowCta2((v) => !v)}
            onTxScale={(r,v) => { stopTransitionPreviewLoopForManualEdit(); updTxN(setTxScale,r,v); }}
            onTxLS={(r,v)    => { stopTransitionPreviewLoopForManualEdit(); updTxN(setTxLS,r,v); }}
            onTxLH={(r,v)    => { stopTransitionPreviewLoopForManualEdit(); updTxN(setTxLH,r,v); }}
            onTxOX={(r,v)    => { stopTransitionPreviewLoopForManualEdit(); updTxN(setTxOX,r,v); }}
            onTxOY={(r,v)    => { stopTransitionPreviewLoopForManualEdit(); updTxN(setTxOY,r,v); }}
            onTxWiggle={(r,v) => {
              stopTransitionPreviewLoopForManualEdit();
              if (r === 'headline') setWiggleH(v);
              else if (r === 'date') setWiggleD(v);
              else if (r === 'cta1') setWiggleCta1(v);
              else if (r === 'cta2') setWiggleCta2(v);
              else {
                setWiggleC(v);
                setWiggleCta1(v);
                setWiggleCta2(v);
              }
            }}
          />


        </Section>

        {template === 'available_now' && (
          <Section title="Ritmo CTA (PRÉ-SAVE)" draggablePanel>
            <div style={{ marginBottom: 10 }}>
              <div style={{ ...miniInputLabel, display: 'flex', justifyContent: 'space-between' }}>
                <span>Presets rápidos</span>
                {ctaTimingPreset === 'custom' && <span style={{ color: 'var(--text-3)' }}>custom</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                <button
                  onClick={() => {
                    setCta1InFrame(78);
                    setCtaSwapFrame(124);
                    setCta2InFrame(138);
                    setLogosInFrame(158);
                  }}
                  style={ctaTimingPreset === 'padrao' ? segBtnActive : segBtn}
                >
                  Padrão
                </button>
                <button
                  onClick={() => {
                    setCta1InFrame(62);
                    setCtaSwapFrame(106);
                    setCta2InFrame(118);
                    setLogosInFrame(138);
                  }}
                  style={ctaTimingPreset === 'comercial' ? segBtnActive : segBtn}
                >
                  Comercial
                </button>
                <button
                  onClick={() => {
                    setCta1InFrame(92);
                    setCtaSwapFrame(138);
                    setCta2InFrame(156);
                    setLogosInFrame(176);
                  }}
                  style={ctaTimingPreset === 'musical' ? segBtnActive : segBtn}
                >
                  Musical
                </button>
              </div>
            </div>

            <SliderRow
              label="Entrada CTA 1"
              value={cta1InFrame}
              min={20}
              max={220}
              step={1}
              onChange={setCta1InFrame}
              format={(v) => `f${Math.round(v)}`}
            />
            <SliderRow
              label="Troca CTA 1 -> CTA 2"
              value={ctaSwapFrame}
              min={30}
              max={230}
              step={1}
              onChange={setCtaSwapFrame}
              format={(v) => `f${Math.round(v)}`}
            />
            <SliderRow
              label="Entrada CTA 2"
              value={cta2InFrame}
              min={40}
              max={240}
              step={1}
              onChange={setCta2InFrame}
              format={(v) => `f${Math.round(v)}`}
            />
            <SliderRow
              label="Entrada logos"
              value={logosInFrame}
              min={50}
              max={260}
              step={1}
              onChange={setLogosInFrame}
              format={(v) => `f${Math.round(v)}`}
            />
          </Section>
        )}

        {/* CAPA */}
        <Section title="Capa" draggablePanel>
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  ANIMAÇÃO DA CAPA
                </div>
                <select
                  value={coverMotion}
                  onChange={(e) => previewCoverMotionChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: 42,
                    borderRadius: 10,
                    border: '1px solid var(--border-1)',
                    background: '#16161b',
                    color: 'var(--text-1)',
                    padding: '0 12px',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                >
                  {COVER_MOTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>


          <SliderRow label="Tamanho / Escala" value={coverSize} min={120} max={1200} step={5}
            onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setCoverSize(v); }} format={(v) => `${v}px`} />
          <SliderRow label="Posição Y da capa" value={coverY} min={-500} max={500} step={1}
            onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setCoverY(v); }} format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}px`} />
          <SliderRow label="Posição X da capa" value={coverX} min={-500} max={500} step={1}
            onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setCoverX(v); }} format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}px`} />
          <SliderRow label="Voltas Y" value={spinTurns} min={0} max={4} step={0.5}
            onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setSpinTurns(v); }} format={(v) => `${v}×`} />
          <SliderRow label="Wiggle (global)" value={wiggleIntensity} min={0} max={2} step={0.1}
            onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setWiggleIntensity(v); }} format={(v) => v.toFixed(1)} />
        </Section>

        {/* CELULAR — só aparece quando template é spotify_print */}
        {template === 'spotify_print' && (
          <Section title="Celular" draggablePanel>
            <div style={{ marginBottom: 12 }}>
              <div style={miniInputLabel}>Entrada do celular</div>
              <select
                value={phoneMotion}
                onChange={(e) => setPhoneMotion(e.target.value as typeof phoneMotion)}
                style={{ ...fieldInputStyle, padding: '8px 10px', fontSize: 12 }}
              >
                <option value="zoom_bounce">Zoom Bounce — intro impacto</option>
                <option value="slide_up">Slide Up — vem de baixo</option>
                <option value="slide_down">Slide Down — vem de cima</option>
                <option value="slide_left">Slide Left — vem da esquerda</option>
                <option value="slide_right">Slide Right — vem da direita</option>
                <option value="diagonal_tl">Diagonal Top-Left — canto superior esq</option>
                <option value="diagonal_tr">Diagonal Top-Right — canto superior dir</option>
                <option value="flip_card">Flip Card — virada 3D</option>
                <option value="tilt_in_left">Tilt In Left — gira da esquerda</option>
                <option value="tilt_in_right">Tilt In Right — gira da direita</option>
                <option value="drop_in">Drop In — cai de cima</option>
                <option value="stamp">Stamp — bate como carimbo</option>
              </select>
            </div>

            <SliderRow label="Tamanho / Escala" value={phoneSize} min={280} max={780} step={5}
              onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setPhoneSize(v); }}
              format={(v) => `${v}px`} />
            <SliderRow label="Posição Y" value={phoneY} min={-500} max={500} step={1}
              onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setPhoneY(v); }}
              format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}px`} />
            <SliderRow label="Posição X" value={phoneX} min={-500} max={500} step={1}
              onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setPhoneX(v); }}
              format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}px`} />
            <SliderRow label="Inclinação (tilt)" value={phoneTilt} min={-25} max={25} step={0.5}
              onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setPhoneTilt(v); }}
              format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°`} />
            <SliderRow label="Voltas Y (spin 3D)" value={phoneSpinTurns} min={0} max={4} step={0.5}
              onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setPhoneSpinTurns(v); }}
              format={(v) => `${v}×`} />
            <SliderRow label="Wiggle do celular" value={phoneWiggle} min={0} max={2} step={0.05}
              onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setPhoneWiggle(v); }}
              format={(v) => v.toFixed(2)} />

            <ToggleRow
              label="Dynamic Island (iPhone 15/16 Pro)"
              value={phoneDynamicIsland}
              onChange={(v) => { stopTransitionPreviewLoopForManualEdit(); setPhoneDynamicIsland(v); }}
            />

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
              <div style={miniInputLabel}>Presets rápidos</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <button
                  onClick={() => {
                    setPhoneMotion('zoom_bounce');
                    setPhoneTilt(-6);
                    setPhoneSpinTurns(0);
                    setPhoneSize(520);
                    setPhoneWiggle(0.7);
                  }}
                  style={segBtn}
                >Reto sutil</button>
                <button
                  onClick={() => {
                    setPhoneMotion('tilt_in_left');
                    setPhoneTilt(-14);
                    setPhoneSpinTurns(0);
                    setPhoneSize(540);
                    setPhoneWiggle(1.0);
                  }}
                  style={segBtn}
                >Torto esquerda</button>
                <button
                  onClick={() => {
                    setPhoneMotion('tilt_in_right');
                    setPhoneTilt(14);
                    setPhoneSpinTurns(0);
                    setPhoneSize(540);
                    setPhoneWiggle(1.0);
                  }}
                  style={segBtn}
                >Torto direita</button>
                <button
                  onClick={() => {
                    setPhoneMotion('flip_card');
                    setPhoneTilt(0);
                    setPhoneSpinTurns(1);
                    setPhoneSize(520);
                    setPhoneWiggle(0.5);
                  }}
                  style={segBtn}
                >Flip 3D</button>
                <button
                  onClick={() => {
                    setPhoneMotion('drop_in');
                    setPhoneTilt(-3);
                    setPhoneSpinTurns(0);
                    setPhoneSize(540);
                    setPhoneWiggle(0.8);
                  }}
                  style={segBtn}
                >Cai de cima</button>
                <button
                  onClick={() => {
                    setPhoneMotion('stamp');
                    setPhoneTilt(0);
                    setPhoneSpinTurns(0);
                    setPhoneSize(560);
                    setPhoneWiggle(0.4);
                  }}
                  style={segBtn}
                >Carimbo</button>
              </div>
            </div>
          </Section>
        )}

<Section title="Brilho" draggablePanel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {GLOW_PRESETS.map((g) => (
              <button key={g.label} onClick={() => setGlowColor(g.color)} title={g.label}
                style={{
                  height: 36, borderRadius: 8,
                  border: glowColor === g.color ? '1px solid var(--text-1)' : '1px solid var(--border-1)',
                  background: g.color.replace('0.32', '0.85'), cursor: 'pointer',
                }} />
            ))}
          </div>
        </Section>

      </aside>

      {/* MODAL NOVO ARTISTA */}
      {showArtistModal && <ArtistModal onCreate={createArtist} onClose={() => setShowArtistModal(false)} />}

      {SAAS_EXPORT_MODE && showUpgradeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            display: 'grid',
            placeItems: 'center',
            padding: 18,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              width: 'min(980px, 100%)',
              maxHeight: 'calc(100vh - 36px)',
              overflow: 'auto',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.14)',
              background: '#111217',
              boxShadow: '0 34px 110px rgba(0,0,0,0.58)',
              color: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 18,
                padding: 22,
                borderBottom: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <div>
                <div style={{ color: '#70e0b1', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Demonstração finalizada
                </div>
                <h2 style={{ margin: '8px 0 0', fontSize: 28, lineHeight: 1.08 }}>
                  Continue exportando com um pacote NovaCena
                </h2>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.62)', maxWidth: 660, lineHeight: 1.45 }}>
                  Seu render gratuito já foi usado. Escolha um plano e carregue renders na sua conta para exportar sem sair do estúdio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 22, display: 'grid', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>
                  {saasUser ? `${saasUser.name} · ${saasUser.tokens} renders disponíveis` : 'Escolha um pacote para continuar'}
                </div>
                <div style={{ display: 'flex', gap: 8, padding: 4, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
                  {BILLING_CYCLES.map((cycle) => (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => setUpgradeCycle(cycle.id)}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 12px',
                        background: upgradeCycle === cycle.id ? '#fff' : 'transparent',
                        color: upgradeCycle === cycle.id ? '#111' : 'rgba(255,255,255,0.72)',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {cycle.label}
                    </button>
                  ))}
                </div>
              </div>

              {upgradeMessage && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: /não|erro|falha/i.test(upgradeMessage) ? 'rgba(248,113,113,0.14)' : 'rgba(244,211,94,0.12)',
                    color: /não|erro|falha/i.test(upgradeMessage) ? '#fca5a5' : '#f4d35e',
                    fontSize: 13,
                  }}
                >
                  {upgradeMessage}
                </div>
              )}

              {upgradePixPayment && (
                <div style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 10, border: '1px solid rgba(112,224,177,0.34)', background: 'rgba(112,224,177,0.10)' }}>
                  <div>
                    <div style={{ color: '#70e0b1', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Pix para liberar agora
                    </div>
                    <strong style={{ display: 'block', marginTop: 4, fontSize: 18 }}>
                      {formatBRL(upgradePixPayment.amountBRL)} · {upgradePixPayment.planName} · {upgradePixPayment.renders} renders
                    </strong>
                    <span style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>
                      Envie o comprovante com o email da conta para liberarmos os renders.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <code style={{ flex: '1 1 260px', padding: 11, borderRadius: 8, background: '#090a0c', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', wordBreak: 'break-all' }}>
                      {upgradePixPayment.key}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(upgradePixPayment.key)}
                      style={{ border: 'none', borderRadius: 8, padding: '0 14px', background: '#70e0b1', color: '#07110c', fontWeight: 950, cursor: 'pointer' }}
                    >
                      Copiar Pix
                    </button>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.54)', fontSize: 12 }}>
                    Favorecido: {upgradePixPayment.name} · Identificação: {upgradePixPayment.reference}
                  </div>
                  {upgradePixPayment.whatsapp && (
                    <a href={`https://wa.me/${upgradePixPayment.whatsapp.replace(/\D/g, '')}`} style={{ color: '#70e0b1', fontWeight: 900, textDecoration: 'none', fontSize: 13 }}>
                      Enviar comprovante no WhatsApp
                    </a>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {SAAS_PLANS.map((plan) => {
                  const months = upgradeCycle === 'monthly' ? 1 : upgradeCycle === 'annual' ? 12 : 36;
                  const selectedCycle = BILLING_CYCLES.find((cycle) => cycle.id === upgradeCycle);
                  const featured = plan.id === 'pro';
                  return (
                    <article
                      key={plan.id}
                      style={{
                        display: 'grid',
                        gap: 13,
                        padding: 18,
                        borderRadius: 10,
                        border: featured ? '1px solid rgba(244,211,94,0.66)' : '1px solid rgba(255,255,255,0.12)',
                        background: featured ? 'rgba(244,211,94,0.08)' : 'rgba(255,255,255,0.045)',
                      }}
                    >
                      {featured && (
                        <div style={{ justifySelf: 'start', padding: '5px 9px', borderRadius: 999, background: 'rgba(112,224,177,0.14)', color: '#70e0b1', fontSize: 11, fontWeight: 900 }}>
                          Mais escolhido
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0, fontSize: 22 }}>{plan.name}</h3>
                        <p style={{ minHeight: 42, margin: '7px 0 0', color: 'rgba(255,255,255,0.62)', lineHeight: 1.4, fontSize: 13 }}>
                          {plan.description}
                        </p>
                      </div>
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 950 }}>{formatBRL(planPrice(plan, upgradeCycle))}</div>
                        <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12 }}>
                          {upgradeCycle === 'monthly' ? 'por mês' : `por ${months} meses`}
                          {selectedCycle?.discountLabel ? ` · ${selectedCycle.discountLabel}` : ''}
                        </div>
                      </div>
                      <div style={{ color: '#f4d35e', fontWeight: 900 }}>
                        {plan.includedTokens * months} renders no ciclo
                      </div>
                      <button
                        type="button"
                        onClick={() => chooseUpgradePlan(plan.id)}
                        disabled={loadingUpgradePlan === plan.id}
                        style={{
                          height: 42,
                          borderRadius: 8,
                          border: 'none',
                          background: featured ? '#f4d35e' : '#fff',
                          color: '#111',
                          fontWeight: 950,
                          cursor: loadingUpgradePlan === plan.id ? 'wait' : 'pointer',
                          opacity: loadingUpgradePlan === plan.id ? 0.7 : 1,
                        }}
                      >
                        {loadingUpgradePlan === plan.id ? 'Abrindo...' : `Comprar ${plan.name}`}
                      </button>
                    </article>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => { window.location.href = '/billing'; }}
                style={{
                  justifySelf: 'center',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.78)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Ver todos os detalhes dos pacotes
              </button>
            </div>
          </div>
        </div>
      )}
    
      <div
        data-novacena-tool-dock="true"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 18,
          transform: 'translateX(-50%)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(10,10,14,0.86)',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
        }}
      >
        {STUDIO_TOOL_DOCK.filter((tool) => tool.id !== 'render').map((tool) => {
          const active = activeStudioTool === tool.id;

          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => selectStudioTool(tool.id)}
              style={{
                border: active ? '1px solid rgba(255,255,255,0.28)' : '1px solid rgba(255,255,255,0.08)',
                background: active
                  ? 'linear-gradient(135deg, rgba(168,85,247,0.95), rgba(249,115,22,0.82))'
                  : 'rgba(255,255,255,0.045)',
                color: active ? '#fff' : 'var(--text-muted)',
                borderRadius: 12,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 10px 26px rgba(168,85,247,0.28)' : 'none',
              }}
            >
              {tool.label}
            </button>
          );
        })}
      </div>

      {showTimeline && activeTab === 'studio' && (
        <TimelinePanel
          durationSec={durationSeconds}
          currentSec={timelineSec}
          tracks={timelineTracks}
          tools={timelineTools}
          onSeek={seekTimeline}
          onClose={() => setShowTimeline(false)}
        />
      )}

</main>
  );
}
