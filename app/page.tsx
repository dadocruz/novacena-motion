'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { AvailableNow } from '../remotion/AvailableNow';
import { WatchOnYouTube } from '../remotion/WatchOnYouTube';
import { Milestone } from '../remotion/Milestone';
import { OutNow } from '../remotion/OutNow';
import { getProject, templateLabels, templateOrder } from '../remotion/project';
import type {
  MotionConfig,
  OverlayPlacement,
  PlatformName,
  RenderTarget,
  TemplateId,
  TextStyle,
  TemplateProps,
  TextTransitionId,
  CoverMotionId,
} from '../remotion/types';
import {
  FONT_CATALOG,
  DEFAULT_FONTS,
  userFontToFontDef,
  type FontDef,
} from '../lib/fontCatalog';
import { TEXT_TRANSITIONS } from '../remotion/motionEngine';

// ============================================================
// CONSTANTES
// ============================================================
const componentByTemplate = {
  available_now: AvailableNow,
  watch_youtube: WatchOnYouTube,
  milestone: Milestone,
  out_now: OutNow,
};

const allPlatforms: PlatformName[] = ['Spotify', 'Deezer', 'Apple Music', 'YouTube Music'];

const GLOW_PRESETS: { label: string; color: string }[] = [
  { label: 'Roxo', color: 'rgba(190, 90, 255, 0.32)' },
  { label: 'Laranja', color: 'rgba(255, 140, 60, 0.32)' },
  { label: 'Verde', color: 'rgba(60, 220, 130, 0.32)' },
  { label: 'Vermelho', color: 'rgba(255, 60, 60, 0.32)' },
  { label: 'Azul', color: 'rgba(80, 140, 255, 0.32)' },
  { label: 'Dourado', color: 'rgba(255, 200, 80, 0.32)' },
  { label: 'Rosa', color: 'rgba(255, 90, 180, 0.32)' },
  { label: 'Off-white', color: 'rgba(255, 255, 255, 0.20)' },
];

const BG_COLORS = ['#000000', '#030205', '#0a0a14', '#1a0a2a', '#0a1a14', '#2a0a14', '#1a1a2a'];

const COVER_MOTION_OPTIONS: { value: CoverMotionId; label: string }[] = [
  { value: 'zoom_bounce', label: 'Zoom Bounce — Intro impacto' },
  { value: 'slide_up_glow', label: 'Slide Up Glow — Vem de baixo' },
  { value: 'slide_left_premium', label: 'Slide Left — Entra da esquerda' },
  { value: 'slide_right_premium', label: 'Slide Right — Entra da direita' },
  { value: 'flip_card', label: 'Flip Card — Virada premium' },
  { value: 'vinyl_reveal', label: 'Vinyl Reveal — Disco atrás' },
];

// ============================================================
// TIPOS LOCAIS DE STATE
// ============================================================
type ArtistRecord = {
  id: string;
  slug: string;
  name: string;
  driveFolderPath?: string;
};

type GalleryItem = {
  id: string;
  title: string;
  template: string;
  thumbnailPath?: string;
  createdAt: string;
};

type Photo = {
  id: string;
  filename: string;
  path: string;
  uploadedAt: string;
};

type UserFontRecord = {
  id: string;
  label: string;
  filename: string;
  family: string;
  category: 'display' | 'sans' | 'special';
  weight: number;
};

type OverlayAsset = {
  id: string;
  label: string;
  path: string;
  type: 'video' | 'image';
  blendMode: 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal';
};

type TextStyleState = {
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

const HEADLINE_STYLE_DEFAULTS: TextStyleState = {
  color: '#ffffff',
  useGradient: false,
  gradientColor1: '#b855ff',
  gradientColor2: '#ff9244',
  gradientAngle: 120,
  letterSpacing: -2,
  textAlign: 'center',
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
};

const DATE_STYLE_DEFAULTS: TextStyleState = {
  color: '#ffffff',
  useGradient: false,
  gradientColor1: '#ffd06b',
  gradientColor2: '#ff6e51',
  gradientAngle: 120,
  letterSpacing: 2.4,
  textAlign: 'center',
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
};

const CTA_STYLE_DEFAULTS: TextStyleState = {
  color: '#ffffff',
  useGradient: false,
  gradientColor1: '#ffffff',
  gradientColor2: '#b855ff',
  gradientAngle: 120,
  letterSpacing: 2.4,
  textAlign: 'center',
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
};

function mergeTextStyle(defaults: TextStyleState, style?: TextStyle): TextStyleState {
  return {
    ...defaults,
    ...(style ?? {}),
  };
}

const CTA_TIMING_DEFAULTS = {
  cta1InFrame: 78,
  ctaSwapFrame: 124,
  cta2InFrame: 138,
  logosInFrame: 158,
} as const;


function normalizeAssetUrl(src?: string): string | undefined {
  if (!src) return src;
  if (src.startsWith('/uploads/')) return src.replace('/uploads/', '/api/uploads/');
  return src;
}

function normalizeCustomLogos(logos: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(logos)) {
    next[key] = normalizeAssetUrl(value) ?? value;
  }
  return next;
}

function isBlobUrl(src?: string): boolean {
  return !!src && src.startsWith('blob:');
}


type StudioToolId =
  | 'cover'
  | 'text'
  | 'motion'
  | 'video'
  | 'audio'
  | 'logos'
  | 'fonts'
  | 'colors'
  | 'effects'
  | 'render';

const STUDIO_TOOL_DOCK: { id: StudioToolId; label: string; section?: string }[] = [
  { id: 'cover', label: 'Capa', section: 'Capa' },
  { id: 'text', label: 'Texto', section: 'Transições de texto' },
  { id: 'motion', label: 'Motion', section: 'Ritmo CTA (Disponível)' },
  { id: 'video', label: 'Vídeo BG', section: 'Projeto' },
  { id: 'audio', label: 'Áudio', section: 'Áudio' },
  { id: 'logos', label: 'Logos', section: 'Logos das plataformas' },
  { id: 'fonts', label: 'Fonte', section: 'Fontes' },
  { id: 'colors', label: 'Cor', section: 'Cor & gradiente' },
  { id: 'effects', label: 'Efeitos', section: 'Efeitos' },
  { id: 'render', label: 'Render' },
];

