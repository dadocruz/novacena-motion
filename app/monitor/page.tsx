'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CSSProperties } from 'react';

// ── Design tokens ─────────────────────────────────
const BG = '#080a0f';
const SURFACE = '#0d1117';
const BORDER = '#1e2a3a';
const ACCENT = '#7B93FF';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const TEXT = '#e2e8f0';
const TEXT_DIM = '#94a3b8';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const MONO = '"SF Mono", "Fira Code", Menlo, monospace';

// ── Types (mirror from lib/monitor.ts) ─────────────
interface MonitorStat { value: number | null; weeklyDiff: number | null; weeklyDiffPercent: number | null; monthlyDiff: number | null; monthlyDiffPercent: number | null; timestamp: string | null; }
interface MonitorSingle { spotifyTrackId: string | null; spotifyUrl: string; releaseDate: string | null; title: string; coverUrl: string | null; plays: number | null; }
interface MonitorYTVideo { id: string | null; youtubeUrl: string | null; title: string; publishedAt: string | null; daysOld: number; thumbnail: string | null; views: number | null; needsTraffic: boolean; }
interface MonitorArtist { artistName: string; spotifyArtistId: string | null; spotifyArtistUrl: string | null; chartmetricArtistId: number | null; fetchedAt: string; imageUrl: string | null; spotify: { monthlyListeners: MonitorStat; followers: MonitorStat; singles: MonitorSingle[] }; youtube: { channelId: string | null; title: string | null; thumbnail: string | null; subscribers: number | null; views: number | null; latestVideos: MonitorYTVideo[] }; error?: string; }
interface MonitorRanking { artistName: string; imageUrl: string | null; monthlyListeners: number; youtubeViews: number; priorityScore: number; }
interface MonitorTrafficAlert { artistName: string; artistImage: string | null; videoTitle: string; videoUrl: string | null; thumbnail: string | null; views: number | null; daysOld: number; }
interface SavedArtist { id: string; artistName: string; spotifyUrl: string; youtubeUrl: string; addedAt: string; }

// ── Helpers ────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function diffColor(n: number | null): string {
  if (n == null || n === 0) return TEXT_DIM;
  return n > 0 ? GREEN : RED;
}

function diffArrow(n: number | null): string {
  if (n == null || n === 0) return '';
  return n > 0 ? '▲' : '▼';
}

