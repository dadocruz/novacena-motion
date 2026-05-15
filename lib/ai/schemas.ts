export type NovaCenaFormat = 'story' | 'square' | 'youtube';

export type NovaCenaTemplateCategory =
  | 'spotify_milestone'
  | 'youtube_watch'
  | 'youtube_subscribe'
  | 'available_now'
  | 'pre_save'
  | 'custom_reference';

export type NovaCenaMood =
  | 'neon'
  | 'elegant'
  | 'gospel'
  | 'youtube'
  | 'premium'
  | 'sertanejo'
  | 'romantic'
  | 'stage'
  | 'clean';

export type NumberRenderMode =
  | 'native_text'
  | 'styled_text_from_reference'
  | 'uploaded_graphic';

export type NovaCenaAssetRole =
  | 'cover'
  | 'artist'
  | 'artistLogo'
  | 'background'
  | 'backgroundVideo'
  | 'reference'
  | 'psd'
  | 'thumbnail'
  | 'platformLogo'
  | 'decorative'
  | 'textGraphic';

export type NovaCenaAsset = {
  id: string;
  role: NovaCenaAssetRole;
  src: string;
  width?: number;
  height?: number;
  mimeType?: string;
  notes?: string;
};

export type CoverIntelligenceResult = {
  palette: string[];
  dominantColors: string[];
  mood: NovaCenaMood[];
  fontMood: string;
  suggestedFonts: string[];
  contrastLevel: 'low' | 'medium' | 'high';
  hasFaces?: boolean;
  faceSafetyNotes?: string;
  compositionNotes: string;
  designBrief: string;
};

export type NovaCenaTextPlan = {
  headline?: string;
  title?: string;
  subtitle?: string;
  date?: string;
  cta?: string;
  handle?: string;
  number?: string;
  label?: string;
  platform?: string;
};

export type NovaCenaStylePlan = {
  mood: NovaCenaMood;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontMood?: string;
  suggestedFonts?: string[];
  glowIntensity?: number;
  textureIntensity?: number;
};

export type NovaCenaMotionPlan = {
  preset:
    | 'spotify_milestone_neon_bounce'
    | 'youtube_icons_card_reveal'
    | 'available_now_slow_elegant'
    | 'pre_save_platform_orbit'
    | 'custom_reference_motion';
  intensity: number;
  coverMotion:
    | 'scale_bounce'
    | 'parallax_float'
    | 'slow_zoom'
    | 'slide_up_bounce'
    | 'custom';
  textMotion:
    | 'tracking_reveal'
    | 'split_letters'
    | 'bounce_in'
    | 'fade_up'
    | 'custom';
  backgroundMotion:
    | 'slow_zoom'
    | 'video_loop'
    | 'blur_zoom'
    | 'light_sweep'
    | 'custom';
};

export type NovaCenaLayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right';
};

export type NovaCenaFormatLayout = {
  format: NovaCenaFormat;
  width: number;
  height: number;
  safeZone: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  boxes: Record<string, NovaCenaLayoutBox>;
};

export type NovaCenaAIPlan = {
  templateId: string;
  category: NovaCenaTemplateCategory;
  formats: NovaCenaFormat[];
  durationSeconds: number;
  assets: NovaCenaAsset[];
  texts: NovaCenaTextPlan;
  style: NovaCenaStylePlan;
  motion: NovaCenaMotionPlan;
  numberRenderMode?: NumberRenderMode;
  layouts: NovaCenaFormatLayout[];
  reviewChecklist: string[];
  notes?: string;
};

export type NovaCenaTemplateDefinition = {
  id: string;
  name: string;
  category: NovaCenaTemplateCategory;
  defaultDurationSeconds: number;
  supportedFormats: NovaCenaFormat[];
  requiredAssets: NovaCenaAssetRole[];
  editableFields: string[];
  fixedCommunicationOrder: string[];
  defaultMotion: NovaCenaMotionPlan;
};