function scrollToStudioSection(section?: string) {
  if (!section || typeof window === 'undefined') return;

  window.requestAnimationFrame(() => {
    const el = document.querySelector(`[data-right-panel-section="${section}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Home() {
  const [activeStudioTool, setActiveStudioTool] = useState<StudioToolId>('cover');
  // ─── ARTISTA ──────────────────────────────────────────────
  const [artists, setArtists] = useState<ArtistRecord[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const activeArtist = artists.find((a) => a.slug === activeSlug);

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [driveFolderPath, setDriveFolderPath] = useState('');

  // ─── PROJETO ──────────────────────────────────────────────
  const [template, setTemplate] = useState<TemplateId>('available_now');
  const [target, setTarget] = useState<RenderTarget>('story');
  const [showSafeArea, setShowSafeArea] = useState(false);

  const [releaseDate, setReleaseDate] = useState(getProject('available_now').releaseDate ?? '');
  const [coverImage, setCoverImage] = useState(getProject('available_now').coverImage);
  const [headline, setHeadline] = useState(getProject('available_now').headline);
  const [cta, setCta] = useState(getProject('available_now').cta);
  const [cta2, setCta2] = useState(getProject('available_now').cta2 ?? getProject('available_now').cta);
  const [channelName, setChannelName] = useState(getProject('available_now').channelName ?? '');
  const [metricPrefix, setMetricPrefix] = useState(getProject('available_now').metricPrefix ?? 'ULTRAPASSAMOS');
  const [metricNumber, setMetricNumber] = useState(getProject('available_now').metricNumber ?? '100.000');
  const [metricLabel, setMetricLabel] = useState(getProject('available_now').metricLabel ?? 'OUVINTES');
  const [platformsSel, setPlatformsSel] = useState<PlatformName[]>(getProject('available_now').platforms);

  // ─── MOTION CONFIG ────────────────────────────────────────
  const [fontHeadline, setFontHeadline] = useState<string>(DEFAULT_FONTS.headline);
  const [fontDate, setFontDate] = useState<string>(DEFAULT_FONTS.date);
  const [fontCta, setFontCta] = useState<string>(DEFAULT_FONTS.cta);
  const [coverSize, setCoverSize] = useState<number>(510);
  const [coverMotion, setCoverMotion] = useState<CoverMotionId>('slide_up_glow');
  const [spinTurns, setSpinTurns] = useState<number>(2);
  const [wiggleIntensity, setWiggleIntensity] = useState<number>(1);
  const [wiggleH, setWiggleH] = useState<number>(0);
  const [wiggleD, setWiggleD] = useState<number>(0);
  const [wiggleC, setWiggleC] = useState<number>(0);
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(true);
  const [finalFlash, setFinalFlash] = useState<boolean>(true);
  const [glowColor, setGlowColor] = useState<string>(GLOW_PRESETS[0].color);

  // Transições
  const [trHeadline, setTrHeadline] = useState<TextTransitionId>('mask_reveal');
  const [trDate, setTrDate] = useState<TextTransitionId>('scale_pop');
  const [trCta, setTrCta] = useState<TextTransitionId>('split_letters');

  // Estilo de texto (cor + gradiente) por elemento
  const [styleHeadline, setStyleHeadline] = useState<TextStyleState>({
    ...HEADLINE_STYLE_DEFAULTS,
  });
  const [styleDate, setStyleDate] = useState<TextStyleState>({
    ...DATE_STYLE_DEFAULTS,
  });
  const [styleCta, setStyleCta] = useState<TextStyleState>({
    ...CTA_STYLE_DEFAULTS,
  });
  const [cta1InFrame, setCta1InFrame] = useState<number>(CTA_TIMING_DEFAULTS.cta1InFrame);
  const [ctaSwapFrame, setCtaSwapFrame] = useState<number>(CTA_TIMING_DEFAULTS.ctaSwapFrame);
  const [cta2InFrame, setCta2InFrame] = useState<number>(CTA_TIMING_DEFAULTS.cta2InFrame);
  const [logosInFrame, setLogosInFrame] = useState<number>(CTA_TIMING_DEFAULTS.logosInFrame);

  // Project settings
  const [durationSeconds, setDurationSeconds] = useState<number>(8);
  const [bgVideo, setBgVideo] = useState<string>('');
  const [bgVideoStartSec, setBgVideoStartSec] = useState<number>(0);
  const [bgVideoDuration, setBgVideoDuration] = useState<number>(0);
  const [bgVideoOpacity, setBgVideoOpacity] = useState<number>(1);
  const [bgColor, setBgColor] = useState<string>('#030205');
  const [bgVideoBlur, setBgVideoBlur] = useState<number>(22);
  const [bgVideoSaturation, setBgVideoSaturation] = useState<number>(1.15);

  // ─── ÁUDIO ────────────────────────────────────────────────
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [audioStartSec, setAudioStartSec] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(0.8);
  const [audioFadeIn, setAudioFadeIn] = useState<number>(0.5);
  const [audioFadeOut, setAudioFadeOut] = useState<number>(1);
  const [useVideoAudio, setUseVideoAudio] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // ─── LOGOS CUSTOMIZADOS POR PLATAFORMA ────────────────────
  const [customLogos, setCustomLogos] = useState<Record<string, string>>({});
  const platformLogoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Overlays
  const [overlayAssets, setOverlayAssets] = useState<OverlayAsset[]>([]);
  const [overlays, setOverlays] = useState<OverlayPlacement[]>([]);

  // User fonts
  const [userFonts, setUserFonts] = useState<UserFontRecord[]>([]);

  // ─── ESTADOS DE UI ───────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [rendering, setRendering] = useState(false);
  const [renderMessage, setRenderMessage] = useState('');
  const [renderLog, setRenderLog] = useState('');
  const [renderFiles, setRenderFiles] = useState<{name: string; size: number; mtime: string}[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadMsg, setVideoUploadMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'studio' | 'gallery'>('studio');
  const [showArtistModal, setShowArtistModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const photoMultiRef = useRef<HTMLInputElement | null>(null);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);

  // ─── EFEITOS ─────────────────────────────────────────────
  // Carregar lista de artistas ao montar
  useEffect(() => {
    fetch('/api/artists')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setArtists(d.artists);
          if (d.artists.length > 0 && !activeSlug) {
            setActiveSlug(d.artists[0].slug);
          }
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

  // Quando troca template, atualiza defaults
  useEffect(() => {
    const next = getProject(template);
    setHeadline(next.headline);
    setCta(next.cta);
    setCta2(next.cta2 ?? next.cta ?? '');
    setChannelName(next.channelName ?? '');
    setMetricPrefix(next.metricPrefix ?? 'ULTRAPASSAMOS');
    setMetricNumber(next.metricNumber ?? '100.000');
    setMetricLabel(next.metricLabel ?? 'OUVINTES');
  }, [template]);

  // Carregar arquivos renderizados ao montar
  useEffect(() => {
    fetch('/api/render-files').then(r => r.json()).then(d => setRenderFiles(d.files ?? []));
  }, []);

  // ─── COMPUTED ────────────────────────────────────────────
  const allFonts: FontDef[] = useMemo(
    () => [...FONT_CATALOG, ...userFonts.map(userFontToFontDef)],
    [userFonts]
  );

  const motion: MotionConfig = useMemo(
    () => ({
      fontHeadline,
      fontDate,
      fontCta,
      coverSize,
      coverMotion,
      spinTurns,
      wiggleIntensity,
      wiggleHeadline: wiggleH,
      wiggleDate: wiggleD,
      wiggleCta: wiggleC,
      particlesEnabled,
      finalFlash,
      glowColor,
      durationSeconds,
      transitionHeadline: trHeadline,
      transitionDate: trDate,
      transitionCta: trCta,
      styleHeadline,
      styleDate,
      styleCta,
      cta1InFrame,
      ctaSwapFrame,
      cta2InFrame,
      logosInFrame,
      background: {
        videoSrc: bgVideo || undefined,
        videoStartFrame: Math.floor(bgVideoStartSec * 30),
        videoOpacity: bgVideoOpacity,
        bgColor,
        videoBlur: bgVideoBlur,
        videoSaturation: bgVideoSaturation,
        audioSrc: audioSrc || undefined,
        audioStartSec,
        audioVolume,
        audioFadeInSec: audioFadeIn,
        audioFadeOutSec: audioFadeOut,
        useVideoAudio,
      },
      customLogos: normalizeCustomLogos(customLogos),
      overlays,
    }),
    [
      fontHeadline, fontDate, fontCta, coverSize, coverMotion, spinTurns, wiggleIntensity,
      wiggleH, wiggleD, wiggleC, particlesEnabled, finalFlash, glowColor,
      durationSeconds, trHeadline, trDate, trCta, styleHeadline, styleDate, styleCta,
      cta1InFrame, ctaSwapFrame, cta2InFrame, logosInFrame,
      bgVideo, bgVideoStartSec,
      bgVideoOpacity, bgColor, bgVideoBlur, bgVideoSaturation,
      audioSrc, audioStartSec, audioVolume, audioFadeIn, audioFadeOut, useVideoAudio,
      customLogos, overlays,
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

  const project = useMemo(() => {
    const base = getProject(template);
    return {
      ...base,
      releaseDate,
      headline,
      cta,
      cta2,
      channelName,
      metricPrefix,
      metricNumber,
      metricLabel,
      platforms: platformsSel,
      coverImage: normalizeAssetUrl(coverImage) ?? coverImage,
      motion,
      media: {
        type: 'image' as const,
        file: normalizeAssetUrl(coverImage) ?? coverImage,
        sourceFormat: 'square' as const,
        framingMode: 'background_blur' as const,
      },
      renderTarget: target,
    } satisfies TemplateProps;
  }, [
    template, releaseDate, headline, cta, cta2, channelName, metricPrefix,
    metricNumber, metricLabel, platformsSel, coverImage, motion, target,
  ]);

  const Component = componentByTemplate[template];
  const compositionHeight = target === 'story' ? 1920 : 1350;

  // ─── HANDLERS ────────────────────────────────────────────
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
        projectSnapshot: { ...project, motion },
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
    setTemplate(snap.type);
    setReleaseDate(snap.releaseDate ?? '');
    setHeadline(snap.headline ?? '');
    setCta(snap.cta ?? '');
    setCta2(snap.cta2 ?? snap.cta ?? '');
    setCoverImage(snap.coverImage ?? '');
    if (snap.motion) {
      const m = snap.motion;
      setFontHeadline(m.fontHeadline ?? DEFAULT_FONTS.headline);
      setFontDate(m.fontDate ?? DEFAULT_FONTS.date);
      setFontCta(m.fontCta ?? DEFAULT_FONTS.cta);
      setCoverSize(m.coverSize ?? 510);
      setCoverMotion(m.coverMotion ?? 'slide_up_glow');
      setSpinTurns(m.spinTurns ?? 2);
      setWiggleIntensity(m.wiggleIntensity ?? 1);
      setTrHeadline(m.transitionHeadline ?? 'mask_reveal');
      setTrDate(m.transitionDate ?? 'scale_pop');
      setTrCta(m.transitionCta ?? 'split_letters');
      setStyleHeadline(mergeTextStyle(HEADLINE_STYLE_DEFAULTS, m.styleHeadline));
      setStyleDate(mergeTextStyle(DATE_STYLE_DEFAULTS, m.styleDate));
      setStyleCta(mergeTextStyle(CTA_STYLE_DEFAULTS, m.styleCta));
      setCta1InFrame(m.cta1InFrame ?? CTA_TIMING_DEFAULTS.cta1InFrame);
      setCtaSwapFrame(m.ctaSwapFrame ?? CTA_TIMING_DEFAULTS.ctaSwapFrame);
      setCta2InFrame(m.cta2InFrame ?? CTA_TIMING_DEFAULTS.cta2InFrame);
      setLogosInFrame(m.logosInFrame ?? CTA_TIMING_DEFAULTS.logosInFrame);
      setDurationSeconds(m.durationSeconds ?? 8);
      setGlowColor(m.glowColor ?? GLOW_PRESETS[0].color);
      if (m.background) {
        setBgVideo(m.background.videoSrc ?? '');
        setBgVideoStartSec((m.background.videoStartFrame ?? 0) / 30);
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

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setVideoUploadMsg('Enviando…');
    const videoUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = videoUrl;
    await new Promise<void>((resolve) => {
      tempVideo.onloadedmetadata = () => resolve();
      tempVideo.onerror = () => resolve();
    });
    const totalDuration = tempVideo.duration || 0;
    URL.revokeObjectURL(videoUrl);
    const formData = new FormData();
    formData.append('video', file);
    const r = await fetch('/api/upload-video', { method: 'POST', body: formData });
    const d = await r.json();
    if (!d.ok) {
      setVideoUploadMsg(`Erro: ${d.error}`);
      setUploadingVideo(false);
      return;
    }
    setBgVideo(d.videoSrc);
    setBgVideoStartSec(0);
    setBgVideoDuration(totalDuration);
    setVideoUploadMsg(`Vídeo carregado (${totalDuration.toFixed(1)}s)`);
    setUploadingVideo(false);
    if (videoInputRef.current) videoInputRef.current.value = '';
  }

  function clearBgVideo() {
    setBgVideo('');
    setBgVideoStartSec(0);
    setBgVideoDuration(0);
    setVideoUploadMsg('');
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

  async function uploadOverlay(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = prompt('Nome do overlay (ex: Film Burn 01):', file.name);
    if (!label) return;
    const formData = new FormData();
    formData.append('overlay', file);
    formData.append('label', label);
    formData.append('blendMode', 'screen');
    const r = await fetch('/api/upload-overlay', { method: 'POST', body: formData });
    const d = await r.json();
    if (d.ok) {
      setOverlayAssets((o) => [d.overlay, ...o]);
    } else {
      alert(`Erro: ${d.error}`);
    }
    if (overlayInputRef.current) overlayInputRef.current.value = '';
  }

  function addOverlayInstance(asset: OverlayAsset) {
    setOverlays((arr) => [
      ...arr,
      {
        id: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        src: asset.path,
        type: asset.type,
        startSec: 0,
        durationSec: Math.min(2, durationSeconds),
        opacity: 0.9,
        blendMode: 'normal',
        label: asset.label,
      },
    ]);
  }

  async function deleteOverlayAsset(id: string) {
    if (!confirm('Remover esse overlay da biblioteca? (Instâncias já no projeto continuam.)')) return;
    await fetch(`/api/upload-overlay?id=${id}`, { method: 'DELETE' });
    setOverlayAssets((arr) => arr.filter((o) => o.id !== id));
  }

  function updateOverlay(id: string, patch: Partial<OverlayPlacement>) {
    setOverlays((arr) => arr.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function removeOverlay(id: string) {
    setOverlays((arr) => arr.filter((o) => o.id !== id));
  }

  async function uploadAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    // Lê duração do áudio
    const audioUrl = URL.createObjectURL(file);
    const tempAudio = document.createElement('audio');
    tempAudio.preload = 'metadata';
    tempAudio.src = audioUrl;
    await new Promise<void>((resolve) => {
      tempAudio.onloadedmetadata = () => resolve();
      tempAudio.onerror = () => resolve();
    });
    const dur = tempAudio.duration || 0;
    URL.revokeObjectURL(audioUrl);
    const formData = new FormData();
    formData.append('audio', file);
    const r = await fetch('/api/upload-audio', { method: 'POST', body: formData });
    const d = await r.json();
    setUploadingAudio(false);
    if (!d.ok) {
      alert(`Erro: ${d.error}`);
      return;
    }
    setAudioSrc(d.audioSrc);
    setAudioDuration(dur);
    setAudioStartSec(0);
    if (audioInputRef.current) audioInputRef.current.value = '';
  }

  function clearAudio() {
    setAudioSrc('');
    setAudioDuration(0);
    setAudioStartSec(0);
  }

  async function uploadPlatformLogo(platform: string, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('platform', platform);
    const r = await fetch('/api/platform-logos', { method: 'POST', body: formData });
    const d = await r.json();
    if (d.ok) {
      setCustomLogos((m) => ({ ...m, [platform]: d.logo.path }));
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
    setFontHeadline(DEFAULT_FONTS.headline);
    setFontDate(DEFAULT_FONTS.date);
    setFontCta(DEFAULT_FONTS.cta);
    setCoverSize(510);
    setSpinTurns(2);
    setWiggleIntensity(1);
    setWiggleH(0);
    setWiggleD(0);
    setWiggleC(0);
    setParticlesEnabled(true);
    setFinalFlash(true);
    setGlowColor(GLOW_PRESETS[0].color);
    setTrHeadline('mask_reveal');
    setTrDate('scale_pop');
    setTrCta('split_letters');
    setStyleHeadline({ ...HEADLINE_STYLE_DEFAULTS });
    setStyleDate({ ...DATE_STYLE_DEFAULTS });
    setStyleCta({ ...CTA_STYLE_DEFAULTS });
    setCta1InFrame(CTA_TIMING_DEFAULTS.cta1InFrame);
    setCtaSwapFrame(CTA_TIMING_DEFAULTS.ctaSwapFrame);
    setCta2InFrame(CTA_TIMING_DEFAULTS.cta2InFrame);
    setLogosInFrame(CTA_TIMING_DEFAULTS.logosInFrame);
    setOverlays([]);
    setAudioSrc('');
    setAudioStartSec(0);
    setAudioVolume(0.8);
    setAudioFadeIn(0.5);
    setAudioFadeOut(1);
    setUseVideoAudio(false);
  }

  async function renderScript(script: string, label: string) {
    setRendering(true);
    setRenderMessage(`Gerando ${label}…`);
    setRenderLog('');
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, props: project }),
    });
    const result = await response.json();
    setRendering(false);
    setRenderLog(result.output ?? '');
    if (!result.ok) {
      setRenderMessage(`Erro: ${result.error ?? 'falha'}`);
      return;
    }
    setRenderMessage(`${label} gerado. ✓`);
    // Atualizar lista de arquivos disponíveis para download
    fetch('/api/render-files').then(r => r.json()).then(d => setRenderFiles(d.files ?? []));
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
    setSaveMessage('Projeto salvo. Pronto pra renderizar.');
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <main
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '380px 1fr 360px',
        gridTemplateRows: '56px 1fr',
        gridTemplateAreas: `
          "topbar topbar topbar"
          "left center right"
        `,
      }}
    >
      {/* ─── TOPBAR ─── */}
      <header style={topbarStyle}>
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
        </div>
      </header>

      {/* ─── SIDEBAR ESQUERDA ─── */}
      <aside style={leftSidebar}>
        <Section title="Template">
          <div style={gridTwoCols}>
            {templateOrder.map((id) => (
              <TemplateButton key={id} active={template === id} onClick={() => setTemplate(id)}>
                {templateLabels[id]}
              </TemplateButton>
            ))}
          </div>
        </Section>

        <Section title="Conteúdo">
          <Field label="Data" value={releaseDate} onChange={setReleaseDate} placeholder="07.JANEIRO" />
          <Field label="Headline" value={headline} onChange={setHeadline} placeholder="LANÇAMENTO" />
          {template === 'available_now' ? (
            <>
              <Field label="Chamada / CTA 1" value={cta} onChange={setCta} placeholder="FAÇA O PRÉ-SAVE" />
              <Field label="Chamada / CTA 2" value={cta2} onChange={setCta2} placeholder="EM TODAS AS PLATAFORMAS DIGITAIS" />
            </>
          ) : (
            <Field label="Chamada / CTA" value={cta} onChange={setCta} placeholder="EM TODAS AS PLATAFORMAS DIGITAIS" />
          )}
          {template === 'watch_youtube' && (
            <Field label="Canal" value={channelName} onChange={setChannelName} />
          )}
          {template === 'milestone' && (
            <>
              <Field label="Texto acima" value={metricPrefix} onChange={setMetricPrefix} />
              <div style={gridTwoCols}>
                <Field label="Número" value={metricNumber} onChange={setMetricNumber} />
                <Field label="Métrica" value={metricLabel} onChange={setMetricLabel} />
              </div>
            </>
          )}
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
            onChange={async (e) => {
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

        <Section title="Plataformas">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allPlatforms.map((p) => (
              <ChipButton key={p} active={platformsSel.includes(p)} onClick={() => togglePlatform(p)}>
                {p}
              </ChipButton>
            ))}
          </div>
        </Section>

        <div style={{ marginTop: 'auto', padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={saveToGallery} style={primaryBtn} disabled={!activeSlug}>
            ★ Salvar na galeria
          </button>
          <button onClick={saveProjectMain} disabled={saving} style={ghostBtnStyle}>
            {saving ? 'Salvando…' : 'Salvar projeto (render)'}
          </button>
          {saveMessage && (
            <div style={{ fontSize: 11, color: saveMessage.startsWith('Erro') ? 'var(--danger)' : 'var(--text-3)' }}>
              {saveMessage}
            </div>
          )}
        </div>
      </aside>

      {/* ─── ÁREA CENTRAL ─── */}
      <section style={centerStyle}>
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
                {showSafeArea ? '✓ ' : ''}Safe area
              </button>
            </div>

            <div
              style={{
                position: 'relative',
                width: target === 'story' ? 380 : 460,
                aspectRatio: target === 'story' ? '9 / 16' : '1080 / 1350',
                borderRadius: 22,
                overflow: 'hidden',
                boxShadow: '0 30px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              <Player
                component={Component}
                inputProps={project}
                durationInFrames={durationSeconds * 30}
                compositionWidth={1080}
                compositionHeight={compositionHeight}
                fps={30}
                style={{ width: '100%', height: '100%' }}
                controls
                loop
                initialFrame={Math.max(0, durationSeconds * 30 - 15)}
              />
              {showSafeArea && target === 'story' && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${(285 / 1920) * 100}%`,
                    left: 0,
                    width: '100%',
                    height: `${(1350 / 1920) * 100}%`,
                    border: '2px dashed rgba(255, 80, 200, 0.85)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>

            {/* TIMELINE DE OVERLAYS */}
            <OverlayTimeline
              overlays={overlays}
              durationSeconds={durationSeconds}
              onUpdate={updateOverlay}
              onRemove={removeOverlay}
            />

            <div style={renderBarStyle}>
              <button
                disabled={rendering}
                onClick={() =>
                  renderScript(renderScriptFor(template, target), `${templateLabels[template]} ${target}`)
                }
                style={renderBtnStyle}
              >
                {rendering ? 'Renderizando…' : `Renderizar ${target}`}
              </button>
              <button disabled={rendering} onClick={() => renderScript('render:all', 'todos')} style={ghostBtnStyle}>
                Gerar todos
              </button>
              <button onClick={openOutFolder} style={ghostBtnStyle}>
                Abrir pasta
              </button>
            </div>
            {renderMessage && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-2)' }}>{renderMessage}</div>
            )}
            {renderLog && (
              <details style={{ marginTop: 10, maxWidth: 520 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 12 }}>Log</summary>
                <pre style={logBoxStyle}>{renderLog.slice(-3000)}</pre>
              </details>
            )}
            {renderFiles.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  Vídeos prontos
                </div>
                {renderFiles.map(f => (
                  <a
                    key={f.name}
                    href={`/api/render-files?file=${encodeURIComponent(f.name)}`}
                    download={f.name}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: 8, fontSize: 12,
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      color: 'var(--text-1)', textDecoration: 'none', gap: 8,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.name}</span>
                    <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {(f.size / 1024 / 1024).toFixed(1)} MB ↓
                    </span>
                  </a>
                ))}
              </div>
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
      <aside style={rightSidebar}>
        <div style={{ padding: '18px 22px 6px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={miniLabel}>Studio</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>Motion controls</div>
          </div>
          <button onClick={resetMotion} style={resetBtnStyle} title="Resetar tudo">↺</button>
        </div>

        {/* PROJETO */}
        <Section title="Projeto" draggablePanel>
          <div style={{ marginBottom: 12 }}>
            <div style={miniInputLabel}>Duração</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
              {[8, 15, 20, 30, 40].map((d) => (
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
            <button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} style={dashedUpload}>
              {uploadingVideo ? 'Enviando…' : bgVideo ? `✓ Vídeo (${bgVideoDuration.toFixed(1)}s)` : '+ Carregar MP4/MOV'}
            </button>
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm"
              onChange={handleVideoUpload} style={{ display: 'none' }} />
            {videoUploadMsg && <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)' }}>{videoUploadMsg}</div>}
          </div>

          {bgVideo && bgVideoDuration > 0 && (
            <>
              <SliderRow label="Início (refrão)" value={bgVideoStartSec} min={0}
                max={Math.max(0, bgVideoDuration - durationSeconds)} step={0.1}
                onChange={setBgVideoStartSec} format={(v) => `${v.toFixed(1)}s`} />
              <SliderRow label="Opacidade do vídeo" value={bgVideoOpacity} min={0} max={1} step={0.05}
                onChange={setBgVideoOpacity} format={(v) => `${Math.round(v * 100)}%`} />
              <SliderRow label="Blur" value={bgVideoBlur} min={0} max={60} step={1}
                onChange={setBgVideoBlur} format={(v) => `${v}px`} />
              <SliderRow label="Saturação" value={bgVideoSaturation} min={0} max={2} step={0.05}
                onChange={setBgVideoSaturation} format={(v) => `${v.toFixed(2)}×`} />
            </>
          )}

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

        {/* ÁUDIO */}
        <Section title="Áudio" draggablePanel>
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={uploadingAudio}
            style={dashedUpload}
          >
            {uploadingAudio ? 'Enviando…' : audioSrc ? `✓ Áudio (${audioDuration.toFixed(1)}s)` : '+ Carregar MP3/WAV/M4A'}
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/aac,audio/ogg"
            onChange={uploadAudio}
            style={{ display: 'none' }}
          />
          {audioSrc && (
            <>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={clearAudio} style={linkBtnDanger}>remover áudio</button>
              </div>
              <SliderRow
                label="Início (refrão)"
                value={audioStartSec}
                min={0}
                max={Math.max(0, audioDuration - durationSeconds)}
                step={0.1}
                onChange={setAudioStartSec}
                format={(v) => `${v.toFixed(1)}s`}
              />
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
                label="Usar áudio do vídeo BG"
                value={useVideoAudio}
                onChange={setUseVideoAudio}
              />
            </div>
          )}
        </Section>

        {/* LOGOS DAS PLATAFORMAS */}
        <Section title="Logos das plataformas" draggablePanel>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
            Substitua o ícone padrão de cada plataforma pelo seu próprio PNG/SVG.
          </div>
          {allPlatforms.map((p) => {
            const hasCustom = !!customLogos[p];
            return (
              <div key={p} style={platformLogoRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 6,
                    background: 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {hasCustom ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={customLogos[p]} alt={p}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>default</span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-1)' }}>{p}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => platformLogoInputRefs.current[p]?.click()}
                    style={tinyAddBtn}
                  >
                    {hasCustom ? 'Trocar' : 'Subir'}
                  </button>
                  {hasCustom && (
                    <button onClick={() => removePlatformLogo(p)} style={tinyDelBtn}>×</button>
                  )}
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
        </Section>

        {/* TRANSIÇÕES */}
        <Section title="Transições de texto" draggablePanel>
          <TransitionPicker label="Headline" value={trHeadline} onChange={setTrHeadline} />
          <TransitionPicker label="Data" value={trDate} onChange={setTrDate} />
          <TransitionPicker label="CTA" value={trCta} onChange={setTrCta} />
        </Section>

        {template === 'available_now' && (
          <Section title="Ritmo CTA (Disponível)" draggablePanel>
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

        {/* COR E GRADIENTE POR TEXTO */}
        <Section title="Cor & gradiente" draggablePanel>
          <TextColorEditor label="Headline" value={styleHeadline} onChange={setStyleHeadline} />
          <TextColorEditor label="Data" value={styleDate} onChange={setStyleDate} />
          <TextColorEditor label="CTA" value={styleCta} onChange={setStyleCta} />
        </Section>

        <Section title="Tipografia avançada" draggablePanel>
          <TextLayoutEditor label="Headline" value={styleHeadline} onChange={setStyleHeadline} />
          <TextLayoutEditor label="Data" value={styleDate} onChange={setStyleDate} />
          <TextLayoutEditor label="CTA" value={styleCta} onChange={setStyleCta} />
        </Section>

        {/* FONTES */}
        <Section title="Fontes" draggablePanel>
          <FontPicker label="Headline" sampleText={headline || 'LANÇAMENTO'} value={fontHeadline}
            onChange={setFontHeadline} fonts={allFonts} />
          <FontPicker label="Data" sampleText={releaseDate || '07.JANEIRO'} value={fontDate}
            onChange={setFontDate} fonts={allFonts} />
          <FontPicker label="CTA" sampleText="OUÇA AGORA" value={fontCta}
            onChange={setFontCta} fonts={allFonts} />
          <button onClick={() => fontInputRef.current?.click()} style={dashedUpload}>
            + Subir fonte (TTF/OTF/WOFF)
          </button>
          <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff,.woff2"
            onChange={uploadFont} style={{ display: 'none' }} />
          {userFonts.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={miniLabel}>Suas fontes</div>
              {userFonts.map((f) => (
                <div key={f.id} style={userFontRow}>
                  <span style={{
                    fontFamily: `'${f.family}', sans-serif`,
                    fontSize: 14,
                    fontWeight: f.weight,
                  }}>
                    {f.label}
                  </span>
                  <button onClick={() => deleteUserFont(f.id)} style={linkBtnDanger}>×</button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* OVERLAYS */}
        <Section title="Overlays (filmburn / película)" draggablePanel>
          <button onClick={() => overlayInputRef.current?.click()} style={dashedUpload}>
            + Subir overlay
          </button>
          <input ref={overlayInputRef} type="file"
            accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp"
            onChange={uploadOverlay} style={{ display: 'none' }} />

          {overlayAssets.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={miniLabel}>Biblioteca</div>
              {overlayAssets.map((ov) => (
                <div key={ov.id} style={overlayLibraryRow}>
                  <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ov.type === 'video' ? '🎞' : '🖼'} {ov.label}
                  </span>
                  <button onClick={() => addOverlayInstance(ov)} style={tinyAddBtn}>+ tempo</button>
                  <button onClick={() => deleteOverlayAsset(ov.id)} style={tinyDelBtn} title="Remover da biblioteca">×</button>
                </div>
              ))}
            </div>
          )}
        </Section>

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
                  onChange={(e) => setCoverMotion(e.target.value as CoverMotionId)}
                  style={{
                    width: '100%',
                    height: 42,
                    borderRadius: 10,
                    border: '1px solid var(--border-1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-main)',
                    padding: '0 12px',
                    outline: 'none',
                  }}
                >
                  {COVER_MOTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>


          <SliderRow label="Tamanho" value={coverSize} min={320} max={680} step={10}
            onChange={setCoverSize} format={(v) => `${v}px`} />
          <SliderRow label="Voltas Y" value={spinTurns} min={0} max={4} step={0.5}
            onChange={setSpinTurns} format={(v) => `${v}×`} />
          <SliderRow label="Wiggle (global)" value={wiggleIntensity} min={0} max={2} step={0.1}
            onChange={setWiggleIntensity} format={(v) => v.toFixed(1)} />
        </Section>

        <Section title="Wiggle por elemento" draggablePanel>
          <SliderRow label="Wiggle headline" value={wiggleH} min={0} max={2} step={0.1}
            onChange={setWiggleH} format={(v) => v.toFixed(1)} />
          <SliderRow label="Wiggle data" value={wiggleD} min={0} max={2} step={0.1}
            onChange={setWiggleD} format={(v) => v.toFixed(1)} />
          <SliderRow label="Wiggle CTA" value={wiggleC} min={0} max={2} step={0.1}
            onChange={setWiggleC} format={(v) => v.toFixed(1)} />
        </Section>

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

        <Section title="Efeitos" draggablePanel>
          <ToggleRow label="Partículas bokeh" value={particlesEnabled} onChange={setParticlesEnabled} />
          <ToggleRow label="Flash final" value={finalFlash} onChange={setFinalFlash} />
        </Section>
      </aside>

      {/* MODAL NOVO ARTISTA */}
      {showArtistModal && <ArtistModal onCreate={createArtist} onClose={() => setShowArtistModal(false)} />}
    
      <div
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
        {STUDIO_TOOL_DOCK.map((tool) => {
          const active = activeStudioTool === tool.id;

          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                setActiveStudioTool(tool.id);
                scrollToStudioSection(tool.section);
              }}
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

</main>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function BrandSmall() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14, boxShadow: '0 4px 14px var(--brand-glow)',
      }}>N</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>NovaCena</div>
    </div>
  );
}

function ArtistSelector({
  artists, activeSlug, onSelect, onNew,
}: {
  artists: ArtistRecord[]; activeSlug: string | null;
  onSelect: (slug: string) => void; onNew: () => void;
}) {
  const active = artists.find((a) => a.slug === activeSlug);
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        padding: '6px 14px', background: 'var(--surface-1)',
        border: '1px solid var(--border-1)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-1)',
      }}>
        <span style={{ color: 'var(--text-3)' }}>Artista:</span>
        <strong>{active?.name ?? 'Nenhum'}</strong>
        <span style={{ color: 'var(--text-3)' }}>⌄</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          minWidth: 220, background: 'var(--bg-2)',
          border: '1px solid var(--border-1)', borderRadius: 8,
          padding: 4, zIndex: 100, maxHeight: 320, overflow: 'auto',
        }}>
          {artists.map((a) => (
            <button
              key={a.slug}
              onClick={() => { onSelect(a.slug); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 10px',
                background: a.slug === activeSlug ? 'var(--surface-active)' : 'transparent',
                border: 'none', borderRadius: 6, fontSize: 13, color: 'var(--text-1)',
              }}
            >
              {a.name}
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
          <button onClick={() => { onNew(); setOpen(false); }} style={{
            width: '100%', textAlign: 'left', padding: '8px 10px',
            background: 'transparent', border: 'none', borderRadius: 6,
            color: 'var(--brand)', fontSize: 13, fontWeight: 600,
          }}>
            + Novo artista
          </button>
        </div>
      )}
    </div>
  );
}

function ArtistModal({ onCreate, onClose }: { onCreate: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-1)', padding: 24, borderRadius: 14,
        border: '1px solid var(--border-2)', minWidth: 340,
      }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>Novo artista</h3>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nome do artista" style={{
            width: '100%', padding: '10px 12px', background: 'var(--surface-1)',
            border: '1px solid var(--border-1)', borderRadius: 8, color: 'var(--text-1)',
            fontSize: 14, marginBottom: 14, outline: 'none',
          }} onKeyDown={(e) => e.key === 'Enter' && name && onCreate(name)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', background: 'transparent', border: '1px solid var(--border-1)',
            borderRadius: 8, color: 'var(--text-2)', fontSize: 13,
          }}>Cancelar</button>
          <button disabled={!name} onClick={() => onCreate(name)} style={{
            padding: '8px 18px', background: 'linear-gradient(135deg,var(--brand),var(--brand-2))',
            border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13,
          }}>Criar</button>
        </div>
      </div>
    </div>
  );
}

function GalleryView({
  artist, items, driveFolderPath, onDriveChange, onDriveSave, onLoad, onDelete,
}: {
  artist?: ArtistRecord; items: GalleryItem[]; driveFolderPath: string;
  onDriveChange: (s: string) => void; onDriveSave: () => void;
  onLoad: (item: GalleryItem) => void; onDelete: (id: string) => void;
}) {
  if (!artist) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        Selecione um artista pra ver a galeria.
      </div>
    );
  }
  return (
    <div style={{ padding: '20px 40px', width: '100%', maxWidth: 980 }}>
      <h2 style={{ fontSize: 22, margin: '0 0 6px' }}>{artist.name}</h2>
      <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>
        Galeria · {items.length} {items.length === 1 ? 'arte salva' : 'artes salvas'}
      </div>

      {/* Drive folder */}
      <div style={{
        padding: 14, background: 'var(--surface-1)', border: '1px solid var(--border-1)',
        borderRadius: 10, marginBottom: 24,
      }}>
        <div style={miniLabel}>Pasta do Drive (sincronizada via Google Drive Desktop)</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={driveFolderPath}
            onChange={(e) => onDriveChange(e.target.value)}
            placeholder="/Users/voce/Google Drive/Artistas/Nome"
            style={{
              flex: 1, padding: '8px 12px', background: 'var(--bg-2)',
              border: '1px solid var(--border-1)', borderRadius: 8,
              color: 'var(--text-1)', fontSize: 13, outline: 'none',
            }}
          />
          <button onClick={onDriveSave} style={{
            padding: '8px 14px', background: 'var(--text-1)', color: 'var(--bg-0)',
            border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
          }}>Salvar</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          Cole o caminho local da pasta sincronizada. Os vídeos renderizados ficam disponíveis pra
          download nesse caminho do Drive Desktop.
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
          Nenhuma arte salva ainda. Crie uma no Studio e clique em <strong>★ Salvar na galeria</strong>.
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14,
        }}>
          {items.map((item) => (
            <div key={item.id} style={{
              borderRadius: 12, overflow: 'hidden',
              background: 'var(--surface-1)', border: '1px solid var(--border-1)',
            }}>
              <div style={{
                aspectRatio: '9 / 16', background: 'var(--bg-2)', position: 'relative', cursor: 'pointer',
              }} onClick={() => onLoad(item)}>
                {item.thumbnailPath && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.thumbnailPath} alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                  {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => onLoad(item)} style={{
                    flex: 1, padding: '5px 8px', background: 'var(--surface-2)',
                    border: '1px solid var(--border-1)', borderRadius: 6,
                    color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
                  }}>Carregar</button>
                  <button onClick={() => onDelete(item.id)} style={{
                    padding: '5px 8px', background: 'transparent',
                    border: '1px solid var(--border-1)', borderRadius: 6,
                    color: 'var(--danger)', fontSize: 11,
                  }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverlayTimeline({
  overlays, durationSeconds, onUpdate, onRemove,
}: {
  overlays: OverlayPlacement[]; durationSeconds: number;
  onUpdate: (id: string, patch: Partial<OverlayPlacement>) => void;
  onRemove: (id: string) => void;
}) {
  if (overlays.length === 0) return null;
  return (
    <div style={{
      width: '100%', maxWidth: 720, padding: 14,
      background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 12,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
        color: 'var(--text-3)', fontWeight: 600, marginBottom: 10 }}>
        Timeline · {durationSeconds}s · {overlays.length} overlay{overlays.length > 1 ? 's' : ''}
      </div>
      {overlays.map((ov) => (
        <div key={ov.id} style={{
          padding: '8px 10px', marginBottom: 8,
          background: 'var(--bg-2)', borderRadius: 8,
          display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto',
          gap: 8, alignItems: 'center', fontSize: 11,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ov.type === 'video' ? '🎞' : '🖼'} {ov.label}
          </span>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 9, color: 'var(--text-3)' }}>
            início
            <input type="number" step="0.1" min={0} max={durationSeconds - 0.1}
              value={ov.startSec.toFixed(1)}
              onChange={(e) => onUpdate(ov.id, { startSec: parseFloat(e.target.value) || 0 })}
              style={tinyNumInput} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 9, color: 'var(--text-3)' }}>
            duração
            <input type="number" step="0.1" min={0.1}
              max={durationSeconds - ov.startSec}
              value={ov.durationSec.toFixed(1)}
              onChange={(e) => onUpdate(ov.id, { durationSec: parseFloat(e.target.value) || 0.5 })}
              style={tinyNumInput} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 9, color: 'var(--text-3)' }}>
            opacidade
            <input type="range" min={0} max={1} step={0.05} value={ov.opacity}
              onChange={(e) => onUpdate(ov.id, { opacity: parseFloat(e.target.value) })}
              style={{ width: 60 }} />
          </label>
          <select value={ov.blendMode}
            onChange={(e) => onUpdate(ov.id, { blendMode: e.target.value as OverlayPlacement['blendMode'] })}
            style={tinySelect}>
            <option value="screen">screen</option>
            <option value="overlay">overlay</option>
            <option value="lighten">lighten</option>
            <option value="soft-light">soft</option>
            <option value="normal">normal</option>
          </select>
          <button onClick={() => onRemove(ov.id)} style={linkBtnDanger}>×</button>
        </div>
      ))}
    </div>
  );
}

