'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BillingCycle } from '../../lib/saasPlans';

type AdminUser = {
  id: string;
  email: string;
  name: string;
  provider: string;
  tokens: number;
  planId: string | null;
  billingCycle: BillingCycle | null;
  createdAt: string;
  updatedAt: string;
};

const PLAN_OPTIONS = [
  { id: '', label: 'Manter plano' },
  { id: 'starter', label: 'Start' },
  { id: 'pro', label: 'Pro' },
  { id: 'studio', label: 'Studio' },
];

const CYCLE_OPTIONS = [
  { id: '', label: 'Manter ciclo' },
  { id: 'monthly', label: 'Mensal' },
  { id: 'annual', label: 'Anual' },
  { id: 'triennial', label: 'Trienal' },
];

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('novacena:adminToken') || '';
    setToken(saved);
    if (saved) loadUsers(saved);
  }, []);

  async function loadUsers(authToken = token) {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'x-novacena-admin-token': authToken },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setMessage(data.error || 'Não foi possível carregar clientes.');
        return;
      }
      window.localStorage.setItem('novacena:adminToken', authToken);
      setUsers(data.users);
    } catch {
      setMessage('Não foi possível carregar clientes.');
    } finally {
      setLoading(false);
    }
  }

  async function addTokens(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get('amount'));
    const planId = String(form.get('planId') || '');
    const billingCycle = String(form.get('billingCycle') || '');
    setMessage('');

    const response = await fetch(`/api/admin/users/${userId}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-novacena-admin-token': token,
      },
      body: JSON.stringify({
        amount,
        planId: planId || undefined,
        billingCycle: billingCycle || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMessage(data.error || 'Não foi possível adicionar tokens.');
      return;
    }
    setUsers((current) => current.map((user) => user.id === userId ? data.user : user));
    setMessage('Tokens adicionados.');
    event.currentTarget.reset();
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', padding: 28 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 22 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.46)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              NovaCena
            </div>
            <h1 style={{ margin: '8px 0 0', fontSize: 32 }}>Clientes e tokens</h1>
          </div>
          <a href="/" style={outlineLink}>Voltar ao estúdio</a>
        </header>

        <section style={panel}>
          <label style={{ display: 'grid', gap: 8, color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>
            Token administrativo
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              style={input}
            />
          </label>
          <button onClick={() => loadUsers()} disabled={!token || loading} style={primaryButton}>
            {loading ? 'Carregando...' : 'Carregar clientes'}
          </button>
        </section>

        {message && (
          <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
            {message}
          </div>
        )}

        <section style={{ display: 'grid', gap: 12 }}>
          {users.map((user) => (
            <article key={user.id} style={userCard}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{user.name}</h2>
                <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, marginTop: 4 }}>
                  {user.email} · {user.provider} · {user.tokens} tokens
                </div>
                <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 4 }}>
                  Plano: {user.planId || 'sem plano'} · Ciclo: {user.billingCycle || 'sem ciclo'}
                </div>
              </div>
              <form onSubmit={(event) => addTokens(event, user.id)} style={tokenForm}>
                <input name="amount" type="number" min="1" placeholder="Tokens" style={smallInput} />
                <select name="planId" style={smallInput}>
                  {PLAN_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                <select name="billingCycle" style={smallInput}>
                  {CYCLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                <button style={primaryButton}>Adicionar</button>
              </form>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

const panel: CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'minmax(240px, 1fr) auto',
  alignItems: 'end',
  padding: 16,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.045)',
};

const userCard: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(240px, 1fr) minmax(320px, auto)',
  gap: 16,
  alignItems: 'center',
  padding: 16,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.045)',
};

const tokenForm: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px 120px 120px auto',
  gap: 8,
};

const input: CSSProperties = {
  height: 42,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(0,0,0,0.28)',
  color: '#fff',
  padding: '0 12px',
  outline: 'none',
};

const smallInput = {
  ...input,
  minWidth: 0,
};

const primaryButton: CSSProperties = {
  minHeight: 42,
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(90deg, #b855ff, #ff9244)',
  color: '#fff',
  fontWeight: 900,
  padding: '0 14px',
};

const outlineLink: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 8,
  padding: '10px 14px',
};
