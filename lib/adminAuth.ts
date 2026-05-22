import { NextRequest, NextResponse } from 'next/server';

export function requireAdmin(req: NextRequest) {
  const expected = process.env.NOVACENA_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'NOVACENA_ADMIN_TOKEN não configurado no servidor.' },
      { status: 503 }
    );
  }

  const incoming = req.headers.get('x-novacena-admin-token') || '';
  if (incoming !== expected) {
    return NextResponse.json(
      { ok: false, error: 'Acesso administrativo não autorizado.' },
      { status: 401 }
    );
  }

  return null;
}
