'use client';

import { type CSSProperties, FormEvent, useEffect, useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nextPath, setNextPath] = useState('/');
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
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#0a0a0c',
        color: 'rgba(255,255,255,0.94)',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 'min(380px, 100%)',
          display: 'grid',
          gap: 16,
          padding: 24,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.045)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.42)',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            NovaCena
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: 26, lineHeight: 1.1 }}>
            {mode === 'login' ? 'Entrar no estúdio' : 'Criar sua conta'}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 1.45 }}>
            Crie sua conta e teste com 1 render de demonstração.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={mode === 'login' ? tabActive : tab}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={mode === 'signup' ? tabActive : tab}
          >
            Criar conta
          </button>
        </div>

        <a
          href={`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`}
          style={{
            height: 44,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            textDecoration: 'none',
            fontWeight: 800,
          }}
        >
          Continuar com Google
        </a>

        <div style={{ display: 'grid', gap: 12 }}>
          {mode === 'signup' && (
            <label style={labelStyle}>
              Nome
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={inputStyle}
              />
            </label>
          )}

          <label style={labelStyle}>
            Email
            <input
              autoFocus={mode === 'login'}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
            />
          </label>

        <label style={{ display: 'grid', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.68)' }}>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
        </label>
        </div>

        {error && (
          <div style={{ color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          disabled={loading || !canSubmit}
          style={{
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(90deg, #b855ff, #ff9244)',
            color: '#fff',
            fontWeight: 800,
            opacity: loading || !canSubmit ? 0.55 : 1,
          }}
        >
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <a href="/billing" style={{ color: 'rgba(255,255,255,0.56)', fontSize: 13, textAlign: 'center' }}>
          Ver planos e tokens
        </a>
      </form>
    </main>
  );
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  fontSize: 13,
  color: 'rgba(255,255,255,0.68)',
};

const inputStyle: CSSProperties = {
  height: 44,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(0,0,0,0.28)',
  color: '#fff',
  padding: '0 12px',
  outline: 'none',
};

const tab: CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.72)',
  fontWeight: 800,
};

const tabActive = {
  ...tab,
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'rgba(255,255,255,0.14)',
  color: '#fff',
};
