'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
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

type PixPayment = {
  type: 'pix';
  key: string;
  name: string;
  whatsapp?: string;
  amountBRL: number;
  planName: string;
  cycle: BillingCycle;
  renders: number;
  reference: string;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const MONO = '"SF Mono", "Fira Code", Menlo, monospace';
const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const ACCENT = '#7B93FF';

export default function BillingPage() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [user, setUser] = useState<BillingUser | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [message, setMessage] = useState('');
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutSucceeded, setCheckoutSucceeded] = useState(false);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') !== 'success') return;

    setCheckoutSucceeded(true);
    const redirect = window.setTimeout(() => {
      window.location.href = '/studio?checkout=success';
    }, 1200);

    return () => window.clearTimeout(redirect);
  }, []);

  const selectedCycle = useMemo(
    () => cycles.find((item) => item.id === cycle),
    [cycles, cycle]
  );

  async function choosePlan(planId: string) {
    setLoadingPlan(planId);
    setMessage('');
    setPixPayment(null);
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
      if (data.payment?.type === 'pix') {
        setPixPayment(data.payment);
        setMessage('');
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

  const months = selectedCycle?.multiplier ?? (cycle === 'annual' ? 12 : cycle === 'quarterly' ? 3 : 1);

  if (checkoutSucceeded) {
    return (
      <main style={page}>
        <nav style={nav}>
          <a href="/motion" style={navLogo}>NovaCena</a>
          <div style={navRight}>
            <a href="/studio" style={navBtn}>Abrir Studio ↗</a>
          </div>
        </nav>

        <section style={successShell}>
          <div style={successTag}>{'// COMPRA CONFIRMADA'}</div>
          <h1 style={successTitle}>Seus renders foram adicionados.</h1>
          <p style={successText}>
            Estamos abrindo o Motion Studio. O painel de monitoramento tambem ja fica disponivel na sua conta.
          </p>
          <div style={successActions}>
            <a href="/studio?checkout=success" style={successPrimary}>Abrir Studio</a>
            <a href="/monitor" style={successSecondary}>Abrir Monitor</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={page}>
      {/* ── Nav ── */}
      <nav style={nav}>
        <a href="/motion" style={navLogo}>NovaCena</a>
        <div style={navRight}>
          <a href="/login" style={navLink}>Entrar</a>
          <a href="/studio" style={navBtn}>Abrir Studio ↗</a>
        </div>
      </nav>

      <div style={shell}>
        {/* ── Header ── */}
        <header style={header}>
          <div style={tag}>{'// PLANOS'}</div>
          <h1 style={h1}>
            Escolha seu plano.{' '}
            <em style={emCyan}>Comece agora</em>.
          </h1>
          <p style={sub}>Todos os recursos em todos os planos. Escolha o volume de renders.</p>
        </header>

        {/* ── User info ── */}
        {user && (
          <section style={userBar}>
            <div style={userInfo}>
              <div style={userAvatar}>{user.name.slice(0, 1).toUpperCase()}</div>
              <div>
                <div style={userNameStyle}>{user.name}</div>
                <div style={userMeta}>{user.email}</div>
              </div>
            </div>
            <div style={balanceBox}>
              <span style={balanceLabel}>Saldo atual</span>
              <strong style={balanceValue}>{user.tokens}</strong>
              <span style={balanceUnit}>{user.tokens === 1 ? 'render' : 'renders'}</span>
            </div>
          </section>
        )}

        {/* ── Cycle toggle ── */}
        <div style={cycleRow}>
          {cycles.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCycle(item.id)}
              style={cycle === item.id ? cycleBtnActive : cycleBtn}
            >
              {item.label}
              {item.discountLabel ? <span style={cycleSave}>{item.discountLabel}</span> : null}
            </button>
          ))}
        </div>

        {/* ── Message ── */}
        {message && <div style={noticeError}>{message}</div>}

        {/* ── Pix ── */}
        {pixPayment && (
          <section style={pixCard}>
            <div>
              <div style={pixTag}>PAGAMENTO PIX</div>
              <h2 style={pixTitle}>Pague {formatBRL(pixPayment.amountBRL)} para liberar {pixPayment.renders} renders</h2>
              <p style={pixDesc}>
                Plano {pixPayment.planName}. Depois do pagamento, envie o comprovante com o email da conta para liberarmos os renders.
              </p>
            </div>
            <div style={pixKeySection}>
              <span style={pixKeyLabel}>Chave Pix</span>
              <div style={pixKeyRow}>
                <code style={pixKeyCode}>{pixPayment.key}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(pixPayment.key)}
                  style={pixCopyBtn}
                >
                  Copiar
                </button>
              </div>
              <div style={pixMeta}>Favorecido: {pixPayment.name} · Ref: {pixPayment.reference}</div>
              {pixPayment.whatsapp && (
                <a
                  href={`https://wa.me/${pixPayment.whatsapp.replace(/\D/g, '')}`}
                  style={pixWhatsapp}
                >
                  Enviar comprovante no WhatsApp ↗
                </a>
              )}
            </div>
          </section>
        )}

        {/* ── Plans ── */}
        <section style={plansGrid}>
          {plans.map((plan) => {
            const price = plan.monthlyPriceBRL * (selectedCycle?.multiplier ?? 1);
            const featured = plan.id === 'pro';
            return (
              <article key={plan.id} style={featured ? planFeatured : planCard}>
                {featured && <div style={planBadge}>Mais popular</div>}
                <h3 style={planTitle}>{plan.name}</h3>
                <p style={planDesc}>{plan.description}</p>
                <div>
                  <div style={planPrice}>{formatBRL(price)}</div>
                  <div style={planPer}>
                    {cycle === 'monthly' ? '/mês' : `por ${months} meses`}
                    {selectedCycle?.discountLabel ? ` · ${selectedCycle.discountLabel}` : ''}
                  </div>
                </div>
                <div style={planTokenBadge}>{plan.includedTokens * months} renders no ciclo</div>
                <ul style={planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} style={planFeatureItem}>
                      <span style={checkIcon}>{'✓'}</span> {f}
                    </li>
                  ))}
                  <li style={planFeatureItem}>
                    <span style={checkIcon}>{'✓'}</span> Vídeos até {plan.maxVideoSeconds}s
                  </li>
                </ul>
                <button
                  onClick={() => choosePlan(plan.id)}
                  disabled={loadingPlan === plan.id}
                  style={featured ? planBtnFeat : planBtnNorm}
                >
                  {loadingPlan === plan.id ? 'Abrindo…' : `Escolher ${plan.name}`}
                </button>
              </article>
            );
          })}
        </section>

        {/* ── Footer ── */}
        <div style={footer}>
          <a href="/motion" style={footerLink}>← Voltar ao site</a>
          <a href="/termos-de-uso" style={footerLink}>Termos de Uso</a>
          <a href="/politica-de-privacidade" style={footerLink}>Privacidade</a>
        </div>
      </div>
    </main>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const page: CSSProperties = { height: '100%', overflow: 'auto', background: '#080a0f', color: '#e8e8ec', fontFamily: SANS };

