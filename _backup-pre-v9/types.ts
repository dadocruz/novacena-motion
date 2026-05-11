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

/**
 * Configurações do background do vídeo.
 * Quando videoSrc está definido, ele substitui o background-blur-da-capa.
 */
export type BackgroundConfig = {
  /** Caminho do vídeo de fundo (ex: /uploads/bg/clipe.mp4). Se vazio, usa capa borrada. */
  videoSrc?: string;
  /** Frame de início do vídeo (frames a 30fps). Permite usar refrão. */
  videoStartFrame?: number;
  /** Opacidade do vídeo (0 a 1) */
  videoOpacity?: number;
  /** Cor de fundo atrás do vídeo. Usar com videoOpacity < 1 cria efeito "escurecido". */
  bgColor?: string;
  /** Blur do vídeo em px (0 = nítido, 40 = bem borrado) */
  videoBlur?: number;
  /** Saturação do vídeo (0 = preto e branco, 1 = original, 1.5 = saturado) */
  videoSaturation?: number;
};

/**
 * Configurações do motion controláveis pelo usuário.
 * Todos os campos são opcionais — quando não definidos, valem os defaults.
 */
export type MotionConfig = {
  /** IDs das fontes (referenciam o catálogo em lib/fontCatalog.ts) */
  fontHeadline?: string;
  fontDate?: string;
  fontCta?: string;
  /** Tamanho da capa em pixels (300–700) */
  coverSize?: number;
  /** Número de voltas Y da capa (0 = sem giro, 2 = padrão, 4 = energético) */
  spinTurns?: number;
  /** Intensidade do wiggle (0 = travado, 1 = padrão, 2 = exagerado) */
  wiggleIntensity?: number;
  /** Liga/desliga partículas bokeh */
  particlesEnabled?: boolean;
  /** Liga/desliga flash final */
  finalFlash?: boolean;
  /** Cor de glow da capa em rgba */
  glowColor?: string;
  /** Velocidade global da animação (0.5 = lenta, 1 = padrão, 1.5 = rápida) */
  speed?: number;
  /** Duração total em segundos (8, 15, 20, 30, 40) */
  durationSeconds?: number;
  /** Background config (vídeo, cor, opacidade) */
  background?: BackgroundConfig;
};

export type MotionProject = {
  type: TemplateId;
  artistName: string;
  songTitle: string;
  headline: string;
  cta: string;
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
