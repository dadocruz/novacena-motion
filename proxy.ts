import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'novacena_session';

function isSaasMode() {
  return process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
    process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
}

function isPublicPath(pathname: string) {
  if (pathname === '/login') return true;
  if (pathname === '/vendas') return true;
  if (pathname === '/motion') return true;
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

function base64url(bytes: ArrayBuffer) {
  const chars = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(chars).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(payload: string) {
  const secret = process.env.NOVACENA_AUTH_SECRET || process.env.NOVACENA_SAAS_PASSWORD || 'novacena-dev-secret';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return base64url(signature);
}

function parsePayload(encodedPayload: string) {
  try {
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

async function isValidSession(token?: string) {
  if (!token) return false;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return false;
  const expected = await hmac(encodedPayload);
  if (signature !== expected) return false;
  const payload = parsePayload(encodedPayload);
  if (!payload?.exp) return false;
  return payload.exp > Math.floor(Date.now() / 1000);
}

export async function proxy(req: NextRequest) {
  if (!isSaasMode()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const currentToken = req.cookies.get(COOKIE_NAME)?.value;
  if (await isValidSession(currentToken)) {
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
