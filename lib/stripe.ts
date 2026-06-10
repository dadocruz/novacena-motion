/**
 * Stripe integration for NovaCena Motion
 * - Checkout sessions for plan purchases
 * - Webhook handling for payment events
 * - Token management on payment success
 */
import Stripe from 'stripe';
import { SAAS_PLANS, BILLING_CYCLES, type BillingCycle } from './saasPlans';

// ── Stripe instance ───────────────────────────────
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY nao configurada.');
  return new Stripe(key);
}

export function getStripeInstance() {
  return getStripe();
}

// ── Price mapping ─────────────────────────────────
// Maps plan+cycle to Stripe Price IDs (set via env vars)
export function stripePriceId(planId: string, cycle: BillingCycle): string | null {
  const envKey = `STRIPE_PRICE_${planId.toUpperCase()}_${cycle.toUpperCase()}`;
  return process.env[envKey] || null;
}

// ── Checkout ──────────────────────────────────────
export interface CreateCheckoutParams {
  planId: string;
  cycle: BillingCycle;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
  const stripe = getStripe();
  const plan = SAAS_PLANS.find((p) => p.id === params.planId);
  if (!plan) throw new Error('Plano invalido.');

  const priceId = stripePriceId(params.planId, params.cycle);
  if (!priceId) throw new Error(`Stripe Price ID nao configurado para ${params.planId}/${params.cycle}.`);

  const cycleInfo = BILLING_CYCLES.find((c) => c.id === params.cycle);
  const isRecurring = params.cycle !== 'monthly'; // all cycles are recurring in this model

  // successUrl pode já ter query string (?checkout=success&value=...) — usar & nesse caso.
  const successSep = params.successUrl.includes('?') ? '&' : '?';

  const session = await stripe.checkout.sessions.create({
    mode: isRecurring ? 'subscription' : 'subscription',
    payment_method_types: ['card'],
    customer_email: params.userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    // Campo "Adicionar código promocional" no checkout — cupons criados no
    // dashboard do Stripe (ex.: PRIMEIRACOMPRA) funcionam sem mudar código.
    allow_promotion_codes: true,
    success_url: `${params.successUrl}${successSep}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
    metadata: {
      novacena_user_id: params.userId,
      novacena_plan_id: params.planId,
      novacena_cycle: params.cycle,
      novacena_tokens: String(plan.includedTokens * (cycleInfo?.multiplier || 1)),
    },
    subscription_data: {
      metadata: {
        novacena_user_id: params.userId,
        novacena_plan_id: params.planId,
        novacena_cycle: params.cycle,
      },
    },
  });

  if (!session.url) throw new Error('Stripe nao retornou URL de checkout.');
  return session.url;
}

// ── Webhook event parsing ─────────────────────────
export function constructWebhookEvent(body: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET nao configurada.');
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

// ── Token calculation ─────────────────────────────
export function tokensForPlan(planId: string, cycle: BillingCycle): number {
  const plan = SAAS_PLANS.find((p) => p.id === planId);
  if (!plan) return 0;
  const cycleInfo = BILLING_CYCLES.find((c) => c.id === cycle);
  return plan.includedTokens * (cycleInfo?.multiplier || 1);
}
