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
