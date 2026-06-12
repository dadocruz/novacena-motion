import { NextRequest, NextResponse } from 'next/server';
import { clientIp, rateLimit } from '../../../../../lib/rateLimit';
import {
  loadCatalog,
  releaseForArtist,
  resolveApprovalToken,
  saveCatalog,
} from '../../../../../lib/catalog';

// Rota PÚBLICA (o artista não tem conta): autenticação é o próprio token
// aleatório do link. Sem sessão, com rate limit por IP.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

async function findRelease(token: string) {
  const entry = await resolveApprovalToken(token);
  if (!entry) return null;
  const catalog = await loadCatalog(entry.userId);
  const release = catalog.releases.find((r) => r.id === entry.releaseId);
  if (!release || release.approval?.token !== token) return null;
  const client = catalog.clients.find((c) => c.id === release.clientId) || null;
  return { entry, catalog, release, client };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const limit = rateLimit(`approval-get:${clientIp(req)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas.' }, { status: 429 });
  }

  const { token } = await context.params;
  const found = await findRelease(token);
  if (!found) {
    return NextResponse.json({ ok: false, error: 'Link inválido ou expirado.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    release: releaseForArtist(found.release, found.client?.name),
  });
}

/**
 * POST { action:'save'|'approve', fullName?, notes?, lyrics?: { [trackId]: string } }
 *  - save: artista completa letras e deixa observações
 *  - approve: registra aprovação (nome completo + data + IP)
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const ip = clientIp(req);
  const limit = rateLimit(`approval-post:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429 });
  }

  const { token } = await context.params;
  const found = await findRelease(token);
  if (!found) {
    return NextResponse.json({ ok: false, error: 'Link inválido ou expirado.' }, { status: 404 });
  }
  const { entry, catalog, release, client } = found;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '');
  if (action !== 'save' && action !== 'approve') {
    return NextResponse.json({ ok: false, error: 'Ação inválida.' }, { status: 400 });
  }

  // Letras enviadas pelo artista entram direto na faixa (fonte da verdade da letra)
  const lyrics = body?.lyrics && typeof body.lyrics === 'object' ? (body.lyrics as Record<string, unknown>) : {};
  for (const track of release.tracks) {
    const incoming = lyrics[track.id];
    if (typeof incoming === 'string' && incoming.trim()) {
      track.lyrics = incoming.slice(0, 20000);
    }
  }

  release.approval = release.approval || { token, createdAt: new Date().toISOString() };
  if (typeof body?.notes === 'string') {
    release.approval.artistNotes = body.notes.slice(0, 5000);
  }

  if (action === 'approve') {
    const fullName = String(body?.fullName || '').trim();
    if (fullName.length < 5 || !fullName.includes(' ')) {
      return NextResponse.json(
        { ok: false, error: 'Digite seu nome completo pra registrar a aprovação.' },
        { status: 400 }
      );
    }
    release.approval.approvedAt = new Date().toISOString();
    release.approval.approvedName = fullName.slice(0, 160);
    release.approval.approvedIp = ip;
    if (release.status === 'rascunho' || release.status === 'aguardando_artista') {
      release.status = 'aprovado';
    }
  }

  release.updatedAt = new Date().toISOString();
  await saveCatalog(entry.userId, catalog);

  return NextResponse.json({ ok: true, release: releaseForArtist(release, client?.name) });
}
