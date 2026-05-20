import { NextResponse } from 'next/server';
import { listAvailableProviders } from '../../../../lib/ai/providerRegistry';

export const runtime = 'nodejs';

/**
 * GET /api/ai/providers — lista providers disponíveis (com base nas env vars).
 * Usado pra UI mostrar quais IAs estão configuradas.
 */
export async function GET() {
  const providers = listAvailableProviders();
  const anyAvailable = providers.some((p) => p.available && p.id !== 'mock');
  return NextResponse.json({ ok: true, providers, anyAvailable });
}