function TextColorEditor({
  label, value, onChange,
}: { label: string; value: TextStyleState; onChange: (s: TextStyleState) => void }) {
  return (
    <div style={{ marginBottom: 14, padding: '10px 12px',
      background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
        <button onClick={() => onChange({ ...value, useGradient: !value.useGradient })}
          style={{
            padding: '3px 9px', fontSize: 10, fontWeight: 600,
            background: value.useGradient ? 'linear-gradient(135deg,' + value.gradientColor1 + ',' + value.gradientColor2 + ')' : 'var(--bg-2)',
            color: '#fff', border: '1px solid var(--border-2)', borderRadius: 6,
          }}>
          {value.useGradient ? 'GRADIENTE' : 'COR SÓLIDA'}
        </button>
      </div>
      {!value.useGradient ? (
        <input type="color" value={value.color}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          style={colorInputStyle} />
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input type="color" value={value.gradientColor1}
              onChange={(e) => onChange({ ...value, gradientColor1: e.target.value })}
              style={{ ...colorInputStyle, flex: 1 }} />
            <input type="color" value={value.gradientColor2}
              onChange={(e) => onChange({ ...value, gradientColor2: e.target.value })}
              style={{ ...colorInputStyle, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>Ângulo</span>
            <input type="range" min={0} max={360} step={5} value={value.gradientAngle}
              onChange={(e) => onChange({ ...value, gradientAngle: parseInt(e.target.value) })}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, width: 30, textAlign: 'right' }}>
              {value.gradientAngle}°
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TextLayoutEditor({
  label, value, onChange,
}: { label: string; value: TextStyleState; onChange: (s: TextStyleState) => void }) {
  const setNum = (key: keyof TextStyleState, next: number) => onChange({ ...value, [key]: next });
  const textAlign = value.textAlign ?? 'center';

  return (
    <div style={{ marginBottom: 14, padding: '10px 12px',
      background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>{label}</div>

      <SliderRow
        label="Espaçamento entre letras"
        value={value.letterSpacing ?? 0}
        min={-20}
        max={30}
        step={0.5}
        onChange={(v) => setNum('letterSpacing', v)}
        format={(v) => `${v.toFixed(1)}px`}
      />

      <div style={{ marginBottom: 10 }}>
        <div style={miniInputLabel}>Alinhamento / justificado</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {(['left', 'center', 'right', 'justify'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ ...value, textAlign: align })}
              style={textAlign === align ? segBtnActive : segBtn}
            >
              {align === 'left' ? 'Esq' : align === 'center' ? 'Centro' : align === 'right' ? 'Dir' : 'Just'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={miniInputLabel}>Padding interno (px)</div>
        <div style={textBoxGridStyle}>
          <NumberBox label="Top" value={value.paddingTop ?? 0} onChange={(v) => setNum('paddingTop', v)} />
          <NumberBox label="Right" value={value.paddingRight ?? 0} onChange={(v) => setNum('paddingRight', v)} />
          <NumberBox label="Bottom" value={value.paddingBottom ?? 0} onChange={(v) => setNum('paddingBottom', v)} />
          <NumberBox label="Left" value={value.paddingLeft ?? 0} onChange={(v) => setNum('paddingLeft', v)} />
        </div>
      </div>

      <div>
        <div style={miniInputLabel}>Padding externo / margem (px)</div>
        <div style={textBoxGridStyle}>
          <NumberBox label="Top" value={value.marginTop ?? 0} onChange={(v) => setNum('marginTop', v)} />
          <NumberBox label="Right" value={value.marginRight ?? 0} onChange={(v) => setNum('marginRight', v)} />
          <NumberBox label="Bottom" value={value.marginBottom ?? 0} onChange={(v) => setNum('marginBottom', v)} />
          <NumberBox label="Left" value={value.marginLeft ?? 0} onChange={(v) => setNum('marginLeft', v)} />
        </div>
      </div>
    </div>
  );
}

function NumberBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{label}</span>
      <input
        type="number"
        min={-200}
        max={200}
        step={1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={miniNumberInputStyle}
      />
    </label>
  );
}

function TransitionPicker({
  label, value, onChange,
}: { label: string; value: TextTransitionId; onChange: (id: TextTransitionId) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={miniInputLabel}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value as TextTransitionId)}
        style={{
          width: '100%', padding: '8px 10px', background: 'var(--surface-1)',
          border: '1px solid var(--border-1)', borderRadius: 8, color: 'var(--text-1)',
          fontSize: 12, outline: 'none',
        }}>
        {TEXT_TRANSITIONS.map((t) => (
          <option key={t.id} value={t.id}>{t.label} — {t.description}</option>
        ))}
      </select>
    </div>
  );
}


const RIGHT_PANEL_SECTION_ORDER_KEY = 'novacena:right-panel-section-order-v1';

const DEFAULT_RIGHT_PANEL_SECTION_ORDER = [
  'Projeto',
  'Áudio',
  'Logos das plataformas',
  'Transições de texto',
  'Ritmo CTA (Disponível)',
  'Cor & gradiente',
  'Tipografia avançada',
  'Fontes',
  'Overlays (filmburn / película)',
  'Capa',
  'Wiggle por elemento',
  'Brilho',
  'Efeitos',
];

function getRightPanelSectionOrder(): string[] {
  if (typeof window === 'undefined') return DEFAULT_RIGHT_PANEL_SECTION_ORDER;

  try {
    const saved = window.localStorage.getItem(RIGHT_PANEL_SECTION_ORDER_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return DEFAULT_RIGHT_PANEL_SECTION_ORDER;

    return [
      ...parsed.filter((item) => DEFAULT_RIGHT_PANEL_SECTION_ORDER.includes(item)),
      ...DEFAULT_RIGHT_PANEL_SECTION_ORDER.filter((item) => !parsed.includes(item)),
    ];
  } catch {
    return DEFAULT_RIGHT_PANEL_SECTION_ORDER;
  }
}

function getRightPanelSectionIndex(title: string): number {
  return getRightPanelSectionOrder().indexOf(title);
}

function saveRightPanelSectionOrder(order: string[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(RIGHT_PANEL_SECTION_ORDER_KEY, JSON.stringify(order));
  window.dispatchEvent(new CustomEvent('novacena:right-panel-section-order-changed'));
}

function moveRightPanelSection(sourceTitle: string, targetTitle: string) {
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


function Section({
  title,
  children,
  draggablePanel = false,
}: {
  title: string;
  children: React.ReactNode;
  draggablePanel?: boolean;
}) {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const [orderIndex, setOrderIndex] = React.useState(() => getRightPanelSectionIndex(title));
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const canDrag = draggablePanel && DEFAULT_RIGHT_PANEL_SECTION_ORDER.includes(title);

  React.useEffect(() => {
    if (!canDrag) return;

    const updateOrder = () => {
      setOrderIndex(getRightPanelSectionIndex(title));
    };

    updateOrder();

    window.addEventListener('novacena:right-panel-section-order-changed', updateOrder);
    window.addEventListener('storage', updateOrder);

    return () => {
      window.removeEventListener('novacena:right-panel-section-order-changed', updateOrder);
      window.removeEventListener('storage', updateOrder);
    };
  }, [canDrag, title]);

  React.useEffect(() => {
    if (!canDrag) return;

    const parent = sectionRef.current?.parentElement;
    if (!parent) return;

    parent.style.display = 'flex';
    parent.style.flexDirection = 'column';
  }, [canDrag]);

  return (
    <section
      ref={sectionRef}
      data-right-panel-section={canDrag ? title : undefined}
      onDragOver={(event) => {
        if (!canDrag) return;
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => {
        if (!canDrag) return;
        setIsDragOver(false);
      }}
      onDrop={(event) => {
        if (!canDrag) return;
        event.preventDefault();
        setIsDragOver(false);

        const sourceTitle = event.dataTransfer.getData('text/plain');
        moveRightPanelSection(sourceTitle, title);
      }}
      style={{
        order: canDrag && orderIndex >= 0 ? orderIndex : undefined,
        opacity: isDragging ? 0.45 : 1,
        transform: isDragging ? 'scale(0.985)' : undefined,
        borderTop: isDragOver ? '1px solid rgba(168, 85, 247, 0.75)' : undefined,
        transition: 'opacity 160ms ease, transform 160ms ease, border-color 160ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {canDrag ? (
          <span
            draggable
            title="Arrastar seção"
            onDragStart={(event) => {
              setIsDragging(true);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', title);
            }}
            onDragEnd={() => setIsDragging(false)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              userSelect: 'none',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-1)',
              background: 'rgba(255,255,255,0.04)',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ⋮⋮
          </span>
        ) : null}

        <h3
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 800,
          }}
        >
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={miniInputLabel}>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        style={fieldInputStyle} />
    </label>
  );
}

function TemplateButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 12px',
      background: active ? 'var(--surface-active)' : 'var(--surface-1)',
      border: active ? '1px solid var(--border-3)' : '1px solid var(--border-1)',
      borderRadius: 10, color: active ? 'var(--text-1)' : 'var(--text-2)',
      fontSize: 12, fontWeight: 600,
    }}>{children}</button>
  );
}

function ChipButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      background: active ? 'var(--surface-active)' : 'var(--surface-1)',
      border: active ? '1px solid var(--border-3)' : '1px solid var(--border-1)',
      borderRadius: 999, color: active ? 'var(--text-1)' : 'var(--text-2)',
      fontSize: 12, fontWeight: 500,
    }}>{children}</button>
  );
}

