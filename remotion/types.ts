export type RenderTarget = 'story' | 'feed';

export type TemplateId =
  | 'available_now'
  | 'watch_youtube'
  | 'milestone'
  | 'out_now';

export type PlatformName =
  | 'Spotify'
  | 'Deezer'
  | 'Apple Music'
  | 'YouTube Music'
  | 'YouTube';

export type FramingMode =
  | 'cover_crop'
  | 'contain_blur'
  | 'background_blur'
  | 'smart_crop';

export type MediaConfig = {
  type: 'video' | 'image';
  file: string;
  clipFile?: string;
  sourceFormat?: 'widescreen' | 'vertical' | 'square';
  startTime?: number;
  duration?: number;
  framingMode: FramingMode;
};

export type SafeArea = {
  width: number;
  height: number;
  x: number;
  y: number;
};

export type FormatConfig = {
  primary: { width: number; height: number };
  safeArea: SafeArea;
  exports?: unknown[];
};

export type TextTransitionId =
  | 'mask_reveal'
  | 'blur_focus'
  | 'split_letters'
  | 'type_writer'
  | 'slide_stagger'
  | 'glitch_rgb'
  | 'scale_pop'
  | 'rise_clean';

/**
 * Instância de overlay posicionada no tempo (semelhante a clip numa timeline).
 */
export type OverlayPlacement = {
  /** id único dentro do projeto */
  id: string;
  /** caminho do asset (referência ao OverlayAsset cadastrado) */
  src: string;
  /** tipo do asset (vídeo ou imagem) */
  type: 'video' | 'image';
  /** segundo onde começa */
  startSec: number;
  /** duração em segundos */
  durationSec: number;
  /** opacidade base 0..1 */
  opacity: number;
  /** blend mode CSS */
  blendMode: 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal';
  /** label livre pra UI */
  label?: string;
};

/**
 * Configurações do background do vídeo.
 */
export type BackgroundConfig = {
  videoSrc?: string;
  videoStartFrame?: number;
  videoOpacity?: number;
  bgColor?: string;
  videoBlur?: number;
  videoSaturation?: number;
  /** Caminho do áudio (mp3/wav/m4a) — independente do vídeo */
  audioSrc?: string;
  /** Segundo do áudio onde começar a tocar (refrão) */
  audioStartSec?: number;
  /** Volume 0..1 */
  audioVolume?: number;
  /** Fade-in em segundos */
  audioFadeInSec?: number;
  /** Fade-out em segundos */
  audioFadeOutSec?: number;
  /** Se true, usa o áudio do próprio vídeo BG */
  useVideoAudio?: boolean;
};

/**
 * Estilo aplicado a textos individuais (cor, gradiente, sombra).
 */
export type TextStyle = {
  /** Cor sólida (#hex ou rgba). Ignorada se useGradient = true. */
  color?: string;
  /** Se ativar gradiente nas letras */
  useGradient?: boolean;
  /** Cor inicial do gradiente */
  gradientColor1?: string;
  /** Cor final do gradiente */
  gradientColor2?: string;
  /** Ângulo do gradiente em graus (0 = horizontal, 90 = vertical) */
  gradientAngle?: number;
  /** Espaçamento entre letras em px */
  letterSpacing?: number;
  /** Alinhamento de texto */
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  /** Padding interno em px */
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  /** Margem externa em px */
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
};

/**
 * Configurações do motion controláveis pelo usuário.
 */
export type MotionConfig = {
  fontHeadline?: string;
  fontDate?: string;
  fontCta?: string;
  coverSize?: number;
  spinTurns?: number;
  wiggleIntensity?: number;
  particlesEnabled?: boolean;
  finalFlash?: boolean;
  glowColor?: string;
  speed?: number;
  durationSeconds?: number;
  background?: BackgroundConfig;
  /** Transição usada por cada elemento */
  transitionHeadline?: TextTransitionId;
  transitionDate?: TextTransitionId;
  transitionCta?: TextTransitionId;
  /** Wiggle individual por elemento (multiplica o global) */
  wiggleHeadline?: number;
  wiggleDate?: number;
  wiggleCta?: number;
  /** Estilo de cor por elemento de texto */
  styleHeadline?: TextStyle;
  styleDate?: TextStyle;
  styleCta?: TextStyle;
  /** Mapa de logos customizados por plataforma (chave = nome) */
  customLogos?: Record<string, string>;
  /** Overlays na timeline */
  overlays?: OverlayPlacement[];
  /** Timing da primeira CTA (frame de entrada) */
  cta1InFrame?: number;
  /** Timing da troca CTA1 -> CTA2 */
  ctaSwapFrame?: number;
  /** Timing da segunda CTA (frame de entrada) */
  cta2InFrame?: number;
  /** Timing da entrada dos logos */
  logosInFrame?: number;
};

export type MotionProject = {
  type: TemplateId;
  artistName: string;
  songTitle: string;
  headline: string;
  cta: string;
  cta2?: string;
  releaseDate?: string;
  channelName?: string;
  metricPrefix?: string;
  metricNumber?: string;
  metricLabel?: string;
  platforms: PlatformName[];
  coverImage: string;
  media: MediaConfig;
  format: FormatConfig;
  motion?: MotionConfig;
};

export type TemplateProps = MotionProject & {
  renderTarget: RenderTarget;
};
