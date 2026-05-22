'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BILLING_CYCLES, planPrice, SAAS_PLANS, type BillingCycle } from '../../lib/saasPlans';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/* ── Data ─────────────────────────────────────────────── */

const painPoints = [
  'Abrir o After Effects, importar assets, animar quadro a quadro, exportar, converter…',
  'Pagar R$200, R$500 por vídeo pra um freelancer de motion.',
  'Usar CapCut genérico e entregar algo que parece amador.',
  'O lançamento é amanhã e o motion ainda não saiu.',
];

const steps = [
  {
    n: '1',
    label: 'TEMPLATE',
    title: 'Escolha o template.',
    desc: 'Disponível Agora, Assista no YouTube, Marco de Streams, Spotify Print. Story e feed prontos pra usar.',
  },
  {
    n: '2',
    label: 'EDIÇÃO',
    title: 'Personalize no navegador.',
    desc: 'Troque capa, texto, vídeo de fundo, logos, cor, opacidade e blur. Tudo visual, sem timeline.',
  },
  {
    n: '3',
    label: 'EXPORTAÇÃO',
    title: 'Exporte na nuvem.',
    desc: 'AWS Lambda renderiza o vídeo. Seu computador não trava. Baixe o MP4 pronto.',
  },
];

/* ── Page ─────────────────────────────────────────────── */

