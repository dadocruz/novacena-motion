'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BILLING_CYCLES, planPrice, SAAS_PLANS, type BillingCycle } from '../../lib/saasPlans';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const platformLogos = [
  { name: 'Spotify', src: '/logos/spotify/logo-color.png' },
  { name: 'Apple Music', src: '/logos/apple-music/logo-color.png' },
  { name: 'YouTube Music', src: '/logos/youtube-music/logo-color.png' },
  { name: 'Deezer', src: '/logos/deezer/logo-color.png' },
];

export default function SalesPage() {
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const selectedCycle = useMemo(
    () => BILLING_CYCLES.find((item) => item.id === cycle) ?? BILLING_CYCLES[0],
    [cycle],
  );
  const months = cycle === 'monthly' ? 1 : cycle === 'annual' ? 12 : 36;

  return (
    <main style={page}>
      {/* ── Nav ─────────────────────────────────── */}
      <nav style={nav}>
        <a href="/vendas" style={brand}>NovaCena</a>
        <div style={navRight}>
          <a href="#planos" style={navLink}>Planos</a>
          <a href="/login" style={navLink}>Entrar</a>
          <a href="/login?mode=signup&next=/" style={navCta}>Testar grátis</a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────── */}
      <section style={hero}>
        <div style={heroGlow} />
        <div style={heroContent}>
          <div style={heroPill}>
            <span style={heroPillDot} />
            Motion Studio para lançamentos musicais
          </div>
          <h1 style={heroTitle}>
            Seus vídeos de{'\n'}lançamento musical.{'\n'}
            <span style={heroGradient}>Profissionais. Rápidos. Online.</span>
          </h1>
          <p style={heroSub}>
            Substitua After Effects, Premiere, CapCut e Final Cut por uma
            plataforma feita para quem lança música. Templates prontos,
            edição visual no navegador e exportação na nuvem.
          </p>
          <div style={heroActions}>
            <a href="/login?mode=signup&next=/" style={btnPrimary}>
              Comece grátis — 1 render incluso
            </a>
            <a href="#planos" style={btnGhost}>Ver planos e preços</a>
          </div>
        </div>

        {/* Product visual */}
        <div style={heroVisual}>
          <div style={browserFrame}>
            <div style={browserBar}>
              <span style={browserDot('#ff5f57')} />
              <span style={browserDot('#ffbd2e')} />
              <span style={browserDot('#28c840')} />
              <span style={browserUrl}>novacena.studio</span>
            </div>
            <div style={browserBody}>
              <div style={editorLeft}>
                <div style={editorTimeline}>
                  <div style={timelineTrack('#7c3aed', '70%')} />
                  <div style={timelineTrack('#f97316', '45%')} />
                  <div style={timelineTrack('#3b82f6', '85%')} />
                </div>
              </div>
              <div style={editorRight}>
                <div style={phonePreview}>
                  <div style={phoneInner}>
                    <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.6)' }}>
                      disponível agora
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Novo Single</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>ouça em todas as plataformas</div>
                    <div style={miniLogos}>
                      {platformLogos.map((p) => (
                        <img key={p.name} src={p.src} alt={p.name} style={{ height: 10, objectFit: 'contain', filter: 'brightness(10)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos das plataformas ─────────────────── */}
      <section style={logosSection}>
        <p style={logosLabel}>Templates com logos oficiais</p>
        <div style={logosRow}>
          {platformLogos.map((p) => (
            <img key={p.name} src={p.src} alt={p.name} style={{ height: 28, objectFit: 'contain', opacity: 0.5 }} />
          ))}
        </div>
      </section>

      {/* ── Substitua ────────────────────────────── */}
      <section style={replaceSection}>
        <h2 style={replaceTitleStyle}>
          Chega de softwares pesados.<br />
          <span style={heroGradient}>Uma ferramenta resolve.</span>
        </h2>
        <div style={replaceGrid}>
          {['After Effects', 'Premiere Pro', 'Final Cut Pro', 'CapCut'].map((name) => (
            <div key={name} style={replaceCard}>
              <span style={replaceStrike}>{name}</span>
            </div>
          ))}
          <div style={replaceCardHighlight}>
            <span style={replaceHighlightText}>NovaCena</span>
          </div>
        </div>
      </section>

      {/* ── Como funciona ────────────────────────── */}
      <section style={stepsSection}>
        <div style={stepsHeader}>
          <h2 style={sectionTitle}>Como funciona</h2>
          <p style={sectionSub}>Do zero ao vídeo pronto em 3 passos.</p>
        </div>
        <div style={stepsGrid}>
          {[
            {
              n: '01',
              title: 'Escolha o template',
              desc: 'Modelos prontos para single, pré-save, marco de streams, Spotify e YouTube. Story ou feed.',
            },
            {
              n: '02',
              title: 'Personalize no navegador',
              desc: 'Capa, texto, vídeo de fundo, logos, overlays, cor, opacidade e blur. Tudo visual.',
            },
            {
              n: '03',
              title: 'Exporte na nuvem',
              desc: 'Renderização em servidores AWS. Seu computador não trava. Baixe o vídeo MP4 pronto.',
            },
          ].map((step) => (
            <article key={step.n} style={stepCard}>
              <div style={stepBadge}>{step.n}</div>
              <h3 style={stepTitle}>{step.title}</h3>
              <p style={stepDesc}>{step.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Features grid ────────────────────────── */}
      <section style={featSection}>
        <h2 style={{...sectionTitle, textAlign: 'center' as const}}>Tudo que você precisa para lançar</h2>
        <div style={featGrid}>
          {[
            { icon: '\u{1F3AC}', t: 'Templates de campanha', d: 'Disponível Agora, Assista no YouTube, Marco de Streams, Spotify Print e mais.' },
            { icon: '\u{2601}\u{FE0F}', t: 'Exportação na nuvem', d: 'AWS Lambda renderiza seu vídeo. Sem instalar nada, sem travar o computador.' },
            { icon: '\u{1F4F1}', t: 'Story + Feed', d: 'Cada template gera versão vertical (story 9:16) e quadrada (feed 1:1) automaticamente.' },
            { icon: '\u{1F3A8}', t: 'Editor visual completo', d: 'Ajuste capas, textos, vídeo de fundo, overlays, opacidade, blur e saturação.' },
            { icon: '\u{1F3B5}', t: 'Feito para música', d: 'Logos de plataformas, layouts de lançamento, motion focado em single e álbum.' },
            { icon: '\u{26A1}', t: 'Rápido de verdade', d: 'Do zero ao vídeo pronto em minutos. Sem curva de aprendizado, sem tutoriais.' },
          ].map((f) => (
            <div key={f.t} style={featCard}>
              <div style={{ fontSize: 32 }}>{f.icon}</div>
              <h3 style={featTitle}>{f.t}</h3>
              <p style={featDesc}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Band ─────────────────────────────── */}
      <section style={ctaBand}>
        <div style={ctaGlow} />
        <h2 style={ctaTitle}>Pronto para lançar sua próxima música?</h2>
        <p style={ctaSub}>Crie sua conta agora e teste com 1 render gratuito.</p>
        <a href="/login?mode=signup&next=/" style={ctaBtn}>Começar agora</a>
      </section>

      {/* ── Pricing ──────────────────────────────── */}
      <section id="planos" style={pricingSection}>
        <div style={pricingTop}>
          <h2 style={sectionTitle}>Planos e preços</h2>
          <p style={sectionSub}>Escolha o que faz sentido para o seu volume de lançamentos.</p>
          <div style={cycleSwitch}>
            {BILLING_CYCLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCycle(item.id)}
                style={cycle === item.id ? cycleBtnActive : cycleBtn}
              >
                {item.label}
                {item.discountLabel ? <span style={cycleDiscount}>{item.discountLabel}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div style={plansGrid}>
          {SAAS_PLANS.map((plan) => {
            const price = planPrice(plan, cycle);
            const featured = plan.id === 'pro';
            const url = `/login?mode=signup&next=${encodeURIComponent('/billing')}`;

            return (
              <article key={plan.id} style={featured ? planFeatured : planCard}>
                {featured && <div style={planBadge}>Mais popular</div>}
                <h3 style={planName}>{plan.name}</h3>
                <p style={planDescStyle}>{plan.description}</p>
                <div style={planPriceBlock}>
                  <span style={planPriceValue}>{formatBRL(price)}</span>
                  <span style={planPricePeriod}>
                    {cycle === 'monthly' ? '/mês' : `por ${months} meses`}
                    {selectedCycle.discountLabel ? ` · ${selectedCycle.discountLabel}` : ''}
                  </span>
                </div>
                <div style={planTokenBadge}>{plan.includedTokens * months} renders no ciclo</div>
                <ul style={planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} style={planFeatItem}><span style={check}>{'✓'}</span>{f}</li>
                  ))}
                  <li style={planFeatItem}><span style={check}>{'✓'}</span>Vídeos até {plan.maxVideoSeconds}s</li>
                </ul>
                <a href={url} style={featured ? planBtnPrimary : planBtnDefault}>
                  Começar com {plan.name}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer style={footer}>
        <span style={footerBrand}>NovaCena <span style={footerSub}>Motion Studio</span></span>
        <div style={footerLinks}>
          <a href="/login" style={footerLink}>Entrar</a>
          <a href="#planos" style={footerLink}>Planos</a>
          <a href="/login?mode=signup&next=/" style={footerLink}>Criar conta</a>
        </div>
      </footer>
    </main>
  );
}

/* ================================================================ */
/*  Helper                                                           */
/* ================================================================ */

function browserDot(color: string): CSSProperties {
  return { width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' };
}

function timelineTrack(color: string, width: string): CSSProperties {
  return { height: 8, borderRadius: 4, background: color, width, opacity: 0.7 };
}

/* ================================================================ */
/*  Styles                                                           */
/* ================================================================ */

const page: CSSProperties = {
  minHeight: '100dvh',
  background: '#000',
  color: '#fff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'auto',
};

/* ── Nav ─────────────────────────────────────────────── */
const nav: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const brand: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: '-0.02em',
};

const navRight: CSSProperties = { display: 'flex', gap: 6, alignItems: 'center' };
const navLink: CSSProperties = { color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, fontSize: 14, padding: '8px 12px' };
const navCta: CSSProperties = {
  color: '#000',
  textDecoration: 'none',
  background: '#fff',
  borderRadius: 999,
  padding: '8px 18px',
  fontWeight: 700,
  fontSize: 14,
};

/* ── Hero ────────────────────────────────────────────── */
const hero: CSSProperties = {
  position: 'relative',
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  paddingTop: 80,
  paddingBottom: 80,
  display: 'grid',
  gap: 60,
  textAlign: 'center',
  justifyItems: 'center',
  overflow: 'hidden',
};

const heroGlow: CSSProperties = {
  position: 'absolute',
  top: -200,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 800,
  height: 800,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, rgba(249,115,22,0.08) 40%, transparent 70%)',
  pointerEvents: 'none',
};

const heroContent: CSSProperties = {
  position: 'relative',
  display: 'grid',
  gap: 24,
  justifyItems: 'center',
  maxWidth: 800,
};

const heroPill: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 18px',
  borderRadius: 999,
  background: 'rgba(124,58,237,0.15)',
  border: '1px solid rgba(124,58,237,0.25)',
  color: '#a78bfa',
  fontSize: 13,
  fontWeight: 600,
};

const heroPillDot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#a78bfa',
  boxShadow: '0 0 8px #a78bfa',
};

const heroTitle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(40px, 6.5vw, 72px)',
  fontWeight: 800,
  lineHeight: 1.05,
  letterSpacing: '-0.03em',
  whiteSpace: 'pre-line',
};

const heroGradient: CSSProperties = {
  background: 'linear-gradient(90deg, #a78bfa, #f97316)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const heroSub: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.55)',
  fontSize: 18,
  lineHeight: 1.6,
  maxWidth: 580,
};

const heroActions: CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' };

const btnPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 50,
  padding: '0 28px',
  borderRadius: 999,
  background: '#fff',
  color: '#000',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
};

const btnGhost: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 50,
  padding: '0 28px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
};

/* ── Product visual (browser mockup) ─────────────────── */
const heroVisual: CSSProperties = { width: '100%', maxWidth: 900, position: 'relative' };

const browserFrame: CSSProperties = {
  borderRadius: 14,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.1)',
  background: '#111',
  boxShadow: '0 40px 120px rgba(124,58,237,0.12), 0 0 0 1px rgba(255,255,255,0.05)',
};

const browserBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '12px 16px',
  background: '#1a1a1a',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const browserUrl: CSSProperties = {
  marginLeft: 12,
  fontSize: 12,
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'monospace',
};

const browserBody: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 200px',
  minHeight: 320,
  gap: 0,
};

const editorLeft: CSSProperties = {
  padding: 24,
  display: 'grid',
  alignContent: 'end',
  gap: 14,
  background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
};

const editorTimeline: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const editorRight: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  background: '#0d0d0d',
  borderLeft: '1px solid rgba(255,255,255,0.06)',
};

const phonePreview: CSSProperties = {
  width: 110,
  aspectRatio: '9 / 16',
  borderRadius: 14,
  padding: 4,
  background: '#222',
};

const phoneInner: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 11,
  background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: 8,
  textAlign: 'center',
};

