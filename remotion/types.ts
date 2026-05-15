
export type TextStrokeMode = 'none' | 'outer' | 'inner';
export type TextStrokeFillKind = 'solid' | 'gradient';

export type TextStroke = {
  mode: TextStrokeMode;       // none | outer | inner
  width: number;              // 0–10 px
  fillKind: TextStrokeFillKind;
  color: string;              // hex quando solid
  gradientFrom?: string;      // hex
  gradientTo?: string;        // hex
  gradientAngle?: number;
  opacity?: number;
  /** Opacidade apenas do preenchimento da letra. Não afeta contorno. */
  fillOpacity?: number;     // graus
};

export const DEFAULT_TEXT_STROKE: TextStroke = {
  mode: 'none',
  width: 2,
  fillKind: 'solid',
  color: '#ffc857',
  gradientFrom: '#ffc857',
  gradientTo: '#ff4d6d',
  gradientAngle: 90,
  opacity: 1,
};

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

export type CoverMotionId =
  | 'zoom_bounce'
  | 'slide_up'
  | 'slide_left'
  | 'slide_right'
  | 'flip_card'
  | 'vinyl_reveal'
  | 'slide_up_glow'
  | 'slide_left_premium'
  | 'slide_right_premium'
  | 'flip_card_premium'
  | 'zoom_bounce_intro';

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
  /** Default true (audio do video BG ligado). Setar false = mute. Ignorado se audioSrc presente. */
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
  opacity?: number;
  /** Opacidade apenas do preenchimento da letra. Não afeta contorno. */
  fillOpacity?: number;
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
  strokeHeadline?: TextStroke;
  strokeDate?: TextStroke;
  strokeCta?: TextStroke;
  /** Opacidade global da camada de texto 0..1 */
  textOpacity?: number;
  /** Força atualização visual do Player sem resetar frame */
  previewNonce?: number;
  fontDate?: string;
  fontCta?: string;
  customFonts?: {
    id: string;
    label: string;
    file: string;
    family: string;
    weight: number;
    category: 'display' | 'sans' | 'special';
    vibe: string;
  }[];
  coverSize?: number;
  coverY?: number;
  coverX?: number;
  /** Animação de entrada da capa */
  coverMotion?: CoverMotionId;
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
  platformLogoSize?: number;
  platformLogoGap?: number;
  platformLogoScales?: Record<string, number>;


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
