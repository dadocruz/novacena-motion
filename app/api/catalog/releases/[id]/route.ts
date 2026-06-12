import { NextRequest, NextResponse } from 'next/server';
import { SAAS_COOKIE_NAME, verifySessionToken } from '../../../../../lib/saasUsers';
import {
  allocateIsrc,
  applyReleasePatch,
  formatIsrc,
  loadCatalog,
  normalizeIsrcPrefix,
  registerApprovalToken,
  revokeApprovalTokens,
  saveCatalog,
  validateRelease,
  RELEASE_STATUSES,
  type ReleaseStatus,
} from '../../../../../lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const catalog = await loadCatalog(session.sub);
  const release = catalog.releases.find((r) => r.id === id);
  if (!release) return NextResponse.json({ ok: false, error: 'Lançamento não encontrado.' }, { status: 404 });

  const client = catalog.clients.find((c) => c.id === release.clientId) || null;
  return NextResponse.json({
    ok: true,
    release: { ...release, validation: validateRelease(release, client) },
  });
}

/**
 * PATCH ações:
 *  - { action:'update', release:{...} }       atualiza campos/faixas
 *  - { action:'status', status }              muda etapa do pipeline
 *  - { action:'isrc', trackId }               gera ISRC pra uma faixa
 *  - { action:'isrc_all' }                    gera ISRC pra todas sem código
 *  - { action:'approval_link' }               cria/regenera link de aprovação
 *  - { action:'settings', settings:{...} }    prefixo ISRC / padrões
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || 'update');

  const catalog = await loadCatalog(session.sub);

  // settings não depende de release específico, mas vive aqui pra não criar rota só pra isso
  if (action === 'settings') {
    const s = (body?.settings || {}) as Record<string, unknown>;
    if (s.isrcPrefix !== undefined) {
      const raw = String(s.isrcPrefix || '').trim();
      if (raw) {
        const prefix = normalizeIsrcPrefix(raw);
        if (!prefix) {
          return NextResponse.json(
            { ok: false, error: 'Prefixo ISRC inválido — use país + registrante, ex.: BRGCA.' },
            { status: 400 }
          );
        }
        catalog.settings.isrcPrefix = prefix;
      } else {
        catalog.settings.isrcPrefix = undefined;
      }
    }
    if (s.defaultLabel !== undefined) catalog.settings.defaultLabel = String(s.defaultLabel || '').trim().slice(0, 120);
    if (s.defaultProducer !== undefined)
      catalog.settings.defaultProducer = String(s.defaultProducer || '').trim().slice(0, 160);
    await saveCatalog(session.sub, catalog);
    return NextResponse.json({ ok: true, settings: catalog.settings });
  }

  const release = catalog.releases.find((r) => r.id === id);
  if (!release) return NextResponse.json({ ok: false, error: 'Lançamento não encontrado.' }, { status: 404 });

  if (action === 'update') {
    applyReleasePatch(release, (body?.release || {}) as Record<string, unknown>);
  } else if (action === 'status') {
    const status = String(body?.status || '') as ReleaseStatus;
    if (!RELEASE_STATUSES.includes(status)) {
      return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
    }
    release.status = status;
    release.updatedAt = new Date().toISOString();
  } else if (action === 'isrc' || action === 'isrc_all') {
    const targets =
      action === 'isrc'
        ? release.tracks.filter((t) => t.id === String(body?.trackId || ''))
        : release.tracks.filter((t) => !t.isrc);
    if (action === 'isrc' && !targets.length) {
      return NextResponse.json({ ok: false, error: 'Faixa não encontrada.' }, { status: 404 });
    }
    const issued: string[] = [];
    for (const track of targets) {
      if (track.isrc) continue;
      const result = allocateIsrc(catalog);
      if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      track.isrc = result.isrc;
      track.isrcAuto = true;
      issued.push(formatIsrc(result.isrc!));
    }
    release.updatedAt = new Date().toISOString();
    if (!issued.length) {
      return NextResponse.json({ ok: false, error: 'Todas as faixas já têm ISRC.' }, { status: 400 });
    }
  } else if (action === 'approval_link') {
    const token = await registerApprovalToken(session.sub, release.id);
    release.approval = {
      token,
      createdAt: new Date().toISOString(),
      // regenerar o link zera aprovação anterior (o artista aprova de novo)
    };
    if (release.status === 'rascunho') release.status = 'aguardando_artista';
    release.updatedAt = new Date().toISOString();
  } else {
    return NextResponse.json({ ok: false, error: 'Ação inválida.' }, { status: 400 });
  }

  await saveCatalog(session.sub, catalog);
  const client = catalog.clients.find((c) => c.id === release.clientId) || null;
  return NextResponse.json({
    ok: true,
    release: { ...release, validation: validateRelease(release, client) },
  });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const catalog = await loadCatalog(session.sub);
  const before = catalog.releases.length;
  catalog.releases = catalog.releases.filter((r) => r.id !== id);
  if (catalog.releases.length === before) {
    return NextResponse.json({ ok: false, error: 'Lançamento não encontrado.' }, { status: 404 });
  }
  await revokeApprovalTokens(session.sub, id);
  await saveCatalog(session.sub, catalog);
  return NextResponse.json({ ok: true });
}