const miniLogos: CSSProperties = { display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' };

/* ── Platform logos ──────────────────────────────────── */
const logosSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  padding: '40px 0',
  display: 'grid',
  gap: 16,
  justifyItems: 'center',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};

const logosLabel: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500 };
const logosRow: CSSProperties = { display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' };

/* ── Replace section ─────────────────────────────────── */
const replaceSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  padding: '80px 0',
  textAlign: 'center',
  display: 'grid',
  gap: 40,
  justifyItems: 'center',
};

const replaceTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(28px, 4.5vw, 48px)',
  fontWeight: 800,
  lineHeight: 1.1,
  letterSpacing: '-0.02em',
};

const replaceGrid: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
};

const replaceCard: CSSProperties = {
  padding: '14px 24px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const replaceStrike: CSSProperties = {
  textDecoration: 'line-through',
  color: 'rgba(255,255,255,0.3)',
  fontWeight: 600,
  fontSize: 16,
};

const replaceCardHighlight: CSSProperties = {
  padding: '14px 28px',
  borderRadius: 12,
  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(249,115,22,0.15))',
  border: '1px solid rgba(124,58,237,0.4)',
};

const replaceHighlightText: CSSProperties = {
  fontWeight: 800,
  fontSize: 16,
  background: 'linear-gradient(90deg, #a78bfa, #f97316)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

/* ── Steps ───────────────────────────────────────────── */
const stepsSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  padding: '80px 0',
  display: 'grid',
  gap: 48,
};

