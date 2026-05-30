'use client';

import { type CSSProperties, FormEvent, useEffect, useState } from 'react';

const MONO = '"SF Mono", "Fira Code", Menlo, monospace';
const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#7B93FF';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nextPath, setNextPath] = useState('/estudio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'signup') setMode('signup');
    const next = params.get('next');
    if (next?.startsWith('/')) setNextPath(next);
    const errorCode = params.get('error');
    if (errorCode === 'google_not_configured') {
      setError('Login com Google ainda não está configurado no servidor.');
    } else if (errorCode === 'google_failed') {
      setError('Não foi possível entrar com Google. Tente novamente.');
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, name, email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error || 'Não foi possível entrar.');
        return;
      }
      window.location.href = nextPath;
    } catch {
      setError('Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.includes('@') && password.length >= 6 && (mode === 'login' || name.trim().length >= 2);

  return (
    <main style={page}>
      <div style={wrapper}>
        {/* ── Brand ── */}
        <a href="/motion" style={brandLink}>
          <span style={brandName}>NovaCena</span>
          <span style={brandTag}>Motion Studio</span>
        </a>

        {/* ── Card ── */}
        <form onSubmit={submit} style={card}>
          <div style={cardHeader}>
            <h1 style={h1}>{mode === 'login' ? 'Entrar no estúdio' : 'Criar sua conta'}</h1>
            <p style={sub}>
              {mode === 'login'
                ? 'Acesse o editor de motion para seus lançamentos.'
                : 'Crie sua conta e teste com 1 render de demonstração gratuito.'}
            </p>
          </div>

          {/* ── Tabs ── */}
          <div style={tabRow}>
            <button type="button" onClick={() => setMode('login')} style={mode === 'login' ? tabActive : tab}>
              Entrar
            </button>
            <button type="button" onClick={() => setMode('signup')} style={mode === 'signup' ? tabActive : tab}>
              Criar conta
            </button>
          </div>

          {/* ── Google ── */}
          <a href={`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`} style={googleBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </a>

          <div style={divider}>
            <span style={dividerLine} />
            <span style={dividerText}>ou com email</span>
            <span style={dividerLine} />
          </div>

          {/* ── Fields ── */}
          <div style={fieldsGrid}>
            {mode === 'signup' && (
              <label style={label}>
                <span style={labelText}>Nome</span>
                <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="Seu nome" />
              </label>
            )}
            <label style={label}>
              <span style={labelText}>Email</span>
              <input autoFocus={mode === 'login'} type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} placeholder="seu@email.com" />
            </label>
            <label style={label}>
              <span style={labelText}>Senha</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} placeholder="Mínimo 6 caracteres" />
            </label>
          </div>

          {/* ── Error ── */}
          {error && <div style={errorBox}>{error}</div>}

          {/* ── Submit ── */}
          <button disabled={loading || !canSubmit} style={{ ...btnPrimary, opacity: loading || !canSubmit ? 0.45 : 1 }}>
            {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          <div style={footerLinks}>
            <a href="/motion" style={footerLink}>← Voltar ao site</a>
            <a href="/billing" style={footerLink}>Ver planos</a>
          </div>
        </form>

        {/* ── Trust ── */}
        <p style={trustLine}>{'✓  1 render de demonstração grátis ao criar conta'}</p>
      </div>
    </main>
  );
}

/* ── Styles ── */

const page: CSSProperties = { height: '100%', overflow: 'auto', display: 'grid', placeItems: 'center', padding: '40px 24px', background: '#080a0f', color: '#e8e8ec', fontFamily: SANS };
const wrapper: CSSProperties = { display: 'grid', gap: 24, justifyItems: 'center', width: 'min(420px, 100%)' };

const brandLink: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' };
const brandName: CSSProperties = { color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' };
const brandTag: CSSProperties = { fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' };

const card: CSSProperties = { width: '100%', display: 'grid', gap: 18, padding: '32px 28px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const cardHeader: CSSProperties = { display: 'grid', gap: 6 };
const h1: CSSProperties = { margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' };
const sub: CSSProperties = { margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 };

const tabRow: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };
const tab: CSSProperties = { height: 38, borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
const tabActive: CSSProperties = { ...tab, background: 'rgba(255,255,255,0.08)', color: '#fff' };

const googleBtn: CSSProperties = { height: 46, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 };

const divider: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const dividerLine: CSSProperties = { flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' };
const dividerText: CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 500 };

const fieldsGrid: CSSProperties = { display: 'grid', gap: 14 };
const label: CSSProperties = { display: 'grid', gap: 6 };
const labelText: CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 };
const input: CSSProperties = { height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '0 14px', outline: 'none', fontFamily: 'inherit', fontSize: 14 };

const errorBox: CSSProperties = { padding: '10px 14px', borderRadius: 8, background: 'rgba(224,108,108,0.1)', border: '1px solid rgba(224,108,108,0.2)', color: '#e06c6c', fontSize: 13 };

const btnPrimary: CSSProperties = { height: 48, borderRadius: 12, border: 'none', background: '#fff', color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' };

const footerLinks: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12 };
const footerLink: CSSProperties = { color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecoration: 'none' };

const trustLine: CSSProperties = { fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.2)' };
