
export type TextStrokeMode = 'none' | 'outer' | 'inner';
export type TextStrokeFillKind = 'solid' | 'gradient';

export type TextStroke = {
  mode: TextStrokeMode;       // none | outer | inner
  width: number;              // 0-24 px
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
  | 'out_now'
  | 'spotify_print';

export type PlatformName =
  | 'Spotify'
  | 'Deezer'
  | 'Apple Music'
  | 'YouTube Music'
  | 'Amazon Music'
  | 'Tidal'
  | 'YouTube';

export type PlatformLogoPackId = 'standard' | 'round' | 'rectangular';

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

export type TextTransitionTuning = {
  /** Multiplica distância, blur e overshoot da transição. */
  intensity?: number;
  /** Multiplica a velocidade geral da entrada. 1 = padrão. */
  speed?: number;
  /** Controla espaçamento entre letras/palavras em transições stagger. */
  stagger?: number;
};

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
  /** modo de repetição do vídeo do overlay */
  loopMode?: 'normal' | 'pingpong';
  /** duração original do asset usado para calcular o loop ping-pong */
  sourceDurationSec?: number;
  /** imagem como elemento livre, ou mídia em tela cheia */
  layout?: 'cover' | 'element';
  /** posição do elemento em px a partir do centro */
  x?: number;
  y?: number;
  /** escala do elemento */
  scale?: number;
  /** rotação em graus */
  rotate?: number;
  /** transição de entrada do elemento */
  entryTransition?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-pop' | 'bounce-left';
  /** duração da entrada em frames */
  entryDurationFrames?: number;
  /** wiggle contínuo de posição em px */
  wigglePosition?: number;
  /** wiggle contínuo de rotação em graus */
  wiggleRotate?: number;
  /** velocidade do wiggle */
  wiggleSpeed?: number;
  /** sombra do elemento */
  shadowBlur?: number;
  shadowOpacity?: number;
  shadowColor?: string;
  /** contorno por drop-shadow em PNG transparente */
  outlineWidth?: number;
  outlineColor?: string;
  /** halo/degradê atrás do elemento */
  gradientEnabled?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientOpacity?: number;
  /** recolore PNG/SVG usando o alpha do asset como máscara */
  tintEnabled?: boolean;
  tintColor?: string;
  tintOpacity?: number;
  /** label livre pra UI */
  label?: string;
};

/**
 * Configurações do background do vídeo.
 */
export type BackgroundConfig = {
  videoSrc?: string;
  mediaType?: 'video' | 'image';
  videoStartFrame?: number;
  videoDurationSec?: number;
  videoNeedsTrim?: boolean;
  videoOriginalName?: string;
  videoOriginalSize?: number;
  localAsset?: {
    id: string;
    kind: 'backgroundVideo' | 'backgroundAudio' | 'overlay';
    name: string;
    size: number;
    type: string;
    durationSec?: number;
    lastModified?: number;
    trimStartSec?: number;
    trimDurationSec?: number;
    serverPreviewSrc?: string;
    renderReadySrc?: string;
  };
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
  /** Compatibilidade com o painel atual de degradê */
  fillKind?: 'solid' | 'gradient';
  gradientFrom?: string;
  gradientTo?: string;
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
  /**
   * Preset interno de composição baseado nas artes de referência NovaCena.
   * Não aparece como controle solto no editor; vem dos templates salvos.
   */
  layoutPreset?: string;
  fontHeadline?: string;
  strokeHeadline?: TextStroke;
  strokeDate?: TextStroke;
  strokeCta?: TextStroke;
  strokeCta1?: TextStroke;
  strokeCta2?: TextStroke;
  /** Opacidade global da camada de texto 0..1 */
  textOpacity?: number;
  /** Força atualização visual do Player sem resetar frame */
  previewNonce?: number;
  /** No editor, evita que uma troca de transição deixe o texto totalmente invisível. */
  previewMode?: boolean;
  fontDate?: string;
  fontCta?: string;
  fontCta1?: string;
  fontCta2?: string;
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
  transitionCta1?: TextTransitionId;
  transitionCta2?: TextTransitionId;
  /** Frame de entrada por texto */
  headlineInFrame?: number;
  dateInFrame?: number;
  transitionTuningHeadline?: TextTransitionTuning;
  transitionTuningDate?: TextTransitionTuning;
  transitionTuningCta?: TextTransitionTuning;
  transitionTuningCta1?: TextTransitionTuning;
  transitionTuningCta2?: TextTransitionTuning;
  /** Wiggle individual por elemento (multiplica o global) */
  wiggleHeadline?: number;
  wiggleDate?: number;
  wiggleCta?: number;
  wiggleCta1?: number;
  wiggleCta2?: number;
  /** Estilo de cor por elemento de texto */
  styleHeadline?: TextStyle;
  styleDate?: TextStyle;
  styleCta?: TextStyle;
  styleCta1?: TextStyle;
  styleCta2?: TextStyle;
  /** Mapa de logos customizados por plataforma (chave = nome) */
  customLogos?: Record<string, string>;
  platformLogoSize?: number;
  platformLogoGap?: number;
  platformLogoScales?: Record<string, number>;
  platformLogoX?: number;
  platformLogoY?: number;
  platformLogoPack?: PlatformLogoPackId;
  platformLogoTintEnabled?: boolean;
  platformLogoTintColor?: string;
  /** Pulso orgânico contínuo dos logos de plataforma. */
  platformLogoWiggle?: number;
  platformLogoWiggleSpeed?: number;


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
  // ─── Spotify Print: controles do celular ───────────────
  /** Inclinação do celular (graus, -25 a 25) */
  phoneTilt?: number;
  /** Largura do celular em px (300-700) */
  phoneSize?: number;
  /** Offset X do celular */
  phoneX?: number;
  /** Offset Y do celular */
  phoneY?: number;
  /** Preset de entrada do celular */
  phoneMotion?:
    | 'zoom_bounce'
    | 'slide_up'
    | 'slide_down'
    | 'slide_left'
    | 'slide_right'
    | 'flip_card'
    | 'tilt_in_left'
    | 'tilt_in_right'
    | 'drop_in'
    | 'stamp'
    | 'diagonal_tl'
    | 'diagonal_tr';
  /** Voltas extra de rotateY (3D spin) */
  phoneSpinTurns?: number;
  /** Wiggle individual do celular (multiplica o global) */
  phoneWiggle?: number;
  /** Dynamic island (true) ou notch (false) */
  phoneDynamicIsland?: boolean;
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
  showCover?: boolean;
  platforms: PlatformName[];
  coverImage: string;
  media: MediaConfig;
  format: FormatConfig;
  motion?: MotionConfig;
};

export type TemplateProps = MotionProject & {
  renderTarget: RenderTarget;
};