const stepsHeader: CSSProperties = { textAlign: 'center', display: 'grid', gap: 8 };

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(28px, 4vw, 44px)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
};

const sectionSub: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.5)',
  fontSize: 17,
};

const stepsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16,
};

const stepCard: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: 32,
  borderRadius: 16,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const stepBadge: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontSize: 14,
  fontWeight: 800,
};

const stepTitle: CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700 };
const stepDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontSize: 15 };

/* ── Features ────────────────────────────────────────── */
const featSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  padding: '48px 0 80px',
  display: 'grid',
  gap: 40,
};

const featGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 14,
};

const featCard: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: 28,
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const featTitle: CSSProperties = { margin: 0, fontSize: 17, fontWeight: 700 };
const featDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.55 };

/* ── CTA band ────────────────────────────────────────── */
const ctaBand: CSSProperties = {
  position: 'relative',
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  padding: '80px 40px',
  borderRadius: 24,
  background: 'linear-gradient(135deg, #0f0720 0%, #1a0a30 50%, #120818 100%)',
  border: '1px solid rgba(124,58,237,0.2)',
  textAlign: 'center',
  display: 'grid',
  gap: 16,
  justifyItems: 'center',
  overflow: 'hidden',
};

const ctaGlow: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  height: 500,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 60%)',
  pointerEvents: 'none',
};

