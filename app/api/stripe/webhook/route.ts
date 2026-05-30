import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, tokensForPlan } from '../../../../lib/stripe';
import { addUserTokens, getSaasUserById, type SaasUser } from '../../../../lib/saasUsers';
import type { BillingCycle } from '../../../../lib/saasPlans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe sends raw body — disable Next.js body parsing
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let event;
  try {
    const body = await req.text();
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed.';
    console.error('[Stripe Webhook] Signature invalid:', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Checkout concluido — libera tokens ──────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.novacena_user_id;
        const planId = session.metadata?.novacena_plan_id;
        const cycle = session.metadata?.novacena_cycle as BillingCycle | undefined;

        if (!userId || !planId || !cycle) {
          console.warn('[Stripe Webhook] checkout.session.completed sem metadata NovaCena:', session.id);
          break;
        }

        const tokens = tokensForPlan(planId, cycle);
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined;

        const updated = await addUserTokens(userId, tokens, { planId, billingCycle: cycle });

        // Save Stripe IDs in user data for future reference
        if (updated && (stripeCustomerId || stripeSubscriptionId)) {
          await saveStripeIds(userId, stripeCustomerId, stripeSubscriptionId);
        }

        console.log(`[Stripe Webhook] checkout.session.completed — user=${userId} plan=${planId}/${cycle} tokens=+${tokens}`);
        break;
      }

      // ── Renovacao de assinatura — adiciona tokens ───
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        // Skip the first invoice (already handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') break;

        const subField = (invoice as unknown as Record<string, unknown>).subscription;
        const subscriptionId = typeof subField === 'string' ? subField : null;
        if (!subscriptionId) break;

        // Get subscription metadata
        const stripe = (await import('../../../../lib/stripe')).getStripeInstance();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.novacena_user_id;
        const planId = subscription.metadata?.novacena_plan_id;
        const cycle = subscription.metadata?.novacena_cycle as BillingCycle | undefined;

        if (!userId || !planId || !cycle) {
          console.warn('[Stripe Webhook] invoice.payment_succeeded sem metadata:', subscriptionId);
          break;
        }

        const tokens = tokensForPlan(planId, cycle);
        await addUserTokens(userId, tokens, { planId, billingCycle: cycle });
        console.log(`[Stripe Webhook] invoice.payment_succeeded (renewal) — user=${userId} tokens=+${tokens}`);
        break;
      }

      // ── Assinatura cancelada — registra cancelamento ─
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.novacena_user_id;

        if (userId) {
          // Don't remove tokens, just clear the plan
          await addUserTokens(userId, 0, { planId: undefined, billingCycle: undefined });
          console.log(`[Stripe Webhook] subscription.deleted — user=${userId} plan cleared`);
        }
        break;
      }

      // ── Pagamento falhou — log para acao manual ──────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        console.warn(`[Stripe Webhook] invoice.payment_failed — customer=${customerEmail} invoice=${invoice.id}`);
        // TODO: send notification email to customer
        break;
      }

      default:
        // Evento nao tratado — ignora silenciosamente
        break;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error processing event:', err);
    return NextResponse.json({ error: 'Internal error processing webhook.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Helper: salvar IDs do Stripe no user ──────────
async function saveStripeIds(userId: string, customerId?: string, subscriptionId?: string) {
  try {
    const { readFile, writeFile, mkdir } = await import('fs/promises');
    const path = await import('path');
    const { DATA_DIR } = await import('../../../../lib/storage');

    const USERS_FILE = path.join(DATA_DIR, 'users', 'saas-users.json');
    const raw = await readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(raw) as (SaasUser & { stripeCustomerId?: string; stripeSubscriptionId?: string })[];
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) return;

    if (customerId) users[idx].stripeCustomerId = customerId;
    if (subscriptionId) users[idx].stripeSubscriptionId = subscriptionId;
    users[idx].updatedAt = new Date().toISOString();

    await mkdir(path.dirname(USERS_FILE), { recursive: true });
    await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch {
    // Non-critical — don't break the webhook
  }
}
