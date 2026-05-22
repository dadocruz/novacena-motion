import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SAAS_COOKIE_NAME, upsertGoogleUser } from '../../../../../lib/saasUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('state') || '/';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appOrigin = process.env.NOVACENA_APP_ORIGIN || req.nextUrl.origin;

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.nextUrl.origin));
  }

  const redirectUri = `${appOrigin}/api/auth/google/callback`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/login?error=google_failed', req.nextUrl.origin));
  }

  const tokenData = await tokenResponse.json();
  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoResponse.ok) {
    return NextResponse.redirect(new URL('/login?error=google_failed', req.nextUrl.origin));
  }

  const googleUser = await userInfoResponse.json() as GoogleUserInfo;
  const user = await upsertGoogleUser({
    email: googleUser.email,
    name: googleUser.name,
    googleSub: googleUser.sub,
  });

  const response = NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', req.nextUrl.origin));
  response.cookies.set({
    name: SAAS_COOKIE_NAME,
    value: createSessionToken(user),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
