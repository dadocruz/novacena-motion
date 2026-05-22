import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/adminAuth';
import { SAAS_PLANS, type BillingCycle } from '../../../../../../lib/saasPlans';
import { addUserTokens } from '../../../../../../lib/saasUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === 'monthly' || value === 'annual' || value === 'triennial';
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const planId = typeof body.planId === 'string' ? body.planId : undefined;
  const billingCycle = isBillingCycle(body.billingCycle) ? body.billingCycle : undefined;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: 'Informe uma quantidade de renders maior que zero.' }, { status: 400 });
  }

  if (planId && !SAAS_PLANS.some((plan) => plan.id === planId)) {
    return NextResponse.json({ ok: false, error: 'Plano inválido.' }, { status: 400 });
  }

  const user = await addUserTokens(id, amount, { planId, billingCycle });
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Cliente não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      tokens: user.tokens,
      planId: user.planId ?? null,
      billingCycle: user.billingCycle ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}
