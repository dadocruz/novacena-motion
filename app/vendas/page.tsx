'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BILLING_CYCLES, planPrice, SAAS_PLANS, type BillingCycle } from '../../lib/saasPlans';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/* ------------------------------------------------------------------ */
/*  Replace icons                                                      */
/* ------------------------------------------------------------------ */

const replaceList = [
  { old: 'After Effects', color: '#9b5de5' },
  { old: 'Premiere Pro', color: '#9b5de5' },
  { old: 'Final Cut', color: '#3a86ff' },
  { old: 'CapCut', color: '#111' },
];

const platformLogos = [
  { name: 'Spotify', src: '/logos/spotify/logo-color.png' },
  { name: 'Apple Music', src: '/logos/apple-music/logo-color.png' },
  { name: 'YouTube Music', src: '/logos/youtube-music/logo-color.png' },
  { name: 'Deezer', src: '/logos/deezer/logo-color.png' },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SalesPage() {
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const selectedCycle = useMemo(
    () => BILLING_CYCLES.find((item) => item.id === cycle) ?? BILLING_CYCLES[0],
    [cycle],
  );
  const months = cycle === 'monthly' ? 1 : cycle === 'annual' ? 12 : 36;

  return (
    <main style={page}>
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav style={nav}>
        <a href="/vendas" style={brand}>
          <span style={brandDot} />
          NovaCena
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="#planos" style={navLink}>Planos</a>
          <a href="/login" style={navLink}>Entrar</a>
          <a href="/login?mode=signup&next=/" style={navCta}>Testar gratis</a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={hero}>
        <div style={heroInner}>
          <div style={heroBadge}>Motion studio para lancamentos musicais</div>
          <h1 style={heroTitle}>
            Crie videos profissionais<br />de divulgacao musical.<br />
            <span style={heroTitleGradient}>Sem instalar nada.</span>
          </h1>
          <p style={heroSub}>
            Templates prontos, edicao visual no navegador e exportacao na nuvem.
            Substitua After Effects, Premiere, CapCut e Final Cut por uma
            ferramenta feita para quem lanca musica.
          </p>
          <div style={heroActions}>
            <a href="/login?mode=signup&next=/" style={ctaPrimary}>
              Comece agora — 1 render gratis
            </a>
            <a href="#planos" style={ctaSecondary}>Ver planos</a>
          </div>
        </div>

        {/* Phone mockup */}
        <div style={heroVisual}>
          <div style={phoneShadow}>
            <div style={phoneOuter}>
              <div style={phoneScreen}>
                <div style={phoneContent}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)' }}>
                    disponivel agora
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                    Novo Single
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    ouca em todas as plataformas
                  </div>
                  <div style={phoneLogos}>
                    {platformLogos.map((p) => (
                      <img key={p.name} src={p.src} alt={p.name} style={{ height: 18, objectFit: 'contain', filter: 'brightness(10)' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Replace band ─────────────────────────────────────── */}
      <section style={replaceBand}>
        <p style={replaceLabel}>Substitua</p>
        <div style={replaceGrid}>
          {replaceList.map((item) => (
            <div key={item.old} style={replaceChip}>
              <span style={{ ...replaceStrike }}>{item.old}</span>
            </div>
          ))}
        </div>
        <p style={replaceArrow}>por uma unica ferramenta</p>
      </section>

      {/* ── Social proof bar ─────────────────────────────────── */}
      <section style={proofBar}>
        <div style={proofItem}>
          <strong style={proofNumber}>100%</strong>
          <span style={proofText}>online, sem download</span>
        </div>
        <div style={proofDivider} />
        <div style={proofItem}>
          <strong style={proofNumber}>Story + Feed</strong>
          <span style={proofText}>formatos prontos</span>
        </div>
        <div style={proofDivider} />
        <div style={proofItem}>
          <strong style={proofNumber}>1 render</strong>
          <span style={proofText}>gratis pra testar</span>
        </div>
        <div style={proofDivider} />
        <div style={proofItem}>
          <strong style={proofNumber}>Nuvem</strong>
          <span style={proofText}>exportacao AWS Lambda</span>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section style={howSection}>
        <div style={sectionEyebrow}>Como funciona</div>
        <h2 style={sectionTitle}>Tres passos. Zero complexidade.</h2>
        <div style={stepsGrid}>
          {[
            {
              n: '01',
              title: 'Escolha o template',
              desc: 'Modelos prontos para single, pre-save, marco de streams, Spotify e YouTube. Selecione o formato story ou feed.',
            },
            {
              n: '02',
              title: 'Personalize tudo',
              desc: 'Troque capa, texto, video de fundo, logos, overlays, cor e movimento. Tudo visual, direto no navegador.',
            },
            {
              n: '03',
              title: 'Exporte na nuvem',
              desc: 'Clique em exportar. A renderizacao acontece na nuvem — seu computador nao trava. Baixe o video pronto.',
            },
          ].map((step) => (
            <article key={step.n} style={stepCard}>
              <div style={stepNumber}>{step.n}</div>
              <h3 style={stepTitle}>{step.title}</h3>
              <p style={stepDesc}>{step.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section style={featuresSection}>
        <div style={sectionEyebrow}>Recursos</div>
        <h2 style={sectionTitle}>Tudo que voce precisa para lancar.</h2>
        <div style={featuresGrid}>
          {[
            { icon: '\u{1F3AC}', title: 'Templates de campanha', desc: 'Disponivel Agora, Assista no YouTube, Marco de Streams, Spotify Print e mais.' },
            { icon: '\u{1F3A8}', title: 'Editor visual completo', desc: 'Ajuste capas, textos, video de fundo, overlays, opacidade, blur e saturacao.' },
            { icon: '\u{2601}\u{FE0F}', title: 'Exportacao na nuvem', desc: 'AWS Lambda renderiza seu video. Sem travar o computador, sem software pesado.' },
            { icon: '\u{1F4F1}', title: 'Story + Feed', desc: 'Cada template gera automaticamente versao vertical (story) e quadrada (feed).' },
            { icon: '\u{1F3B5}', title: 'Feito pra musica', desc: 'Logos de plataformas, layouts de lancamento, motion focado em single e album.' },
            { icon: '\u{26A1}', title: 'Rapido de verdade', desc: 'Do zero ao video pronto em minutos. Sem curva de aprendizado, sem tutoriais.' },
          ].map((f) => (
            <article key={f.title} style={featureCard}>
              <div style={featureIcon}>{f.icon}</div>
              <h3 style={featureTitle}>{f.title}</h3>
              <p style={featureDesc}>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Platforms ─────────────────────────────────────────── */}
      <section style={platformSection}>
        <p style={platformLabel}>Templates com logos oficiais das plataformas</p>
        <div style={platformRow}>
          {platformLogos.map((p) => (
            <img key={p.name} src={p.src} alt={p.name} style={{ height: 32, objectFit: 'contain' }} />
          ))}
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section style={ctaBand}>
        <h2 style={ctaBandTitle}>Pronto pra lancar sua proxima musica?</h2>
        <p style={ctaBandSub}>
          Crie sua conta, teste com um render gratuito e veja como e simples.
        </p>
        <a href="/login?mode=signup&next=/" style={ctaBandButton}>Comecar agora</a>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="planos" style={pricingSection}>
        <div style={pricingHeader}>
          <div>
            <div style={sectionEyebrow}>Planos</div>
            <h2 style={sectionTitle}>Escolha o melhor pra voce</h2>
          </div>
          <div style={cycleSwitch}>
            {BILLING_CYCLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCycle(item.id)}
                style={cycle === item.id ? cycleBtnActive : cycleBtn}
              >
                {item.label}
                {item.discountLabel && <span style={cycleDiscount}>{item.discountLabel}</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={plansGrid}>
          {SAAS_PLANS.map((plan) => {
            const price = planPrice(plan, cycle);
            const isFeatured = plan.id === 'pro';
            const signupUrl = `/login?mode=signup&next=${encodeURIComponent('/billing')}`;

            return (
              <article key={plan.id} style={isFeatured ? planFeatured : planCard}>
                {isFeatured && <div style={planBadge}>Mais popular</div>}
                <div>
                  <h3 style={planName}>{plan.name}</h3>
                  <p style={planDesc}>{plan.description}</p>
                </div>
                <div>
                  <div style={planPriceStyle}>{formatBRL(price)}</div>
                  <div style={planPriceSub}>
                    {cycle === 'monthly' ? '/mes' : `por ${months} meses`}
                    {selectedCycle.discountLabel ? ` · ${selectedCycle.discountLabel}` : ''}
                  </div>
                </div>
                <div style={planTokens}>{plan.includedTokens * months} renders no ciclo</div>
                <ul style={planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} style={planFeatureItem}>
                      <span style={checkIcon}>&#10003;</span> {f}
                    </li>
                  ))}
                  <li style={planFeatureItem}>
                    <span style={checkIcon}>&#10003;</span> Videos ate {plan.maxVideoSeconds}s
                  </li>
                </ul>
                <a href={signupUrl} style={isFeatured ? planBtnFeatured : planBtn}>
                  Comecar com {plan.name}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={footer}>
        <div style={footerInner}>
          <div>
            <span style={footerBrand}>NovaCena</span>
            <span style={footerSub}>Motion Studio</span>
          </div>
          <div style={footerLinks}>
            <a href="/login" style={footerLink}>Entrar</a>
            <a href="#planos" style={footerLink}>Planos</a>
            <a href="/login?mode=signup&next=/" style={footerLink}>Criar conta</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const page: CSSProperties = {
  minHeight: '100dvh',
  background: '#ffffff',
  color: '#111',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'auto',
};

/* ── Nav ─────────────────────────────────────────────────────── */

const nav: CSSProperties = {
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
};

const brand: CSSProperties = {
  color: '#111',
  textDecoration: 'none',
  fontWeight: 800,
  fontSize: 17,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const brandDot: CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #7c3aed, #f97316)',
};

const navLink: CSSProperties = {
  color: '#555',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
  padding: '8px 12px',
};

const navCta: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  background: '#111',
  borderRadius: 8,
  padding: '9px 16px',
  fontWeight: 700,
  fontSize: 14,
};

/* ── Hero ────────────────────────────────────────────────────── */

const hero: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
  gap: 48,
  alignItems: 'center',
  padding: '60px 0 40px',
};

const heroInner: CSSProperties = {
  display: 'grid',
  gap: 24,
};

const heroBadge: CSSProperties = {
  display: 'inline-flex',
  alignSelf: 'start',
  padding: '6px 14px',
  borderRadius: 999,
  background: '#f3f0ff',
  color: '#7c3aed',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.02em',
};

const heroTitle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(36px, 5.5vw, 60px)',
  lineHeight: 1.05,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: '#111',
};

const heroTitleGradient: CSSProperties = {
  background: 'linear-gradient(90deg, #7c3aed, #f97316)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const heroSub: CSSProperties = {
  margin: 0,
  color: '#666',
  fontSize: 18,
  lineHeight: 1.6,
  maxWidth: 540,
};

const heroActions: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
};

const ctaPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 48,
  padding: '0 24px',
  borderRadius: 10,
  background: '#111',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
};

const ctaSecondary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 48,
  padding: '0 24px',
  borderRadius: 10,
  border: '1px solid #ddd',
  background: '#fff',
  color: '#111',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
};

/* ── Phone mockup ────────────────────────────────────────────── */

const heroVisual: CSSProperties = {
  display: 'grid',
  justifyItems: 'center',
};

const phoneShadow: CSSProperties = {
  filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.12))',
};

const phoneOuter: CSSProperties = {
  width: 'clamp(220px, 24vw, 300px)',
  aspectRatio: '9 / 16',
  borderRadius: 32,
  padding: 8,
  background: '#1a1a1a',
};

const phoneScreen: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 26,
  overflow: 'hidden',
  background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
};

const phoneContent: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: 20,
  textAlign: 'center',
};

const phoneLogos: CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 8,
  alignItems: 'center',
};

/* ── Replace band ────────────────────────────────────────────── */

const replaceBand: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  padding: '48px 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
};

const replaceLabel: CSSProperties = {
  margin: 0,
  color: '#999',
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const replaceGrid: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const replaceChip: CSSProperties = {
  padding: '10px 20px',
  borderRadius: 999,
  background: '#f5f5f5',
  border: '1px solid #eee',
};

const replaceStrike: CSSProperties = {
  textDecoration: 'line-through',
  color: '#bbb',
  fontWeight: 600,
  fontSize: 15,
};

const replaceArrow: CSSProperties = {
  margin: 0,
  color: '#111',
  fontSize: 16,
  fontWeight: 700,
};

/* ── Proof bar ───────────────────────────────────────────────── */

const proofBar: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 32,
  flexWrap: 'wrap',
  padding: '40px 0',
  borderTop: '1px solid #f0f0f0',
  borderBottom: '1px solid #f0f0f0',
};

const proofItem: CSSProperties = {
  display: 'grid',
  gap: 4,
  textAlign: 'center',
};

const proofNumber: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: '#111',
};

const proofText: CSSProperties = {
  fontSize: 13,
  color: '#888',
};

const proofDivider: CSSProperties = {
  width: 1,
  height: 36,
  background: '#eee',
};

/* ── How it works ────────────────────────────────────────────── */

const howSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  padding: '80px 0 48px',
  display: 'grid',
  gap: 40,
};

