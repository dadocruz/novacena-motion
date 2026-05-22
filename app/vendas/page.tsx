'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BILLING_CYCLES, planPrice, SAAS_PLANS, type BillingCycle } from '../../lib/saasPlans';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function SalesPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const selectedCycle = useMemo(
    () => BILLING_CYCLES.find((item) => item.id === cycle) ?? BILLING_CYCLES[0],
    [cycle]
  );
  const months = cycle === 'monthly' ? 1 : cycle === 'annual' ? 12 : 36;

  return (
    <main style={page}>
      <nav style={nav}>
        <a href="/vendas" style={brand}>NovaCena</a>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/login" style={navLink}>Entrar</a>
          <a href="/login?mode=signup&next=/billing" style={navCta}>Começar</a>
        </div>
      </nav>

      <section style={hero}>
        <div style={heroCopy}>
          <div style={eyebrow}>Motion studio para lançamentos musicais</div>
          <h1 style={title}>Crie vídeos profissionais de divulgação em minutos.</h1>
          <p style={subtitle}>
            Templates prontos para story e feed, edição visual no navegador e exportação em nuvem. Ideal para artistas,
            social medias, selos e produtoras que precisam lançar conteúdo com velocidade.
          </p>
          <div style={heroActions}>
            <a href="#planos" style={primaryCta}>Ver pacotes</a>
            <a href="/login?mode=signup&next=/" style={secondaryCta}>Testar com 1 render</a>
          </div>
          <div style={proofGrid}>
            <div><strong>Story + feed</strong><span>formatos sociais</span></div>
            <div><strong>1 render</strong><span>demonstração grátis</span></div>
            <div><strong>100% online</strong><span>sem instalar nada</span></div>
          </div>
        </div>
        <div style={previewPanel}>
          <div style={phoneFrame}>
            <div style={phoneVideo}>
              <span>OUT NOW</span>
              <strong>Nova Cena</strong>
              <small>single disponível</small>
            </div>
          </div>
          <div style={previewStats}>
            <div><strong>Exportação</strong><span>via nuvem</span></div>
            <div><strong>Templates</strong><span>campanhas prontas</span></div>
          </div>
        </div>
      </section>

      <section style={featureBand}>
        {[
          ['Editor visual', 'Ajuste capas, textos, vídeo de fundo, overlays, cor e movimento em um fluxo simples.'],
          ['Templates de lançamento', 'Pacotes para disponível agora, YouTube, marco de streams, Spotify print e mais.'],
          ['1 render grátis', 'A conta de demonstração libera uma exportação. Depois disso, o cliente compra um pacote para continuar.'],
        ].map(([heading, text]) => (
          <article key={heading} style={featureCard}>
            <h2>{heading}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section style={conversionBand}>
        <div>
          <div style={eyebrow}>Feito para vender lançamento</div>
          <h2 style={conversionTitle}>O produtor vê o template, ajusta em minutos e compra renders para lançar mais rápido.</h2>
        </div>
        <a href="/login?mode=signup&next=/" style={primaryCta}>Entrar e testar</a>
      </section>

      <section style={workflowSection}>
        {[
          ['1', 'Escolha um template', 'Comece por modelos prontos para single, pré-save, Spotify, YouTube e marcos de streams.'],
          ['2', 'Personalize a campanha', 'Troque capa, texto, fundo, logos, overlays e movimento sem abrir After Effects.'],
          ['3', 'Exporte e compre renders', 'Use o render grátis, veja o resultado e carregue novos pacotes via Pix quando quiser continuar.'],
        ].map(([number, heading, text]) => (
          <article key={heading} style={workflowCard}>
            <strong>{number}</strong>
            <h3>{heading}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section id="planos" style={pricingSection}>
        <div style={sectionHeader}>
          <div>
            <div style={eyebrow}>Pacotes</div>
            <h2 style={sectionTitle}>Escolha como quer pagar</h2>
          </div>
          <div style={cycleSwitch}>
            {BILLING_CYCLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCycle(item.id)}
                style={cycle === item.id ? cycleButtonActive : cycleButton}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={plansGrid}>
          {SAAS_PLANS.map((plan) => {
            const price = planPrice(plan, cycle);
            const signupUrl = `/login?mode=signup&next=${encodeURIComponent('/billing')}`;
            return (
              <article key={plan.id} style={plan.id === 'pro' ? planCardFeatured : planCard}>
                {plan.id === 'pro' && <div style={badge}>Mais escolhido</div>}
                <h3 style={planTitle}>{plan.name}</h3>
                <p style={planDescription}>{plan.description}</p>
                <div>
                  <div style={priceText}>{formatBRL(price)}</div>
                  <div style={priceSub}>
                    {cycle === 'monthly' ? 'por mês' : `por ${months} meses`}
                    {selectedCycle.discountLabel ? ` · ${selectedCycle.discountLabel}` : ''}
                  </div>
                </div>
                <div style={tokenLine}>{plan.includedTokens * months} renders no ciclo</div>
                <ul style={featureList}>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                  <li>Vídeos até {plan.maxVideoSeconds}s</li>
                </ul>
                <a href={signupUrl} style={plan.id === 'pro' ? primaryPlanButton : planButton}>
                  Comprar {plan.name}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <footer style={footer}>
        <span>NovaCena Motion Studio</span>
        <a href="/login">Entrar no estúdio</a>
      </footer>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: '100vh',
  background: '#090a0c',
  color: '#f7f4ef',
  overflowX: 'hidden',
};

const nav: CSSProperties = {
  height: 72,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
};

const brand: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 900,
  fontSize: 18,
};

const navLink: CSSProperties = {
  color: 'rgba(255,255,255,0.72)',
  textDecoration: 'none',
  fontWeight: 800,
};

const navCta: CSSProperties = {
  color: '#111',
  textDecoration: 'none',
  background: '#f4d35e',
  borderRadius: 8,
  padding: '10px 14px',
  fontWeight: 900,
};

const hero: CSSProperties = {
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
  minHeight: 'calc(100vh - 120px)',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.02fr) minmax(300px, 0.78fr)',
  gap: 36,
  alignItems: 'center',
  padding: '24px 0 58px',
};

const heroCopy: CSSProperties = {
  display: 'grid',
  gap: 22,
};

const eyebrow: CSSProperties = {
  color: '#70e0b1',
  textTransform: 'uppercase',
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '0.08em',
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(42px, 7vw, 84px)',
  lineHeight: 0.96,
  letterSpacing: 0,
  maxWidth: 840,
};

const subtitle: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.72)',
  fontSize: 18,
  lineHeight: 1.55,
  maxWidth: 680,
};

const heroActions: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
};

const primaryCta: CSSProperties = {
  color: '#111',
  textDecoration: 'none',
  background: '#f4d35e',
  borderRadius: 8,
  padding: '13px 18px',
  fontWeight: 900,
};

const secondaryCta: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 8,
  padding: '13px 18px',
  fontWeight: 900,
};

const proofGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 12,
  maxWidth: 660,
};

const previewPanel: CSSProperties = {
  display: 'grid',
  gap: 14,
  justifyItems: 'center',
};

const phoneFrame: CSSProperties = {
  width: 'min(330px, 100%)',
  aspectRatio: '9 / 16',
  borderRadius: 28,
  padding: 12,
  background: '#17191f',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 34px 100px rgba(0,0,0,0.48)',
};

const phoneVideo: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 20,
  display: 'grid',
  alignContent: 'center',
  justifyItems: 'center',
  gap: 10,
  color: '#fff',
  background: 'linear-gradient(145deg, #101820 0%, #1c4d4d 42%, #c77d3d 100%)',
};

const previewStats: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  width: 'min(330px, 100%)',
};

const featureBand: CSSProperties = {
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
  padding: '36px 0',
};

const featureCard: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: 20,
  background: 'rgba(255,255,255,0.045)',
};

