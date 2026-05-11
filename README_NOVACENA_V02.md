# NovaCena Motion v0.2

Esta versão adiciona 4 templates:

1. **AvailableNow** — disponível em todas as plataformas
2. **WatchOnYouTube** — assista no YouTube
3. **Milestone** — marca de ouvintes/plays, exemplo 100.000 ouvintes
4. **OutNow** — ouça agora, com bolhas das plataformas

Também adiciona:

- partículas no fundo
- textura/grão cinematográfico
- light sweep
- entrada com bounce
- wiggle sutil em camadas
- logos vetoriais coloridos de Spotify, Deezer, Apple Music e YouTube Music
- data de lançamento via JSON
- preview com seletor de template
- render story 1080x1920 e feed 1080x1350

## Como instalar no projeto que já está rodando

Copie/substitua estas pastas e arquivos dentro do seu projeto `novacena-motion`:

- `app/page.tsx`
- `data/sample-project.json`
- `remotion/`
- `scripts/render-all.mjs`
- `package.json`

Depois rode:

```bash
npm run dev
```

Abra:

```bash
http://localhost:3000
```

## Renderizar

Renderizar apenas o template principal antigo:

```bash
npm run render:story
npm run render:feed
```

Renderizar todos os 4 templates em story + feed:

```bash
npm run render:all
```

Vai gerar 8 arquivos na pasta `out/`.

## Onde trocar dados do cliente

Edite:

```bash
data/sample-project.json
```

Campos principais:

- `artistName`
- `songTitle`
- `releaseDate`
- `coverImage`
- `platforms`
- `templates.available_now.cta`
- `templates.watch_youtube.channelName`
- `templates.milestone.metricNumber`
- `templates.milestone.metricLabel`

Para trocar a capa, coloque a imagem em `public/` e altere:

```json
"coverImage": "/nome-da-capa.png"
```