function SegmentedControl({ options, value, onChange }: {
  options: { id: string; label: string }[]; value: string; onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg-2)',
      border: '1px solid var(--border-1)', borderRadius: 10, padding: 3 }}>
      {options.map((opt) => (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          padding: '7px 14px',
          background: value === opt.id ? 'var(--surface-active)' : 'transparent',
          border: 'none', borderRadius: 7,
          color: value === opt.id ? 'var(--text-1)' : 'var(--text-3)',
          fontSize: 12, fontWeight: 600,
        }}>{opt.label}</button>
      ))}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-3)' }}>{label}</span>
        <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 32, height: 18, borderRadius: 999,
        background: value ? 'var(--brand)' : 'var(--border-2)',
        border: 'none', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 14, height: 14, borderRadius: 999, background: '#fff',
          transition: 'left 0.2s ease',
        }} />
      </button>
    </div>
  );
}

function FontPicker({
  label, sampleText, value, onChange, fonts,
}: {
  label: string; sampleText: string; value: string;
  onChange: (id: string) => void; fonts: FontDef[];
}) {
  const [open, setOpen] = useState(false);
  const selected = fonts.find((f) => f.id === value) ?? fonts[0];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={miniInputLabel}>{label}</div>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: '100%', textAlign: 'left', padding: '8px 10px',
        background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: `'${selected.family}', sans-serif`,
            fontSize: 16, fontWeight: selected.weight, lineHeight: 1.1, color: 'var(--text-1)',
          }}>{sampleText.slice(0, 14) || 'Aa'}</div>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{selected.label}</div>
        </div>
        <span style={{ color: 'var(--text-3)' }}>{open ? '×' : '⌄'}</span>
      </button>
      {open && (
        <div style={{
          marginTop: 6, maxHeight: 280, overflow: 'auto', background: 'var(--bg-2)',
          border: '1px solid var(--border-1)', borderRadius: 8, padding: 4,
        }}>
          {(['display', 'sans', 'special'] as const).map((cat) => (
            <div key={cat}>
              <div style={{
                padding: '6px 8px 2px', fontSize: 9, letterSpacing: 1.4,
                color: 'var(--text-4)', textTransform: 'uppercase', fontWeight: 700,
              }}>
                {cat}
              </div>
              {fonts.filter((f) => f.category === cat).map((f) => (
                <button key={f.id} onClick={() => { onChange(f.id); setOpen(false); }} style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: f.id === value ? 'var(--surface-active)' : 'transparent',
                  border: 'none', borderRadius: 6,
                }}>
                  <div style={{
                    fontFamily: `'${f.family}', sans-serif`,
                    fontSize: 18, fontWeight: f.weight, lineHeight: 1, color: 'var(--text-1)',
                  }}>{sampleText.slice(0, 18) || f.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3 }}>{f.label}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function renderScriptFor(template: TemplateId, target: RenderTarget): string {
  const suffix = target === 'feed' ? ':feed' : '';
  if (template === 'available_now') return `render:available${suffix}`;
  if (template === 'watch_youtube') return `render:youtube${suffix}`;
  if (template === 'milestone') return `render:milestone${suffix}`;
  return `render:outnow${suffix}`;
}

// ============================================================
// STYLES INLINE
// ============================================================
const topbarStyle: React.CSSProperties = {
  gridArea: 'topbar',
  background: 'var(--bg-1)', borderBottom: '1px solid var(--border-1)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '0 22px', gap: 12,
};

const separator: React.CSSProperties = {
  width: 1, height: 22, background: 'var(--border-2)',
};

const topTab: React.CSSProperties = {
  padding: '6px 14px', background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 13, fontWeight: 600, borderRadius: 6,
};

const topTabActive: React.CSSProperties = {
  ...topTab, background: 'var(--surface-active)', color: 'var(--text-1)',
};

const leftSidebar: React.CSSProperties = {
  gridArea: 'left', background: 'var(--bg-1)',
  borderRight: '1px solid var(--border-1)',
  display: 'flex', flexDirection: 'column',
  overflowY: 'auto', overflowX: 'hidden',
  height: '100%', minHeight: 0,
};

const rightSidebar: React.CSSProperties = {
  gridArea: 'right', background: 'var(--bg-1)',
  borderLeft: '1px solid var(--border-1)',
  display: 'flex', flexDirection: 'column',
  overflowY: 'auto', overflowX: 'hidden',
  height: '100%', minHeight: 0,
};

const centerStyle: React.CSSProperties = {
  gridArea: 'center', background: 'var(--bg-0)',
  padding: '24px 30px',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 16,
  overflowY: 'auto', overflowX: 'hidden',
  height: '100%', minHeight: 0,
};

const previewToolbarStyle: React.CSSProperties = {
  display: 'flex', gap: 12, alignItems: 'center',
};

const renderBarStyle: React.CSSProperties = {
  display: 'flex', gap: 8,
};

const gridTwoCols: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8,
};

const uploadCardStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 10,
  background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 12,
};

const uploadCardStyleSmall: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  background: 'var(--surface-1)', border: '1px dashed var(--border-2)',
  borderRadius: 8, color: 'var(--text-2)', fontSize: 12, textAlign: 'center',
};

const uploadThumbStyle: React.CSSProperties = {
  width: 46, height: 46, borderRadius: 8, background: 'var(--bg-2)',
  overflow: 'hidden', flexShrink: 0,
};

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '11px 16px',
  background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
  border: 'none', borderRadius: 10, color: '#fff', fontSize: 13,
  fontWeight: 700, boxShadow: '0 8px 24px var(--brand-glow)',
};

const renderBtnStyle: React.CSSProperties = {
  padding: '10px 18px', background: 'var(--text-1)', color: 'var(--bg-0)',
  border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 14px', background: 'var(--surface-1)',
  color: 'var(--text-2)', border: '1px solid var(--border-1)',
  borderRadius: 10, fontWeight: 600, fontSize: 13,
};

const chip: React.CSSProperties = {
  padding: '7px 14px', background: 'var(--bg-2)',
  border: '1px solid var(--border-1)', borderRadius: 10,
  color: 'var(--text-3)', fontSize: 12, fontWeight: 600,
};

const chipActive: React.CSSProperties = {
  ...chip, background: 'var(--surface-active)',
  border: '1px solid var(--border-3)', color: 'var(--text-1)',
};

const resetBtnStyle: React.CSSProperties = {
  width: 32, height: 32, background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 8,
  color: 'var(--text-2)', fontSize: 16,
};

const miniLabel: React.CSSProperties = {
  fontSize: 10, letterSpacing: 1.4, color: 'var(--text-3)',
  textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
};

const miniInputLabel: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-3)', marginBottom: 5, fontWeight: 500, display: 'block',
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 8,
  color: 'var(--text-1)', fontSize: 12, outline: 'none',
};

