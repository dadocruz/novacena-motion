import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SAAS_COOKIE_NAME } from '../../../../lib/saasUsers';
import { listUserArtists } from '../../../../lib/monitorArtists';
import { fetchDashboard, checkMonitorHealth } from '../../../../lib/monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
}

/** GET /api/monitor/dashboard — health check */
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  const health = await checkMonitorHealth();
  return NextResponse.json(health);
}

/** POST /api/monitor/dashboard — busca dados completos dos artistas do usuario */
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  try {
    const artists = await listUserArtists(session.sub);

    const inputs = artists.map((a) => ({
      artistName: a.artistName,
      spotifyUrl: a.spotifyUrl,
      youtubeUrl: a.youtubeUrl,
    }));

    const dashboard = await fetchDashboard(inputs);
    return NextResponse.json(dashboard);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao buscar dashboard.';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
