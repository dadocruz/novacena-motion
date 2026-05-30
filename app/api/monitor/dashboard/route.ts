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

/** POST /api/monitor/dashboard — busca dados completos
 *  Aceita artists no body (frontend gaveta) OU usa lista salva do usuario */
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const bodyArtists = Array.isArray(body?.artists) ? body.artists : null;

    let inputs;
    if (bodyArtists && bodyArtists.length > 0) {
      // Frontend gaveta envia artists no body
      inputs = bodyArtists.map((a: Record<string, string>) => ({
        artistName: a.artistName || a.name || '',
        spotifyUrl: a.spotifyUrl || '',
        youtubeUrl: a.youtubeUrl || '',
        spotifyArtistId: a.spotifyArtistId || '',
        cmArtistId: Number(a.cmArtistId || 0) || undefined,
      }));
    } else {
      // Fallback: usa lista salva do usuario
      const saved = await listUserArtists(session.sub);
      inputs = saved.map((a) => ({
        artistName: a.artistName,
        spotifyUrl: a.spotifyUrl,
        youtubeUrl: a.youtubeUrl,
        spotifyArtistId: a.spotifyArtistId,
        cmArtistId: a.cmArtistId,
      }));
    }

    const dashboard = await fetchDashboard(inputs);
    return NextResponse.json(dashboard);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao buscar dashboard.';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
