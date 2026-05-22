import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appOrigin = process.env.NOVACENA_APP_ORIGIN || req.nextUrl.origin;
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.nextUrl.origin));
  }

  const redirectUri = `${appOrigin}/api/auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', req.nextUrl.searchParams.get('next') || '/');
  return NextResponse.redirect(url);
}
