/**
 * Catálogo completo do Studio NovaCena para alimentar prompts de IA.
 * A IA vai escolher itens DESTE catálogo, garantindo que tudo aplicado
 * funciona no Remotion (não inventa nomes que não existem).
 */
import { getFontCatalogForAI } from './fontCatalogForAI';

export const STUDIO_CATALOG = {
  templates: [
    {
      id: 'available_now',
      name: 'PRÉ-SAVE',
      use_case: 'Primeira arte da campanha: comunica a data do lançamento e pede pre-save.',
      mandatory_texts: ['headline', 'releaseDate', 'cta'],
    },
    {
      id: 'milestone',
      name: 'Milestone (X plays)',
      use_case: 'Celebração de números (10k ouvintes, 1M plays)',
      mandatory_texts: ['metricPrefix', 'metricNumber', 'metricLabel'],
    },
    {
      id: 'out_now',
      name: 'LANÇAMENTO',
      use_case: 'Arte para single ja lançado: headline editavel como "DISPONIVEL" ou "OUCA AGORA" e CTA de plataformas/apps de musica.',
      mandatory_texts: ['headline', 'cta'],
    },
    {
      id: 'listen_deezer',
      name: 'Ouça na Deezer',
      use_case: 'Arte para single ja lançado com foco exclusivo na Deezer.',
      mandatory_texts: ['headline', 'cta2'],
    },
    {
      id: 'watch_youtube',
      name: 'Assista no YouTube',
      use_case: 'Lançamento de clipe oficial',
      mandatory_texts: ['headline', 'cta', 'channelName'],
    },
    {
      id: 'spotify_print',
      name: 'Spotify Print (com iPhone mockup)',
      use_case: 'Print do app Spotify dentro de celular flutuante',
      mandatory_texts: ['metricPrefix', 'metricNumber', 'metricLabel'],
    },
  ],

  /** Fontes recomendadas por contexto. Use o `id` exato. */
  fonts: {
    headline_impactante: [
      { id: 'premium-akira-expanded-e-bold', vibe: 'premium impacto / título gigante' },
      { id: 'premium-panton-extrablack', vibe: 'premium número / milestone / capa forte' },
      { id: 'premium-akira-expanded', vibe: 'premium impacto / moderno' },
      { id: 'premium-gramatika-black', vibe: 'premium impacto / display' },
      { id: 'premium-heavitas', vibe: 'premium pesado / headline' },
      { id: 'premium-aldivaro-extrabold', vibe: 'premium impacto / elegante' },
      { id: 'premium-1797-compressed', vibe: 'premium condensada / cartaz' },
    ],
    sertanejo: [
      { id: 'premium-bebas-neue', vibe: 'sertanejo / show / YouTube' },
      { id: 'premium-kenyan-coffee', vibe: 'sertanejo / divulgação' },
      { id: 'premium-big-noodle-oblique', vibe: 'show / inclinado / impacto' },
    ],
    cta_clean: [
      { id: 'premium-nexa', vibe: 'CTA / limpo / legível' },
      { id: 'premium-lemon-milk', vibe: 'premium clean / forte' },
    ],
    elegante_gospel: [
      { id: 'premium-fair-prosper', vibe: 'premium / gospel / elegante' },
      { id: 'premium-casanova-scotia', vibe: 'premium / clássico' },
      { id: 'premium-candrika', vibe: 'elegante / texto' },
      { id: 'premium-varane', vibe: 'editorial / premium' },
    ],
    editorial: [
      { id: 'tusker-super', vibe: 'editorial / A24 / refinado' },
      { id: 'tusker-medium', vibe: 'editorial / refinado' },
      { id: 'tusker-thin', vibe: 'editorial / leve' },
    ],
  },

  /** Animações de entrada da capa (Premium Cover). */
  cover_motions: [
    { id: 'zoom_bounce', desc: 'Zoom in com bounce — intro impactante' },
    { id: 'slide_up', desc: 'Sobe de baixo — clean' },
    { id: 'slide_left', desc: 'Entra da esquerda' },
    { id: 'slide_right', desc: 'Entra da direita' },
    { id: 'flip_card', desc: 'Vira como uma carta — premium' },
    { id: 'vinyl_reveal', desc: 'Aparece girando como vinil — sertanejo/clássico' },
    { id: 'slide_up_glow', desc: 'Sobe com brilho — gospel/etéreo' },
    { id: 'flip_card_premium', desc: 'Flip card com brilho premium' },
    { id: 'zoom_bounce_intro', desc: 'Zoom bounce mais elaborado' },
  ],

  /** Transições de texto por elemento (mask_reveal etc.). */
  text_transitions: [
    { id: 'mask_reveal', desc: 'Máscara revela letra por letra — clean/elegante' },
    { id: 'blur_focus', desc: 'Aparece desfocado e foca — etéreo/gospel' },
    { id: 'split_letters', desc: 'Letras separam e voltam — impacto/moderno' },
    { id: 'type_writer', desc: 'Datilografa letra por letra — vintage/jornalístico' },
    { id: 'slide_stagger', desc: 'Letras entram escalonadas — kinetic' },
    { id: 'glitch_rgb', desc: 'Glitch com chromatic aberration — trap/cyberpunk' },
    { id: 'scale_pop', desc: 'Pop com bounce — alegre/pop' },
    { id: 'rise_clean', desc: 'Sobe limpo — minimalista' },
  ],

  /** Cores de glow predefinidas (RGBA). */
  glow_palette: [
    { hex: 'rgba(190, 90, 255, 0.32)', name: 'Roxo' },
    { hex: 'rgba(255, 140, 60, 0.32)', name: 'Laranja' },
    { hex: 'rgba(60, 220, 130, 0.32)', name: 'Verde Spotify' },
    { hex: 'rgba(30, 215, 96, 0.5)', name: 'Verde Spotify forte' },
    { hex: 'rgba(255, 60, 60, 0.32)', name: 'Vermelho' },
    { hex: 'rgba(80, 140, 255, 0.32)', name: 'Azul' },
    { hex: 'rgba(255, 200, 80, 0.32)', name: 'Dourado' },
    { hex: 'rgba(255, 90, 180, 0.32)', name: 'Rosa' },
    { hex: 'rgba(255, 255, 255, 0.20)', name: 'Off-white' },
  ],

  /** Cores de fundo predefinidas. */
  bg_colors: ['#000000', '#030205', '#0a0a14', '#1a0a2a', '#0a1a14', '#2a0a14', '#1a1a2a'],

  /** Plataformas suportadas. */
  platforms: ['Spotify', 'Deezer', 'Apple Music', 'YouTube Music', 'YouTube'],

  /** Tipos de stroke (contorno) disponíveis. */
  stroke_modes: [
    { id: 'none', desc: 'Sem contorno (default)' },
    { id: 'outer', desc: 'Contorno externo nas letras' },
    { id: 'inner', desc: 'Contorno interno (efeito relevo)' },
  ],
};

