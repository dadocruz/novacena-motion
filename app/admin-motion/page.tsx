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

type CleanupResult = {
  ok: boolean;
  dryRun?: boolean;
  skipped?: boolean;
  deletedCount: number;
  deletedBytes: number;
  deleted?: Array<{ path: string; size: number; ageHours: number; reason: 'ttl' | 'quota' }>;
  error?: string;
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
  { id: 'quarterly', label: 'Trimestral' },
  { id: 'annual', label: 'Anual' },
];

function cycleLabel(cycle: BillingCycle | null) {
  if (cycle === 'monthly') return 'Mensal';
  if (cycle === 'quarterly') return 'Trimestral';
  if (cycle === 'annual') return 'Anual';
  return '—';
}

function planLabel(planId: string | null) {
  if (planId === 'starter') return 'Start';
  if (planId === 'pro') return 'Pro';
  if (planId === 'studio') return 'Studio';
  return '—';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d atrás`;
  return `${Math.floor(days / 30)}m atrás`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'info' | 'error' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<CleanupResult | null>(null);
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState('');
  const [cleanupMessageKind, setCleanupMessageKind] = useState<'info' | 'error' | 'success'>('info');

  const stats = useMemo(() => {
    const totalTokens = users.reduce((sum, user) => sum + user.tokens, 0);
    const paidUsers = users.filter((user) => user.planId).length;
    return { users: users.length, paidUsers, totalTokens };
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
      void loadCleanupStatus(authToken);
    } catch {
      setMessageKind('error');
      setMessage('Não foi possível carregar clientes.');
    } finally {
      setLoading(false);
    }
  }

  async function loadCleanupStatus(authToken = token) {
    if (!authToken) return;
    setCleanupLoading(true);
    setCleanupMessage('');
    try {
      const response = await fetch('/api/admin/cleanup', {
        headers: { 'x-novacena-admin-token': authToken },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setCleanupMessageKind('error');
        setCleanupMessage(data.error || 'Não foi possível consultar temporários.');
        return;
      }
      setCleanupPreview(data);
      setCleanupMessageKind('info');
      setCleanupMessage('Prévia de temporários atualizada.');
    } catch {
      setCleanupMessageKind('error');
      setCleanupMessage('Não foi possível consultar temporários.');
    } finally {
      setCleanupLoading(false);
    }
  }

  async function runCleanup() {
    if (!token) return;
    setCleanupLoading(true);
    setCleanupMessage('');
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'x-novacena-admin-token': token },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setCleanupMessageKind('error');
        setCleanupMessage(data.error || 'Não foi possível limpar temporários.');
        return;
      }
      setLastCleanup(data);
      setCleanupPreview({ ...data, dryRun: true });
      setCleanupMessageKind('success');
      setCleanupMessage(
        data.deletedCount > 0
          ? `${data.deletedCount} arquivos temporários apagados (${formatBytes(data.deletedBytes)}).`
          : 'Limpeza executada. Não havia temporários para apagar.'
      );
    } catch {
      setCleanupMessageKind('error');
      setCleanupMessage('Não foi possível limpar temporários.');
    } finally {
      setCleanupLoading(false);
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
    setMessage(`${amount} ${amount === 1 ? 'render adicionado' : 'renders adicionados'} para ${users.find(u => u.id === userId)?.name ?? 'cliente'}.`);
    event.currentTarget.reset();
  }

  async function zeroTokens(userId: string) {
    const target = users.find((u) => u.id === userId);
    const ok = window.confirm(`Zerar o saldo de renders de ${target?.name ?? 'este cliente'}? (${target?.tokens ?? 0} → 0)`);
    if (!ok) return;
    setMessage('');
    const response = await fetch(`/api/admin/users/${userId}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-novacena-admin-token': token,
      },
      body: JSON.stringify({ mode: 'set', amount: 0 }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMessageKind('error');
      setMessage(data.error || 'Não foi possível zerar o saldo.');
      return;
    }
    setUsers((current) => current.map((user) => user.id === userId ? data.user : user));
    setMessageKind('success');
    setMessage(`Saldo de ${target?.name ?? 'cliente'} zerado.`);
  }

  return (
    <main style={page}>
      {/* ── Nav ── */}
      <nav style={nav}>
        <a href="/motion" style={navLogo}>NovaCena</a>
        <div style={navRight}>
          <span style={navBadge}>Admin</span>
          <a href="/estudio" style={navLink}>Estúdio</a>
        </div>
      </nav>

      <div style={shell}>
        {/* ── Header ── */}
        <header style={header}>
          <div style={tag}>{'// PAINEL ADMINISTRATIVO'}</div>
          <h1 style={h1}>Clientes, planos e renders</h1>
          <p style={sub}>Gerencie contas, libere renders e acompanhe quem já comprou pacote.</p>
        </header>

        {/* ── Auth ── */}
        <section style={authCard}>
          <div style={authInfo}>
            <h2 style={cardTitle}>Acesso administrativo</h2>
            <p style={cardDesc}>Cole a chave definida em <strong style={{ color: '#e8e8ec' }}>NOVACENA_ADMIN_TOKEN</strong>.</p>
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
            <button onClick={() => loadUsers()} disabled={!token || loading} style={btnPrimary}>
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </div>
        </section>

        {/* ── Messages ── */}
        {message && (
          <div style={messageKind === 'error' ? noticeError : messageKind === 'success' ? noticeSuccess : noticeInfo}>
            {message}
          </div>
        )}

        {/* ── Stats ── */}
        {hasLoaded && (
          <section style={statsRow}>
            {[
              { label: 'Clientes', value: stats.users },
              { label: 'Com plano', value: stats.paidUsers },
              { label: 'Renders em contas', value: stats.totalTokens },
            ].map((s) => (
              <div key={s.label} style={statCard}>
                <span style={statLabel}>{s.label}</span>
                <strong style={statValue}>{s.value}</strong>
              </div>
            ))}
          </section>
        )}

        {/* ── Maintenance ── */}
        {hasLoaded && (
          <section style={maintenanceCard}>
            <div style={maintenanceHeader}>
              <div>
                <h2 style={cardTitle}>Saúde da VPS</h2>
                <p style={cardDesc}>Limpeza de uploads, renders e saídas temporárias. Volumes, clientes, templates e biblioteca ficam preservados.</p>
              </div>
              <div style={maintenanceActions}>
                <button onClick={() => loadCleanupStatus()} disabled={cleanupLoading} style={btnGhost}>
                  Atualizar prévia
                </button>
                <button onClick={runCleanup} disabled={cleanupLoading} style={btnAction}>
                  {cleanupLoading ? 'Limpando…' : 'Limpar agora'}
                </button>
              </div>
            </div>

            <div style={maintenanceGrid}>
              <div style={metricCard}>
                <span style={statLabel}>Pode liberar agora</span>
                <strong style={statValueSmall}>{formatBytes(cleanupPreview?.deletedBytes ?? 0)}</strong>
                <span style={metricHint}>{cleanupPreview?.deletedCount ?? 0} arquivos temporários</span>
              </div>
              <div style={metricCard}>
                <span style={statLabel}>Última limpeza manual</span>
                <strong style={statValueSmall}>{lastCleanup ? formatBytes(lastCleanup.deletedBytes) : '—'}</strong>
                <span style={metricHint}>{lastCleanup ? `${lastCleanup.deletedCount} arquivos apagados` : 'Ainda não executada nesta sessão'}</span>
              </div>
              <div style={metricCard}>
                <span style={statLabel}>Política ativa</span>
                <strong style={statValueSmall}>Automática</strong>
                <span style={metricHint}>Cron de hora em hora + prune Docker de madrugada</span>
              </div>
            </div>

            {cleanupMessage && (
              <div style={cleanupMessageKind === 'error' ? noticeError : cleanupMessageKind === 'success' ? noticeSuccess : noticeInfo}>
                {cleanupMessage}
              </div>
            )}

            <div style={protectedNote}>
              <span style={protectedDot} />
              Protegido: contas, saldos, planos, dados administrativos, biblioteca e templates oficiais.
            </div>
          </section>
        )}

        {/* ── Empty ── */}
        {hasLoaded && users.length === 0 && (
          <section style={emptyCard}>
            <h2 style={cardTitle}>Nenhum cliente ainda</h2>
            <p style={cardDesc}>Quando alguém criar uma conta, ela aparecerá aqui.</p>
          </section>
        )}

        {/* ── Users ── */}
        {hasLoaded && users.length > 0 && (
          <section style={usersSection}>
            <div style={sectionHeader}>
              <h2 style={cardTitle}>Clientes</h2>
              <p style={cardDesc}>Adicione renders, vincule plano e ciclo sem sair desta tela.</p>
            </div>

            <div style={userList}>
              {users.map((user) => (
                <article key={user.id} style={userCard}>
                  <div style={userTop}>
                    <div style={userInfo}>
                      <div style={avatar}>{user.name.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <h3 style={userName}>{user.name}</h3>
                        <div style={userEmail}>{user.email}</div>
                      </div>
                    </div>
                    <div style={userMeta}>
                      <span style={metaBadge}>{user.provider === 'google' ? 'Google' : 'Email'}</span>
                      <span style={metaBadge}>{planLabel(user.planId)}</span>
                      <span style={metaBadge}>{cycleLabel(user.billingCycle)}</span>
                      <span style={metaMuted}>{timeAgo(user.createdAt)}</span>
                    </div>
                  </div>

                  <div style={userBottom}>
                    <div style={balanceBox}>
                      <span style={balanceLabel}>Saldo</span>
                      <strong style={balanceValue}>{user.tokens}</strong>
                      <span style={balanceUnit}>{user.tokens === 1 ? 'render' : 'renders'}</span>
                    </div>

                    <form onSubmit={(e) => addTokens(e, user.id)} style={tokenForm}>
                      <input name="amount" type="number" min="1" placeholder="Qtd." style={inputSm} />
                      <select name="planId" style={inputSm}>
                        {PLAN_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      <select name="billingCycle" style={inputSm}>
                        {CYCLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      <button style={btnAction}>+ Renders</button>
                    </form>
                    {user.tokens > 0 && (
                      <button
                        type="button"
                        onClick={() => zeroTokens(user.id)}
                        title="Zera o saldo de renders deste cliente (ex.: trial antigo não usado)"
                        style={btnDanger}
                      >
                        Zerar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const MONO = '"SF Mono", "Fira Code", Menlo, monospace';
const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#5eead4';

const page: CSSProperties = { height: '100%', overflow: 'auto', background: '#080a0f', color: '#e8e8ec', fontFamily: SANS };

/* ── Nav ── */
const nav: CSSProperties = { position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, width: '100%', margin: '0 auto', height: 56, padding: '0 24px', background: 'rgba(8,10,15,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' };
const navLogo: CSSProperties = { color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' };
const navRight: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center' };
const navBadge: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 6, border: `1px solid rgba(94,234,212,0.15)`, background: 'rgba(94,234,212,0.06)' };
const navLink: CSSProperties = { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, fontWeight: 600 };

/* ── Shared ── */
const tag: CSSProperties = { fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em' };
const h1: CSSProperties = { margin: '12px 0 0', fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#fff' };
const sub: CSSProperties = { margin: '8px 0 0', fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520 };
const shell: CSSProperties = { maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px 80px', display: 'grid', gap: 20 };
const header: CSSProperties = { padding: '40px 0 0', display: 'grid', gap: 4 };

const cardTitle: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' };
const cardDesc: CSSProperties = { margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 };

/* ── Auth ── */
const authCard: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center', padding: '24px 28px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const authInfo: CSSProperties = {};
const authForm: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 };

const input: CSSProperties = { height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '0 14px', outline: 'none', fontFamily: 'inherit', fontSize: 14 };
const inputSm: CSSProperties = { ...input, height: 38, fontSize: 13, minWidth: 0, padding: '0 10px' };

const btnPrimary: CSSProperties = { height: 44, borderRadius: 10, border: 'none', background: '#fff', color: '#000', fontWeight: 700, fontSize: 14, padding: '0 22px', cursor: 'pointer', fontFamily: 'inherit' };
const btnAction: CSSProperties = { height: 38, borderRadius: 10, border: 'none', background: ACCENT, color: '#000', fontWeight: 700, fontSize: 13, padding: '0 16px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };
const btnGhost: CSSProperties = { height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.72)', fontWeight: 700, fontSize: 13, padding: '0 16px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };
const btnDanger: CSSProperties = { height: 38, borderRadius: 10, border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontWeight: 700, fontSize: 13, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 };

/* ── Notices ── */
const noticeBase: CSSProperties = { padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500 };
const noticeError: CSSProperties = { ...noticeBase, background: 'rgba(224,108,108,0.1)', border: '1px solid rgba(224,108,108,0.2)', color: '#e06c6c' };
const noticeSuccess: CSSProperties = { ...noticeBase, background: 'rgba(94,234,212,0.08)', border: '1px solid rgba(94,234,212,0.15)', color: ACCENT };
const noticeInfo: CSSProperties = { ...noticeBase, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' };

/* ── Stats ── */
const statsRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 };
const statCard: CSSProperties = { display: 'grid', gap: 6, padding: '20px 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const statLabel: CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 600 };
const statValue: CSSProperties = { fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' };

/* ── Maintenance ── */
const maintenanceCard: CSSProperties = { display: 'grid', gap: 16, padding: '22px', borderRadius: 14, border: '1px solid rgba(94,234,212,0.12)', background: 'linear-gradient(135deg, rgba(94,234,212,0.08), rgba(255,255,255,0.02) 42%, rgba(255,255,255,0.015))' };
const maintenanceHeader: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' };
const maintenanceActions: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const maintenanceGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 };
const metricCard: CSSProperties = { display: 'grid', gap: 6, padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)' };
const statValueSmall: CSSProperties = { fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' };
const metricHint: CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.34)', lineHeight: 1.45 };
const protectedNote: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.45 };
const protectedDot: CSSProperties = { width: 7, height: 7, borderRadius: 99, background: ACCENT, boxShadow: '0 0 16px rgba(94,234,212,0.55)', flexShrink: 0 };

/* ── Users ── */
const usersSection: CSSProperties = { display: 'grid', gap: 16 };
const sectionHeader: CSSProperties = { display: 'grid', gap: 2 };
const userList: CSSProperties = { display: 'grid', gap: 10 };

const userCard: CSSProperties = { display: 'grid', gap: 16, padding: '20px 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' };
const userTop: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' };
const userBottom: CSSProperties = { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' };

const userInfo: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const avatar: CSSProperties = { width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(94,234,212,0.12)', color: ACCENT, fontWeight: 700, fontSize: 15, flexShrink: 0 };
const userName: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' };
const userEmail: CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 };

const userMeta: CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' };
const metaBadge: CSSProperties = { fontFamily: MONO, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' };
const metaMuted: CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.2)' };

const balanceBox: CSSProperties = { display: 'grid', justifyItems: 'center', gap: 2, padding: '10px 20px', borderRadius: 10, background: 'rgba(94,234,212,0.06)', border: '1px solid rgba(94,234,212,0.12)', flexShrink: 0 };
const balanceLabel: CSSProperties = { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', fontFamily: MONO };
const balanceValue: CSSProperties = { fontSize: 24, fontWeight: 800, color: ACCENT, letterSpacing: '-0.02em' };
const balanceUnit: CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.3)' };

const tokenForm: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 };

/* ── Empty ── */
const emptyCard: CSSProperties = { padding: '40px 28px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', textAlign: 'center', display: 'grid', gap: 8, justifyItems: 'center' };