export default function MonitorPage() {
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([]);
  const [dashboard, setDashboard] = useState<{ artists: MonitorArtist[]; ranking: MonitorRanking[]; trafficAlerts: MonitorTrafficAlert[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [newName, setNewName] = useState('');
  const [newSpotify, setNewSpotify] = useState('');
  const [newYoutube, setNewYoutube] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchArtists = useCallback(async () => {
    try {
      const r = await fetch('/api/monitor/artists');
      const d = await r.json();
      if (d.ok) setSavedArtists(d.artists);
    } catch { /* noop */ }
    setLoadingArtists(false);
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/monitor/dashboard', { method: 'POST' });
      const d = await r.json();
      if (d.ok) {
        setDashboard({ artists: d.artists, ranking: d.ranking, trafficAlerts: d.trafficAlerts });
      } else {
        setError(d.error || 'Erro ao carregar dashboard.');
      }
    } catch {
      setError('Erro de conexao.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

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
        setNewName('');
        setNewSpotify('');
        setNewYoutube('');
      } else {
        alert(d.error || 'Erro ao adicionar.');
      }
    } catch {
      alert('Erro de conexao.');
    }
    setAdding(false);
  }

  async function removeArtist(id: string) {
    try {
      const r = await fetch('/api/monitor/artists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await r.json();
      if (d.ok) setSavedArtists((prev) => prev.filter((a) => a.id !== id));
    } catch { /* noop */ }
  }

  // ── Styles ───────────────────────────────────────
  const page: CSSProperties = { minHeight: '100vh', background: BG, color: TEXT, fontFamily: SANS, padding: '0 0 80px' };
  const nav: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, position: 'sticky', top: 0, zIndex: 50 };
  const navBrand: CSSProperties = { fontSize: 18, fontWeight: 700, color: TEXT, textDecoration: 'none', letterSpacing: '-0.03em' };
  const navLinks: CSSProperties = { display: 'flex', gap: 16, alignItems: 'center' };
  const navLink: CSSProperties = { color: TEXT_DIM, textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '6px 12px', borderRadius: 6, transition: 'all .15s' };
  const badge: CSSProperties = { background: ACCENT, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 8, letterSpacing: '0.05em', textTransform: 'uppercase' as const };

  const container: CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' };
  const sectionTitle: CSSProperties = { fontSize: 22, fontWeight: 700, marginBottom: 20, color: TEXT, letterSpacing: '-0.02em' };
  const card: CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 };

  const inputStyle: CSSProperties = { background: '#0a0e15', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', color: TEXT, fontSize: 14, fontFamily: SANS, width: '100%', outline: 'none' };
  const btnPrimary: CSSProperties = { background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: SANS, transition: 'opacity .15s' };
  const btnDanger: CSSProperties = { background: 'transparent', color: RED, border: `1px solid ${RED}33`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: SANS };

  const grid3: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 };
  const statBox: CSSProperties = { background: '#0a0e15', borderRadius: 8, padding: '14px 16px', border: `1px solid ${BORDER}` };
  const statLabel: CSSProperties = { fontSize: 11, color: TEXT_DIM, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 };
  const statValue: CSSProperties = { fontSize: 24, fontWeight: 700, fontFamily: MONO, color: TEXT };

  return (
    <div style={page}>
      {/* ── Nav ── */}
      <nav style={nav}>
        <a href="/" style={navBrand}>NovaCena<span style={{ color: ACCENT }}> Motion</span></a>
        <div style={navLinks}>
          <a href="/" style={navLink}>Editor</a>
          <a href="/monitor" style={{ ...navLink, color: ACCENT, background: `${ACCENT}15` }}>Monitor<span style={badge}>Novo</span></a>
          <a href="/billing" style={navLink}>Planos</a>
        </div>
      </nav>

      <div style={container}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.03em' }}>
            Monitor de Artistas
          </h1>
          <p style={{ color: TEXT_DIM, fontSize: 15, margin: 0 }}>
            Acompanhe a performance dos seus artistas no Spotify e YouTube em tempo real.
          </p>
        </div>

        {/* ── Add Artist Form ── */}
        <div style={{ ...card, marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: TEXT }}>Adicionar Artista</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Nome do Artista *</label>
              <input
                style={inputStyle}
                placeholder="Ex: MC Kevin"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addArtist()}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Link Spotify *</label>
              <input
                style={inputStyle}
                placeholder="https://open.spotify.com/artist/..."
                value={newSpotify}
                onChange={(e) => setNewSpotify(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addArtist()}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Canal YouTube</label>
              <input
                style={inputStyle}
                placeholder="https://youtube.com/@..."
                value={newYoutube}
                onChange={(e) => setNewYoutube(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addArtist()}
              />
            </div>
            <button style={{ ...btnPrimary, opacity: adding ? 0.6 : 1 }} onClick={addArtist} disabled={adding}>
              {adding ? 'Adicionando...' : '+ Adicionar'}
            </button>
          </div>
        </div>

        {/* ── Artist List ── */}
        {loadingArtists ? (
          <p style={{ color: TEXT_DIM, textAlign: 'center', padding: 40 }}>Carregando artistas...</p>
        ) : savedArtists.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#127925;</div>
            <p style={{ color: TEXT_DIM, fontSize: 15, margin: '0 0 8px' }}>Nenhum artista cadastrado ainda.</p>
            <p style={{ color: TEXT_DIM, fontSize: 13, margin: 0 }}>Adicione artistas acima para comecar o monitoramento.</p>
          </div>
        ) : (
          <>
            {/* Artist chips + fetch button */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
              {savedArtists.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '6px 14px', fontSize: 13 }}>
                  <span style={{ color: TEXT }}>{a.artistName}</span>
                  <button onClick={() => removeArtist(a.id)} style={{ background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }} title="Remover">x</button>
                </div>
              ))}
              <button
                style={{ ...btnPrimary, marginLeft: 'auto', opacity: loading ? 0.6 : 1 }}
                onClick={fetchDashboard}
                disabled={loading}
              >
                {loading ? 'Buscando dados...' : 'Atualizar Dashboard'}
              </button>
            </div>

            {error && (
              <div style={{ ...card, borderColor: RED, color: RED, fontSize: 14 }}>{error}</div>
            )}

            {/* ── Dashboard Content ── */}
            {dashboard && (
              <>
                {/* Traffic Alerts */}
                {dashboard.trafficAlerts.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={sectionTitle}>
                      <span style={{ color: YELLOW }}>&#9888;</span> Alertas de Trafego
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                      {dashboard.trafficAlerts.map((alert, i) => (
                        <div key={i} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', borderColor: `${YELLOW}33`, padding: 14 }}>
                          {alert.thumbnail && (
                            <img src={alert.thumbnail} alt="" style={{ width: 80, height: 45, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: YELLOW, fontWeight: 600 }}>{alert.artistName}</div>
                            <div style={{ fontSize: 13, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.videoTitle}</div>
                            <div style={{ fontSize: 11, color: TEXT_DIM }}>
                              {fmt(alert.views)} views | {alert.daysOld}d atras
                              {alert.videoUrl && <> | <a href={alert.videoUrl} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>Abrir</a></>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ranking */}
                {dashboard.ranking.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={sectionTitle}>Ranking de Prioridade</h2>
                    <div style={card}>
                      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 120px 80px', gap: 8, padding: '0 8px 8px', fontSize: 11, color: TEXT_DIM, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <div>#</div><div>Artista</div><div style={{ textAlign: 'right' }}>Listeners</div><div style={{ textAlign: 'right' }}>YT Views</div><div style={{ textAlign: 'right' }}>Score</div>
                      </div>
                      {dashboard.ranking.map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 120px 80px', gap: 8, padding: '10px 8px', alignItems: 'center', borderTop: `1px solid ${BORDER}`, fontSize: 14 }}>
                          <div style={{ color: i < 3 ? ACCENT : TEXT_DIM, fontWeight: 700, fontFamily: MONO }}>{i + 1}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {r.imageUrl ? (
                              <img src={r.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: TEXT_DIM }}>{r.artistName.charAt(0)}</div>
                            )}
                            <span style={{ fontWeight: 500 }}>{r.artistName}</span>
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13 }}>{fmt(r.monthlyListeners)}</div>
                          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13 }}>{fmt(r.youtubeViews)}</div>
                          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13, color: ACCENT }}>{r.priorityScore.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Artist Cards */}
                <h2 style={sectionTitle}>Artistas ({dashboard.artists.length})</h2>
                <div style={grid3}>
                  {dashboard.artists.map((artist, i) => (
                    <ArtistCard key={i} artist={artist} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Artist Card Component ──────────────────────────
function ArtistCard({ artist }: { artist: MonitorArtist }) {
  const [expanded, setExpanded] = useState(false);

  const card: CSSProperties = { background: SURFACE, border: `1px solid ${artist.error ? `${RED}44` : BORDER}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color .15s' };
  const header: CSSProperties = { display: 'flex', gap: 14, padding: 16, alignItems: 'center', cursor: 'pointer' };
  const statBox: CSSProperties = { background: '#0a0e15', borderRadius: 8, padding: '12px 14px', border: `1px solid ${BORDER}` };
  const statLabel: CSSProperties = { fontSize: 10, color: TEXT_DIM, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 };
  const statValue: CSSProperties = { fontSize: 20, fontWeight: 700, fontFamily: MONO, color: TEXT };
  const diffStyle = (n: number | null): CSSProperties => ({ fontSize: 11, color: diffColor(n), fontFamily: MONO, marginTop: 2 });

  return (
    <div style={card}>
      <div style={header} onClick={() => setExpanded(!expanded)}>
        {artist.imageUrl ? (
          <img src={artist.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: TEXT_DIM, flexShrink: 0 }}>
            {artist.artistName.charAt(0)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 2 }}>{artist.artistName}</div>
          {artist.error ? (
            <div style={{ fontSize: 12, color: RED }}>{artist.error}</div>
          ) : (
            <div style={{ fontSize: 12, color: TEXT_DIM }}>
              {fmt(artist.spotify.monthlyListeners.value)} listeners | {fmt(artist.spotify.followers.value)} followers
            </div>
          )}
        </div>
        <div style={{ color: TEXT_DIM, fontSize: 18, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>&#9660;</div>
      </div>

      {expanded && !artist.error && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Spotify Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={statBox}>
              <div style={statLabel}>Ouvintes Mensais</div>
              <div style={statValue}>{fmt(artist.spotify.monthlyListeners.value)}</div>
              <div style={diffStyle(artist.spotify.monthlyListeners.monthlyDiff)}>
                {diffArrow(artist.spotify.monthlyListeners.monthlyDiff)} {fmt(artist.spotify.monthlyListeners.monthlyDiff)} ({artist.spotify.monthlyListeners.monthlyDiffPercent != null ? `${artist.spotify.monthlyListeners.monthlyDiffPercent > 0 ? '+' : ''}${artist.spotify.monthlyListeners.monthlyDiffPercent.toFixed(1)}%` : '--'}) /mes
              </div>
            </div>
            <div style={statBox}>
              <div style={statLabel}>Seguidores</div>
              <div style={statValue}>{fmt(artist.spotify.followers.value)}</div>
              <div style={diffStyle(artist.spotify.followers.monthlyDiff)}>
                {diffArrow(artist.spotify.followers.monthlyDiff)} {fmt(artist.spotify.followers.monthlyDiff)} ({artist.spotify.followers.monthlyDiffPercent != null ? `${artist.spotify.followers.monthlyDiffPercent > 0 ? '+' : ''}${artist.spotify.followers.monthlyDiffPercent.toFixed(1)}%` : '--'}) /mes
              </div>
            </div>
          </div>

          {/* Singles */}
          {artist.spotify.singles.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Singles Recentes</div>
              {artist.spotify.singles.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                  {s.coverUrl ? (
                    <img src={s.coverUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: BORDER, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: TEXT_DIM }}>{s.releaseDate?.slice(0, 10) || '--'}</div>
                  </div>
                  <div style={{ fontSize: 13, fontFamily: MONO, color: s.plays ? GREEN : TEXT_DIM, fontWeight: 600 }}>
                    {fmt(s.plays)} plays
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* YouTube */}
          {artist.youtube.channelId && (
            <div>
              <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>YouTube</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={statBox}>
                  <div style={statLabel}>Inscritos</div>
                  <div style={{ ...statValue, fontSize: 18 }}>{fmt(artist.youtube.subscribers)}</div>
                </div>
                <div style={statBox}>
                  <div style={statLabel}>Views Total</div>
                  <div style={{ ...statValue, fontSize: 18 }}>{fmt(artist.youtube.views)}</div>
                </div>
              </div>
              {artist.youtube.latestVideos.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" style={{ width: 64, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 64, height: 36, borderRadius: 4, background: BORDER, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                    <div style={{ fontSize: 11, color: TEXT_DIM }}>{v.daysOld}d atras | {fmt(v.views)} views</div>
                  </div>
                  {v.needsTraffic && (
                    <span style={{ fontSize: 10, color: YELLOW, fontWeight: 700, background: `${YELLOW}15`, padding: '2px 8px', borderRadius: 10 }}>IMPULSIONAR</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
            {artist.spotifyArtistUrl && (
              <a href={artist.spotifyArtistUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 500 }}>Abrir Spotify &#8599;</a>
            )}
            {artist.youtube.channelId && (
              <a href={`https://youtube.com/channel/${artist.youtube.channelId}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: RED, textDecoration: 'none', fontWeight: 500 }}>Abrir YouTube &#8599;</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
