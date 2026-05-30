'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';

// ── Design tokens ─────────────────────────────────
const BG = '#080a0f';
const SURFACE = '#0d1117';
const CARD_BG = '#111820';
const BORDER = '#1e2a3a';
const ACCENT = '#7B93FF';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const SPOTIFY = '#1DB954';
const YT_RED = '#FF0000';
const TEXT = '#e2e8f0';
const TEXT_DIM = '#94a3b8';
const TEXT_MUTED = '#64748b';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const MONO = '"SF Mono", "Fira Code", Menlo, monospace';

// ── Types ──────────────────────────────────────────
interface MonitorStat { value: number | null; weeklyDiff: number | null; weeklyDiffPercent: number | null; monthlyDiff: number | null; monthlyDiffPercent: number | null; timestamp: string | null; }
interface MonitorSingle { spotifyTrackId: string | null; spotifyUrl: string; releaseDate: string | null; title: string; coverUrl: string | null; plays: number | null; }
interface MonitorYTVideo { id: string | null; youtubeUrl: string | null; title: string; publishedAt: string | null; daysOld: number; thumbnail: string | null; views: number | null; needsTraffic: boolean; }
interface MonitorArtist { artistName: string; spotifyArtistId: string | null; spotifyArtistUrl: string | null; chartmetricArtistId: number | null; fetchedAt: string; imageUrl: string | null; spotify: { monthlyListeners: MonitorStat; followers: MonitorStat; singles: MonitorSingle[] }; youtube: { channelId: string | null; title: string | null; thumbnail: string | null; subscribers: number | null; views: number | null; latestVideos: MonitorYTVideo[] }; error?: string; }
interface MonitorRanking { artistName: string; imageUrl: string | null; monthlyListeners: number; youtubeViews: number; priorityScore: number; }
interface MonitorTrafficAlert { artistName: string; artistImage: string | null; videoTitle: string; videoUrl: string | null; thumbnail: string | null; views: number | null; daysOld: number; }
interface SavedArtist { id: string; artistName: string; spotifyUrl: string; youtubeUrl: string; addedAt: string; }

type FilterTab = 'todos' | 'milestone' | 'alta' | 'comecando';

// ── Helpers ────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' bi';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' mil';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + ' mil';
  return n.toLocaleString('pt-BR');
}

function fmtShort(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' mi';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + ' mil';
  return n.toLocaleString('pt-BR');
}

function nextMilestone(plays: number | null): string | null {
  if (plays == null) return null;
  const milestones = [10_000, 50_000, 75_000, 100_000, 250_000, 500_000, 750_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];
  for (const m of milestones) {
    if (plays < m) return `Meta ${fmtShort(m)}`;
  }
  return null;
}

function milestoneProgress(plays: number | null): number {
  if (plays == null) return 0;
  const milestones = [10_000, 50_000, 75_000, 100_000, 250_000, 500_000, 750_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];
  let prev = 0;
  for (const m of milestones) {
    if (plays < m) return ((plays - prev) / (m - prev)) * 100;
    prev = m;
  }
  return 100;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atras`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atras`;
  return `${Math.floor(hours / 24)}d atras`;
}

function isNearMilestone(artist: MonitorArtist): boolean {
  return artist.spotify.singles.some((s) => {
    if (!s.plays) return false;
    const prog = milestoneProgress(s.plays);
    return prog >= 70;
  });
}

function isRising(artist: MonitorArtist): boolean {
  const growth = artist.spotify.monthlyListeners.monthlyDiffPercent;
  return growth != null && growth > 5;
}

function isStarting(artist: MonitorArtist): boolean {
  const listeners = artist.spotify.monthlyListeners.value;
  const followers = artist.spotify.followers.value;
  return (listeners != null && listeners < 50000) || (followers != null && followers < 10000);
}

