import { NextRequest, NextResponse } from 'next/server';
import { getSaasUserById, SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Acesso não autorizado.' }, { status: 401 });
  }

  const user = await getSaasUserById(session.sub);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Conta não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      name: user.name,
      tokens: user.tokens,
      planId: user.planId ?? null,
      billingCycle: user.billingCycle ?? null,
    },
  });
}
