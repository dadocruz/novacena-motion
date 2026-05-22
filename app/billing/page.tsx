'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BillingCycle, SaasPlan } from '../../lib/saasPlans';

type Cycle = {
  id: BillingCycle;
  label: string;
  multiplier: number;
  discountLabel: string;
};

type BillingUser = {
  email: string;
  name: string;
  tokens: number;
  planId: string | null;
  billingCycle: BillingCycle | null;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function BillingPage() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [user, setUser] = useState<BillingUser | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [message, setMessage] = useState('');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/plans')
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) {
          setMessage(data.error || 'Não foi possível carregar os planos.');
          return;
        }
        setPlans(data.plans);
        setCycles(data.cycles);
        setUser(data.user);
      })
      .catch(() => setMessage('Não foi possível carregar os planos.'));
  }, []);

  const selectedCycle = useMemo(
    () => cycles.find((item) => item.id === cycle),
    [cycles, cycle]
  );

  async function choosePlan(planId: string) {
    setLoadingPlan(planId);
    setMessage('');
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setMessage(data.error || 'Não foi possível iniciar o pagamento.');
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.manual && data.user) {
        setUser(data.user);
        setMessage('Plano ativado.');
      }
    } catch {
      setMessage('Não foi possível iniciar o pagamento.');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: 28, background: '#0a0a0c', color: '#fff', overflow: 'auto' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 24 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.46)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              NovaCena
            </div>
            <h1 style={{ margin: '8px 0 0', fontSize: 34 }}>Planos e tokens</h1>
          </div>
          <a href="/" style={{ color: '#fff', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, padding: '10px 14px' }}>
            Voltar ao estúdio
          </a>
        </header>

        <section style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.72)' }}>
            {user ? `${user.name} · ${user.tokens} tokens disponíveis` : 'Carregando conta...'}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 4, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}>
            {cycles.map((item) => (
              <button
                key={item.id}
                onClick={() => setCycle(item.id)}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 12px',
                  background: cycle === item.id ? '#fff' : 'transparent',
                  color: cycle === item.id ? '#111' : 'rgba(255,255,255,0.72)',
                  fontWeight: 800,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {message && (
          <div style={{ padding: 12, borderRadius: 8, background: 'rgba(248,113,113,0.12)', color: '#fca5a5' }}>
            {message}
          </div>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {plans.map((plan) => {
            const price = plan.monthlyPriceBRL * (selectedCycle?.multiplier ?? 1);
            const months = cycle === 'monthly' ? 1 : cycle === 'annual' ? 12 : 36;
            return (
              <article
                key={plan.id}
                style={{
                  display: 'grid',
                  gap: 16,
                  padding: 22,
                  borderRadius: 12,
                  border: plan.id === 'pro' ? '1px solid rgba(184,85,255,0.72)' : '1px solid rgba(255,255,255,0.12)',
                  background: plan.id === 'pro' ? 'rgba(184,85,255,0.12)' : 'rgba(255,255,255,0.045)',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 24 }}>{plan.name}</h2>
                  <p style={{ minHeight: 44, margin: '8px 0 0', color: 'rgba(255,255,255,0.62)', lineHeight: 1.45 }}>
                    {plan.description}
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: 34, fontWeight: 900 }}>{formatBRL(price)}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                    {cycle === 'monthly' ? 'por mês' : `por ${months} meses`} {selectedCycle?.discountLabel ? `· ${selectedCycle.discountLabel}` : ''}
                  </div>
                </div>
                <div style={{ color: '#fbbf24', fontWeight: 800 }}>
                  {plan.includedTokens * months} tokens no ciclo
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.72)', display: 'grid', gap: 8 }}>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                  <li>Vídeos até {plan.maxVideoSeconds}s</li>
                </ul>
                <button
                  onClick={() => choosePlan(plan.id)}
                  disabled={loadingPlan === plan.id}
                  style={{
                    height: 44,
                    borderRadius: 8,
                    border: 'none',
                    background: plan.id === 'pro' ? 'linear-gradient(90deg, #b855ff, #ff9244)' : '#fff',
                    color: plan.id === 'pro' ? '#fff' : '#111',
                    fontWeight: 900,
                  }}
                >
                  {loadingPlan === plan.id ? 'Abrindo...' : 'Escolher plano'}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