/* ── Nav ── */
const nav: CSSProperties = { position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, width: '100%', margin: '0 auto', height: 56, padding: '0 24px', background: 'rgba(8,10,15,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' };
const navLogo: CSSProperties = { color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' };
const navRight: CSSProperties = { display: 'flex', gap: 12, alignItems: 'center' };
const navLink: CSSProperties = { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, fontWeight: 600 };
const navBtn: CSSProperties = { color: '#000', textDecoration: 'none', background: '#fff', borderRadius: 999, padding: '7px 18px', fontWeight: 700, fontSize: 13 };

/* ── Success ── */
const successShell: CSSProperties = { minHeight: 'calc(100vh - 56px)', maxWidth: 760, width: '100%', margin: '0 auto', padding: '72px 24px 96px', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 18, textAlign: 'center' };
const successTag: CSSProperties = { fontFamily: MONO, fontSize: 12, color: ACCENT, letterSpacing: '0.12em', fontWeight: 800 };
const successTitle: CSSProperties = { margin: 0, color: '#fff', fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 850, letterSpacing: '-0.03em' };
const successText: CSSProperties = { margin: 0, maxWidth: 560, color: 'rgba(255,255,255,0.52)', fontSize: 16, lineHeight: 1.65 };
const successActions: CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 };
const successPrimary: CSSProperties = { display: 'grid', placeItems: 'center', minHeight: 44, padding: '0 22px', borderRadius: 999, background: '#fff', color: '#000', fontWeight: 800, fontSize: 14, textDecoration: 'none' };
const successSecondary: CSSProperties = { ...successPrimary, background: 'rgba(123,147,255,0.12)', color: '#fff', border: '1px solid rgba(123,147,255,0.22)' };

/* ── Shared ── */
const tag: CSSProperties = { fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textAlign: 'center' };
const emCyan: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', color: ACCENT };

