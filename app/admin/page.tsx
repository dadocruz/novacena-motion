'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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

function cycleLabel(cycle: BillingCycle | null) {
  if (cycle === 'monthly') return 'Mensal';
  if (cycle === 'annual') return 'Anual';
  if (cycle === 'triennial') return 'Trienal';
  return 'Sem ciclo';
}

function planLabel(planId: string | null) {
  if (planId === 'starter') return 'Start';
  if (planId === 'pro') return 'Pro';
  if (planId === 'studio') return 'Studio';
  return 'Sem plano';
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'info' | 'error' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const stats = useMemo(() => {
    const totalTokens = users.reduce((sum, user) => sum + user.tokens, 0);
    const paidUsers = users.filter((user) => user.planId).length;
    return {
      users: users.length,
      paidUsers,
      totalTokens,
    };
  }, [users]);

  useEffect(() => {
    const saved = window.localStorage.getItem('novacena:adminToken') || '';
    setToken(saved);
    if (saved) loadUsers(saved);
  }, []);

  async function loadUsers(authToken = token) {
    setLoading(true);
    setMessage('');
    setMessageKind('info');
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'x-novacena-admin-token': authToken },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setUsers([]);
        setHasLoaded(false);
        setMessageKind('error');
        setMessage(
          response.status === 401
            ? 'Chave administrativa inválida. Confira o valor de NOVACENA_ADMIN_TOKEN na VPS.'
            : data.error || 'Não foi possível carregar clientes.'
        );
        return;
      }
      window.localStorage.setItem('novacena:adminToken', authToken);
      setUsers(data.users);
      setHasLoaded(true);
      setMessageKind('success');
      setMessage('Clientes carregados.');
    } catch {
      setMessageKind('error');
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
      setMessageKind('error');
      setMessage(data.error || 'Não foi possível adicionar renders.');
      return;
    }
    setUsers((current) => current.map((user) => user.id === userId ? data.user : user));
    setMessageKind('success');
    setMessage(`${amount} ${amount === 1 ? 'render adicionado' : 'renders adicionados'}.`);
    event.currentTarget.reset();
  }

  return (
    <main style={page}>
      <div style={shell}>
        <header style={header}>
          <div>
            <div style={eyebrow}>NovaCena Admin</div>
            <h1 style={title}>Clientes, planos e renders</h1>
            <p style={subtitle}>
              Gerencie contas, libere renders manualmente e acompanhe quem já comprou pacote.
            </p>
          </div>
          <a href="/" style={outlineLink}>Voltar ao estúdio</a>
        </header>

        <section style={accessPanel}>
          <div>
            <h2 style={panelTitle}>Acesso administrativo</h2>
            <p style={panelText}>
              Cole a chave definida em <strong>NOVACENA_ADMIN_TOKEN</strong>. Ela fica salva apenas neste navegador.
            </p>
          </div>
          <div style={accessForm}>
            <input
              aria-label="Token administrativo"
              type="password"
              placeholder="Chave administrativa"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              style={input}
            />
            <button onClick={() => loadUsers()} disabled={!token || loading} style={primaryButton}>
              {loading ? 'Verificando...' : 'Entrar no admin'}
            </button>
          </div>
        </section>

        {message && (
          <div style={messageKind === 'error' ? errorNotice : messageKind === 'success' ? successNotice : infoNotice}>
            {message}
          </div>
        )}

        {hasLoaded && (
          <section style={statsGrid}>
            <div style={statCard}>
              <span>Clientes</span>
              <strong>{stats.users}</strong>
            </div>
            <div style={statCard}>
              <span>Com plano</span>
              <strong>{stats.paidUsers}</strong>
            </div>
            <div style={statCard}>
              <span>Renders em contas</span>
              <strong>{stats.totalTokens}</strong>
            </div>
          </section>
        )}

        {hasLoaded && users.length === 0 && (
          <section style={emptyState}>
            <h2>Nenhum cliente ainda</h2>
            <p>Quando alguém criar uma conta por email ou Google, ela aparecerá aqui.</p>
          </section>
        )}

        {hasLoaded && users.length > 0 && (
          <section style={clientsPanel}>
            <div style={clientsHeader}>
              <div>
                <h2 style={panelTitle}>Clientes</h2>
                <p style={panelText}>Adicione renders, vincule plano e ciclo sem sair desta tela.</p>
              </div>
            </div>

            <div style={clientList}>
              {users.map((user) => (
                <article key={user.id} style={userCard}>
                  <div style={userMain}>
                    <div style={avatar}>{user.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <h3 style={userName}>{user.name}</h3>
                      <div style={userEmail}>{user.email}</div>
                      <div style={metaRow}>
                        <span>{user.provider === 'google' ? 'Google' : 'Email'}</span>
                        <span>{planLabel(user.planId)}</span>
                        <span>{cycleLabel(user.billingCycle)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={balanceCard}>
                    <span>Saldo</span>
                    <strong>{user.tokens}</strong>
                    <small>{user.tokens === 1 ? 'render' : 'renders'}</small>
                  </div>

                  <form onSubmit={(event) => addTokens(event, user.id)} style={tokenForm}>
                    <input name="amount" type="number" min="1" placeholder="Qtd." style={smallInput} />
                    <select name="planId" style={smallInput}>
                      {PLAN_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    <select name="billingCycle" style={smallInput}>
                      {CYCLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    <button style={primaryButton}>Adicionar renders</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: '100vh',
  background: '#08090c',
  color: '#fff',
  padding: '34px 20px 48px',
};

const shell: CSSProperties = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  display: 'grid',
  gap: 18,
};

const header: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 18,
  alignItems: 'center',
  padding: '12px 0 16px',
};

const eyebrow: CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.46)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 900,
};

const title: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 36,
  lineHeight: 1.08,
};

const subtitle: CSSProperties = {
  margin: '8px 0 0',
  maxWidth: 620,
  color: 'rgba(255,255,255,0.58)',
  lineHeight: 1.45,
};

const accessPanel: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 0.8fr) minmax(320px, 1fr)',
  gap: 18,
  alignItems: 'end',
  padding: 20,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))',
  boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
};

