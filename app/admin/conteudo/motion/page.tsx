'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SiteContent, SiteLogo, SiteTestimonialVideo, SiteReview, SiteFaq } from '../../../../lib/siteContentTypes';

const EMPTY_CONTENT: SiteContent = {
  heroVideoId: '',
  heroTagline: '',
  heroTitle: '',
  heroSubtitle: '',
  trustLine: '',
  logos: [],
  testimonialVideos: [],
  reviews: [],
  faqs: [],
};

/* ── Section IDs for collapse state ── */
type SectionId = 'hero' | 'logos' | 'videos' | 'reviews' | 'faqs';

export default function ConteudoPage() {
  const [token, setToken] = useState('');
  const [content, setContent] = useState<SiteContent>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    hero: false,
    logos: true,
    videos: true,
    reviews: true,
    faqs: true,
  });

  /* ── Auth: load token from localStorage ── */
  useEffect(() => {
    const saved = window.localStorage.getItem('novacena:adminToken') || '';
    setToken(saved);
    if (saved) loadContent(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load content ── */
  async function loadContent(authToken = token) {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/site-content', {
        headers: { 'x-novacena-admin-token': authToken },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessageKind('error');
        setMessage(
          res.status === 401
            ? 'Chave administrativa invalida. Confira o valor de NOVACENA_ADMIN_TOKEN na VPS.'
            : data.error || 'Nao foi possivel carregar conteudo.',
        );
        return;
      }
      window.localStorage.setItem('novacena:adminToken', authToken);
      setContent(data.content);
      setHasLoaded(true);
      setMessageKind('success');
      setMessage('Conteudo carregado com sucesso.');
    } catch {
      setMessageKind('error');
      setMessage('Nao foi possivel carregar conteudo.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Save content ── */
  async function saveContent() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/site-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-novacena-admin-token': token,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessageKind('error');
        setMessage(data.error || 'Nao foi possivel salvar.');
        return;
      }
      setMessageKind('success');
      setMessage('Conteudo salvo com sucesso!');
    } catch {
      setMessageKind('error');
      setMessage('Erro ao salvar conteudo.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Collapse toggle ── */
  function toggle(id: SectionId) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /* ── Field updaters ── */
  function updateField<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Logo helpers ── */
  function addLogo() {
    updateField('logos', [...content.logos, { name: '', src: '' }]);
  }
  function updateLogo(i: number, field: keyof SiteLogo, value: string) {
    const next = [...content.logos];
    next[i] = { ...next[i], [field]: value };
    updateField('logos', next);
  }
  function removeLogo(i: number) {
    updateField('logos', content.logos.filter((_, idx) => idx !== i));
  }

  /* ── Testimonial video helpers ── */
  function addVideo() {
    updateField('testimonialVideos', [...content.testimonialVideos, { youtubeId: '', label: '' }]);
  }
  function updateVideo(i: number, field: keyof SiteTestimonialVideo, value: string) {
    const next = [...content.testimonialVideos];
    next[i] = { ...next[i], [field]: value };
    updateField('testimonialVideos', next);
  }
  function removeVideo(i: number) {
    updateField('testimonialVideos', content.testimonialVideos.filter((_, idx) => idx !== i));
  }

  /* ── Review helpers ── */
  function addReview() {
    updateField('reviews', [
      ...content.reviews,
      { name: '', initials: '', role: '', text: '', verified: false },
    ]);
  }
  function updateReview(i: number, field: keyof SiteReview, value: string | boolean) {
    const next = [...content.reviews];
    next[i] = { ...next[i], [field]: value };
    updateField('reviews', next);
  }
  function removeReview(i: number) {
    updateField('reviews', content.reviews.filter((_, idx) => idx !== i));
  }

  /* ── FAQ helpers ── */
  function addFaq() {
    updateField('faqs', [...content.faqs, { q: '', a: '' }]);
  }
  function updateFaq(i: number, field: keyof SiteFaq, value: string) {
    const next = [...content.faqs];
    next[i] = { ...next[i], [field]: value };
    updateField('faqs', next);
  }
  function removeFaq(i: number) {
    updateField('faqs', content.faqs.filter((_, idx) => idx !== i));
  }

  /* ── Section header component ── */
  function SectionHeader({
    id,
    tag: tagText,
    title,
    count,
  }: {
    id: SectionId;
    tag: string;
    title: string;
    count?: number;
  }) {
    return (
      <div style={sectionHeaderStyle} onClick={() => toggle(id)}>
        <div>
          <div style={tag}>{tagText}</div>
          <h2 style={cardTitle}>
            {title}
            {count !== undefined && (
              <span style={countBadge}>{count}</span>
            )}
          </h2>
        </div>
        <span style={collapseIcon}>{collapsed[id] ? '+' : '−'}</span>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */

  return (
    <main style={page}>
      {/* ── Nav ── */}
      <nav style={nav}>
        <a href="/motion" style={navLogo}>NovaCena</a>
        <div style={navRight}>
          <span style={navBadge}>Conteudo</span>
          <a href="/admin-motion" style={navLink}>Painel</a>
          <a href="/motion" style={navLink}>Ver site</a>
        </div>
      </nav>

      <div style={shell}>
        {/* ── Header ── */}
        <header style={header}>
          <div style={tag}>{'// GESTOR DE CONTEUDO'}</div>
          <h1 style={h1}>Conteudo da pagina de vendas</h1>
          <p style={sub}>
            Edite textos, videos, depoimentos e FAQ da landing page sem mexer em codigo.
          </p>
        </header>

        {/* ── Auth ── */}
        <section style={authCard}>
          <div style={authInfo}>
            <h2 style={cardTitle}>Acesso administrativo</h2>
            <p style={cardDesc}>
              Cole a chave definida em{' '}
              <strong style={{ color: '#e8e8ec' }}>NOVACENA_ADMIN_TOKEN</strong>.
            </p>
          </div>
          <div style={authForm}>
            <input
              aria-label="Token administrativo"
              type="password"
              placeholder="Chave administrativa"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={input}
            />
            <button
              onClick={() => loadContent()}
              disabled={!token || loading}
              style={btnPrimary}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </div>
        </section>

        {/* ── Messages ── */}
        {message && (
          <div style={messageKind === 'error' ? noticeError : noticeSuccess}>
            {message}
          </div>
        )}

        {/* ── Content editor ── */}
        {hasLoaded && (
          <>
            {/* ═══ HERO ═══ */}
            <section style={sectionCard}>
              <SectionHeader id="hero" tag="// HERO" title="Hero" />
              {!collapsed.hero && (
                <div style={sectionBody}>
                  <div style={fieldGroup}>
                    <label style={label}>Video ID (YouTube)</label>
                    <input
                      style={input}
                      placeholder="Ex: dQw4w9WgXcQ"
                      value={content.heroVideoId}
                      onChange={(e) => updateField('heroVideoId', e.target.value)}
                    />
                    {content.heroVideoId && (
                      <img
                        src={`https://img.youtube.com/vi/${content.heroVideoId}/mqdefault.jpg`}
                        alt="Thumbnail do video"
                        style={thumbPreview}
                      />
                    )}
                  </div>
                  <div style={fieldGroup}>
                    <label style={label}>Tagline</label>
                    <input
                      style={input}
                      placeholder="Ex: // MOTION PARA LANCAMENTOS MUSICAIS"
                      value={content.heroTagline}
                      onChange={(e) => updateField('heroTagline', e.target.value)}
                    />
                  </div>
                  <div style={fieldGroup}>
                    <label style={label}>Titulo</label>
                    <textarea
                      style={textarea}
                      rows={3}
                      placeholder="Titulo principal do hero"
                      value={content.heroTitle}
                      onChange={(e) => updateField('heroTitle', e.target.value)}
                    />
                  </div>
                  <div style={fieldGroup}>
                    <label style={label}>Subtitulo</label>
                    <textarea
                      style={textarea}
                      rows={3}
                      placeholder="Descricao abaixo do titulo"
                      value={content.heroSubtitle}
                      onChange={(e) => updateField('heroSubtitle', e.target.value)}
                    />
                  </div>
                  <div style={fieldGroup}>
                    <label style={label}>Linha de confianca</label>
                    <input
                      style={input}
                      placeholder="Ex: 1 render de demonstracao gratis"
                      value={content.trustLine}
                      onChange={(e) => updateField('trustLine', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* ═══ LOGOS ═══ */}
            <section style={sectionCard}>
              <SectionHeader
                id="logos"
                tag="// LOGOS"
                title="Logos das Plataformas"
                count={content.logos.length}
              />
              {!collapsed.logos && (
                <div style={sectionBody}>
                  {content.logos.map((logo, i) => (
                    <div key={i} style={itemRow}>
                      <div style={itemFields}>
                        <input
                          style={inputSm}
                          placeholder="Nome da plataforma"
                          value={logo.name}
                          onChange={(e) => updateLogo(i, 'name', e.target.value)}
                        />
                        <input
                          style={inputSm}
                          placeholder="Caminho da imagem (ex: /logos/spotify.svg)"
                          value={logo.src}
                          onChange={(e) => updateLogo(i, 'src', e.target.value)}
                        />
                      </div>
                      <button style={btnRemove} onClick={() => removeLogo(i)}>
                        Remover
                      </button>
                    </div>
                  ))}
                  <button style={btnAdd} onClick={addLogo}>
                    + Adicionar logo
                  </button>
                </div>
              )}
            </section>

            {/* ═══ VIDEOS ═══ */}
            <section style={sectionCard}>
              <SectionHeader
                id="videos"
                tag="// DEPOIMENTOS VIDEO"
                title="Videos de Depoimentos"
                count={content.testimonialVideos.length}
              />
              {!collapsed.videos && (
                <div style={sectionBody}>
                  {content.testimonialVideos.map((vid, i) => (
                    <div key={i} style={itemRow}>
                      <div style={itemFields}>
                        <input
                          style={inputSm}
                          placeholder="YouTube Video ID"
                          value={vid.youtubeId}
                          onChange={(e) => updateVideo(i, 'youtubeId', e.target.value)}
                        />
                        <input
                          style={inputSm}
                          placeholder="Legenda do video"
                          value={vid.label}
                          onChange={(e) => updateVideo(i, 'label', e.target.value)}
                        />
                      </div>
                      {vid.youtubeId && (
                        <img
                          src={`https://img.youtube.com/vi/${vid.youtubeId}/mqdefault.jpg`}
                          alt={`Thumbnail: ${vid.label || vid.youtubeId}`}
                          style={thumbSmall}
                        />
                      )}
                      <button style={btnRemove} onClick={() => removeVideo(i)}>
                        Remover
                      </button>
                    </div>
                  ))}
                  <button style={btnAdd} onClick={addVideo}>
                    + Adicionar video
                  </button>
                </div>
              )}
            </section>

            {/* ═══ REVIEWS ═══ */}
            <section style={sectionCard}>
              <SectionHeader
                id="reviews"
                tag="// DEPOIMENTOS TEXTO"
                title="Depoimentos (Texto)"
                count={content.reviews.length}
              />
              {!collapsed.reviews && (
                <div style={sectionBody}>
                  {content.reviews.map((review, i) => (
                    <div key={i} style={reviewCard}>
                      <div style={reviewGrid}>
                        <div style={fieldGroup}>
                          <label style={labelSm}>Nome</label>
                          <input
                            style={inputSm}
                            placeholder="Nome completo"
                            value={review.name}
                            onChange={(e) => updateReview(i, 'name', e.target.value)}
                          />
                        </div>
                        <div style={fieldGroup}>
                          <label style={labelSm}>Iniciais</label>
                          <input
                            style={inputSm}
                            placeholder="Ex: LM"
                            value={review.initials}
                            onChange={(e) => updateReview(i, 'initials', e.target.value)}
                          />
                        </div>
                        <div style={fieldGroup}>
                          <label style={labelSm}>Cargo / Funcao</label>
                          <input
                            style={inputSm}
                            placeholder="Ex: Produtor musical"
                            value={review.role}
                            onChange={(e) => updateReview(i, 'role', e.target.value)}
                          />
                        </div>
                        <div style={{ ...fieldGroup, gridColumn: '1 / -1' }}>
                          <label style={labelSm}>Depoimento</label>
                          <textarea
                            style={{ ...textarea, minHeight: 60 }}
                            rows={2}
                            placeholder="Texto do depoimento"
                            value={review.text}
                            onChange={(e) => updateReview(i, 'text', e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={reviewFooter}>
                        <label style={checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={review.verified}
                            onChange={(e) => updateReview(i, 'verified', e.target.checked)}
                            style={checkbox}
                          />
                          Verificado
                        </label>
                        <button style={btnRemove} onClick={() => removeReview(i)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                  <button style={btnAdd} onClick={addReview}>
                    + Adicionar depoimento
                  </button>
                </div>
              )}
            </section>

            {/* ═══ FAQ ═══ */}
            <section style={sectionCard}>
              <SectionHeader
                id="faqs"
                tag="// FAQ"
                title="Perguntas Frequentes"
                count={content.faqs.length}
              />
              {!collapsed.faqs && (
                <div style={sectionBody}>
                  {content.faqs.map((faq, i) => (
                    <div key={i} style={itemRow}>
                      <div style={{ ...itemFields, flexDirection: 'column' }}>
                        <input
                          style={inputSm}
                          placeholder="Pergunta"
                          value={faq.q}
                          onChange={(e) => updateFaq(i, 'q', e.target.value)}
                        />
                        <textarea
                          style={{ ...textarea, minHeight: 50 }}
                          rows={2}
                          placeholder="Resposta"
                          value={faq.a}
                          onChange={(e) => updateFaq(i, 'a', e.target.value)}
                        />
                      </div>
                      <button style={btnRemove} onClick={() => removeFaq(i)}>
                        Remover
                      </button>
                    </div>
                  ))}
                  <button style={btnAdd} onClick={addFaq}>
                    + Adicionar pergunta
                  </button>
                </div>
              )}
            </section>

            {/* ── Save bar ── */}
            <div style={saveBar}>
              <button
                onClick={saveContent}
                disabled={saving}
                style={btnSave}
              >
                {saving ? 'Salvando...' : 'Salvar alteracoes'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* ==================================================================
   Styles
   ================================================================== */

const MONO = '"SF Mono", "Fira Code", Menlo, monospace';
const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#7B93FF';

const page: CSSProperties = {
  height: '100%',
  overflow: 'auto',
  background: '#080a0f',
  color: '#e8e8ec',
  fontFamily: SANS,
};

/* ── Nav ── */
const nav: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  maxWidth: 1200,
  width: '100%',
  margin: '0 auto',
  height: 56,
  padding: '0 24px',
  background: 'rgba(8,10,15,0.85)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};

const navLogo: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 800,
  fontSize: 16,
  letterSpacing: '-0.02em',
};

const navRight: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
};

const navBadge: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 700,
  color: ACCENT,
  letterSpacing: '0.06em',
  padding: '4px 10px',
  borderRadius: 6,
  border: `1px solid rgba(123,147,255,0.15)`,
  background: 'rgba(123,147,255,0.06)',
};

const navLink: CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
};

/* ── Shared ── */
const tag: CSSProperties = {
  fontFamily: MONO,
  fontSize: 13,
  color: 'rgba(255,255,255,0.28)',
  letterSpacing: '0.08em',
};

const h1: CSSProperties = {
  margin: '12px 0 0',
  fontSize: 'clamp(28px, 3.5vw, 42px)',
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: '-0.03em',
  color: '#fff',
};

const sub: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 16,
  color: 'rgba(255,255,255,0.4)',
  lineHeight: 1.6,
  maxWidth: 520,
};

const shell: CSSProperties = {
  maxWidth: 1200,
  width: '100%',
  margin: '0 auto',
  padding: '0 24px 120px',
  display: 'grid',
  gap: 20,
};

const header: CSSProperties = {
  padding: '40px 0 0',
  display: 'grid',
  gap: 4,
};

const cardTitle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const cardDesc: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 14,
  color: 'rgba(255,255,255,0.4)',
  lineHeight: 1.5,
};

/* ── Auth ── */
const authCard: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 24,
  alignItems: 'center',
  padding: '24px 28px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
};

const authInfo: CSSProperties = {};

const authForm: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 10,
};

/* ── Inputs ── */
const input: CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  padding: '0 14px',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
};

const inputSm: CSSProperties = {
  ...input,
  height: 38,
  fontSize: 13,
  padding: '0 10px',
};

const textarea: CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  padding: '10px 14px',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
  minHeight: 80,
};

/* ── Labels ── */
const label: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 4,
};

const labelSm: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 2,
};

/* ── Buttons ── */
const btnPrimary: CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: 'none',
  background: '#fff',
  color: '#000',
  fontWeight: 700,
  fontSize: 14,
  padding: '0 22px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnAdd: CSSProperties = {
  height: 40,
  borderRadius: 10,
  border: `1px dashed rgba(123,147,255,0.3)`,
  background: 'rgba(123,147,255,0.06)',
  color: ACCENT,
  fontWeight: 700,
  fontSize: 13,
  padding: '0 20px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  width: '100%',
};

const btnRemove: CSSProperties = {
  height: 34,
  borderRadius: 8,
  border: '1px solid rgba(224,108,108,0.2)',
  background: 'rgba(224,108,108,0.06)',
  color: '#e06c6c',
  fontWeight: 600,
  fontSize: 12,
  padding: '0 14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const btnSave: CSSProperties = {
  height: 48,
  borderRadius: 12,
  border: 'none',
  background: ACCENT,
  color: '#000',
  fontWeight: 700,
  fontSize: 15,
  padding: '0 36px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  minWidth: 200,
};

/* ── Notices ── */
const noticeBase: CSSProperties = {
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
};

const noticeError: CSSProperties = {
  ...noticeBase,
  background: 'rgba(224,108,108,0.1)',
  border: '1px solid rgba(224,108,108,0.2)',
  color: '#e06c6c',
};

const noticeSuccess: CSSProperties = {
  ...noticeBase,
  background: 'rgba(123,147,255,0.08)',
  border: '1px solid rgba(123,147,255,0.15)',
  color: ACCENT,
};

/* ── Section cards ── */
const sectionCard: CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
  overflow: 'hidden',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 24px',
  cursor: 'pointer',
  userSelect: 'none',
};

const collapseIcon: CSSProperties = {
  fontFamily: MONO,
  fontSize: 20,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.3)',
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  flexShrink: 0,
};

const sectionBody: CSSProperties = {
  padding: '0 24px 24px',
  display: 'grid',
  gap: 16,
};

const countBadge: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 700,
  color: ACCENT,
  padding: '2px 8px',
  borderRadius: 5,
  background: 'rgba(123,147,255,0.1)',
  border: '1px solid rgba(123,147,255,0.15)',
};

/* ── Field groups ── */
const fieldGroup: CSSProperties = {
  display: 'grid',
  gap: 4,
};

/* ── Item rows (logos, videos, faqs) ── */
const itemRow: CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  padding: '16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.05)',
  background: 'rgba(0,0,0,0.15)',
};

const itemFields: CSSProperties = {
  display: 'flex',
  gap: 10,
  flex: 1,
  flexWrap: 'wrap',
};

/* ── Review cards ── */
const reviewCard: CSSProperties = {
  padding: '16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.05)',
  background: 'rgba(0,0,0,0.15)',
  display: 'grid',
  gap: 12,
};

const reviewGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 100px 1fr',
  gap: 12,
};

const reviewFooter: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 8,
  borderTop: '1px solid rgba(255,255,255,0.05)',
};

const checkboxLabel: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
};

const checkbox: CSSProperties = {
  accentColor: ACCENT,
  width: 16,
  height: 16,
  cursor: 'pointer',
};

/* ── Thumbnails ── */
const thumbPreview: CSSProperties = {
  width: 320,
  maxWidth: '100%',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  marginTop: 8,
};

const thumbSmall: CSSProperties = {
  width: 120,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.08)',
  flexShrink: 0,
  alignSelf: 'center',
};

/* ── Save bar ── */
const saveBar: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  padding: '16px 24px',
  background: 'linear-gradient(to top, rgba(8,10,15,0.98), rgba(8,10,15,0.8) 60%, transparent)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  zIndex: 200,
};
