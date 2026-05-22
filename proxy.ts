import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'novacena_session';

function isSaasMode() {
  return process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
    process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
}

function isPublicPath(pathname: string) {
  if (pathname === '/login') return true;
  if (pathname === '/favicon.ico') return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/fonts/')) return true;
  if (pathname === '/api/health') return true;
  if (pathname === '/api/fonts/css') return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (!pathname.startsWith('/api/') && /\.(css|js|map|ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|otf)$/i.test(pathname)) {
    return true;
  }
  return false;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function expectedSessionToken() {
  const password = process.env.NOVACENA_SAAS_PASSWORD;
  if (!password) return null;
  const secret = process.env.NOVACENA_AUTH_SECRET || password;
  return sha256(`${password}:${secret}`);
}

export async function proxy(req: NextRequest) {
  if (!isSaasMode()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const expectedToken = await expectedSessionToken();
  const currentToken = req.cookies.get(COOKIE_NAME)?.value;
  if (expectedToken && currentToken === expectedToken) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Acesso não autorizado.' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/:path*'],
};
