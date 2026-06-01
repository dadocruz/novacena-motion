'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BILLING_CYCLES, planPrice, SAAS_PLANS, type BillingCycle, type SaasPlan } from '../../lib/saasPlans';
import { trackMarketingEvent } from '../../lib/marketingEvents';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return mobile;
}

/* ── Data ─────────────────────────────────────────────── */

import type { SiteContent, SiteReview, SiteFaq } from '../../lib/siteContentTypes';
import { DEFAULT_CONTENT } from '../../lib/siteContentTypes';

const painPoints = [
  'Abrir o editor, importar assets, animar quadro a quadro, exportar, converter…',
  'Pagar R$200, R$500 por vídeo pra um freelancer de motion.',
  'Usar uma ferramenta genérica e entregar algo que parece amador.',
  'O lançamento é amanhã e o motion ainda não saiu.',
];

const steps = [
  { n: '1', label: 'TEMPLATE', title: 'Escolha o template.', desc: 'Pré-save, Lançamento, Assista no YouTube, Marco de Streams, Spotify Print. Story e feed prontos pra usar.' },
  { n: '2', label: 'EDIÇÃO', title: 'Personalize no navegador.', desc: 'Troque capa, texto, vídeo de fundo, logos, cor, opacidade e blur. Tudo visual, sem timeline.' },
  { n: '3', label: 'EXPORTAÇÃO', title: 'Exporte na nuvem.', desc: 'O vídeo é renderizado em servidores na nuvem. Seu computador não trava. Baixe o MP4 pronto.' },
];

const CTA_URL = '/login?mode=signup&next=/estudio';
const CTA_BILLING = `/login?mode=signup&next=${encodeURIComponent('/billing')}`;

function trackTrialClick() {
  trackMarketingEvent('Lead', {
    content_name: 'NovaCena Motion trial',
    content_category: 'signup',
  });
}

function trackPlanClick(plan: SaasPlan, cycle: BillingCycle) {
  trackMarketingEvent('InitiateCheckout', {
    content_name: `NovaCena Motion ${plan.id}`,
    content_category: 'plan',
    currency: 'BRL',
    value: planPrice(plan, cycle),
  });
}

/* ── Dual-row auto-scroll hook ───────────────────────── */

function useDualScroll(speed = 0.4) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elTop = topRef.current;
    const elBottom = bottomRef.current;
    if (!elTop || !elBottom) return;
    let raf: number;
    let posTop = 0;
    let posBottom = elBottom.scrollWidth / 2;

    function tick() {
      if (!elTop || !elBottom) return;
      // Top row → right
      posTop += speed;
      if (posTop >= elTop.scrollWidth / 2) posTop = 0;
      elTop.scrollLeft = posTop;
      // Bottom row → left
      posBottom -= speed;
      if (posBottom <= 0) posBottom = elBottom.scrollWidth / 2;
      elBottom.scrollLeft = posBottom;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  return { topRef, bottomRef };
}

/* ── Video carousel hook ─────────────────────────────── */

function useAutoScroll(speed = 0.5) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf: number;
    let pos = 0;
    function tick() {
      if (!el) return;
      pos += speed;
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.scrollLeft = pos;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed]);
  return ref;
}

/* ── Page ─────────────────────────────────────────────── */

