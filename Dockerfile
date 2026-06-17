# ============================================
# STAGE 1: deps — instala dependências
# ============================================
FROM node:20-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ============================================
# STAGE 2: builder — build do Next standalone
# ============================================
FROM node:20-bookworm AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ARG NEXT_PUBLIC_NOVACENA_SAAS_MODE=0
ENV NEXT_PUBLIC_NOVACENA_SAAS_MODE=$NEXT_PUBLIC_NOVACENA_SAAS_MODE
ARG NEXT_PUBLIC_GTM_ID=GTM-P4RX9S2X
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID

RUN npm run build

# ============================================
# STAGE 3: runner — runtime mínimo + ffmpeg + libs do Chromium (Remotion)
# ============================================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Dependências de runtime do Remotion (Chromium headless + ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
  ffmpeg \
  curl \
  ca-certificates \
  libnspr4 \
  libnss3 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libgtk-3-0 \
  libu2f-udev \
  libvulkan1 \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG NEXT_PUBLIC_NOVACENA_SAAS_MODE=0
ENV NEXT_PUBLIC_NOVACENA_SAAS_MODE=$NEXT_PUBLIC_NOVACENA_SAAS_MODE
ARG NEXT_PUBLIC_GTM_ID=GTM-P4RX9S2X
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID

# Cria usuário não-root pra rodar Next
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m -s /bin/bash nextjs

# node_modules vem de DEPS (não builder) — cacheia enquanto package.json não mudar
# Remotion precisa do node_modules completo (binários, fontes, etc que o standalone não inclui)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Output do Next standalone + estáticos + public (mudam a cada build)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Arquivos necessários para o CLI do Remotion (chamado via npm run render:*)
COPY --from=builder --chown=nextjs:nodejs /app/remotion ./remotion
COPY --from=builder --chown=nextjs:nodejs /app/remotion-entry ./remotion-entry
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Cria pastas de runtime
RUN mkdir -p /app/data /app/public/uploads /app/out \
  && chown -R nextjs:nodejs /app/data /app/public/uploads /app/out

USER nextjs

EXPOSE 3000

# Healthcheck Docker-nativo
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

# server.js é gerado pelo Next standalone output
CMD ["node", "server.js"]
