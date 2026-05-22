'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error || 'Não foi possível entrar.');
        return;
      }
      window.location.href = '/';
    } catch {
      setError('Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

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
            Entrar no estúdio
          </h1>
        </div>

        <label style={{ display: 'grid', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.68)' }}>
          Senha de acesso
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{
              height: 44,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(0,0,0,0.28)',
              color: '#fff',
              padding: '0 12px',
              outline: 'none',
            }}
          />
        </label>

        {error && (
          <div style={{ color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          disabled={loading || !password}
          style={{
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(90deg, #b855ff, #ff9244)',
            color: '#fff',
            fontWeight: 800,
            opacity: loading || !password ? 0.55 : 1,
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