export default function SalesPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const { topRef, bottomRef } = useDualScroll(0.4);
  const videoCarouselRef = useAutoScroll(0.4);
  const isMobile = useIsMobile();

  // Fetch CMS content
  useEffect(() => {
    fetch('/api/site-content')
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.content) setContent(d.content); })
      .catch(() => {});
  }, []);

  const reviews: SiteReview[] = content.reviews;
  const faqs: SiteFaq[] = content.faqs;
  const topRow = reviews.slice(0, Math.ceil(reviews.length / 2));
  const bottomRow = reviews.slice(Math.ceil(reviews.length / 2));
  const activeVideos = content.testimonialVideos.filter((v) => v.youtubeId);

  const selectedCycle = useMemo(
    () => BILLING_CYCLES.find((item) => item.id === cycle) ?? BILLING_CYCLES[0],
    [cycle],
  );
  const months = selectedCycle.multiplier;

  return (
    <main style={page}>
      {/* ── Nav ────────────────────────────────────── */}
      <nav style={nav}>
        <a href="/motion" style={navLogo}>NovaCena</a>
        {!isMobile && (
          <div style={navPill}>
            <a href="#como" style={navItem}>Como funciona</a>
            <a href="#planos" style={navItem}>Planos</a>
            <a href="/login" style={navItem}>Entrar</a>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isMobile && <a href="/login" style={navItemMobile}>Entrar</a>}
          <a href={CTA_URL} onClick={trackTrialClick} style={isMobile ? navCtaMobile : navCta}>
            {isMobile ? 'Teste grátis ↗' : 'Teste gratuitamente ↗'}
          </a>
        </div>
      </nav>

      {/* ── Grid background overlay ─────────────── */}
      <div style={gridBg} />

      {/* ── Hero ───────────────────────────────────── */}
      <section style={isMobile ? heroMobile : hero}>
        <div style={heroText}>
          <div style={tag}>{content.heroTagline}</div>
          <h1 style={h1}>
            NovaCena cria<br />
            o motion do seu<br />
            lançamento.<br />
            Você fica com <em style={emCyan}>o crédito</em>.
          </h1>
          <p style={heroSub}>{content.heroSubtitle}</p>
          <div style={heroBtns}>
            <a href={CTA_URL} onClick={trackTrialClick} style={btnPrimary}>Teste gratuitamente ↗</a>
            <a href="#como" style={btnGhost}>Veja como funciona</a>
          </div>
          <p style={trustLine}>{content.trustLine}</p>
        </div>

        <div style={heroVisual}>
          <div style={videoWrapper}>
            {content.heroVideoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${content.heroVideoId}?rel=0&modestbranding=1`}
                title="NovaCena Motion Studio — Veja como funciona"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={videoIframe}
              />
            ) : (
              <div style={videoPlaceholder}>
                <div style={videoPlayBtn}>▶</div>
                <span style={videoPlaceholderText}>VÍDEO EM BREVE</span>
              </div>
            )}
            <span style={videoLabel}>VEJA EM AÇÃO · 2 MIN</span>
          </div>
        </div>
      </section>

      {/* ── Platform logos ──────────────────────────── */}
      {content.logos.length > 0 && (
        <section style={logosSection}>
          <p style={logosLabel}>COMPATÍVEL COM AS PLATAFORMAS</p>
          <div style={logosRow}>
            {content.logos.map((p) => (
              <img key={p.name} src={p.src} alt={p.name} style={logoImg} />
            ))}
          </div>
        </section>
      )}

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
          {painPoints.map((pt, i) => (
            <div key={i} style={painItem}>
              <p style={painTextStyle}>{pt}</p>
            </div>
          ))}
        </div>
        <p style={painClose}>
          E se a ferramenta <em style={emCyan}>fizesse isso por você</em>?
        </p>
      </section>

      {/* ── CTA Banner 1 ──────────────────────────── */}
      <section style={ctaBanner}>
        <a href={CTA_URL} onClick={trackTrialClick} style={btnPrimary}>Teste gratuitamente ↗</a>
        <p style={trustLineCenter}>{'✓  1 render grátis · Sem cartão · Sem instalar nada'}</p>
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
              <div style={stepHeader}>
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
            <div style={forLabelRed}>PRODUTORES</div>
            <p style={forText}>
              Você lança 10, 20, 40 artistas por mês. Precisa de escala,
              velocidade e qualidade visual pra cada campanha.
              NovaCena é a sua linha de produção de motion.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>&ldquo;Em 5 minutos eu tinha o motion pronto. Antes eu gastava 2 horas no editor pra cada lançamento.&rdquo;</p>
              <strong style={quoteName}>Lucas Martins</strong>
              <span style={quoteRole}>Produtor musical</span>
            </div>
          </div>
          <div style={forCol}>
            <div style={forRule} />
            <div style={forLabelRed}>ARTISTAS</div>
            <p style={forText}>
              Você faz música. Agora pode criar seu próprio motion de lançamento
              sem contratar ninguém. Troque a capa, ajuste o texto, exporte.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>&ldquo;Eu não sabia usar editor de vídeo. Aqui eu só troquei a capa e o texto. Ficou profissional.&rdquo;</p>
              <strong style={quoteName}>Pedro Gustavo</strong>
              <span style={quoteRole}>Artista independente</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Also for ───────────────────────────────── */}
      <section style={sect}>
        <div style={tag}>{'// TAMBÉM PARA'}</div>
        <h2 style={h2}>
          O lançamento é amanhã.{' '}
          <em style={emCyan}>Entregue hoje</em>.
        </h2>
        <div style={forGrid}>
          <div style={forCol}>
            <div style={forRule} />
            <div style={forLabelCyan}>SOCIAL MEDIA</div>
            <p style={forText}>
              Você cuida das redes de artistas. O prazo é curto.
              Precisa de um motion profissional agora, não em dias.
              Aqui você entrega em minutos.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>&ldquo;Meus artistas ficaram impressionados. Parece que contratamos uma agência de motion design.&rdquo;</p>
              <strong style={quoteName}>Camila Rocha</strong>
              <span style={quoteRole}>Social media</span>
            </div>
          </div>
          <div style={forCol}>
            <div style={forRule} />
            <div style={forLabelCyan}>DISTRIBUIDORAS</div>
            <p style={forText}>
              Alto volume de lançamentos. Cada artista precisa de material visual.
              Com NovaCena, uma pessoa resolve o que antes precisava de uma equipe.
            </p>
            <div style={testimonial}>
              <p style={quoteText}>&ldquo;A gente lança 40 singles por mês. Sem essa ferramenta a gente não dava conta.&rdquo;</p>
              <strong style={quoteName}>Rafaela Duarte</strong>
              <span style={quoteRole}>Distribuidora digital</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner 2 ──────────────────────────── */}
      <section style={ctaBanner}>
        <a href={CTA_URL} onClick={trackTrialClick} style={btnPrimary}>Teste gratuitamente ↗</a>
        <p style={trustLineCenter}>{'✓  Crie sua conta em 30 segundos'}</p>
      </section>

      {/* ── Dual-row testimonial carousel ─────────── */}
      <section style={carouselSection}>
        <div style={tagCenter}>{'// O QUE DIZEM NOSSOS USUÁRIOS'}</div>
        <h2 style={h2Center}>
          Veja o que{' '}
          <em style={emCyan}>nossos usuários dizem</em>.
        </h2>
        <div style={ratingBadge}>
          <span style={ratingStars}>{'★★★★★'}</span>
          <span style={ratingText}>5.0 nota média · produtores e artistas</span>
        </div>

        {/* Top row → scrolls right */}
        <div ref={topRef} style={carouselTrack}>
          <div style={carouselInner}>
            {[...topRow, ...topRow, ...topRow].map((r, i) => (
              <div key={`top-${i}`} style={carouselCard}>
                <div style={carouselStars}>{'★★★★★'}</div>
                <p style={carouselQuote}>&ldquo;{r.text}&rdquo;</p>
                <div style={carouselDivider} />
                <div style={carouselAuthor}>
                  <div style={carouselAvatar}>{r.initials}</div>
                  <div>
                    <div style={carouselName}>{r.name}</div>
                    <div style={carouselRole}>
                      {r.verified && <span style={verifiedBadge}>✓ Verificado</span>}
                      {r.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row → scrolls left */}
        <div ref={bottomRef} style={carouselTrack}>
          <div style={carouselInner}>
            {[...bottomRow, ...bottomRow, ...bottomRow].map((r, i) => (
              <div key={`bot-${i}`} style={carouselCard}>
                <div style={carouselStars}>{'★★★★★'}</div>
                <p style={carouselQuote}>&ldquo;{r.text}&rdquo;</p>
                <div style={carouselDivider} />
                <div style={carouselAuthor}>
                  <div style={carouselAvatar}>{r.initials}</div>
                  <div>
                    <div style={carouselName}>{r.name}</div>
                    <div style={carouselRole}>
                      {r.verified && <span style={verifiedBadge}>✓ Verificado</span>}
                      {r.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Video testimonials carousel ────────────── */}
      <section style={videoCarouselSect}>
        <div style={tag}>{'// NO YOUTUBE'}</div>
        <h2 style={h2}>
          Quem usa a NovaCena{' '}
          <em style={emCyan}>mostra o resultado</em>.
        </h2>
        <div ref={videoCarouselRef} style={vidCarousel}>
          <div style={vidCarouselTrack}>
            {activeVideos.length > 0 ? (
              [...activeVideos, ...activeVideos].map((v, i) => (
                <a
                  key={`${v.youtubeId}-${i}`}
                  href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={vidCard}
                >
                  <img src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`} alt={v.label} style={vidThumb} />
                  <div style={vidOverlay}><div style={vidPlay}>▶</div></div>
                  <div style={vidLabel}>{v.label}</div>
                  <div style={vidYt}>ASSISTIR NO YOUTUBE</div>
                </a>
              ))
            ) : (
              [1, 2, 3, 4].map((i) => (
                <div key={`ph-${i}`} style={vidCard}>
                  <div style={vidPlaceholder}>
                    <div style={vidPlay}>▶</div>
                  </div>
                  <div style={vidLabel}>Em breve</div>
                  <div style={vidYt}>VÍDEO DE DEPOIMENTO</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── CTA Banner 3 ──────────────────────────── */}
      <section style={ctaBanner}>
        <h2 style={h2Center}>
          Pronto pra criar seu{' '}
          <em style={emCyan}>primeiro motion</em>?
        </h2>
        <a href={CTA_URL} onClick={trackTrialClick} style={btnPrimary}>Teste gratuitamente ↗</a>
        <p style={trustLineCenter}>{'✓  1 render grátis · Sem cartão de crédito'}</p>
      </section>

      {/* ── Pricing ────────────────────────────────── */}
      <section id="planos" style={sect}>
        <div style={tagCenter}>{'// PLANOS'}</div>
        <h2 style={h2Center}>
          Comece a usar a NovaCena.{' '}
          <em style={emCyan}>Escolha seu plano</em>.
        </h2>
        <p style={subCenter}>Todos os recursos em todos os planos. Escolha o volume de renders.</p>

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
            return (
              <article key={plan.id} style={featured ? planFeatured : planCard}>
                {featured && <div style={planBadge}>Mais popular</div>}
                <h3 style={planTitleStyle}>{plan.name}</h3>
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
                      <span style={checkIcon}>{'✓'}</span> {f}
                    </li>
                  ))}
                  <li style={planFeatureItem}>
                    <span style={checkIcon}>{'✓'}</span> Vídeos até {plan.maxVideoSeconds}s
                  </li>
                </ul>
                <a
                  href={CTA_BILLING}
                  onClick={() => trackPlanClick(plan, cycle)}
                  style={featured ? planBtnFeat : planBtnNorm}
                >
                  Começar com {plan.name}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      <section style={faqSect}>
        <div style={tagCenter}>{'// DÚVIDAS'}</div>
        <h2 style={h2Center}>
          As perguntas que{' '}
          <em style={emCyan}>todo mundo faz</em>.
        </h2>
        <div style={faqList}>
          {faqs.map((faq, i) => (
            <div key={i} style={faqItem}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={faqQuestion}
              >
                <span>{faq.q}</span>
                <span style={faqIcon}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div style={faqAnswer}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────── */}
      <section style={finalSect}>
        <h2 style={h2Center}>
          Escolha o template. Troque a capa.{' '}
          <em style={emCyan}>Exporte na nuvem</em>.
        </h2>
        <p style={subCenter}>Teste grátis com 1 render de demonstração. Sem cartão.</p>
        <a href={CTA_URL} onClick={trackTrialClick} style={btnPrimary}>Teste gratuitamente ↗</a>
        <p style={trustLineCenter}>{'✓  Comece em 30 segundos'}</p>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer style={footer}>
        <div style={footerGrid}>
          <div style={footerBrandCol}>
            <div style={footerBrand}>NovaCena</div>
            <p style={footerTagline}>Motion studio online para<br />lançamentos musicais.</p>
          </div>
          <div style={footerCol}>
            <div style={footerColTitle}>PRODUTO</div>
            <a href="#como" style={footerLink}>Como funciona</a>
            <a href="#planos" style={footerLink}>Planos</a>
            <a href={CTA_URL} onClick={trackTrialClick} style={footerLink}>Teste gratuitamente</a>
          </div>
          <div style={footerCol}>
            <div style={footerColTitle}>CONTA</div>
            <a href="/login" style={footerLink}>Entrar</a>
            <a href={CTA_BILLING} onClick={() => trackMarketingEvent('InitiateCheckout', {
              content_name: 'NovaCena Motion footer',
              content_category: 'billing',
            })} style={footerLink}>Comprar renders</a>
          </div>
          <div style={footerCol}>
            <div style={footerColTitle}>LEGAL</div>
            <a href="/politica-de-privacidade" style={footerLink}>Política de Privacidade</a>
            <a href="/termos-de-uso" style={footerLink}>Termos de Uso</a>
            <a href="mailto:estudionovacena@gmail.com" style={footerLink}>Contato</a>
          </div>
        </div>
        <div style={footerBottom}>
          <span>© 2026 NovaCena. Todos os direitos reservados.</span>
          <span style={footerBuilt}>Feito para produtores musicais.</span>
        </div>
      </footer>
    </main>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const MONO = '"SF Mono", "Fira Code", Menlo, monospace';
const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#7B93FF';
const W = 'min(1200px, calc(100% - 48px))';

const page: CSSProperties = { height: '100%', overflow: 'auto', background: '#080a0f', color: '#e8e8ec', fontFamily: SANS, position: 'relative' };
const gridBg: CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, height: '100vh', pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(rgba(123,147,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(123,147,255,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)' };

/* ── Nav ── */
const nav: CSSProperties = { position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200, margin: '0 auto', height: 64, padding: '0 24px', background: 'rgba(8,10,15,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' };
const sectionZ: CSSProperties = { position: 'relative', zIndex: 1 };
const navLogo: CSSProperties = { color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' };
const navPill: CSSProperties = { display: 'flex', gap: 2, padding: '5px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
const navItem: CSSProperties = { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '7px 16px', borderRadius: 999 };
const navCta: CSSProperties = { color: '#000', textDecoration: 'none', background: '#fff', borderRadius: 999, padding: '8px 20px', fontWeight: 700, fontSize: 14 };
const navCtaMobile: CSSProperties = { ...navCta, padding: '7px 14px', fontSize: 13 };
const navItemMobile: CSSProperties = { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13, fontWeight: 600 };

/* ── Shared ── */
const tag: CSSProperties = { fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em' };
const tagCenter: CSSProperties = { ...tag, textAlign: 'center' };
const emCyan: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', color: ACCENT };
const emRed: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', color: '#e06c6c' };
const emWhite: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', color: '#ffffff' };
const h1: CSSProperties = { margin: 0, fontSize: 'clamp(34px, 4.8vw, 58px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.035em', color: '#fff' };
const h2: CSSProperties = { margin: 0, fontSize: 'clamp(30px, 4.2vw, 52px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#fff' };
const h2Center: CSSProperties = { ...h2, textAlign: 'center' };
const subMuted: CSSProperties = { margin: 0, fontSize: 17, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 };
const subCenter: CSSProperties = { ...subMuted, textAlign: 'center' };
const sect: CSSProperties = { width: W, margin: '0 auto', padding: '120px 0', display: 'grid', gap: 24, borderTop: '1px solid rgba(255,255,255,0.06)' };
const btnPrimary: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 52, padding: '0 32px', borderRadius: 999, background: '#fff', color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: 15 };
const btnGhost: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 52, padding: '0 32px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontWeight: 600, fontSize: 15 };
const trustLine: CSSProperties = { margin: 0, fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.25)' };
const trustLineCenter: CSSProperties = { ...trustLine, textAlign: 'center' };

/* ── CTA Banner ── */
const ctaBanner: CSSProperties = { width: W, margin: '0 auto', padding: '80px 0', display: 'grid', gap: 16, justifyItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' };

/* ── Hero ── */
const hero: CSSProperties = { width: W, margin: '0 auto', padding: '80px 0 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 60, alignItems: 'center' };
const heroMobile: CSSProperties = { width: W, margin: '0 auto', padding: '48px 0 40px', display: 'grid', gridTemplateColumns: '1fr', gap: 36, alignItems: 'center' };
const heroText: CSSProperties = { display: 'grid', gap: 26 };
const heroSub: CSSProperties = { margin: 0, fontSize: 17, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: 480 };
const heroBtns: CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' };
const heroVisual: CSSProperties = { display: 'grid', alignItems: 'center' };

/* Hero video */
const videoWrapper: CSSProperties = { position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0c0e14', aspectRatio: '16 / 9' };
const videoIframe: CSSProperties = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' };
const videoLabel: CSSProperties = { position: 'absolute', bottom: 12, right: 16, fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', zIndex: 2, pointerEvents: 'none' };
const videoPlaceholder: CSSProperties = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, rgba(123,147,255,0.08), rgba(123,147,255,0.02))' };
const videoPlayBtn: CSSProperties = { width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', fontSize: 22, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' };
const videoPlaceholderText: CSSProperties = { position: 'absolute', bottom: 40, fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' };

/* Hero mockup fallback */
const mockupFrame: CSSProperties = { borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#0c0e14', overflow: 'hidden' };
const mockupBar: CSSProperties = { display: 'flex', gap: 7, alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const dot: CSSProperties = { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' };
const mockupUrl: CSSProperties = { marginLeft: 12, fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)' };
const mockupBody: CSSProperties = { display: 'grid', gridTemplateColumns: '130px 1fr', minHeight: 340 };
const mockupSide: CSSProperties = { borderRight: '1px solid rgba(255,255,255,0.06)', padding: '14px 10px', display: 'grid', gap: 4, alignContent: 'start' };
const mockupSideItem: CSSProperties = { padding: '8px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', cursor: 'default' };
const mockupSideActive: CSSProperties = { ...mockupSideItem, background: `rgba(123,147,255,0.08)`, color: ACCENT, border: `1px solid rgba(123,147,255,0.12)` };
const mockupMain: CSSProperties = { padding: 14, display: 'grid', gap: 10, gridTemplateRows: '1fr auto' };
const mockupPreview: CSSProperties = { borderRadius: 10, background: `linear-gradient(145deg, rgba(123,147,255,0.04), rgba(123,147,255,0.01))`, border: `1px solid rgba(123,147,255,0.07)`, display: 'grid', placeItems: 'center', position: 'relative' };
const mockupPhone: CSSProperties = { width: 90, padding: 6, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', display: 'grid', gap: 6 };
const mockupPhoneScreen: CSSProperties = { display: 'grid', gap: 6, justifyItems: 'center', padding: '16px 8px' };
const mockupCover: CSSProperties = { width: 52, height: 52, borderRadius: 6, background: `linear-gradient(135deg, ${ACCENT}, #4B64CC)` };
const mockupWatchLabel: CSSProperties = { position: 'absolute', bottom: 10, right: 14, fontFamily: MONO, fontSize: 10, color: `rgba(123,147,255,0.4)`, letterSpacing: '0.08em' };
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
const painTextStyle: CSSProperties = { margin: 0, fontSize: 'clamp(16px, 1.8vw, 20px)', color: '#e06c6c', lineHeight: 1.5, fontWeight: 500 };
const painClose: CSSProperties = { margin: 0, fontSize: 'clamp(18px, 2vw, 24px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontWeight: 500, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' };

/* ── Steps ── */
const stepsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 16 };
const stepCard: CSSProperties = { display: 'grid', gap: 16, padding: '32px 28px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' };
const stepHeader: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const stepN: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', fontSize: 28, color: 'rgba(255,255,255,0.18)', lineHeight: 1 };
const stepLabel: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 6, border: `1px solid rgba(123,147,255,0.15)`, background: `rgba(123,147,255,0.06)` };
const stepTitle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' };
const stepDesc: CSSProperties = { margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7 };

/* ── For who ── */
const forGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, marginTop: 24 };
const forCol: CSSProperties = { display: 'grid', gap: 16, alignContent: 'start' };
const forRule: CSSProperties = { width: 40, height: 2, background: 'rgba(255,255,255,0.15)' };
const forLabelRed: CSSProperties = { fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#e06c6c', letterSpacing: '0.1em' };
const forLabelCyan: CSSProperties = { fontFamily: MONO, fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: '0.1em' };
const forText: CSSProperties = { margin: 0, fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 };
const testimonial: CSSProperties = { display: 'grid', gap: 6, marginTop: 16 };
const quoteText: CSSProperties = { margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: 'rgba(255,255,255,0.32)', lineHeight: 1.65 };
const quoteName: CSSProperties = { fontSize: 14, color: '#fff' };
const quoteRole: CSSProperties = { fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' };

/* ── Dual-row carousel ── */
const carouselSection: CSSProperties = { width: '100%', padding: '120px 0', display: 'grid', gap: 28, borderTop: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' };
const carouselTrack: CSSProperties = { width: '100%', overflow: 'hidden' };
const carouselInner: CSSProperties = { display: 'flex', gap: 16, width: 'max-content' };
const carouselCard: CSSProperties = { width: 340, flexShrink: 0, display: 'grid', gap: 14, padding: '22px 24px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', alignContent: 'start' };
const carouselStars: CSSProperties = { fontSize: 14, color: '#f59e0b', letterSpacing: 2 };
const carouselQuote: CSSProperties = { margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 };
const carouselDivider: CSSProperties = { width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' };
const carouselAuthor: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center' };
const carouselAvatar: CSSProperties = { width: 34, height: 34, borderRadius: '50%', background: `rgba(123,147,255,0.12)`, color: ACCENT, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 };
const carouselName: CSSProperties = { fontSize: 13, fontWeight: 600, color: '#fff' };
const carouselRole: CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, display: 'flex', gap: 6, alignItems: 'center' };
const verifiedBadge: CSSProperties = { fontSize: 10, color: ACCENT, fontWeight: 700, background: `rgba(123,147,255,0.08)`, padding: '2px 6px', borderRadius: 4, border: `1px solid rgba(123,147,255,0.15)` };
const ratingBadge: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', padding: '8px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', justifySelf: 'center' };
const ratingStars: CSSProperties = { fontSize: 14, color: '#f59e0b', letterSpacing: 2 };
const ratingText: CSSProperties = { fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' };

/* ── Video carousel ── */
const videoCarouselSect: CSSProperties = { width: '100%', padding: '120px 0', display: 'grid', gap: 32, borderTop: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' };
const vidCarousel: CSSProperties = { width: '100%', overflow: 'hidden', cursor: 'grab' };
const vidCarouselTrack: CSSProperties = { display: 'flex', gap: 20, width: 'max-content' };
const vidCard: CSSProperties = { position: 'relative', width: 360, flexShrink: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0c0e14', textDecoration: 'none', display: 'grid', gap: 0 };
const vidThumb: CSSProperties = { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' };
const vidOverlay: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: '16 / 9', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.25)' };
const vidPlay: CSSProperties = { width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', fontSize: 18, color: '#fff', backdropFilter: 'blur(8px)' };
const vidLabel: CSSProperties = { padding: '12px 16px 4px', fontSize: 14, fontWeight: 600, color: '#fff' };
const vidYt: CSSProperties = { padding: '0 16px 14px', fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' };
const vidPlaceholder: CSSProperties = { width: '100%', aspectRatio: '16 / 9', background: 'linear-gradient(135deg, rgba(123,147,255,0.06), rgba(123,147,255,0.02))', display: 'grid', placeItems: 'center' };

/* ── Pricing ── */
const cycleRow: CSSProperties = { display: 'inline-flex', gap: 4, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', justifySelf: 'center' };
const cycleBtn: CSSProperties = { border: 'none', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.4)', padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'grid', gap: 2, fontFamily: 'inherit' };
const cycleBtnActive: CSSProperties = { ...cycleBtn, background: 'rgba(255,255,255,0.08)', color: '#fff' };
const cycleSave: CSSProperties = { fontSize: 10, color: ACCENT, fontWeight: 600 };
const plansGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 };
const planCard: CSSProperties = { position: 'relative', display: 'grid', gap: 18, padding: 28, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const planFeatured: CSSProperties = { ...planCard, border: `1px solid rgba(123,147,255,0.25)`, background: `rgba(123,147,255,0.03)`, boxShadow: `0 0 80px rgba(123,147,255,0.06)` };
const planBadge: CSSProperties = { position: 'absolute', top: -11, left: 24, padding: '5px 14px', borderRadius: 999, background: ACCENT, color: '#000', fontSize: 12, fontWeight: 700 };
const planTitleStyle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 800 };
const planDesc: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: 14, lineHeight: 1.5, minHeight: 42 };
const planPriceVal: CSSProperties = { fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' };
const planPricePer: CSSProperties = { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 };
const planTokenBadge: CSSProperties = { padding: '7px 14px', borderRadius: 8, background: `rgba(123,147,255,0.06)`, border: `1px solid rgba(123,147,255,0.12)`, color: ACCENT, fontWeight: 700, fontSize: 13, justifySelf: 'start' };
const planFeatures: CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 };
const planFeatureItem: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', color: 'rgba(255,255,255,0.48)', fontSize: 14 };
const checkIcon: CSSProperties = { color: ACCENT, fontWeight: 700, flexShrink: 0 };
const planBtnNorm: CSSProperties = { display: 'grid', placeItems: 'center', height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.08)' };
const planBtnFeat: CSSProperties = { ...planBtnNorm, background: '#fff', color: '#000', border: '1px solid #fff' };

/* ── FAQ ── */
const faqSect: CSSProperties = { width: W, margin: '0 auto', padding: '120px 0', display: 'grid', gap: 40, borderTop: '1px solid rgba(255,255,255,0.06)' };
const faqList: CSSProperties = { width: 'min(720px, 100%)', margin: '0 auto', display: 'grid', gap: 0 };
const faqItem: CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.07)' };
const faqQuestion: CSSProperties = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', background: 'none', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' };
const faqIcon: CSSProperties = { fontSize: 22, color: 'rgba(255,255,255,0.3)', fontWeight: 300, flexShrink: 0, marginLeft: 16 };
const faqAnswer: CSSProperties = { padding: '0 0 22px', fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 };

/* ── Final CTA ── */
const finalSect: CSSProperties = { width: W, margin: '0 auto', padding: '120px 0 140px', display: 'grid', gap: 20, justifyItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' };

/* ── Footer ── */
const footer: CSSProperties = { width: W, margin: '0 auto', padding: '56px 0 40px', display: 'grid', gap: 40, borderTop: '1px solid rgba(255,255,255,0.06)' };
const footerGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32 };
const footerBrandCol: CSSProperties = { display: 'grid', gap: 8, alignContent: 'start' };
const footerBrand: CSSProperties = { fontWeight: 800, fontSize: 16, color: '#fff' };
const footerTagline: CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 13, lineHeight: 1.5 };
const footerCol: CSSProperties = { display: 'grid', gap: 10, alignContent: 'start' };
const footerColTitle: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 4 };
const footerLink: CSSProperties = { color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: 13 };
const footerBottom: CSSProperties = { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, color: 'rgba(255,255,255,0.15)', fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20 };
const footerBuilt: CSSProperties = { color: 'rgba(255,255,255,0.15)' };
