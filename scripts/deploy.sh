#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
APP_DIR="/var/www/novacena-motion"
BRANCH="${1:-feat/render-cloud-lambda}"
IMAGE="novacena-motion:lambda-vps"
SERVICE="novacena-motion"
BUILD_ARGS=(
  --build-arg NEXT_PUBLIC_NOVACENA_SAAS_MODE=1
  --build-arg NEXT_PUBLIC_MOTION_META_PIXEL_ID=1640871190359011
)

# ── Helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' CYAN='\033[0;36m' NC='\033[0m'
step()  { echo -e "\n${CYAN}▸ $1${NC}"; }
ok()    { echo -e "${GREEN}✓ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
fail()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Main ────────────────────────────────────────────────────────────
cd "$APP_DIR"

step "Fetching origin/$BRANCH"
git fetch origin

LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || echo "none")
REMOTE_SHA=$(git rev-parse "origin/$BRANCH" 2>/dev/null || fail "Branch origin/$BRANCH not found")

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  warn "Already at ${REMOTE_SHA:0:7} — nothing to deploy"
  exit 0
fi

step "Updating ${LOCAL_SHA:0:7} → ${REMOTE_SHA:0:7}"
git reset --hard "origin/$BRANCH"
git --no-pager log --oneline "${LOCAL_SHA}..${REMOTE_SHA}" 2>/dev/null || true

step "Building image"
START=$(date +%s)
DOCKER_BUILDKIT=1 docker build "${BUILD_ARGS[@]}" -t "$IMAGE" .
ok "Built in $(($(date +%s) - START))s"

step "Deploying service"
docker service update --force --image "$IMAGE" "$SERVICE"

step "Healthcheck"
sleep 5
if curl -fsS http://localhost:3000/api/health > /dev/null 2>&1; then
  ok "Healthy"
else
  warn "Healthcheck failed — check: docker service logs $SERVICE --tail 30"
  exit 1
fi

echo -e "\n${GREEN}Deploy complete: ${REMOTE_SHA:0:7} on $BRANCH${NC}"