const sectionEyebrow: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#7c3aed',
};

const sectionTitle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 'clamp(28px, 4vw, 42px)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
};

const stepsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 20,
};

const stepCard: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: 28,
  borderRadius: 16,
  background: '#fafafa',
  border: '1px solid #f0f0f0',
};

const stepNumber: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: '#111',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontSize: 14,
  fontWeight: 800,
};

const stepTitle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
};

const stepDesc: CSSProperties = {
  margin: 0,
  color: '#666',
  lineHeight: 1.55,
  fontSize: 15,
};

/* ── Features ────────────────────────────────────────────────── */

const featuresSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  padding: '48px 0 80px',
  display: 'grid',
  gap: 40,
};

const featuresGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 16,
};

const featureCard: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: 24,
  borderRadius: 14,
  border: '1px solid #f0f0f0',
  background: '#fff',
  transition: 'box-shadow 0.2s',
};

const featureIcon: CSSProperties = {
  fontSize: 28,
};

const featureTitle: CSSProperties = {
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
};

const featureDesc: CSSProperties = {
  margin: 0,
  color: '#666',
  fontSize: 14,
  lineHeight: 1.55,
};

/* ── Platform logos ──────────────────────────────────────────── */

const platformSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  padding: '40px 0',
  display: 'grid',
  gap: 20,
  justifyItems: 'center',
  borderTop: '1px solid #f0f0f0',
};

