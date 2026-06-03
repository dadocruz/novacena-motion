@AGENTS.md

# Novacena Motion

Next.js 16 + Remotion video rendering SaaS. Owner: Dado Cruz (@dadocruz).

## Deploy (automated via GitHub Actions)

**O deploy e automatico.** Cada push na branch `feat/render-cloud-lambda` dispara o workflow `.github/workflows/deploy-vps.yml` que:

1. Builda a imagem Docker no GitHub Actions (com cache GHA)
2. Publica no GitHub Container Registry (`ghcr.io/dadocruz/novacena-motion`)
3. SSH na VPS, faz `docker pull` e `docker service update`
4. Verifica healthcheck do container
5. Faz rollback automatico se o healthcheck falhar

### Para deployar uma mudanca

```bash
git add <files>
git commit -m "feat/fix: descricao"
git push origin feat/render-cloud-lambda
```

Pronto. O workflow cuida do resto. **NAO precisa SSHar na VPS.**

### Se o workflow falhar

```bash
# Ver status
gh run list --repo dadocruz/novacena-motion --branch feat/render-cloud-lambda --limit 5

# Ver logs do ultimo run que falhou
gh run view <RUN_ID> --log-failed
```

### Infra

- **VPS:** Hostinger, IP 72.61.40.219, Debian 11
- **Service:** Docker Swarm service `novacena-motion`
- **Proxy:** Traefik v3.4.0 (overlay network `automatizadoria`)
- **Registry:** `ghcr.io/dadocruz/novacena-motion`
- **Secrets configurados no GitHub Actions:** VPS_HOST, VPS_USER, VPS_PORT, VPS_SSH_KEY

### Remotion Lambda (AWS us-east-1)

- Function: `remotion-render-4-0-464-mem2048mb-disk2048mb-120sec`
- S3: `remotionlambda-useast1-zj52zr8mhy`
- IAM: `remotion-lambda-user` (account 557393770410)

## Stack

- **Framework:** Next.js 16.2.6 (standalone output)
- **Video:** Remotion (Chromium headless + ffmpeg in container)
- **Runtime:** Node 20 (bookworm-slim)
- **Container:** Multi-stage Docker (deps -> builder -> runner)

## Important notes

- The Dockerfile copies FULL node_modules to the runner stage (Remotion needs binaries that standalone doesn't include)
- Port 3000 is NOT published to the host — traffic goes through Traefik
- Data dirs (uploads, renders, cache) are bind-mounted, not baked into the image
- Build args: `NEXT_PUBLIC_NOVACENA_SAAS_MODE=1`, `NEXT_PUBLIC_MOTION_META_PIXEL_ID=1640871190359011`

## Templates

7 templates. IDs → labels:
- `available_now` PRÉ-SAVE · `out_now` DISPONÍVEL · `watch_youtube` Assista no YouTube
- `youtube_subscribe` Inscreva-se · `youtube_views` Visualizações YT
- `milestone` Plays no single · `spotify_print` Ouvintes Mensais

Each template keeps an **isolated config**: `switchTemplate()` in `app/estudio/page.tsx`
saves/restores a snapshot per template; the `[template]` defaults effect runs only on
initial mount. Never reintroduce a `useEffect([template])` that overwrites text fields —
it breaks isolation.

### Adding a new template touches 13 places (build/tsc catches the exhaustive Records)

1. `remotion/types.ts` → `TemplateId` union
2. `remotion/project.ts` → `templateOrder` + `templateLabels`
3. `remotion/<New>.tsx` → the composition component
4. `remotion/Root.tsx` → import + `<X>WithFonts` wrapper + `templates[]` (gives story+feed)
5. `app/editorConstants.ts` → import, `componentByTemplate`, `TEXT_IN_FRAME_DEFAULTS_BY_TEMPLATE`, `renderScriptFor()`
6. `app/estudio/page.tsx` → `TEXT_ROLE_LABELS_BY_TEMPLATE`, `VISIBLE_TEXT_ROLES_BY_TEMPLATE`, two `includes()` validation lists, hotspots branch, sidebar content panel branch, `switchTemplate` first-open defaults, preview sample props
7. `data/sample-project.json` → template entry (type, text fields, motion)
8. `app/api/render/lambda/route.ts` → `COMPOSITION_MAP` (id + `:feed`)
9. `app/api/render/route.ts` → `z.enum(type)` + render-script map
10. `app/api/render/bulk/route.ts` → `z.enum` templates
11. `package.json` → `render:<x>` and `render:<x>:feed` scripts
12. `components/ControlPanels.tsx` → `TEMPLATE_INFO` (Record<TemplateId>)
13. `components/Preview.tsx` → `COMPONENTS` lazy map + import + preload `Promise.all`

Run `npm run build` after — tsc flags any missing exhaustive-Record case.

### Fonts (premium) — register in TWO places, same `family`

- `remotion/Root.tsx` `FONT_DEFINITIONS` (→ @font-face for preview AND render)
- `lib/fontCatalog.ts` `PREMIUM_FONT_CATALOG` (→ font picker)
- File goes in `public/fonts/premium/`.

### Video background performance (preview vs render)

`CinematicBackground` and `OverlayLayer` switch on `getRemotionEnvironment().isRendering`:
- **Render** → `OffthreadVideo` / frame-controlled `<Freeze>` (frame-exact, needed for output)
- **Preview** → native `<Video>` / `<Loop>` + capped blur (8px) — OffthreadVideo and
  per-frame `<Freeze>` seek the video ~30×/s in the Player and FREEZE the editor.
Keep this split; don't use OffthreadVideo or per-frame Freeze in the preview path.