export default function SalesPage() {
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const selectedCycle = useMemo(
    () => BILLING_CYCLES.find((item) => item.id === cycle) ?? BILLING_CYCLES[0],
    [cycle],
  );
  const months = cycle === 'monthly' ? 1 : cycle === 'annual' ? 12 : 36;

  return (
    <main style={page}>
      {/* ── Nav ────────────────────────────────────── */}
      <nav style={nav}>
        <a href="/vendas" style={navLogo}>NovaCena</a>
        <div style={navPill}>
          <a href="#como" style={navItem}>Como funciona</a>
          <a href="#planos" style={navItem}>Planos</a>
          <a href="/login" style={navItem}>Entrar</a>
        </div>
        <a href="/login?mode=signup&next=/" style={navCta}>Testar grátis ↗</a>
      </nav>

      {/* ── Hero ───────────────────────────────────── */}
      <section style={hero}>
        <div style={heroText}>
          <div style={tag}>{'// MOTION PARA LANÇAMENTOS MUSICAIS'}</div>
          <h1 style={h1}>
            NovaCena cria<br />
            o motion do seu<br />
            lançamento.<br />
            Você fica com <em style={emCyan}>o crédito</em>.
          </h1>
          <p style={heroSub}>
            Templates profissionais de motion para divulgação musical.
            Troque a capa, ajuste o texto, exporte na nuvem.
            Sem After Effects. Sem Premiere. Sem freelancer.
          </p>
          <div style={heroBtns}>
            <a href="/login?mode=signup&next=/" style={btnPrimary}>Começar grátis ↗</a>
            <a href="#como" style={btnGhost}>Veja como funciona</a>
          </div>
          <p style={trustLine}>{'✓  1 render de demonstração grátis'}</p>
        </div>

        <div style={heroVisual}>
          <div style={mockup}>
            <div style={mockupBar}>
              <span style={dot} /><span style={dot} /><span style={dot} />
              <span style={mockupUrl}>novacena.com/studio</span>
            </div>
            <div style={mockupBody}>
              <div style={mockupSide}>
                {['Disponível Agora', 'YouTube', 'Milestone', 'Spotify Print'].map((t, i) => (
                  <div key={t} style={i === 0 ? mockupSideActive : mockupSideItem}>{t}</div>
                ))}
              </div>
              <div style={mockupMain}>
                <div style={mockupPreview}>
                  <div style={mockupPhone}>
                    <div style={mockupPhoneScreen}>
                      <div style={mockupCover} />
                      <div style={mockupTrackName}>Novo Single</div>
                      <div style={mockupArtist}>Seu Artista</div>
                    </div>
                  </div>
                  <span style={mockupWatchLabel}>PREVIEW AO VIVO</span>
                </div>
                <div style={mockupProps}>
                  <div style={mockupPropItem}>
                    <span style={mockupPropLabel}>Capa</span>
                    <span style={mockupPropValue}>cover.jpg</span>
                  </div>
                  <div style={mockupPropItem}>
                    <span style={mockupPropLabel}>Texto</span>
                    <span style={mockupPropValue}>DISPONÍVEL AGORA</span>
                  </div>
                  <div style={mockupPropItem}>
                    <span style={mockupPropLabel}>Duração</span>
                    <span style={mockupPropValue}>15s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform logos ──────────────────────────── */}
      <section style={logosSection}>
        <p style={logosLabel}>TEMPLATES COM LOGOS DAS PLATAFORMAS</p>
        <div style={logosRow}>
          {[
            { name: 'Spotify', src: '/logos/spotify/logo-color.png' },
            { name: 'Apple Music', src: '/logos/apple-music/logo-color.png' },
            { name: 'YouTube Music', src: '/logos/youtube-music/logo-color.png' },
            { name: 'Deezer', src: '/logos/deezer/logo-color.png' },
          ].map((p) => (
            <img key={p.name} src={p.src} alt={p.name} style={logoImg} />
          ))}
        </div>
      </section>

      {/* ── Reality Check ──────────────────────────── */}
      <section style={sect}>
        <div style={tag}>{'// O PROBLEMA'}</div>
        <h2 style={h2}>
          Criar motion de lançamento{' '}
          <em style={emWhite}>na mão</em> é{' '}
          <em style={emRed}>brutal</em>.
        </h2>
        <p style={subMuted}>Você sabe. A gente sabe.</p>
        <div style={painList}>
          {painPoints.map((p, i) => (
            <div key={i} style={painItem}>
              <p style={painText}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────── */}
      <section id="como" style={sect}>
        <div style={tag}>{'// COMO FUNCIONA'}</div>
        <h2 style={h2}>
          Três passos.{' '}
          <em style={emCyan}>Zero complexidade</em>.
        </h2>
        <p style={subMuted}>Cada etapa é automática do seu lado. Revise e exporte quando quiser.</p>
        <div style={stepsGrid}>
          {steps.map((s) => (
            <div key={s.n} style={stepCard}>
              <div style={stepVisual} />
              <div style={stepMeta}>
                <span style={stepN}>{s.n}</span>
                <span style={stepLabel}>{s.label}</span>
              </div>
              <h3 style={stepTitle}>{s.title}</h3>
              <p style={stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who it's for ───────────────────────────── */}
      <section style={sect}>
        <div style={tag}>{'// PRA QUEM É'}</div>
        <h2 style={h2}>
          Produtores. E{' '}
          <em style={emCyan}>artistas também</em>.
        </h2>
        <div style={forGrid}>
          <div style={forCol}>
            <div style={forRule} />
            <div style={forLabel}>PRODUTORES</div>
            <p style={forText}>
              Você lança 10, 20, 40 artistas por mês. Precisa de escala,
              velocidade e qualidade visual pra cada campanha.
              NovaCena é a sua linha de produção de motion.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>
                &ldquo;Em 5 minutos eu tinha o motion pronto.
                Antes eu gastava 2 horas no After Effects pra cada lançamento.&rdquo;
              </p>
              <strong style={quoteName}>Lucas Martins</strong>
              <span style={quoteRole}>Produtor musical</span>
            </div>
          </div>
          <div style={forCol}>
            <div style={forRule} />
            <div style={forLabel}>ARTISTAS</div>
            <p style={forText}>
              Você faz música. Agora pode criar seu próprio motion de lançamento
              sem contratar ninguém. Troque a capa, ajuste o texto, exporte.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>
                &ldquo;Não sei usar Premiere, não sei usar After Effects.
                Aqui eu só troquei a capa e o texto. Ficou profissional.&rdquo;
              </p>
              <strong style={quoteName}>Pedro Gustavo</strong>
              <span style={quoteRole}>Artista independente</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social media ───────────────────────────── */}
      <section style={sect}>
        <div style={tag}>{'// SOCIAL MEDIA'}</div>
        <h2 style={h2}>
          O lançamento é amanhã.{' '}
          <em style={emCyan}>Entregue hoje</em>.
        </h2>
        <div style={smGrid}>
          <div style={smCol}>
            <div style={forRule} />
            <div style={smLabel}>SOCIAL MEDIA</div>
            <p style={forText}>
              Você cuida das redes de artistas. O prazo é curto.
              Precisa de um motion profissional agora, não em dias.
              Aqui você entrega em minutos.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>
                &ldquo;Meus artistas ficaram impressionados.
                Parece que contratamos uma agência de motion design.&rdquo;
              </p>
              <strong style={quoteName}>Camila Rocha</strong>
              <span style={quoteRole}>Social media</span>
            </div>
          </div>
          <div style={smCol}>
            <div style={forRule} />
            <div style={smLabel}>DISTRIBUIDORAS</div>
            <p style={forText}>
              Alto volume de lançamentos. Cada artista precisa de material visual.
              Com NovaCena, uma pessoa resolve o que antes precisava de uma equipe.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>
                &ldquo;A gente lança 40 singles por mês.
                Sem essa ferramenta a gente não dava conta.&rdquo;
              </p>
              <strong style={quoteName}>Rafaela Duarte</strong>
              <span style={quoteRole}>Distribuidora digital</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────── */}
      <section id="planos" style={sect}>
        <div style={tag}>{'// PLANOS'}</div>
        <h2 style={h2}>Todos os recursos. <em style={emCyan}>Preço justo</em>.</h2>
        <p style={subMuted}>Escolha o volume que faz sentido pro seu ritmo de lançamentos.</p>

        <div style={cycleRow}>
          {BILLING_CYCLES.map((item) => (
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

        <div style={plansGrid}>
          {SAAS_PLANS.map((plan) => {
            const price = planPrice(plan, cycle);
            const featured = plan.id === 'pro';
            const url = `/login?mode=signup&next=${encodeURIComponent('/billing')}`;

            return (
              <article key={plan.id} style={featured ? planFeatured : planCard}>
                {featured && <div style={planBadge}>Mais popular</div>}
                <h3 style={planName}>{plan.name}</h3>
                <p style={planDesc}>{plan.description}</p>
                <div>
                  <div style={planPriceVal}>{formatBRL(price)}</div>
                  <div style={planPricePer}>
                    {cycle === 'monthly' ? '/mês' : `por ${months} meses`}
                    {selectedCycle.discountLabel ? ` · ${selectedCycle.discountLabel}` : ''}
                  </div>
                </div>
                <div style={planTokenBadge}>
                  {plan.includedTokens * months} renders no ciclo
                </div>
                <ul style={planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} style={planFeatureItem}>
                      <span style={check}>{'✓'}</span> {f}
                    </li>
                  ))}
                  <li style={planFeatureItem}>
                    <span style={check}>{'✓'}</span> Vídeos até {plan.maxVideoSeconds}s
                  </li>
                </ul>
                <a href={url} style={featured ? planBtnFeat : planBtnNorm}>
                  Começar com {plan.name}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────── */}
      <section style={finalSect}>
        <h2 style={h2}>
          Seu próximo lançamento merece{' '}
          <em style={emCyan}>motion profissional</em>.
        </h2>
        <p style={subMuted}>Crie sua conta, teste com 1 render grátis e veja como é simples.</p>
        <a href="/login?mode=signup&next=/" style={btnPrimary}>Começar agora — é grátis ↗</a>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer style={footer}>
        <div style={footerTop}>
          <div>
            <div style={footerBrand}>NovaCena</div>
            <p style={footerTagline}>Motion studio para lançamentos musicais.</p>
          </div>
          <div style={footerLinks}>
            <a href="#como" style={footerLink}>Como funciona</a>
            <a href="#planos" style={footerLink}>Planos</a>
            <a href="/login" style={footerLink}>Entrar</a>
            <a href="/login?mode=signup&next=/" style={footerLink}>Criar conta</a>
          </div>
        </div>
        <div style={footerBottom}>
          © 2026 NovaCena. Todos os direitos reservados.
        </div>
      </footer>
    </main>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = '"SF Mono", "Fira Code", Menlo, monospace';
const W = 'min(1200px, calc(100% - 48px))';

const page: CSSProperties = {
  minHeight: '100dvh',
  background: '#080a0f',
  color: '#e8e8ec',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

/* ── Nav ── */
const nav: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: W,
  margin: '0 auto',
  height: 64,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};
const navLogo: CSSProperties = { color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' };
const navPill: CSSProperties = { display: 'flex', gap: 2, padding: '5px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
const navItem: CSSProperties = { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '7px 16px', borderRadius: 999 };
const navCta: CSSProperties = { color: '#000', textDecoration: 'none', background: '#fff', borderRadius: 999, padding: '8px 20px', fontWeight: 700, fontSize: 14 };

/* ── Shared ── */
const tag: CSSProperties = { fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em' };
const emCyan: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', color: '#5eead4' };
const emRed: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', color: '#e06c6c' };
const emWhite: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', color: '#ffffff' };
const h1: CSSProperties = { margin: 0, fontSize: 'clamp(34px, 4.8vw, 58px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.035em', color: '#fff' };
const h2: CSSProperties = { margin: 0, fontSize: 'clamp(30px, 4.2vw, 52px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#fff' };
const subMuted: CSSProperties = { margin: 0, fontSize: 17, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 };
const sect: CSSProperties = { width: W, margin: '0 auto', padding: '120px 0', display: 'grid', gap: 24, borderTop: '1px solid rgba(255,255,255,0.06)' };
const btnPrimary: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 50, padding: '0 30px', borderRadius: 999, background: '#fff', color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: 15 };
const btnGhost: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 50, padding: '0 30px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontWeight: 600, fontSize: 15 };
const trustLine: CSSProperties = { margin: 0, fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.25)' };

/* ── Hero ── */
const hero: CSSProperties = { width: W, margin: '0 auto', padding: '80px 0 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 60, alignItems: 'center' };
const heroText: CSSProperties = { display: 'grid', gap: 26 };
const heroSub: CSSProperties = { margin: 0, fontSize: 17, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: 480 };
const heroBtns: CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' };

/* Hero mockup */
const heroVisual: CSSProperties = { display: 'grid' };
const mockup: CSSProperties = { borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#0c0e14', overflow: 'hidden' };
const mockupBar: CSSProperties = { display: 'flex', gap: 7, alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const dot: CSSProperties = { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' };
const mockupUrl: CSSProperties = { marginLeft: 12, fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)' };
const mockupBody: CSSProperties = { display: 'grid', gridTemplateColumns: '130px 1fr', minHeight: 340 };
const mockupSide: CSSProperties = { borderRight: '1px solid rgba(255,255,255,0.06)', padding: '14px 10px', display: 'grid', gap: 4, alignContent: 'start' };
const mockupSideItem: CSSProperties = { padding: '8px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', cursor: 'default' };
const mockupSideActive: CSSProperties = { ...mockupSideItem, background: 'rgba(94,234,212,0.08)', color: '#5eead4', border: '1px solid rgba(94,234,212,0.12)' };
const mockupMain: CSSProperties = { padding: 14, display: 'grid', gap: 10, gridTemplateRows: '1fr auto' };
const mockupPreview: CSSProperties = { borderRadius: 10, background: 'linear-gradient(145deg, rgba(94,234,212,0.04), rgba(94,234,212,0.01))', border: '1px solid rgba(94,234,212,0.07)', display: 'grid', placeItems: 'center', position: 'relative' };
const mockupPhone: CSSProperties = { width: 90, padding: 6, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', display: 'grid', gap: 6 };
const mockupPhoneScreen: CSSProperties = { display: 'grid', gap: 6, justifyItems: 'center', padding: '16px 8px' };
const mockupCover: CSSProperties = { width: 52, height: 52, borderRadius: 6, background: 'linear-gradient(135deg, #5eead4, #0d9488)' };
const mockupTrackName: CSSProperties = { fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'center' };
const mockupArtist: CSSProperties = { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center' };
const mockupWatchLabel: CSSProperties = { position: 'absolute', bottom: 10, right: 14, fontFamily: MONO, fontSize: 10, color: 'rgba(94,234,212,0.4)', letterSpacing: '0.08em' };
const mockupProps: CSSProperties = { display: 'grid', gap: 6 };
const mockupPropItem: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' };
const mockupPropLabel: CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 };
const mockupPropValue: CSSProperties = { fontSize: 11, fontFamily: MONO, color: 'rgba(255,255,255,0.45)' };

/* ── Platform logos ── */
const logosSection: CSSProperties = { width: W, margin: '0 auto', padding: '40px 0', display: 'grid', gap: 16, justifyItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' };
const logosLabel: CSSProperties = { margin: 0, fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' };
const logosRow: CSSProperties = { display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' };
const logoImg: CSSProperties = { height: 28, objectFit: 'contain', opacity: 0.35 };

/* ── Pain ── */
const painList: CSSProperties = { display: 'grid', gap: 0, marginTop: 12 };
const painItem: CSSProperties = { padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.07)' };
const painText: CSSProperties = { margin: 0, fontSize: 'clamp(16px, 1.8vw, 20px)', color: '#e06c6c', lineHeight: 1.5, fontWeight: 500 };

/* ── Steps ── */
const stepsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 16 };
const stepCard: CSSProperties = { display: 'grid', gap: 14 };
const stepVisual: CSSProperties = { height: 200, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' };
const stepMeta: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const stepN: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: 'rgba(255,255,255,0.25)' };
const stepLabel: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#5eead4', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(94,234,212,0.15)', background: 'rgba(94,234,212,0.06)' };
const stepTitle: CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' };
const stepDesc: CSSProperties = { margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65 };

/* ── For who ── */
const forGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, marginTop: 24 };
const forCol: CSSProperties = { display: 'grid', gap: 16, alignContent: 'start' };
const forRule: CSSProperties = { width: 40, height: 2, background: 'rgba(255,255,255,0.15)' };
const forLabel: CSSProperties = { fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#e06c6c', letterSpacing: '0.1em' };
const forText: CSSProperties = { margin: 0, fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 };
const testimonial: CSSProperties = { display: 'grid', gap: 6, marginTop: 16 };
const quoteText: CSSProperties = { margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: 'rgba(255,255,255,0.32)', lineHeight: 1.65 };
const quoteName: CSSProperties = { fontSize: 14, color: '#fff' };
const quoteRole: CSSProperties = { fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' };

/* ── Social media / distribuidoras ── */
const smGrid: CSSProperties = { ...forGrid };
const smCol: CSSProperties = { ...forCol };
const smLabel: CSSProperties = { ...forLabel, color: '#5eead4' };

/* ── Pricing ── */
const cycleRow: CSSProperties = { display: 'inline-flex', gap: 4, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', justifySelf: 'start' };
const cycleBtn: CSSProperties = { border: 'none', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.4)', padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'grid', gap: 2, fontFamily: 'inherit' };
const cycleBtnActive: CSSProperties = { ...cycleBtn, background: 'rgba(255,255,255,0.08)', color: '#fff' };
const cycleSave: CSSProperties = { fontSize: 10, color: '#5eead4', fontWeight: 600 };
const plansGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 };
const planCard: CSSProperties = { position: 'relative', display: 'grid', gap: 18, padding: 28, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const planFeatured: CSSProperties = { ...planCard, border: '1px solid rgba(94,234,212,0.3)', background: 'rgba(94,234,212,0.03)', boxShadow: '0 0 80px rgba(94,234,212,0.04)' };
const planBadge: CSSProperties = { position: 'absolute', top: -11, left: 24, padding: '5px 14px', borderRadius: 999, background: '#5eead4', color: '#000', fontSize: 12, fontWeight: 700 };
const planName: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 800 };
const planDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: 14, lineHeight: 1.5, minHeight: 42 };
const planPriceVal: CSSProperties = { fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' };
const planPricePer: CSSProperties = { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 };
const planTokenBadge: CSSProperties = { padding: '7px 14px', borderRadius: 8, background: 'rgba(94,234,212,0.06)', border: '1px solid rgba(94,234,212,0.12)', color: '#5eead4', fontWeight: 700, fontSize: 13, justifySelf: 'start' };
const planFeatures: CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 };
const planFeatureItem: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', color: 'rgba(255,255,255,0.48)', fontSize: 14 };
const check: CSSProperties = { color: '#5eead4', fontWeight: 700, flexShrink: 0 };
const planBtnNorm: CSSProperties = { display: 'grid', placeItems: 'center', height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.08)' };
const planBtnFeat: CSSProperties = { ...planBtnNorm, background: '#fff', color: '#000', border: '1px solid #fff' };

/* ── Final CTA ── */
const finalSect: CSSProperties = { width: W, margin: '0 auto', padding: '120px 0 140px', display: 'grid', gap: 20, borderTop: '1px solid rgba(255,255,255,0.06)' };

/* ── Footer ── */
const footer: CSSProperties = { width: W, margin: '0 auto', padding: '48px 0 40px', display: 'grid', gap: 32, borderTop: '1px solid rgba(255,255,255,0.06)' };
const footerTop: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' };
const footerBrand: CSSProperties = { fontWeight: 800, fontSize: 16, color: '#fff' };
const footerTagline: CSSProperties = { margin: '6px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 };
const footerLinks: CSSProperties = { display: 'flex', gap: 24, alignItems: 'center' };
const footerLink: CSSProperties = { color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 13 };
const footerBottom: CSSProperties = { color: 'rgba(255,255,255,0.15)', fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20 };
