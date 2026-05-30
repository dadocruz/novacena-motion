import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SAAS_COOKIE_NAME } from '../../../../lib/saasUsers';
import { getSaasUserById } from '../../../../lib/saasUsers';
import { getPlanById } from '../../../../lib/saasPlans';
import { listUserArtists, addUserArtist, removeUserArtist, replaceUserArtists } from '../../../../lib/monitorArtists';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
}

/** GET /api/monitor/artists — lista artistas do usuario */
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  const user = await getSaasUserById(session.sub);
  const plan = getPlanById(user?.planId);
  const artists = await listUserArtists(session.sub);
  return NextResponse.json({
    ok: true,
    artists,
    limits: {
      monitorArtistLimit: plan.monitorArtistLimit,
      monitorDailyRefreshLimit: plan.monitorDailyRefreshLimit,
      refreshWindowHours: 24,
    },
  });
}

/** POST /api/monitor/artists — adiciona artista */
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  try {
    const body = await req.json();
    if (Array.isArray(body?.artists)) {
      const user = await getSaasUserById(session.sub);
      const plan = getPlanById(user?.planId);
      const artists = await replaceUserArtists(session.sub, body.artists, plan.monitorArtistLimit);
      return NextResponse.json({
        ok: true,
        artists,
        imported: artists.length,
        limit: plan.monitorArtistLimit,
        truncated: body.artists.length > artists.length,
      });
    }

    const { artistName, spotifyUrl, youtubeUrl } = body as {
      artistName?: string;
      spotifyUrl?: string;
      youtubeUrl?: string;
      spotifyArtistId?: string;
      cmArtistId?: number;
    };

    if (!artistName?.trim() || !spotifyUrl?.trim()) {
      return NextResponse.json({ ok: false, error: 'Nome e Spotify URL obrigatorios.' }, { status: 400 });
    }

    const user = await getSaasUserById(session.sub);
    const plan = getPlanById(user?.planId);
    const artist = await addUserArtist(session.sub, body, plan.monitorArtistLimit);
    return NextResponse.json({ ok: true, artist });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao adicionar artista.';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

/** PUT /api/monitor/artists — substitui lista importada respeitando limite do plano */
export async function PUT(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  try {
    const body = await req.json();
    const incoming = Array.isArray(body?.artists) ? body.artists : [];
    if (!incoming.length) {
      return NextResponse.json({ ok: false, error: 'Lista de artistas vazia.' }, { status: 400 });
    }

    const user = await getSaasUserById(session.sub);
    const plan = getPlanById(user?.planId);
    const artists = await replaceUserArtists(session.sub, incoming, plan.monitorArtistLimit);
    return NextResponse.json({
      ok: true,
      artists,
      imported: artists.length,
      limit: plan.monitorArtistLimit,
      truncated: incoming.length > artists.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao importar artistas.';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

/** DELETE /api/monitor/artists — remove artista */
export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ ok: false, error: 'ID obrigatorio.' }, { status: 400 });

    const removed = await removeUserArtist(session.sub, id);
    if (!removed) return NextResponse.json({ ok: false, error: 'Artista nao encontrado.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Erro ao remover artista.' }, { status: 400 });
  }
}
