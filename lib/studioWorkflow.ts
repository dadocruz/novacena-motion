export type StudioMode = 'simple' | 'advanced';

export const RIGHT_PANEL_PRESET_ORDER: Record<string, number> = {
  'Projeto': 10,
  'Conteúdo': 20,
  'Capa principal': 30,
  'Fotos': 35,

  'Logos das plataformas': 40,

  'Texto': 50,
  'Fontes': 55,
  'Cor & gradiente': 60,
  'Tipografia avançada': 65,
  'Transições de texto': 70,

  'Ritmo CTA (Disponível)': 80,

  'Capa': 90,
  'Wiggle por elemento': 100,
  'Brilho': 110,
  'Efeitos': 120,

  'Áudio': 130,
  'Overlays (filmburn / película)': 140,
};

export const SIMPLE_MODE_SECTIONS = new Set([
  'Projeto',
  'Conteúdo',
  'Capa principal',
  'Logos das plataformas',
  'Texto',
  'Fontes',
  'Ritmo CTA (Disponível)',
  'Capa',
  'Overlays (filmburn / película)',
]);

export const ADVANCED_ONLY_SECTIONS = new Set([
  'Cor & gradiente',
  'Tipografia avançada',
  'Transições de texto',
  'Wiggle por elemento',
  'Brilho',
  'Efeitos',
  'Áudio',
]);

export const STUDIO_TOOL_DOCK = [
  { id: 'cover', label: 'Capa', section: 'Capa' },
  { id: 'text', label: 'Texto', section: 'Fontes' },
  { id: 'logos', label: 'Logos', section: 'Logos das plataformas' },
  { id: 'motion', label: 'Motion', section: 'Capa' },
  { id: 'cta', label: 'CTA', section: 'Ritmo CTA (Disponível)' },
  { id: 'overlay', label: 'Overlay', section: 'Overlays (filmburn / película)' },
  { id: 'render', label: 'Render', section: 'Projeto' },
] as const;

export const QUICK_ACTIONS = [
  { id: 'safe', label: 'Safe zone' },
  { id: 'impact', label: 'Mais impacto' },
  { id: 'clean', label: 'Mais clean' },
  { id: 'premium', label: 'Premium' },
  { id: 'readable', label: 'Mais legível' },
] as const;
