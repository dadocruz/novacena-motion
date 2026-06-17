# CI/CD com GitHub Actions, GHCR e Docker Swarm

Este fluxo publica uma imagem versionada no GitHub Container Registry e atualiza o service `novacena-motion` na VPS via SSH.

## O que o workflow faz

1. Roda `npm ci`, `npm run build` e `npm test -- --run`.
2. Builda a imagem Docker com `NEXT_PUBLIC_NOVACENA_SAAS_MODE=1`.
3. Publica no GHCR com duas tags:
   - `ghcr.io/dadocruz/novacena-motion:<commit-sha>`
   - `ghcr.io/dadocruz/novacena-motion:latest`
4. Entra na VPS por SSH, faz `docker pull` e roda:

```bash
docker service update --with-registry-auth --force --image <imagem-sha> novacena-motion
```

As variáveis de runtime do service, como Stripe, Chartmetric, YouTube, tokens admin e origem pública, continuam preservadas no Docker Swarm.

## Secrets necessários no GitHub

Crie em `Settings > Secrets and variables > Actions > Secrets`:

```txt
VPS_HOST=IP_OU_HOST_DA_VPS
VPS_USER=root
VPS_PORT=22
VPS_SSH_KEY=chave privada SSH usada para entrar na VPS
GHCR_USER=dadocruz
GHCR_TOKEN=token GitHub com read:packages
```

O `GITHUB_TOKEN` do workflow já publica a imagem no GHCR. O `GHCR_TOKEN` é usado pela VPS para puxar a imagem.

## Variables opcionais

Crie em `Settings > Secrets and variables > Actions > Variables` se quiser compilar tags de marketing:

```txt
NEXT_PUBLIC_GTM_ID=GTM-P4RX9S2X
```

## Preparação única na VPS

Garanta que o Docker Swarm service existe:

```bash
docker service ls | grep novacena-motion
```

Garanta que o usuário configurado no secret `VPS_USER` consegue rodar Docker:

```bash
docker ps
docker service ps novacena-motion
```

Se o usuário não for `root`, adicione ao grupo Docker:

```bash
sudo usermod -aG docker NOME_DO_USUARIO
```

Depois faça logout/login do SSH.

## Como disparar deploy

O deploy roda automaticamente em push para:

```txt
feat/render-cloud-lambda
main
master
```

Também dá para rodar manualmente em `Actions > Deploy VPS > Run workflow`.

## Rollback rápido

No GitHub, abra a aba `Packages` do repositório, copie uma tag SHA anterior e rode na VPS:

```bash
docker pull ghcr.io/dadocruz/novacena-motion:SHA_ANTERIOR
docker service update \
  --with-registry-auth \
  --force \
  --image ghcr.io/dadocruz/novacena-motion:SHA_ANTERIOR \
  novacena-motion
```