const segBtn: React.CSSProperties = {
  padding: '7px 0', fontSize: 11, fontWeight: 600,
  border: '1px solid var(--border-1)', background: 'var(--surface-1)',
  color: 'var(--text-3)', borderRadius: 7,
};

const segBtnActive: React.CSSProperties = {
  ...segBtn, background: 'var(--surface-active)',
  border: '1px solid var(--border-3)', color: 'var(--text-1)',
};

const dashedUpload: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface-1)', border: '1px dashed var(--border-2)',
  borderRadius: 8, color: 'var(--text-2)', fontSize: 12, textAlign: 'left',
};

const linkBtnDanger: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--danger)',
  fontSize: 11, cursor: 'pointer', padding: 0,
};

const userFontRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 8px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 6, marginBottom: 4,
};

const overlayLibraryRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 8px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 6, marginBottom: 4,
};

const tinyAddBtn: React.CSSProperties = {
  padding: '3px 8px', background: 'var(--brand)', color: '#fff',
  border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 600,
};

const tinyDelBtn: React.CSSProperties = {
  padding: '3px 7px', background: 'transparent',
  border: '1px solid var(--border-2)', color: 'var(--danger)',
  borderRadius: 5, fontSize: 11, fontWeight: 700, marginLeft: 4,
};

const platformLogoRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 10px', marginBottom: 6,
  background: 'var(--surface-1)',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
};

const colorInputStyle: React.CSSProperties = {
  width: '100%', height: 32, background: 'transparent',
  border: '1px solid var(--border-1)', borderRadius: 6,
  padding: 0, cursor: 'pointer',
};

const textBoxGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 6,
};

const miniNumberInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 7px',
  marginTop: 2,
  background: 'var(--bg-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 6,
  color: 'var(--text-1)',
  fontSize: 11,
  outline: 'none',
};

const tinyNumInput: React.CSSProperties = {
  width: 56, padding: '4px 6px',
  background: 'var(--surface-1)', border: '1px solid var(--border-1)',
  borderRadius: 4, color: 'var(--text-1)', fontSize: 11, outline: 'none',
};

const tinySelect: React.CSSProperties = {
  padding: '4px 6px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 4,
  color: 'var(--text-1)', fontSize: 11, outline: 'none',
};

const photoDelBtn: React.CSSProperties = {
  position: 'absolute', top: 2, right: 2, width: 18, height: 18,
  border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff',
  borderRadius: 999, fontSize: 11, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const logBoxStyle: React.CSSProperties = {
  marginTop: 8, padding: 14, background: 'var(--bg-2)',
  border: '1px solid var(--border-1)', borderRadius: 10,
  color: 'var(--text-2)', fontSize: 11, maxHeight: 220,
  overflow: 'auto', lineHeight: 1.5,
};
