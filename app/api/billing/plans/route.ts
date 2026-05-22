import { NextRequest, NextResponse } from 'next/server';
import { BILLING_CYCLES, SAAS_PLANS } from '../../../../lib/saasPlans';
import { getSaasUserById, SAAS_COOKIE_NAME, verifySessionToken } from '../../../../lib/saasUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Acesso não autorizado.' }, { status: 401 });
  }

  const user = await getSaasUserById(session.sub);
  return NextResponse.json({
    ok: true,
    plans: SAAS_PLANS,
    cycles: BILLING_CYCLES,
    user: user ? {
      email: user.email,
      name: user.name,
      tokens: user.tokens,
      planId: user.planId ?? null,
      billingCycle: user.billingCycle ?? null,
    } : null,
  });
}