const accessForm: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) auto',
  gap: 10,
};

const panelTitle: CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const panelText: CSSProperties = {
  margin: '6px 0 0',
  color: 'rgba(255,255,255,0.58)',
  lineHeight: 1.45,
  fontSize: 13,
};

const statsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 12,
};

const statCard: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 18,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.045)',
};

const clientsPanel: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: 18,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.032)',
};

const clientsHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
};

const clientList: CSSProperties = {
  display: 'grid',
  gap: 10,
};

const userCard: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(250px, 1fr) 104px minmax(420px, auto)',
  gap: 14,
  alignItems: 'center',
  padding: 14,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.10)',
  background: '#121318',
};

const userMain: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const avatar: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #b855ff, #ff9244)',
  fontWeight: 950,
};

const userName: CSSProperties = {
  margin: 0,
  fontSize: 16,
};

const userEmail: CSSProperties = {
  marginTop: 3,
  color: 'rgba(255,255,255,0.62)',
  fontSize: 13,
};

const metaRow: CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginTop: 8,
};

const balanceCard: CSSProperties = {
  display: 'grid',
  justifyItems: 'center',
  gap: 2,
  padding: '10px 8px',
  borderRadius: 10,
  background: 'rgba(244,211,94,0.10)',
  color: '#f4d35e',
};

const tokenForm: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '82px 122px 122px auto',
  gap: 8,
};

const input: CSSProperties = {
  height: 44,
  borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(0,0,0,0.28)',
  color: '#fff',
  padding: '0 12px',
  outline: 'none',
};

const smallInput: CSSProperties = {
  ...input,
  minWidth: 0,
};

const primaryButton: CSSProperties = {
  minHeight: 44,
  borderRadius: 9,
  border: 'none',
  background: 'linear-gradient(90deg, #b855ff, #ff9244)',
  color: '#fff',
  fontWeight: 900,
  padding: '0 14px',
  cursor: 'pointer',
};

const outlineLink: CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 9,
  padding: '10px 14px',
};

const noticeBase: CSSProperties = {
  padding: 14,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.10)',
};

const errorNotice: CSSProperties = {
  ...noticeBase,
  background: 'rgba(248,113,113,0.13)',
  color: '#fca5a5',
};

const successNotice: CSSProperties = {
  ...noticeBase,
  background: 'rgba(112,224,177,0.12)',
  color: '#a7f3d0',
};

const infoNotice: CSSProperties = {
  ...noticeBase,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.82)',
};

const emptyState: CSSProperties = {
  padding: 26,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.04)',
  textAlign: 'center',
};
