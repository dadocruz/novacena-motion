/**
 * Few-shot examples completos pro Claude aprender o estilo NovaCena.
 * Cada exemplo é uma capa → motion plan completo, com rationale específico.
 *
 * Esses exemplos ensinam o Claude a:
 * - Identificar fontes da capa (serif/sans/condensed/texturized)
 * - Escolher fontes do catálogo que CONVERSEM esteticamente
 * - Aplicar combinações coerentes (mood + cor + motion + transição)
 */

export const FEW_SHOT_EXAMPLES = `
EXEMPLO 1 — Capa SERTANEJO clássica (dupla, palco escuro, título em serif dourado)
Análise visual:
- Fontes da capa: SERIF dourado com peso médio (parece "Trajan" ou "Cinzel") + sans-serif fina pra subtítulo
- Paleta: dourado (#D4A847), bordô profundo (#5B1F2E), preto (#0A0A0F)
- Mood: sertanejo premium, palco, romantic
- Composição: duo no centro, cover quadrado, iluminação cinematográfica

Decisão criativa:
{
  "template": "available_now",
  "durationSeconds": 12,
  "headline": "JÁ DISPONÍVEL",
  "cta": "OUÇA AGORA",
  "cta2": "EM TODAS AS PLATAFORMAS DIGITAIS",
  "releaseDate": "",
  "metricPrefix": "",
  "metricNumber": "",
  "metricLabel": "",
  "platforms": ["Spotify", "Deezer", "Apple Music", "YouTube Music"],
  "motion": {
    "fontHeadline": "premium-fair-prosper",
    "fontDate": "premium-bebas-neue",
    "fontCta": "premium-nexa",
    "fontCta1": "premium-nexa",
    "fontCta2": "premium-bebas-neue",
    "coverMotion": "vinyl_reveal",
    "coverSize": 540,
    "coverY": 30,
    "transitionHeadline": "blur_focus",
    "transitionDate": "rise_clean",
    "transitionCta": "mask_reveal",
    "transitionCta1": "mask_reveal",
    "transitionCta2": "rise_clean",
    "wiggleIntensity": 0.5,
    "particlesEnabled": true,
    "finalFlash": false,
    "glowColor": "rgba(212, 168, 71, 0.32)",
    "spinTurns": 1,
    "styleHeadline": {
      "color": "#D4A847",
      "useGradient": true,
      "gradientColor1": "#F5D87A",
      "gradientColor2": "#A87C2B",
      "gradientAngle": 135,
      "letterSpacing": 2
    },
    "styleDate": {"color": "#E8C97B","letterSpacing": 4},
    "styleCta1": {"color": "#FFFFFF","letterSpacing": 3},
    "styleCta2": {"color": "#D4A847","letterSpacing": 3},
    "strokeHeadline": {"mode": "none","width": 0,"color": "#000","fillKind": "solid","opacity": 0},
    "background": {"bgColor": "#0A0A0F"}
  },
  "rationale": "Fair Prosper espelha o serif elegante da capa. Vinyl reveal evoca o vinil sertanejo. Gradiente dourado puxa a paleta. Glow âmbar amplifica a iluminação de palco. Sem flash final pra preservar elegância."
}

EXEMPLO 2 — Capa TRAP (rosto editado, cores neon roxo/ciano, fonte futurista)
Análise visual:
- Fontes da capa: SANS condensada bold tipo "Akira" ou "Druk Wide", letterspacing apertado
- Paleta: roxo elétrico (#B855FF), ciano (#00E5FF), preto (#0A0014)
- Mood: trap, urban, neon
- Composição: closeup do artista, cores edit em duo-tone

Decisão criativa:
{
  "template": "out_now",
  "durationSeconds": 8,
  "headline": "OUT NOW",
  "cta": "OUÇA AGORA",
  "cta2": "STREAMING EM TODAS AS PLATAFORMAS",
  "platforms": ["Spotify", "YouTube Music"],
  "motion": {
    "fontHeadline": "premium-akira-expanded-e-bold",
    "fontDate": "premium-panton-extrablack",
    "fontCta": "premium-akira-expanded",
    "fontCta1": "premium-akira-expanded",
    "fontCta2": "premium-akira-expanded",
    "coverMotion": "zoom_bounce_intro",
    "coverSize": 580,
    "coverY": -20,
    "transitionHeadline": "glitch_rgb",
    "transitionDate": "split_letters",
    "transitionCta": "split_letters",
    "transitionCta1": "glitch_rgb",
    "transitionCta2": "scale_pop",
    "wiggleIntensity": 1.1,
    "particlesEnabled": true,
    "finalFlash": true,
    "glowColor": "rgba(184, 85, 255, 0.42)",
    "spinTurns": 0,
    "styleHeadline": {
      "color": "#FFFFFF",
      "useGradient": true,
      "gradientColor1": "#B855FF",
      "gradientColor2": "#00E5FF",
      "gradientAngle": 110,
      "letterSpacing": -1
    },
    "styleDate": {"color": "#00E5FF","letterSpacing": 3},
    "styleCta1": {"color": "#FFFFFF","letterSpacing": 2},
    "styleCta2": {"color": "#B855FF","letterSpacing": 2},
    "strokeHeadline": {"mode": "outer","width": 2,"color": "#B855FF","fillKind": "solid","opacity": 0.7},
    "background": {"bgColor": "#0A0014"}
  },
  "rationale": "Akira Expanded combina com a fonte condensada bold da capa. Glitch_rgb e gradiente neon roxo→ciano amplificam a vibe urbana. Stroke roxo nas letras dá sensação de cyberpunk. Final flash pra impacto trap."
}

EXEMPLO 3 — Capa GOSPEL/WORSHIP (céu, fundo etéreo, luz dourada, serif claro)
Análise visual:
- Fontes da capa: SERIF leve clássico tipo "Cormorant" ou "Playfair Display"
- Paleta: dourado claro (#F5D87A), branco/creme, azul céu (#86C5D8)
- Mood: gospel, etéreo, premium
- Composição: artista olhando pra cima, luz vinda de cima

Decisão criativa:
{
  "template": "available_now",
  "durationSeconds": 14,
  "headline": "LANÇAMENTO",
  "cta": "OUÇA AGORA",
  "cta2": "EM TODAS AS PLATAFORMAS",
  "releaseDate": "12.DEZ",
  "platforms": ["Spotify", "Deezer", "Apple Music", "YouTube Music"],
  "motion": {
    "fontHeadline": "premium-varane",
    "fontDate": "premium-candrika",
    "fontCta": "premium-nexa",
    "fontCta1": "premium-nexa",
    "fontCta2": "premium-fair-prosper",
    "coverMotion": "slide_up_glow",
    "coverSize": 510,
    "coverY": 20,
    "transitionHeadline": "blur_focus",
    "transitionDate": "blur_focus",
    "transitionCta": "rise_clean",
    "transitionCta1": "rise_clean",
    "transitionCta2": "blur_focus",
    "wiggleIntensity": 0.3,
    "particlesEnabled": true,
    "finalFlash": false,
    "glowColor": "rgba(245, 216, 122, 0.42)",
    "spinTurns": 0,
    "styleHeadline": {
      "color": "#F5D87A",
      "useGradient": true,
      "gradientColor1": "#FFFFFF",
      "gradientColor2": "#F5D87A",
      "gradientAngle": 180,
      "letterSpacing": 4
    },
    "styleDate": {"color": "#F5D87A","letterSpacing": 5},
    "styleCta1": {"color": "#FFFFFF","letterSpacing": 4},
    "styleCta2": {"color": "#E8C97B","letterSpacing": 3},
    "strokeHeadline": {"mode": "none","width": 0,"color": "#000","fillKind": "solid","opacity": 0},
    "background": {"bgColor": "#0F0F1A"}
  },
  "rationale": "Varane é editorial/premium, casa com o serif clássico da capa. Slide_up_glow evoca ascensão/luz. Blur_focus suaviza entrada. Gradiente branco→dourado simula raio de luz. Sem particles intensas, etéreo."
}

EXEMPLO 4 — Capa MILESTONE PLAYS (cover + título com número grande)
Análise visual:
- Fontes da capa: BOLD condensed massivo (tipo "Akira" ou "Druk Condensed")
- Paleta: verde Spotify (#1ED760), branco, preto
- Mood: stage, milestone, premium
- Composição: artista de palco com público ao fundo

Decisão criativa:
{
  "template": "milestone",
  "durationSeconds": 10,
  "headline": "",
  "cta": "OBRIGADO POR FAZER PARTE",
  "metricPrefix": "ULTRAPASSAMOS",
  "metricNumber": "100.000",
  "metricLabel": "OUVINTES MENSAIS",
  "platforms": ["Spotify"],
  "motion": {
    "fontHeadline": "premium-panton-extrablack",
    "fontDate": "premium-akira-expanded-e-bold",
    "fontCta": "premium-nexa",
    "fontCta1": "premium-nexa",
    "fontCta2": "premium-nexa",
    "coverMotion": "zoom_bounce",
    "coverSize": 460,
    "coverY": 80,
    "transitionHeadline": "scale_pop",
    "transitionDate": "scale_pop",
    "transitionCta": "rise_clean",
    "transitionCta1": "rise_clean",
    "transitionCta2": "rise_clean",
    "wiggleIntensity": 0.9,
    "particlesEnabled": true,
    "finalFlash": true,
    "glowColor": "rgba(30, 215, 96, 0.5)",
    "spinTurns": 0,
    "styleHeadline": {
      "color": "#1ED760",
      "useGradient": false,
      "letterSpacing": -2
    },
    "styleDate": {"color": "#1ED760","letterSpacing": 2},
    "styleCta1": {"color": "#FFFFFF","letterSpacing": 3},
    "styleCta2": {"color": "#FFFFFF","letterSpacing": 3},
    "strokeHeadline": {"mode": "outer","width": 2,"color": "#1ED760","fillKind": "solid","opacity": 0.8},
    "background": {"bgColor": "#0A1A0F"}
  },
  "rationale": "Panton ExtraBlack dá peso visual ao número gigante. Scale_pop com final flash celebra o marco. Verde Spotify dominante. Stroke verde reforça identidade da plataforma."
}

EXEMPLO 5 — Capa INDIE / minimalista (fonte sans clean, paleta neutra)
Análise visual:
- Fontes da capa: SANS clean fino (tipo "Inter Light" ou "Helvetica Light")
- Paleta: off-white (#F4EDE0), café (#3A2A1C), bege (#C9BFA8)
- Mood: clean, indie, editorial
- Composição: artista de costas, paisagem suave, minimalista

Decisão criativa:
{
  "template": "out_now",
  "durationSeconds": 10,
  "headline": "OUT NOW",
  "cta": "STREAMING EM TODAS AS PLATAFORMAS",
  "platforms": ["Spotify", "Deezer", "Apple Music", "YouTube Music"],
  "motion": {
    "fontHeadline": "premium-casanova-scotia",
    "fontDate": "premium-varane",
    "fontCta": "tusker-thin",
    "fontCta1": "tusker-thin",
    "fontCta2": "tusker-thin",
    "coverMotion": "slide_up",
    "coverSize": 480,
    "coverY": 40,
    "transitionHeadline": "rise_clean",
    "transitionDate": "rise_clean",
    "transitionCta": "blur_focus",
    "transitionCta1": "blur_focus",
    "transitionCta2": "rise_clean",
    "wiggleIntensity": 0.2,
    "particlesEnabled": false,
    "finalFlash": false,
    "glowColor": "rgba(255, 255, 255, 0.15)",
    "spinTurns": 0,
    "styleHeadline": {
      "color": "#F4EDE0",
      "useGradient": false,
      "letterSpacing": -0.5
    },
    "styleDate": {"color": "#C9BFA8","letterSpacing": 4},
    "styleCta1": {"color": "#F4EDE0","letterSpacing": 3.5},
    "styleCta2": {"color": "#C9BFA8","letterSpacing": 3.5},
    "strokeHeadline": {"mode": "none","width": 0,"color": "#000","fillKind": "solid","opacity": 0},
    "background": {"bgColor": "#1A1814"}
  },
  "rationale": "Casanova Scotia é editorial clean, casa com o sans light da capa. Slide_up sem flash, particles off — minimalismo total. Cores neutras off-white sobre marrom quente. Sem stroke."
}
`;
