# TODO: Platform Logos + Templates Fix

## Deploy
Depois de cada mudança: `git push origin feat/render-cloud-lambda`
Na VPS cola: `deploy-motion`

## 1. Logo spacing/sizing — CONTROLE RUIM

**Arquivo:** `app/estudio/page.tsx` (linhas ~481-486 — state vars)
**Arquivo:** `remotion/AvailableNow.tsx` (linhas ~88-94 — logosFitScale clamp)

### Problema
- `platformLogoGap` (distância entre logos) não tem range suficiente — precisa ir de 0 a ~60px
- `platformLogoSize` (tamanho geral) está limitado por `maxLogosWidth = 640` e `logosFitScale`
- O clamp no layout (`makeAvailableNowLogosRect` linha ~3465) limita `logoHeightPct` a max 8.5% — muito apertado

### Fix
- Aumentar `maxLogosWidth` de 640 para 920
- Remover ou relaxar o `logoHeightPct` clamp (de 8.5 para 14)
- Slider de gap: range 0-60, default 18
- Slider de size: range 28-160, default 58
- Garantir que a mesma lógica se aplica em TODOS os templates (AvailableNow, OutNow, etc.)

## 2. Logo packs — BANCO DE DADOS DE ESTILOS

**Arquivos:**
- `data/platform-logos.json` — único pack (round-white)
- `public/logos/platforms/` — só tem `round-white/`
- `app/api/platform-logos/route.ts` — API que serve os packs

### O que precisa
Criar sistema de packs com estrutura:
```
public/logos/platforms/
  round-white/     (existente — logos redondos brancos)
  round-color/     (logos redondos coloridos)
  icon-only/       (só o ícone, sem círculo)
  rectangular/     (badges retangulares tipo "Listen on Spotify")
```

Cada pack precisa ter: Spotify, Deezer, Apple Music, YouTube Music, Amazon Music, Tidal

O `PlatformLogo.tsx` já suporta tint via CSS mask (`tintEnabled` + `tintColor`).
Funciona com PNGs brancos — aplica cor via `mask-image`.
Pra logos coloridos: desabilitar tint. Pra logos brancos: habilitar tint e deixar o cliente escolher a cor.

### Estrutura sugerida para data/platform-logo-packs.json
```json
{
  "packs": [
    {
      "id": "round-white",
      "label": "Logos redondos",
      "description": "Brancos editáveis",
      "tintable": true,
      "defaultTintColor": "#ffffff",
      "logos": {
        "Spotify": "/logos/platforms/round-white/SPOTIFY.png",
        "Deezer": "/logos/platforms/round-white/DEEZER.png",
        ...
      }
    },
    {
      "id": "round-color",
      "label": "Logos coloridos",
      "description": "Cores originais",
      "tintable": false,
      "logos": { ... }
    },
    {
      "id": "icon-only",
      "label": "Logos padrão",
      "description": "Ícone simples",
      "tintable": true,
      "defaultTintColor": "#ffffff",
      "logos": { ... }
    }
  ]
}
```

A UI no estúdio (painel direito "ESTILO DOS LOGOS") já mostra cards pra cada pack.
Quando o usuário seleciona um pack, `selectPlatformLogoPack()` (linha 1902) atualiza os `customLogos`.

### Tinting
O `PlatformLogo.tsx` já implementa tint via CSS `mask-image` (linhas 94-110).
Se `tintEnabled=true` e o logo é um PNG branco, aplica `background: tintColor` com mask.
Funciona perfeitamente para trocar cor (branco, preto, gradiente).
Para gradiente: `tintColor` pode ser `linear-gradient(...)` no CSS background.

## 3. Templates quebrados

### LANÇAMENTO (template: `out_now` — OutNow.tsx)
Deveria ser igual ao PRÉ-SAVE mas sem "data de lançamento" e sem "FAÇA O PRÉ-SAVE".
Verificar se `OutNow.tsx` está usando os mesmos layouts que `AvailableNow.tsx`.

### Assista no YouTube (template: `watch_youtube` — WatchOnYouTube.tsx)
Escalas dos textos estão zuadas. Verificar fontSize, letterSpacing e posicionamento.

### 100k/Milestone (template: `milestone` — Milestone.tsx)
Mesma coisa — verificar escalas.

### Spotify Print (template: `spotify_print` — SpotifyPrint.tsx)
Verificar escalas.

## 4. Vídeos com alpha / motions coloríveis

O Remotion suporta vídeos com alpha channel (WebM VP9 com alpha).
Para trocar cor de um motion branco: mesma técnica de CSS mask que os logos.
Mas para vídeos, `mix-blend-mode: multiply` ou `filter: hue-rotate()` pode funcionar.
Green screen: Remotion tem `@remotion/chroma-key` — possível mas precisa avaliar performance.

## Prioridade
1. Fix logo spacing/sizing (rápido)
2. Fix templates quebrados (médio)
3. Logo packs database (médio-grande)
4. Color tinting para motions/vídeos (pesquisa)
