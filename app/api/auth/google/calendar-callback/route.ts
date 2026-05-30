import { NextRequest, NextResponse } from 'next/server';
import { exchangeCalendarCode, saveCalendarTokens } from '../../../../../lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/google/calendar-callback — recebe code do OAuth Calendar */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const userId = req.nextUrl.searchParams.get('state');
  const appOrigin = process.env.NOVACENA_APP_ORIGIN || req.nextUrl.origin;

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/monitor?calendar=error', appOrigin));
  }

  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeCalendarCode(code, appOrigin);

    await saveCalendarTokens(userId, {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL('/monitor?calendar=connected', appOrigin));
  } catch {
    return NextResponse.redirect(new URL('/monitor?calendar=error', appOrigin));
  }
}