/**
 * Retorna o catálogo em formato compacto pra colocar no prompt.
 * Substitui o `fonts` estático pelo catálogo REAL dinâmico (34+ fontes).
 */
export function getStudioCatalogPrompt(): string {
  const base = JSON.stringify(STUDIO_CATALOG, null, 2);
  // Anexa o catálogo COMPLETO real (não só os 16 premium agrupados)
  const realFonts = getFontCatalogForAI();
  return `${base}

═════════════════════════════════════════════════════════════
🔤 CATÁLOGO COMPLETO DE FONTES (USE EXATAMENTE estes IDs)
═════════════════════════════════════════════════════════════
${realFonts}

REGRA: ao escolher fontHeadline, fontDate, fontCta etc., use APENAS um dos IDs acima.
Se inventar um ID que não está na lista, o sistema vai REJEITAR e cair em fallback genérico.
Olhe o "vibe" de cada fonte e escolha as que CONVERSAM com o estilo tipográfico da capa.
`;
}

/**
 * Schema EXATO do MotionConfig que a IA precisa retornar.
 * Cada campo aplica DIRETO no Studio Remotion.
 */
export const AI_MOTION_PLAN_SCHEMA = `{
  "template": "available_now" | "milestone" | "out_now" | "listen_deezer" | "watch_youtube" | "spotify_print",
  "durationSeconds": 8-15,
  "headline": "string — texto da headline (mantém o do user se vier)",
  "cta": "string — CTA principal",
  "cta2": "string — CTA secundário (opcional)",
  "releaseDate": "DD.MES" | "",
  "channelName": "string" | "",
  "metricPrefix": "ULTRAPASSAMOS" | "LANÇAMENTO" | "" — texto acima do número,
  "metricNumber": "string" | "" — ex: "100.000" ou "1 MILHÃO",
  "metricLabel": "string" | "" — ex: "OUVINTES MENSAIS",
  "platforms": ["Spotify", "Deezer", "Apple Music", "YouTube Music"],
  "motion": {
    "fontHeadline": "id_da_fonte (do catalog)",
    "fontDate": "id_da_fonte",
    "fontCta": "id_da_fonte",
    "fontCta1": "id_da_fonte",
    "fontCta2": "id_da_fonte",
    "coverMotion": "zoom_bounce | slide_up | flip_card | vinyl_reveal | etc",
    "coverSize": 400-700,
    "coverY": -200 to 200,
    "transitionHeadline": "mask_reveal | scale_pop | etc",
    "transitionDate": "mask_reveal | etc",
    "transitionCta": "mask_reveal | etc",
    "transitionCta1": "mask_reveal | etc",
    "transitionCta2": "mask_reveal | etc",
    "wiggleIntensity": 0.0-1.5,
    "particlesEnabled": true | false,
    "finalFlash": true | false,
    "glowColor": "rgba(R, G, B, A) — extraído da capa",
    "spinTurns": 0-3,
    "styleHeadline": {
      "color": "#hex",
      "useGradient": true | false,
      "gradientColor1": "#hex",
      "gradientColor2": "#hex",
      "gradientAngle": 0-360,
      "letterSpacing": -3 to 5
    },
    "styleDate": { "color": "#hex", "letterSpacing": 0-5 },
    "styleCta1": { "color": "#hex", "letterSpacing": 0-5 },
    "styleCta2": { "color": "#hex", "letterSpacing": 0-5 },
    "strokeHeadline": {
      "mode": "none | outer | inner",
      "width": 0-5,
      "color": "#hex",
      "fillKind": "solid",
      "opacity": 0-1
    },
    "background": { "bgColor": "#hex" }
  },
  "rationale": "1-2 frases curtas explicando por que escolheu assim"
}`;
