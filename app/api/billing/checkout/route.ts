import { NextRequest, NextResponse } from 'next/server';
import { checkoutEnvName, planPrice, SAAS_PLANS, type BillingCycle } from '../../../../lib/saasPlans';
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

  const pixKey = process.env.NOVACENA_PIX_KEY;
  if (pixKey) {
    const months = cycle === 'monthly' ? 1 : cycle === 'annual' ? 12 : 36;
    return NextResponse.json({
      ok: true,
      payment: {
        type: 'pix',
        key: pixKey,
        name: process.env.NOVACENA_PIX_NAME || 'NovaCena',
        whatsapp: process.env.NOVACENA_PIX_WHATSAPP || '',
        amountBRL: planPrice(plan, cycle),
        planName: plan.name,
        cycle,
        renders: plan.includedTokens * months,
        reference: `${user.email} - ${plan.name} ${cycle}`,
      },
    });
  }

  return NextResponse.json({
    ok: false,
    error: 'Pagamento Pix ainda não configurado. Defina NOVACENA_PIX_KEY no servidor.',
    env: 'NOVACENA_PIX_KEY',
  }, { status: 400 });
}
