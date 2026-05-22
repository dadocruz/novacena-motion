'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BILLING_CYCLES, planPrice, SAAS_PLANS, type BillingCycle } from '../../lib/saasPlans';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const reviews = [
  { name: 'Lucas Martins', role: 'Produtor musical', text: 'Em 5 minutos eu tinha o motion pronto. Antes eu gastava 2 horas no After Effects pra cada lançamento.', stars: 5 },
  { name: 'Camila Rocha', role: 'Social media', text: 'Meus artistas ficaram impressionados. Parece que contratamos uma agência de motion design.', stars: 5 },
  { name: 'Pedro Gustavo', role: 'Artista independente', text: 'Não sei usar Premiere, não sei usar After Effects. Aqui eu só troquei a capa e o texto. Ficou profissional.', stars: 5 },
  { name: 'Rafaela Duarte', role: 'Distribuidora digital', text: 'A gente lança 40 singles por mês. Sem essa ferramenta a gente não dava conta.', stars: 5 },
];

const painPoints = [
  'Abrir After Effects, importar assets, animar quadro a quadro, exportar, converter...',
  'Pagar freelancer de motion pra cada lançamento — R$200, R$500 por vídeo.',
  'Usar CapCut e parecer amador. Ou não postar nada e perder alcance.',
  'Deadline apertado, lançamento amanhã, e o motion ainda não saiu.',
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
      {/* ── Nav ──────────────────────────────────── */}
      <nav style={nav}>
        <a href="/vendas" style={navBrand}>NovaCena</a>
        <div style={navRight}>
          <a href="#como" style={navLink}>Como funciona</a>
          <a href="#planos" style={navLink}>Planos</a>
          <a href="/login" style={navLink}>Entrar</a>
          <a href="/login?mode=signup&next=/" style={navCta}>Testar grátis</a>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────── */}
      <section style={hero}>
        <div style={heroGlow} />
        <div style={heroContent}>
          <h1 style={heroTitle}>
            NovaCena cria o motion do seu lançamento.<br />
            <span style={grad}>Você fica com o crédito.</span>
          </h1>
          <p style={heroSub}>
            Templates profissionais de motion para divulgação musical.
            Troque a capa, ajuste o texto, exporte na nuvem.
            Sem After Effects. Sem Premiere. Sem freelancer.
          </p>
          <div style={heroActions}>
            <a href="/login?mode=signup&next=/" style={btnWhite}>
              Comece grátis — 1 render incluso
            </a>
            <a href="#como" style={btnOutline}>Veja como funciona</a>
          </div>
          <p style={heroTrust}>Teste grátis com 1 render de demonstração.</p>
        </div>
      </section>

      {/* ── Social proof ──────────────────────────── */}
      <section style={proofSection}>
        <div style={proofHeader}>
          <div style={stars}>{'★'.repeat(5)}</div>
          <span style={proofScore}>Produtores e artistas já usam a NovaCena</span>
        </div>
        <div style={reviewsGrid}>
          {reviews.map((r) => (
            <div key={r.name} style={reviewCard}>
              <div style={reviewStars}>{'★'.repeat(r.stars)}</div>
              <p style={reviewText}>&ldquo;{r.text}&rdquo;</p>
              <div style={reviewAuthor}>
                <strong>{r.name}</strong>
                <span style={reviewRole}>{r.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pain points ───────────────────────────── */}
      <section style={painSection}>
        <div style={sectionTag}>{'// o problema'}</div>
        <h2 style={painTitle}>
          Você ainda faz motion de lançamento na mão?<br />
          <span style={painFade}>A gente sabe. É brutal.</span>
        </h2>
        <div style={painGrid}>
          {painPoints.map((p, i) => (
            <div key={i} style={painCard}>
              <span style={painX}>{'✕'}</span>
              <p style={painText}>{p}</p>
            </div>
          ))}
        </div>
        <div style={painPunch}>
          <p style={painPunchText}>
            E se uma ferramenta online fizesse tudo isso por você em minutos?
          </p>
          <a href="#como" style={btnWhiteSmall}>Veja como funciona →</a>
        </div>
      </section>

      {/* ── How it works ──────────────────────────── */}
      <section id="como" style={howSection}>
        <div style={sectionTag}>{'// como funciona'}</div>
        <h2 style={sectionTitle}>Três passos. Zero complexidade.</h2>
        <div style={stepsGrid}>
          {[
            {
              n: '01',
              title: 'Escolha o template',
              desc: 'Disponível Agora, Assista no YouTube, Marco de Streams, Spotify Print. Modelos prontos pra story e feed.',
            },
            {
              n: '02',
              title: 'Personalize no navegador',
              desc: 'Troque capa, texto, vídeo de fundo, logos, overlays, cor, opacidade e blur. Tudo visual, sem timeline.',
            },
            {
              n: '03',
              title: 'Exporte na nuvem',
              desc: 'Clique em exportar. AWS Lambda renderiza o vídeo. Seu computador não trava. Baixe o MP4 pronto.',
            },
          ].map((s) => (
            <div key={s.n} style={stepCard}>
              <div style={stepNum}>{s.n}</div>
              <h3 style={stepName}>{s.title}</h3>
              <p style={stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── For who ───────────────────────────────── */}
      <section style={forWhoSection}>
        <div style={sectionTag}>{'// pra quem é'}</div>
        <h2 style={sectionTitle}>Feito pra quem lança música.</h2>
        <div style={forWhoGrid}>
          <div style={forWhoCard}>
            <div style={forWhoEmoji}>{'🎤'}</div>
            <h3 style={forWhoName}>Artistas e cantores</h3>
            <p style={forWhoDesc}>
              Você lança single, EP, álbum. Precisa de motion pra story e feed.
              Não quer depender de editor, não quer aprender After Effects.
              Aqui você faz sozinho em minutos.
            </p>
          </div>
          <div style={forWhoCard}>
            <div style={forWhoEmoji}>{'🎧'}</div>
            <h3 style={forWhoName}>Produtores e distribuidoras</h3>
            <p style={forWhoDesc}>
              Você lança 10, 20, 40 artistas por mês. Precisa de escala,
              velocidade e qualidade visual pra cada campanha.
              NovaCena é a sua linha de produção de motion.
            </p>
          </div>
          <div style={forWhoCard}>
            <div style={forWhoEmoji}>{'📱'}</div>
            <h3 style={forWhoName}>Social media musical</h3>
            <p style={forWhoDesc}>
              Você cuida das redes de artistas. O lançamento é amanhã.
              Precisa de um motion profissional agora.
              Aqui você entrega em minutos, não em dias.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section style={featSection}>
        <div style={sectionTag}>{'// recursos'}</div>
        <h2 style={sectionTitle}>Tudo incluso. Sem surpresas.</h2>
        <div style={featGrid}>
          {[
            { icon: '🎬', t: 'Templates de campanha', d: 'Disponível Agora, YouTube, Marco de Streams, Spotify Print. Story 9:16 e Feed 1:1.' },
            { icon: '☁️', t: 'Exportação na nuvem', d: 'AWS Lambda renderiza. Sem instalar software, sem travar o computador.' },
            { icon: '🎨', t: 'Editor visual completo', d: 'Capas, textos, vídeo de fundo, overlays, opacidade, blur e saturação.' },
            { icon: '🎵', t: 'Logos das plataformas', d: 'Spotify, Apple Music, YouTube Music, Deezer. Já prontos pra usar.' },
            { icon: '⚡', t: 'Rápido de verdade', d: 'Do zero ao vídeo pronto em minutos. Sem curva de aprendizado.' },
            { icon: '🌐', t: '100% online', d: 'Funciona no navegador. Chrome, Safari, Edge. Qualquer computador.' },
          ].map((f) => (
            <div key={f.t} style={featCard}>
              <div style={{ fontSize: 28 }}>{f.icon}</div>
              <h3 style={featName}>{f.t}</h3>
              <p style={featDesc}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform logos ────────────────────────── */}
      <section style={logosSection}>
        <p style={logosLabel}>Templates com logos oficiais das plataformas</p>
        <div style={logosRow}>
          {platformLogos.map((p) => (
            <img key={p.name} src={p.src} alt={p.name} style={{ height: 30, objectFit: 'contain', opacity: 0.45 }} />
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────── */}
      <section id="planos" style={pricingSection}>
        <div style={sectionTag}>{'// planos'}</div>
        <h2 style={sectionTitle}>Todos os recursos. Preço justo.</h2>
        <p style={sectionSub}>Escolha o volume que faz sentido pro seu ritmo de lançamentos.</p>

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
                <h3 style={planTitle}>{plan.name}</h3>
                <p style={planDesc}>{plan.description}</p>
                <div>
                  <div style={planPriceVal}>{formatBRL(price)}</div>
                  <div style={planPricePer}>
                    {cycle === 'monthly' ? '/mês' : `por ${months} meses`}
                    {selectedCycle.discountLabel ? ` · ${selectedCycle.discountLabel}` : ''}
                  </div>
                </div>
                <div style={planTokens}>{plan.includedTokens * months} renders no ciclo</div>
                <ul style={planFeats}>
                  {plan.features.map((f) => (
                    <li key={f} style={planFeatItem}>
                      <span style={checkMark}>{'✓'}</span> {f}
                    </li>
                  ))}
                  <li style={planFeatItem}>
                    <span style={checkMark}>{'✓'}</span> Vídeos até {plan.maxVideoSeconds}s
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

      {/* ── Final CTA ─────────────────────────────── */}
      <section style={finalCta}>
        <div style={finalGlow} />
        <h2 style={finalTitle}>Seu próximo lançamento merece um motion profissional.</h2>
        <p style={finalSub}>Crie sua conta, teste com 1 render grátis e veja como é simples.</p>
        <a href="/login?mode=signup&next=/" style={btnWhite}>Começar agora — é grátis</a>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer style={footer}>
        <div style={footerGrid}>
          <div>
            <div style={footerBrand}>NovaCena</div>
            <div style={footerTagline}>Motion studio para lançamentos musicais.</div>
          </div>
          <div style={footerCol}>
            <div style={footerColTitle}>Produto</div>
            <a href="#como" style={footerLink}>Como funciona</a>
            <a href="#planos" style={footerLink}>Planos</a>
            <a href="/login?mode=signup&next=/" style={footerLink}>Criar conta</a>
          </div>
          <div style={footerCol}>
            <div style={footerColTitle}>Conta</div>
            <a href="/login" style={footerLink}>Entrar</a>
            <a href="/login?mode=signup&next=/billing" style={footerLink}>Comprar renders</a>
          </div>
        </div>
        <div style={footerBottom}>
          <span>© 2026 NovaCena. Todos os direitos reservados.</span>
        </div>
      </footer>
    </main>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const grad: CSSProperties = {
  background: 'linear-gradient(90deg, #a78bfa, #f97316)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const page: CSSProperties = {
  minHeight: '100dvh',
  background: '#050507',
  color: '#e8e8ea',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'auto',
};

const W = 'min(1100px, calc(100% - 48px))';

/* Nav */
const nav: CSSProperties = { position: 'sticky', top: 0, zIndex: 100, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: W, margin: '0 auto', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' };
const navBrand: CSSProperties = { color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' };
const navRight: CSSProperties = { display: 'flex', gap: 4, alignItems: 'center' };
const navLink: CSSProperties = { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontWeight: 600, fontSize: 13, padding: '8px 10px' };
const navCta: CSSProperties = { color: '#000', textDecoration: 'none', background: '#fff', borderRadius: 999, padding: '7px 16px', fontWeight: 700, fontSize: 13 };

/* Hero */
const hero: CSSProperties = { position: 'relative', width: W, margin: '0 auto', padding: '100px 0 80px', textAlign: 'center', display: 'grid', gap: 24, justifyItems: 'center', overflow: 'hidden' };
const heroGlow: CSSProperties = { position: 'absolute', top: -250, left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(249,115,22,0.06) 40%, transparent 65%)', pointerEvents: 'none' };
const heroContent: CSSProperties = { position: 'relative', display: 'grid', gap: 22, justifyItems: 'center', maxWidth: 760 };
const heroTitle: CSSProperties = { margin: 0, fontSize: 'clamp(34px, 5.5vw, 56px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em' };
const heroSub: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 17, lineHeight: 1.65, maxWidth: 560 };
const heroActions: CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' };
const heroTrust: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 13 };

const btnWhite: CSSProperties = { display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 26px', borderRadius: 999, background: '#fff', color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: 15 };
const btnWhiteSmall: CSSProperties = { ...btnWhite, height: 40, fontSize: 14, padding: '0 20px' };
const btnOutline: CSSProperties = { display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 26px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15 };

/* Social proof */
const proofSection: CSSProperties = { width: W, margin: '0 auto', padding: '60px 0', display: 'grid', gap: 28, borderTop: '1px solid rgba(255,255,255,0.06)' };
const proofHeader: CSSProperties = { textAlign: 'center', display: 'grid', gap: 6, justifyItems: 'center' };
const stars: CSSProperties = { fontSize: 22, color: '#f59e0b', letterSpacing: 4 };
const proofScore: CSSProperties = { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 600 };
const reviewsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 };
const reviewCard: CSSProperties = { display: 'grid', gap: 12, padding: 22, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };
const reviewStars: CSSProperties = { fontSize: 14, color: '#f59e0b', letterSpacing: 2 };
const reviewText: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' };
const reviewAuthor: CSSProperties = { display: 'grid', gap: 2 };
const reviewRole: CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.35)' };

/* Pain points */
const painSection: CSSProperties = { width: W, margin: '0 auto', padding: '80px 0', display: 'grid', gap: 32 };
const painTitle: CSSProperties = { margin: 0, fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em' };
const painFade: CSSProperties = { color: 'rgba(255,255,255,0.35)' };
const painGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 };
const painCard: CSSProperties = { display: 'flex', gap: 12, padding: 20, borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' };
const painX: CSSProperties = { color: '#ef4444', fontWeight: 800, fontSize: 16, flexShrink: 0, marginTop: 2 };
const painText: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.6)' };
const painPunch: CSSProperties = { textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center', paddingTop: 16 };
const painPunchText: CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' };

/* Section tags */
const sectionTag: CSSProperties = { fontFamily: 'monospace', fontSize: 13, color: '#a78bfa', fontWeight: 600 };
const sectionTitle: CSSProperties = { margin: 0, fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em' };
const sectionSub: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 16 };

/* How it works */
const howSection: CSSProperties = { width: W, margin: '0 auto', padding: '80px 0', display: 'grid', gap: 32 };
const stepsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 };
const stepCard: CSSProperties = { display: 'grid', gap: 14, padding: 28, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };
const stepNum: CSSProperties = { width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800 };
const stepName: CSSProperties = { margin: 0, fontSize: 19, fontWeight: 700 };
const stepDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontSize: 14 };

/* For who */
const forWhoSection: CSSProperties = { width: W, margin: '0 auto', padding: '80px 0', display: 'grid', gap: 32 };
const forWhoGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 };
const forWhoCard: CSSProperties = { display: 'grid', gap: 12, padding: 28, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };
const forWhoEmoji: CSSProperties = { fontSize: 32 };
const forWhoName: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700 };
const forWhoDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 };

/* Features */
const featSection: CSSProperties = { width: W, margin: '0 auto', padding: '48px 0 80px', display: 'grid', gap: 32 };
const featGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 };
const featCard: CSSProperties = { display: 'grid', gap: 10, padding: 24, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' };
const featName: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 700 };
const featDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.55 };

/* Platform logos */
const logosSection: CSSProperties = { width: W, margin: '0 auto', padding: '32px 0 48px', display: 'grid', gap: 14, justifyItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' };
const logosLabel: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 13 };
const logosRow: CSSProperties = { display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' };

/* Pricing */
const pricingSection: CSSProperties = { width: W, margin: '0 auto', padding: '80px 0', display: 'grid', gap: 28 };
const cycleRow: CSSProperties = { display: 'inline-flex', gap: 4, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', justifySelf: 'start' };
const cycleBtn: CSSProperties = { border: 'none', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.45)', padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'grid', gap: 2 };
const cycleBtnActive: CSSProperties = { ...cycleBtn, background: 'rgba(255,255,255,0.1)', color: '#fff' };
const cycleSave: CSSProperties = { fontSize: 10, color: '#a78bfa', fontWeight: 600 };

const plansGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 };
const planCard: CSSProperties = { position: 'relative', display: 'grid', gap: 18, padding: 28, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' };
const planFeatured: CSSProperties = { ...planCard, border: '1px solid rgba(124,58,237,0.45)', background: 'rgba(124,58,237,0.04)', boxShadow: '0 0 60px rgba(124,58,237,0.06)' };
const planBadge: CSSProperties = { position: 'absolute', top: -11, left: 24, padding: '5px 14px', borderRadius: 999, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', fontSize: 12, fontWeight: 700 };
const planTitle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 800 };
const planDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.5, minHeight: 42 };
const planPriceVal: CSSProperties = { fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' };
const planPricePer: CSSProperties = { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 2 };
const planTokens: CSSProperties = { padding: '7px 14px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#a78bfa', fontWeight: 700, fontSize: 13, justifySelf: 'start' };
const planFeats: CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 };
const planFeatItem: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 14 };
const checkMark: CSSProperties = { color: '#a78bfa', fontWeight: 700, flexShrink: 0 };
const planBtnNorm: CSSProperties = { display: 'grid', placeItems: 'center', height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.08)' };
const planBtnFeat: CSSProperties = { ...planBtnNorm, background: '#fff', color: '#000', border: '1px solid #fff' };

/* Final CTA */
const finalCta: CSSProperties = { position: 'relative', width: W, margin: '0 auto', padding: '80px 40px', borderRadius: 20, background: '#0a0818', border: '1px solid rgba(124,58,237,0.15)', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center', overflow: 'hidden' };
const finalGlow: CSSProperties = { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%)', pointerEvents: 'none' };
const finalTitle: CSSProperties = { position: 'relative', margin: 0, fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', maxWidth: 600 };
const finalSub: CSSProperties = { position: 'relative', margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 15 };

/* Footer */
const footer: CSSProperties = { width: W, margin: '0 auto', padding: '60px 0 40px', display: 'grid', gap: 32, borderTop: '1px solid rgba(255,255,255,0.06)' };
const footerGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 32 };
const footerBrand: CSSProperties = { fontWeight: 800, fontSize: 16 };
const footerTagline: CSSProperties = { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6 };
const footerCol: CSSProperties = { display: 'grid', gap: 8, alignContent: 'start' };
const footerColTitle: CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: 4 };
const footerLink: CSSProperties = { color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: 13 };
const footerBottom: CSSProperties = { color: 'rgba(255,255,255,0.2)', fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20 };