// ── Main Component ─────────────────────────────────
export default function MonitorPage() {
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([]);
  const [dashboard, setDashboard] = useState<{ artists: MonitorArtist[]; ranking: MonitorRanking[]; trafficAlerts: MonitorTrafficAlert[]; fetchedAt?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('todos');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form
  const [newName, setNewName] = useState('');
  const [newSpotify, setNewSpotify] = useState('');
  const [newYoutube, setNewYoutube] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchArtists = useCallback(async () => {
    try {
      const r = await fetch('/api/monitor/artists');
      const d = await r.json();
      if (d.ok) setSavedArtists(d.artists);
    } catch { /* */ }
    setLoadingArtists(false);
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/monitor/dashboard', { method: 'POST' });
      const d = await r.json();
      if (d.ok) setDashboard({ artists: d.artists, ranking: d.ranking, trafficAlerts: d.trafficAlerts, fetchedAt: d.fetchedAt });
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);
  useEffect(() => { if (savedArtists.length > 0 && !dashboard) fetchDashboard(); }, [savedArtists, dashboard, fetchDashboard]);

  async function addArtist() {
    if (!newName.trim() || !newSpotify.trim()) return;
    setAdding(true);
    try {
      const r = await fetch('/api/monitor/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: newName, spotifyUrl: newSpotify, youtubeUrl: newYoutube }),
      });
      const d = await r.json();
      if (d.ok) {
        setSavedArtists((prev) => [d.artist, ...prev]);
        setNewName(''); setNewSpotify(''); setNewYoutube('');
        setShowAddForm(false);
        // Auto-refresh dashboard
        setTimeout(() => fetchDashboard(), 300);
      } else {
        alert(d.error || 'Erro ao adicionar.');
      }
    } catch { alert('Erro de conexao.'); }
    setAdding(false);
  }

  async function removeArtist(id: string) {
    if (!confirm('Remover este artista?')) return;
    try {
      const r = await fetch('/api/monitor/artists', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const d = await r.json();
      if (d.ok) {
        setSavedArtists((prev) => prev.filter((a) => a.id !== id));
        if (dashboard) setDashboard({ ...dashboard, artists: dashboard.artists.filter((a) => !savedArtists.find((s) => s.id === id && s.artistName === a.artistName)) });
      }
    } catch { /* */ }
  }

  const filteredArtists = useMemo(() => {
    if (!dashboard) return [];
    let list = dashboard.artists;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.artistName.toLowerCase().includes(q));
    }
    switch (filter) {
      case 'milestone': return list.filter(isNearMilestone);
      case 'alta': return list.filter(isRising);
      case 'comecando': return list.filter(isStarting);
      default: return list;
    }
  }, [dashboard, filter, search]);

  // ── Styles ───────────────────────────────────────
  const page: CSSProperties = { minHeight: '100vh', background: BG, color: TEXT, fontFamily: SANS };

  const topBar: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, position: 'sticky', top: 0, zIndex: 50 };
  const brandStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
  const brandIcon: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${ACCENT}, #5b6abf)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' };
  const brandTitle: CSSProperties = { fontSize: 16, fontWeight: 700, color: TEXT };
  const brandSub: CSSProperties = { fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase' as const, letterSpacing: '0.08em' };

  const topActions: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' };
  const topBtn: CSSProperties = { background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 16px', color: TEXT_DIM, fontSize: 13, cursor: 'pointer', fontFamily: SANS, transition: 'all .15s' };
  const topBtnPrimary: CSSProperties = { ...topBtn, background: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 600 };

  const syncInfo: CSSProperties = { fontSize: 11, color: TEXT_MUTED, textAlign: 'center' as const, padding: '0 16px' };

  const filterBar: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap' as const };
  const filterBtn = (active: boolean): CSSProperties => ({ background: active ? `${ACCENT}20` : 'transparent', border: `1px solid ${active ? ACCENT : BORDER}`, borderRadius: 20, padding: '6px 16px', color: active ? ACCENT : TEXT_DIM, fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: SANS, transition: 'all .15s' });
  const searchInput: CSSProperties = { background: '#0a0e15', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 14px', color: TEXT, fontSize: 13, fontFamily: SANS, outline: 'none', marginLeft: 'auto', width: 200 };

  const gridContainer: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 0, padding: 0 };

  const inputStyle: CSSProperties = { background: '#0a0e15', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', color: TEXT, fontSize: 14, fontFamily: SANS, width: '100%', outline: 'none' };
  const modalOverlay: CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const modalBox: CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 500 };

  return (
    <div style={page}>
      {/* ── Top Bar ── */}
      <div style={topBar}>
        <div style={brandStyle}>
          <div style={brandIcon}>N</div>
          <div>
            <div style={brandTitle}>NovaCena Monitor</div>
            <div style={brandSub}>Spotify e YouTube para decisao rapida de arte e trafego</div>
          </div>
        </div>
        {dashboard?.fetchedAt && (
          <div style={syncInfo}>
            Sincronizado {new Date(dashboard.fetchedAt).toLocaleString('pt-BR')}
          </div>
        )}
        <div style={topActions}>
          <button style={topBtn} onClick={fetchDashboard} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar agora'}
          </button>
          <a href="/" style={{ ...topBtn, textDecoration: 'none', display: 'inline-block' }}>Editor</a>
          <a href="/billing" style={{ ...topBtn, textDecoration: 'none', display: 'inline-block' }}>Planos</a>
          <button style={topBtnPrimary} onClick={() => setShowAddForm(true)}>+ Cadastrar</button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {dashboard && dashboard.artists.length > 0 && (
        <div style={filterBar}>
          <button style={filterBtn(filter === 'todos')} onClick={() => setFilter('todos')}>Todos</button>
          <button style={filterBtn(filter === 'milestone')} onClick={() => setFilter('milestone')}>Prox. milestone</button>
          <button style={filterBtn(filter === 'alta')} onClick={() => setFilter('alta')}>Em alta</button>
          <button style={filterBtn(filter === 'comecando')} onClick={() => setFilter('comecando')}>Comecando</button>
          <input style={searchInput} placeholder="Buscar artista..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {/* ── Add Form Modal ── */}
      {showAddForm && (
        <div style={modalOverlay} onClick={() => setShowAddForm(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: TEXT }}>Cadastrar Artista</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Nome do Artista *</label>
                <input style={inputStyle} placeholder="Ex: MC Kevin" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Link Spotify *</label>
                <input style={inputStyle} placeholder="https://open.spotify.com/artist/..." value={newSpotify} onChange={(e) => setNewSpotify(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Canal YouTube (opcional)</label>
                <input style={inputStyle} placeholder="https://youtube.com/@..." value={newYoutube} onChange={(e) => setNewYoutube(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button style={topBtn} onClick={() => setShowAddForm(false)}>Cancelar</button>
                <button style={{ ...topBtnPrimary, opacity: adding ? 0.6 : 1 }} onClick={addArtist} disabled={adding}>
                  {adding ? 'Adicionando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loadingArtists ? (
        <div style={{ textAlign: 'center', padding: 80, color: TEXT_DIM }}>Carregando...</div>
      ) : savedArtists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>&#127911;</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Nenhum artista cadastrado</h2>
          <p style={{ color: TEXT_DIM, fontSize: 15, marginBottom: 24 }}>Cadastre seus artistas para monitorar Spotify e YouTube.</p>
          <button style={topBtnPrimary} onClick={() => setShowAddForm(true)}>+ Cadastrar Artista</button>
        </div>
      ) : loading && !dashboard ? (
        <div style={{ textAlign: 'center', padding: 80, color: TEXT_DIM }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Buscando dados do Chartmetric e YouTube...</div>
          <div style={{ fontSize: 13 }}>Primeira carga pode levar alguns segundos.</div>
        </div>
      ) : dashboard ? (
        <div style={gridContainer}>
          {filteredArtists.map((artist, i) => (
            <ArtistCard
              key={i}
              artist={artist}
              savedArtist={savedArtists.find((s) => s.artistName === artist.artistName)}
              onRemove={removeArtist}
            />
          ))}
          {filteredArtists.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: TEXT_DIM }}>
              Nenhum artista encontrado com esse filtro.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Artist Card ────────────────────────────────────
function ArtistCard({ artist, savedArtist, onRemove }: { artist: MonitorArtist; savedArtist?: SavedArtist; onRemove: (id: string) => void }) {
  const card: CSSProperties = { borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: 24, background: CARD_BG };

  const hasSpotify = !!artist.spotifyArtistId;
  const hasYoutube = !!artist.youtube.channelId;

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'center' }}>
        {artist.imageUrl ? (
          <img src={artist.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: TEXT_DIM, flexShrink: 0 }}>
            {artist.artistName.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{artist.artistName.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>
            Atualizado {new Date(artist.fetchedAt).toLocaleString('pt-BR')}
          </div>
        </div>
        {savedArtist && (
          <button onClick={() => onRemove(savedArtist.id)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 16, padding: 4 }} title="Remover artista">&#10005;</button>
        )}
      </div>

      {/* Platform badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: hasSpotify ? SPOTIFY : TEXT_MUTED, background: hasSpotify ? `${SPOTIFY}15` : `${BORDER}`, borderRadius: 12, padding: '3px 10px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasSpotify ? SPOTIFY : TEXT_MUTED }} /> SPOTIFY
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: hasYoutube ? YT_RED : TEXT_MUTED, background: hasYoutube ? `${YT_RED}15` : `${BORDER}`, borderRadius: 12, padding: '3px 10px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasYoutube ? YT_RED : TEXT_MUTED }} /> YOUTUBE
        </span>
      </div>

      {/* Error */}
      {artist.error && (
        <div style={{ background: `${RED}10`, border: `1px solid ${RED}33`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: RED }}>
          {artist.error}
        </div>
      )}

      {/* ── Spotify Section ── */}
      {!artist.error && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SPOTIFY }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Spotify</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Ouvintes Mensais</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO, color: TEXT }}>{fmtShort(artist.spotify.monthlyListeners.value)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Seguidores</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO, color: TEXT }}>{fmtShort(artist.spotify.followers.value)}</div>
            </div>
          </div>

          {artist.chartmetricArtistId && (
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
              Popularidade {artist.spotify.monthlyListeners.monthlyDiffPercent != null ? Math.round(Math.abs(artist.spotify.monthlyListeners.monthlyDiffPercent)) : '--'}/100
            </div>
          )}

          {/* Singles */}
          {artist.spotify.singles.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {artist.spotify.singles.map((single, i) => (
                <SingleRow key={i} single={single} />
              ))}
            </div>
          )}

          {/* ── YouTube Section ── */}
          {hasYoutube && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: YT_RED }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>YouTube</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Inscritos</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: MONO, color: TEXT }}>{fmtShort(artist.youtube.subscribers)}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>{artist.youtube.title || ''}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Views Canal</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: MONO, color: TEXT }}>{fmtShort(artist.youtube.views)}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>Total acumulado</div>
                </div>
              </div>

              {artist.youtube.latestVideos.map((video, i) => (
                <VideoRow key={i} video={video} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Single Row ─────────────────────────────────────
function SingleRow({ single }: { single: MonitorSingle }) {
  const milestone = nextMilestone(single.plays);
  const progress = milestoneProgress(single.plays);

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${BORDER}` }}>
      {single.coverUrl ? (
        <img src={single.coverUrl} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 52, height: 52, borderRadius: 6, background: BORDER, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{single.title}</div>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>{single.releaseDate?.slice(0, 10) || '--'}</div>
        {milestone && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: GREEN, background: `${GREEN}15`, borderRadius: 10, padding: '2px 8px' }}>
              &#9650; {milestone}
            </div>
            <div style={{ width: '100%', height: 3, background: BORDER, borderRadius: 2, marginTop: 4 }}>
              <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', background: GREEN, borderRadius: 2, transition: 'width .3s' }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Streams</div>
        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: single.plays ? TEXT : TEXT_MUTED }}>{fmtShort(single.plays)}</div>
      </div>
    </div>
  );
}

// ── Video Row ──────────────────────────────────────
function VideoRow({ video }: { video: MonitorYTVideo }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${BORDER}` }}>
      {video.thumbnail ? (
        <a href={video.youtubeUrl || '#'} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
          <img src={video.thumbnail} alt="" style={{ width: 72, height: 40, borderRadius: 4, objectFit: 'cover' }} />
        </a>
      ) : (
        <div style={{ width: 72, height: 40, borderRadius: 4, background: BORDER, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</div>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>
          {video.publishedAt?.slice(0, 10)} {video.daysOld < 999 ? `| ${video.daysOld}d` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
        {video.needsTraffic && (
          <div style={{ fontSize: 9, fontWeight: 700, color: YELLOW, background: `${YELLOW}15`, borderRadius: 8, padding: '2px 6px', marginBottom: 2 }}>IMPULSIONAR</div>
        )}
        <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase' as const }}>Views</div>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: TEXT }}>{fmtShort(video.views)}</div>
      </div>
    </div>
  );
}
