import { NextRequest, NextResponse } from 'next/server';
import { checkoutEnvName, SAAS_PLANS, type BillingCycle } from '../../../../lib/saasPlans';
import { getSaasUserById, SAAS_COOKIE_NAME, updateUserPlan, verifySessionToken } from '../../../../lib/saasUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === 'monthly' || value === 'annual' || value === 'triennial';
}

export async function POST(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SAAS_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Acesso não autorizado.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = SAAS_PLANS.find((item) => item.id === body.planId);
  const cycle = isBillingCycle(body.cycle) ? body.cycle : null;
  if (!plan || !cycle) {
    return NextResponse.json({ ok: false, error: 'Plano inválido.' }, { status: 400 });
  }

  const user = await getSaasUserById(session.sub);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Conta não encontrada.' }, { status: 404 });
  }

  const checkoutUrl = process.env[checkoutEnvName(plan.id, cycle)];
  if (checkoutUrl) {
    return NextResponse.json({ ok: true, checkoutUrl });
  }

  if (process.env.NOVACENA_ENABLE_MANUAL_BILLING === '1') {
    const multiplier = cycle === 'monthly' ? 1 : cycle === 'annual' ? 12 : 36;
    const updated = await updateUserPlan(user.id, {
      planId: plan.id,
      billingCycle: cycle,
      tokensToAdd: plan.includedTokens * multiplier,
    });
    return NextResponse.json({ ok: true, manual: true, user: updated });
  }

  return NextResponse.json({
    ok: false,
    error: 'Checkout ainda não configurado. Defina o link de pagamento deste plano no servidor.',
    env: checkoutEnvName(plan.id, cycle),
  }, { status: 400 });
}