const ctaTitle: CSSProperties = {
  position: 'relative',
  margin: 0,
  fontSize: 'clamp(26px, 4vw, 40px)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
};

const ctaSub: CSSProperties = {
  position: 'relative',
  margin: 0,
  color: 'rgba(255,255,255,0.5)',
  fontSize: 16,
  maxWidth: 400,
};

const ctaBtn: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  height: 50,
  padding: '0 32px',
  borderRadius: 999,
  background: '#fff',
  color: '#000',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
};

/* ── Pricing ─────────────────────────────────────────── */
const pricingSection: CSSProperties = {
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  padding: '80px 0',
  display: 'grid',
  gap: 40,
};

const pricingTop: CSSProperties = {
  textAlign: 'center',
  display: 'grid',
  gap: 12,
  justifyItems: 'center',
};

const cycleSwitch: CSSProperties = {
  display: 'inline-flex',
  gap: 4,
  padding: 4,
  borderRadius: 14,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const cycleBtn: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  background: 'transparent',
  color: 'rgba(255,255,255,0.5)',
  padding: '10px 18px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  display: 'grid',
  gap: 2,
};

const cycleBtnActive: CSSProperties = {
  ...cycleBtn,
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
};

const cycleDiscount: CSSProperties = { fontSize: 10, color: '#a78bfa', fontWeight: 600 };

const plansGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16,
};

const planCard: CSSProperties = {
  position: 'relative',
  display: 'grid',
  gap: 20,
  padding: 32,
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
};

const planFeatured: CSSProperties = {
  ...planCard,
  border: '1px solid rgba(124,58,237,0.5)',
  background: 'rgba(124,58,237,0.06)',
  boxShadow: '0 0 60px rgba(124,58,237,0.08)',
};

const planBadge: CSSProperties = {
  position: 'absolute',
  top: -11,
  left: 28,
  padding: '5px 14px',
  borderRadius: 999,
  background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
};

const planName: CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800 };
const planDescStyle: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.5 };

const planPriceBlock: CSSProperties = { display: 'grid', gap: 2 };
const planPriceValue: CSSProperties = { fontSize: 38, fontWeight: 900, letterSpacing: '-0.02em' };
const planPricePeriod: CSSProperties = { color: 'rgba(255,255,255,0.4)', fontSize: 13 };

const planTokenBadge: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  background: 'rgba(124,58,237,0.1)',
  border: '1px solid rgba(124,58,237,0.2)',
  color: '#a78bfa',
  fontWeight: 700,
  fontSize: 14,
  justifySelf: 'start',
};

const planFeatures: CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 };
const planFeatItem: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14 };
const check: CSSProperties = { color: '#a78bfa', fontWeight: 700, fontSize: 14, flexShrink: 0 };

const planBtnDefault: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: 48,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
  border: '1px solid rgba(255,255,255,0.1)',
};

const planBtnPrimary: CSSProperties = {
  ...planBtnDefault,
  background: '#fff',
  color: '#000',
  border: '1px solid #fff',
};

/* ── Footer ──────────────────────────────────────────── */
const footer: CSSProperties = {
  width: 'min(1200px, calc(100% - 48px))',
  margin: '0 auto',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  padding: '28px 0 40px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 16,
};

const footerBrand: CSSProperties = { fontWeight: 800, fontSize: 15 };
const footerSub: CSSProperties = { color: 'rgba(255,255,255,0.35)', fontWeight: 400 };
const footerLinks: CSSProperties = { display: 'flex', gap: 20 };
const footerLink: CSSProperties = { color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, fontWeight: 600 };