const platformLabel: CSSProperties = {
  margin: 0,
  color: '#999',
  fontSize: 13,
  fontWeight: 600,
};

const platformRow: CSSProperties = {
  display: 'flex',
  gap: 32,
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'center',
};

/* ── CTA band ────────────────────────────────────────────────── */

const ctaBand: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  padding: '64px 40px',
  borderRadius: 20,
  background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
  color: '#fff',
  textAlign: 'center',
  display: 'grid',
  gap: 16,
  justifyItems: 'center',
};

const ctaBandTitle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(24px, 4vw, 36px)',
  fontWeight: 800,
  letterSpacing: '-0.01em',
};

const ctaBandSub: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.65)',
  fontSize: 16,
  maxWidth: 480,
};

const ctaBandButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 48,
  padding: '0 28px',
  borderRadius: 10,
  background: '#fff',
  color: '#111',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
};

/* ── Pricing ─────────────────────────────────────────────────── */

const pricingSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  padding: '80px 0',
  display: 'grid',
  gap: 32,
};

const pricingHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'end',
  gap: 20,
  flexWrap: 'wrap',
};

const cycleSwitch: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: 4,
  borderRadius: 12,
  background: '#f5f5f5',
};

const cycleBtn: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  background: 'transparent',
  color: '#888',
  padding: '10px 16px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  display: 'grid',
  gap: 2,
};

