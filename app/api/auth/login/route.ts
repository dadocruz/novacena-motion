import { NextRequest, NextResponse } from 'next/server';
import {
  createPasswordUser,
  createSessionToken,
  getSaasUserByEmail,
  SAAS_COOKIE_NAME,
  verifyPassword,
} from '../../../../lib/saasUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isSaasMode() {
  return process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
    process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SAAS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function POST(req: NextRequest) {
  if (!isSaasMode()) {
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === 'signup' ? 'signup' : 'login';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name : '';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Informe um email válido.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 });
  }

  try {
    const user = mode === 'signup'
      ? await createPasswordUser({ email, name, password })
      : await getSaasUserByEmail(email);

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Conta não encontrada.' }, { status: 401 });
    }

    if (mode === 'login') {
      if (!user.passwordHash || !user.passwordSalt || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
        return NextResponse.json({ ok: false, error: 'Email ou senha inválidos.' }, { status: 401 });
      }
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        name: user.name,
        tokens: user.tokens,
        planId: user.planId ?? null,
        billingCycle: user.billingCycle ?? null,
      },
    });
    setSessionCookie(response, createSessionToken(user));
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Não foi possível entrar.' },
      { status: 400 }
    );
  }
}
