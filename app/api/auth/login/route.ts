import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'novacena_session';

function isSaasMode() {
  return process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
    process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
}

function sessionToken(password: string) {
  const secret = process.env.NOVACENA_AUTH_SECRET || password;
  return createHash('sha256').update(`${password}:${secret}`).digest('hex');
}

export async function POST(req: NextRequest) {
  if (!isSaasMode()) {
    return NextResponse.json({ ok: true });
  }

  const expectedPassword = process.env.NOVACENA_SAAS_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json(
      { ok: false, error: 'Login não configurado no servidor.' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  if (password !== expectedPassword) {
    return NextResponse.json(
      { ok: false, error: 'Senha inválida.' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: sessionToken(expectedPassword),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