const cycleBtnActive: CSSProperties = {
  ...cycleBtn,
  background: '#fff',
  color: '#111',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const cycleDiscount: CSSProperties = {
  fontSize: 10,
  color: '#7c3aed',
  fontWeight: 600,
};

const plansGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16,
};

const planCard: CSSProperties = {
  position: 'relative',
  display: 'grid',
  gap: 20,
  padding: 28,
  borderRadius: 16,
  border: '1px solid #eee',
  background: '#fff',
};

const planFeatured: CSSProperties = {
  ...planCard,
  border: '2px solid #7c3aed',
  boxShadow: '0 8px 30px rgba(124, 58, 237, 0.08)',
};

const planBadge: CSSProperties = {
  position: 'absolute',
  top: -12,
  left: 24,
  padding: '4px 12px',
  borderRadius: 999,
  background: '#7c3aed',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
};

const planName: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
};

const planDesc: CSSProperties = {
  margin: '4px 0 0',
  color: '#888',
  fontSize: 14,
  lineHeight: 1.45,
};

const planPriceStyle: CSSProperties = {
  fontSize: 36,
  fontWeight: 900,
  color: '#111',
  letterSpacing: '-0.02em',
};

const planPriceSub: CSSProperties = {
  color: '#999',
  fontSize: 13,
  marginTop: 2,
};

const planTokens: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  background: '#f8f5ff',
  color: '#7c3aed',
  fontWeight: 700,
  fontSize: 14,
  justifySelf: 'start',
};

const planFeatures: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  gap: 10,
};

const planFeatureItem: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  color: '#555',
  fontSize: 14,
  lineHeight: 1.4,
};

const checkIcon: CSSProperties = {
  color: '#7c3aed',
  fontWeight: 700,
  fontSize: 14,
  flexShrink: 0,
};

const planBtn: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: 46,
  borderRadius: 10,
  background: '#f5f5f5',
  color: '#111',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
  border: '1px solid #eee',
};

const planBtnFeatured: CSSProperties = {
  ...planBtn,
  background: '#111',
  color: '#fff',
  border: '1px solid #111',
};

/* ── Footer ──────────────────────────────────────────────────── */

const footer: CSSProperties = {
  borderTop: '1px solid #f0f0f0',
  padding: '32px 0 48px',
};

const footerInner: CSSProperties = {
  width: 'min(1200px, calc(100% - 40px))',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 16,
};

const footerBrand: CSSProperties = {
  fontWeight: 800,
  fontSize: 15,
  color: '#111',
};

const footerSub: CSSProperties = {
  color: '#999',
  fontSize: 13,
  marginLeft: 8,
};

const footerLinks: CSSProperties = {
  display: 'flex',
  gap: 20,
};

const footerLink: CSSProperties = {
  color: '#888',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
};
