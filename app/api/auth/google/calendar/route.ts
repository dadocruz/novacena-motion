import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SAAS_COOKIE_NAME } from '../../../../../lib/saasUsers';
import { calendarOAuthUrl, getCalendarTokens } from '../../../../../lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/google/calendar — inicia OAuth para Google Calendar */
export async function GET(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ ok: false, error: 'Google OAuth nao configurado.' }, { status: 503 });
  }

  // Check if already connected
  const check = req.nextUrl.searchParams.get('check');
  if (check === '1') {
    const tokens = await getCalendarTokens(session.sub);
    return NextResponse.json({ ok: true, connected: !!tokens, connectedAt: tokens?.connectedAt || null });
  }

  const appOrigin = process.env.NOVACENA_APP_ORIGIN || req.nextUrl.origin;
  const url = calendarOAuthUrl(appOrigin, session.sub);
  return NextResponse.redirect(url);
}