const shell: CSSProperties = { maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px 80px', display: 'grid', gap: 28 };
const header: CSSProperties = { padding: '40px 0 0', display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' };
const h1: CSSProperties = { margin: 0, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#fff' };
const sub: CSSProperties = { margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 };

/* ── User bar ── */
const userBar: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: '18px 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const userInfo: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const userAvatar: CSSProperties = { width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(123,147,255,0.12)', color: ACCENT, fontWeight: 700, fontSize: 15, flexShrink: 0 };
const userNameStyle: CSSProperties = { fontSize: 15, fontWeight: 700, color: '#fff' };
const userMeta: CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 };
const balanceBox: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: 'rgba(123,147,255,0.06)', border: '1px solid rgba(123,147,255,0.12)' };
const balanceLabel: CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: MONO };
const balanceValue: CSSProperties = { fontSize: 22, fontWeight: 800, color: ACCENT, letterSpacing: '-0.02em' };
const balanceUnit: CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.3)' };

/* ── Cycle ── */
const cycleRow: CSSProperties = { display: 'inline-flex', gap: 4, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', justifySelf: 'center' };
const cycleBtn: CSSProperties = { border: 'none', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.4)', padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'grid', gap: 2, fontFamily: 'inherit' };
const cycleBtnActive: CSSProperties = { ...cycleBtn, background: 'rgba(255,255,255,0.08)', color: '#fff' };
const cycleSave: CSSProperties = { fontSize: 10, color: ACCENT, fontWeight: 600 };

/* ── Notice ── */
const noticeError: CSSProperties = { padding: '12px 16px', borderRadius: 10, background: 'rgba(224,108,108,0.1)', border: '1px solid rgba(224,108,108,0.2)', color: '#e06c6c', fontSize: 14 };

/* ── Pix ── */
const pixCard: CSSProperties = { display: 'grid', gap: 18, padding: '24px 28px', borderRadius: 16, border: `1px solid rgba(123,147,255,0.25)`, background: 'rgba(123,147,255,0.04)' };
const pixTag: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.08em' };
const pixTitle: CSSProperties = { margin: '8px 0 0', fontSize: 22, fontWeight: 700, color: '#fff' };
const pixDesc: CSSProperties = { margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 };
const pixKeySection: CSSProperties = { display: 'grid', gap: 8 };
const pixKeyLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: MONO };
const pixKeyRow: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const pixKeyCode: CSSProperties = { flex: '1 1 280px', padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: MONO, fontSize: 13, wordBreak: 'break-all' };
const pixCopyBtn: CSSProperties = { border: 'none', borderRadius: 10, padding: '0 20px', height: 42, background: ACCENT, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
const pixMeta: CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,0.35)' };
const pixWhatsapp: CSSProperties = { color: ACCENT, fontWeight: 700, fontSize: 14, textDecoration: 'none' };

/* ── Plans ── */
const plansGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 };
const planCard: CSSProperties = { position: 'relative', display: 'grid', gap: 18, padding: 28, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const planFeatured: CSSProperties = { ...planCard, border: `1px solid rgba(123,147,255,0.3)`, background: 'rgba(123,147,255,0.03)', boxShadow: '0 0 80px rgba(123,147,255,0.04)' };
const planBadge: CSSProperties = { position: 'absolute', top: -11, left: 24, padding: '5px 14px', borderRadius: 999, background: ACCENT, color: '#000', fontSize: 12, fontWeight: 700 };
const planTitle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 800 };
const planDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: 14, lineHeight: 1.5, minHeight: 42 };
const planPrice: CSSProperties = { fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' };
const planPer: CSSProperties = { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 };
const planTokenBadge: CSSProperties = { padding: '7px 14px', borderRadius: 8, background: 'rgba(123,147,255,0.06)', border: '1px solid rgba(123,147,255,0.12)', color: ACCENT, fontWeight: 700, fontSize: 13, justifySelf: 'start' };
const planFeatures: CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 };
const planFeatureItem: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', color: 'rgba(255,255,255,0.48)', fontSize: 14 };
const checkIcon: CSSProperties = { color: ACCENT, fontWeight: 700, flexShrink: 0 };
const planBtnNorm: CSSProperties = { display: 'grid', placeItems: 'center', height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'inherit' };
const planBtnFeat: CSSProperties = { ...planBtnNorm, background: '#fff', color: '#000', border: '1px solid #fff' };

/* ── Footer ── */
const footer: CSSProperties = { display: 'flex', justifyContent: 'center', gap: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' };
const footerLink: CSSProperties = { color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontSize: 13 };
