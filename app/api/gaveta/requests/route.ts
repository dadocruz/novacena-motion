import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SAAS_COOKIE_NAME } from '../../../../lib/saasUsers';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  getCalendarTokens,
} from '../../../../lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
}

/** GET /api/gaveta/requests — lista eventos de arte do calendario */
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  const tokens = await getCalendarTokens(session.sub);
  if (!tokens) {
    return NextResponse.json({ ok: true, requests: [], calendarConnected: false });
  }

  try {
    const events = await listCalendarEvents(session.sub);
    const requests = events.map((e) => ({
      calendarEventId: e.id,
      summary: e.summary,
      description: e.description,
      date: e.start,
      htmlLink: e.htmlLink,
    }));
    return NextResponse.json({ ok: true, requests, calendarConnected: true });
  } catch {
    return NextResponse.json({ ok: true, requests: [], calendarConnected: true });
  }
}

/** POST /api/gaveta/requests — cria evento de solicitacao de arte */
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  const tokens = await getCalendarTokens(session.sub);
  if (!tokens) {
    return NextResponse.json({
      ok: false,
      error: 'Google Agenda nao conectada. Clique em "Conectar Agenda" no painel.',
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const task = body.task || body;

    const artistName = String(task.artistName || task.requestDetails?.artistName || 'Artista');
    const itemTitle = String(task.itemTitle || task.requestDetails?.itemTitle || 'Arte');
    const type = String(task.type || task.requestDetails?.type || 'single');
    const milestone = Number(task.milestone || task.requestDetails?.milestone || 0);
    const currentValue = Number(task.currentValue || task.requestDetails?.currentValue || 0);
    const note = String(task.note || task.requestDetails?.note || '');
    const sourceUrl = String(task.sourceUrl || task.requestDetails?.sourceUrl || '');
    const dueDate = String(task.dueDate || new Date().toISOString().slice(0, 10));

    // Build event summary and description
    const summary = `[NovaCena] ${artistName} — ${itemTitle}`;
    const lines = [
      `Tipo: ${type}`,
      `Artista: ${artistName}`,
      `Item: ${itemTitle}`,
    ];
    if (milestone) lines.push(`Meta: ${milestone.toLocaleString('pt-BR')}`);
    if (currentValue) lines.push(`Atual: ${currentValue.toLocaleString('pt-BR')}`);
    if (sourceUrl) lines.push(`Link: ${sourceUrl}`);
    if (note) lines.push(`Nota: ${note}`);
    lines.push('', 'Criado via NovaCena Monitor');

    const event = await createCalendarEvent(session.sub, {
      summary,
      description: lines.join('\n'),
      date: dueDate,
      colorId: type === 'traffic' ? '11' : '9', // red for traffic, blue for art
    });

    return NextResponse.json({
      ok: true,
      request: {
        calendarEventId: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar evento.';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** DELETE /api/gaveta/requests — remove evento do calendario */
export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 });

  try {
    const calendarEventId = req.nextUrl.searchParams.get('calendarEventId');

    if (calendarEventId) {
      await deleteCalendarEvent(session.sub, calendarEventId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Event may already be deleted, that's fine
    return NextResponse.json({ ok: true });
  }
}