const conversionBand: CSSProperties = {
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 20,
  flexWrap: 'wrap',
  padding: 24,
  borderRadius: 8,
  border: '1px solid rgba(244,211,94,0.34)',
  background: 'linear-gradient(135deg, rgba(244,211,94,0.12), rgba(112,224,177,0.08))',
};

const conversionTitle: CSSProperties = {
  margin: '8px 0 0',
  maxWidth: 760,
  fontSize: 28,
  lineHeight: 1.12,
};

const workflowSection: CSSProperties = {
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
  padding: '34px 0 22px',
};

const workflowCard: CSSProperties = {
  display: 'grid',
  gap: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: 20,
  background: '#111318',
};

const pricingSection: CSSProperties = {
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
  display: 'grid',
  gap: 22,
  padding: '48px 0 64px',
};

const sectionHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'end',
  flexWrap: 'wrap',
};

const sectionTitle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 38,
};

const cycleSwitch: CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: 4,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
};

const cycleButton: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'rgba(255,255,255,0.72)',
  padding: '10px 12px',
  fontWeight: 900,
};

const cycleButtonActive: CSSProperties = {
  ...cycleButton,
  background: '#fff',
  color: '#111',
};

const plansGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
};

const planCard: CSSProperties = {
  position: 'relative',
  display: 'grid',
  gap: 16,
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: 22,
  background: '#111318',
};

const planCardFeatured: CSSProperties = {
  ...planCard,
  border: '1px solid rgba(244,211,94,0.64)',
  background: '#151412',
};

const badge: CSSProperties = {
  justifySelf: 'start',
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(112,224,177,0.14)',
  color: '#70e0b1',
  fontSize: 12,
  fontWeight: 900,
};

const planTitle: CSSProperties = {
  margin: 0,
  fontSize: 24,
};

const planDescription: CSSProperties = {
  margin: 0,
  minHeight: 48,
  color: 'rgba(255,255,255,0.64)',
  lineHeight: 1.45,
};

const priceText: CSSProperties = {
  fontSize: 34,
  fontWeight: 950,
};

const priceSub: CSSProperties = {
  color: 'rgba(255,255,255,0.52)',
  fontSize: 13,
};

const tokenLine: CSSProperties = {
  color: '#f4d35e',
  fontWeight: 900,
};

const featureList: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: 'grid',
  gap: 8,
  color: 'rgba(255,255,255,0.72)',
};

const planButton: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  minHeight: 44,
  borderRadius: 8,
  background: '#fff',
  color: '#111',
  textDecoration: 'none',
  fontWeight: 950,
};

const primaryPlanButton: CSSProperties = {
  ...planButton,
  background: '#f4d35e',
};

const footer: CSSProperties = {
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  padding: '24px 0 36px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  flexWrap: 'wrap',
  color: 'rgba(255,255,255,0.56)',
};
