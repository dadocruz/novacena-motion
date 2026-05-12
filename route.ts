import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const startedAt = Date.now();

/**
 * Healthcheck endpoint — leve e barato.
 *
 * NÃO toca em disco, NÃO dispara render, NÃO consulta banco.
 * Usado por:
 *   - Docker HEALTHCHECK (no Dockerfile)
 *   - Traefik (futuramente, via labels)
 *   - deploy.sh (validar deploy antes de virar produção)
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'novacena-motion',
    version: process.env.npm_package_version ?? '0.5.0',
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
}
