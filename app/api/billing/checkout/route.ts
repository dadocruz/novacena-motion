import { NextRequest, NextResponse } from 'next/server';
import { BILLING_CYCLES, checkoutEnvName, planPrice, SAAS_PLANS, type BillingCycle } from '../../../../lib/saasPlans';
import { getSaasUserById, SAAS_COOKIE_NAME, updateUserPlan, verifySessionToken } from '../../../../lib/saasUsers';
import { createCheckoutSession } from '../../../../lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === 'monthly' || value === 'quarterly' || value === 'annual';
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

  const appOrigin = process.env.NOVACENA_APP_ORIGIN || req.nextUrl.origin;
  const paymentMethod = body.paymentMethod as string | undefined; // 'stripe' | 'pix' | undefined
  const cycleInfo = BILLING_CYCLES.find((c) => c.id === cycle);
  const months = cycleInfo?.multiplier || 1;
  const totalBRL = planPrice(plan, cycle);
  const totalTokens = plan.includedTokens * months;

  // ── Stripe payment ───────────────────────────────
  if (paymentMethod === 'stripe' || (!paymentMethod && process.env.STRIPE_SECRET_KEY)) {
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const checkoutUrl = await createCheckoutSession({
          planId: plan.id,
          cycle,
          userId: user.id,
          userEmail: user.email,
          successUrl: `${appOrigin}/studio?checkout=success`,
          cancelUrl: `${appOrigin}/billing?status=cancelled`,
        });
        return NextResponse.json({ ok: true, checkoutUrl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro no Stripe.';
        if (paymentMethod === 'stripe') {
          return NextResponse.json({ ok: false, error: msg }, { status: 500 });
        }
        // Fall through to other methods
      }
    }
  }

  // ── Pix payment ──────────────────────────────────
  const pixKey = process.env.NOVACENA_PIX_KEY;
  if (paymentMethod === 'pix' || (!paymentMethod && pixKey)) {
    if (pixKey) {
      return NextResponse.json({
        ok: true,
        payment: {
          type: 'pix',
          key: pixKey,
          name: process.env.NOVACENA_PIX_NAME || 'NovaCena',
          whatsapp: process.env.NOVACENA_PIX_WHATSAPP || '',
          amountBRL: totalBRL,
          planName: plan.name,
          cycle,
          renders: totalTokens,
          reference: `${user.email} - ${plan.name} ${cycle}`,
        },
      });
    }
  }

  // ── Legacy checkout URL ──────────────────────────
  const legacyUrl = process.env[checkoutEnvName(plan.id, cycle)];
  if (legacyUrl) {
    return NextResponse.json({ ok: true, checkoutUrl: legacyUrl });
  }

  // ── Manual billing (dev) ─────────────────────────
  if (process.env.NOVACENA_ENABLE_MANUAL_BILLING === '1') {
    const updated = await updateUserPlan(user.id, {
      planId: plan.id,
      billingCycle: cycle,
      tokensToAdd: totalTokens,
    });
    return NextResponse.json({ ok: true, manual: true, user: updated });
  }

  // ── Return available methods ─────────────────────
  const methods: string[] = [];
  if (process.env.STRIPE_SECRET_KEY) methods.push('stripe');
  if (pixKey) methods.push('pix');

  if (methods.length > 0) {
    return NextResponse.json({
      ok: true,
      availableMethods: methods,
      plan: { name: plan.name, id: plan.id },
      cycle,
      totalBRL,
      totalTokens,
    });
  }

  return NextResponse.json({
    ok: false,
    error: 'Nenhum metodo de pagamento configurado.',
  }, { status: 400 });
}
