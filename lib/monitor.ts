/**
 * Monitor service — Chartmetric + YouTube Data API
 * Ported from gaveta-monitor/server.js
 * Server-only (uses env vars for API keys)
 */

// ── Types ──────────────────────────────────────────
export interface MonitorStat {
  value: number | null;
  weeklyDiff: number | null;
  weeklyDiffPercent: number | null;
  monthlyDiff: number | null;
  monthlyDiffPercent: number | null;
  timestamp: string | null;
}

export interface MonitorSingle {
  cmAlbum: number | null;
  cmTrack: number | null;
  spotifyTrackId: string | null;
  spotifyUrl: string;
  releaseDate: string | null;
  title: string;
  coverUrl: string | null;
  plays: number | null;
}

export interface MonitorYouTubeVideo {
  id: string | null;
  youtubeUrl: string | null;
  title: string;
  publishedAt: string | null;
  daysOld: number;
  thumbnail: string | null;
  views: number | null;
  needsTraffic: boolean;
}

export interface MonitorYouTubeChannel {
  channelId: string | null;
  title: string | null;
  thumbnail: string | null;
  subscribers: number | null;
  views: number | null;
  latestVideos: MonitorYouTubeVideo[];
}

export interface MonitorArtistResult {
  artistName: string;
  spotifyArtistId: string | null;
  spotifyArtistUrl: string | null;
  chartmetricArtistId: number | null;
  fetchedAt: string;
  imageUrl: string | null;
  spotify: {
    monthlyListeners: MonitorStat;
    followers: MonitorStat;
    singles: MonitorSingle[];
  };
  youtube: MonitorYouTubeChannel;
  error?: string;
}

export interface MonitorRanking {
  artistName: string;
  imageUrl: string | null;
  monthlyListeners: number;
  youtubeViews: number;
  priorityScore: number;
}

export interface MonitorTrafficAlert {
  artistName: string;
  artistImage: string | null;
  videoTitle: string;
  videoUrl: string | null;
  thumbnail: string | null;
  views: number | null;
  daysOld: number;
  publishedAt: string | null;
}

export interface MonitorDashboard {
  ok: boolean;
  fetchedAt: string;
  artists: MonitorArtistResult[];
  ranking: MonitorRanking[];
  trafficAlerts: MonitorTrafficAlert[];
}

// ── Cache ──────────────────────────────────────────
const TTL = {
  dashboard: 24 * 60 * 60 * 1000,
  cmArtistId: 7 * 24 * 60 * 60 * 1000,
  artistMeta: 7 * 24 * 60 * 60 * 1000,
  listenersFollowers: 24 * 60 * 60 * 1000,
  artistAlbums: 7 * 24 * 60 * 60 * 1000,
  albumTracks: 7 * 24 * 60 * 60 * 1000,
  trackStreams: 7 * 24 * 60 * 60 * 1000,
  youtube: 6 * 60 * 60 * 1000,
};

const cache = new Map<string, { value: unknown; expiresAt: number }>();
const inflight = new Map<string, Promise<unknown>>();

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { cache.delete(key); return null; }
  return hit.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs: number): T {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

async function remember<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;

  const p = (async () => {
    try {
      const value = await factory();
      return cacheSet(key, value, ttlMs);
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

// ── Helpers ────────────────────────────────────────
function compactNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return null;
  return Number(value);
}

export function extractSpotifyArtistId(input: string): string | null {
  const value = String(input).trim();
  for (const pattern of [
    /open\.spotify\.com\/(?:intl-[^/]+\/)?artist\/([A-Za-z0-9]{22})/i,
    /spotify:artist:([A-Za-z0-9]{22})/i,
    /^([A-Za-z0-9]{22})$/,
  ]) {
    const m = value.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function isValidSpotifyArtistId(value: unknown): boolean {
  return /^[A-Za-z0-9]{22}$/.test(String(value ?? '').trim());
}

function extractYouTubeChannelId(input: string): string | null {
  const v = String(input).trim();
  if (!v) return null;
  const m1 = v.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/i); if (m1) return m1[1];
  const m2 = v.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/i); if (m2) return `@${m2[1]}`;
  const m3 = v.match(/youtube\.com\/(?:c|user)\/([A-Za-z0-9_.-]+)/i); if (m3) return m3[1];
  const m4 = v.match(/^([A-Za-z0-9_-]{20,})$/); if (m4) return m4[1];
  return null;
}

// ── Chartmetric ────────────────────────────────────
const CM_HOST = 'https://api.chartmetric.com';
let cmAccessToken: string | null = null;
let cmAccessExpiresAt = 0;

async function getChartmetricAccessToken(): Promise<string> {
  const token = process.env.CHARTMETRIC_REFRESH_TOKEN;
  if (!token) throw new Error('CHARTMETRIC_REFRESH_TOKEN ausente');
  if (cmAccessToken && Date.now() < cmAccessExpiresAt - 60_000) return cmAccessToken;

  const res = await fetch(`${CM_HOST}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshtoken: token }),
  });

  if (!res.ok) throw new Error(`CM token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  cmAccessToken = data.token;
  cmAccessExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  return cmAccessToken!;
}

async function chartmetricGet(path: string) {
  const accessToken = await getChartmetricAccessToken();
  const res = await fetch(`${CM_HOST}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`CM ${res.status}: ${(await res.text()).slice(0, 260)}`);
  return res.json();
}

async function youtubeGet(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YT ${res.status}: ${(await res.text()).slice(0, 260)}`);
  return res.json();
}

// ── Data fetchers ──────────────────────────────────
async function getLatestChartmetricStat(cmArtistId: number, field: string): Promise<MonitorStat> {
  return remember(`cm:artist:${cmArtistId}:stat:${field}`, TTL.listenersFollowers, async () => {
    const data = await chartmetricGet(`/api/artist/${cmArtistId}/stat/spotify?field=${field}&latest=true`);
    const values = Array.isArray(data.obj?.[field]) ? data.obj[field] : [];
    const latest = values[values.length - 1] || values[0] || null;
    if (!latest) {
      return { value: null, weeklyDiff: null, weeklyDiffPercent: null, monthlyDiff: null, monthlyDiffPercent: null, timestamp: null };
    }
    return {
      value: compactNumber(latest.value),
      weeklyDiff: compactNumber(latest.weekly_diff),
      weeklyDiffPercent: compactNumber(latest.weekly_diff_percent),
      monthlyDiff: compactNumber(latest.monthly_diff),
      monthlyDiffPercent: compactNumber(latest.monthly_diff_percent),
      timestamp: latest.timestp || null,
    };
  });
}

async function getArtistMeta(cmArtistId: number) {
  return remember(`cm:artist:${cmArtistId}:meta`, TTL.artistMeta, async () => {
    try {
      return (await chartmetricGet(`/api/artist/${cmArtistId}`)).obj || {};
    } catch {
      return {};
    }
  });
}

async function getChartmetricArtistIdFromSpotify(spotifyArtistId: string): Promise<number | null> {
  return remember(`cm:map:spotify:${spotifyArtistId}`, TTL.cmArtistId, async () => {
    const data = await chartmetricGet(`/api/artist/spotify/${encodeURIComponent(spotifyArtistId)}/get-ids`);
    const obj = Array.isArray(data.obj) ? data.obj : [];
    const match = obj.find((x: Record<string, unknown>) => x.cm_artist) || null;
    return match ? Number(match.cm_artist) : null;
  });
}

async function getArtistAlbums(cmArtistId: number) {
  return remember(`cm:artist:${cmArtistId}:albums`, TTL.artistAlbums, async () => {
    const data = await chartmetricGet(
      `/api/artist/${cmArtistId}/albums?sortColumn=release_date&sortOrderDesc=true&isPrimary=true&limit=30`
    );
    return Array.isArray(data.obj) ? data.obj : [];
  });
}

async function getAlbumTracks(cmAlbumId: number) {
  return remember(`cm:album:${cmAlbumId}:tracks`, TTL.albumTracks, async () => {
    const data = await chartmetricGet(`/api/album/${cmAlbumId}/tracks`);
    return Array.isArray(data.obj) ? data.obj : [];
  });
}

async function getTrackSpotifyStreams(cmTrackId: number | null, spotifyTrackId: string | null): Promise<number | null> {
  const attempts: string[] = [];
  if (cmTrackId) {
    attempts.push(`/api/track/${cmTrackId}/spotify/stats/highest-playcounts?type=streams&latest=true`);
    attempts.push(`/api/track/${cmTrackId}/spotify/stats/most-history?type=streams&latest=true`);
  }
  if (spotifyTrackId) {
    attempts.push(`/api/track/${encodeURIComponent(spotifyTrackId)}/spotify/stats/highest-playcounts?type=streams&latest=true&isDomainId=true`);
    attempts.push(`/api/track/${encodeURIComponent(spotifyTrackId)}/spotify/stats/most-history?type=streams&latest=true&isDomainId=true`);
  }

  for (const path of attempts) {
    try {
      const data = await chartmetricGet(path);
      const rows = Array.isArray(data.obj) ? data.obj : [];
      for (const row of rows) {
        const points = Array.isArray(row.data) ? row.data : [];
        const latest = points[points.length - 1] || points[0];
        if (latest?.value != null) return compactNumber(latest.value);
      }
    } catch {
      // try next endpoint
    }
  }
  return null;
}

async function getRecentSingles(cmArtistId: number, spotifyArtistId: string): Promise<MonitorSingle[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const albums: any[] = await getArtistAlbums(cmArtistId);
  const singles = albums.filter((a) => Number(a.num_track) === 1).slice(0, 3);
  const results: MonitorSingle[] = [];

  for (const album of singles) {
    let trackName = album.name || 'Single';
    let coverUrl = album.image_url || null;
    let plays: number | null = null;
    let spotifyTrackId: string | null = null;
    let cmTrackId: number | null = null;

    try {
      const tracks = await getAlbumTracks(album.cm_album);
      const first = tracks[0];
      if (first) {
        trackName = first.name || trackName;
        coverUrl = first.image_url || coverUrl;
        cmTrackId = first.cm_track || null;
        if (Array.isArray(first.spotify_track_ids) && first.spotify_track_ids.length) {
          spotifyTrackId = first.spotify_track_ids[0];
        }
        plays = await getTrackSpotifyStreams(cmTrackId, spotifyTrackId);
      }
    } catch {
      // keep album data if track fetch fails
    }

    results.push({
      cmAlbum: album.cm_album,
      cmTrack: cmTrackId,
      spotifyTrackId,
      spotifyUrl: spotifyTrackId
        ? `https://open.spotify.com/track/${spotifyTrackId}`
        : `https://open.spotify.com/artist/${spotifyArtistId}`,
      releaseDate: album.release_date || null,
      title: trackName,
      coverUrl,
      plays,
    });
  }

  return results;
}

async function getYouTubeChannelBundle(channelUrl: string): Promise<MonitorYouTubeChannel> {
  const channelId = extractYouTubeChannelId(channelUrl);
  const empty: MonitorYouTubeChannel = { channelId: null, title: null, thumbnail: null, subscribers: null, views: null, latestVideos: [] };

  if (!channelId) return empty;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ...empty, channelId };

  return remember(`yt:channel:${channelId}`, TTL.youtube, async () => {
    let qp: string;
    if (channelId.startsWith('@')) qp = `forHandle=${encodeURIComponent(channelId)}`;
    else if (/^UC[A-Za-z0-9_-]{20,}$/.test(channelId)) qp = `id=${encodeURIComponent(channelId)}`;
    else qp = `forUsername=${encodeURIComponent(channelId)}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channelData: any = await youtubeGet(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${qp}&key=${encodeURIComponent(apiKey)}`
    );

    if (!channelData.items?.length && !channelId.startsWith('@') && !/^UC/.test(channelId)) {
      try {
        channelData = await youtubeGet(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent('@' + channelId)}&key=${encodeURIComponent(apiKey)}`
        );
      } catch {
        channelData = { items: [] };
      }
    }

    const channel = channelData.items?.[0];
    if (!channel) return { ...empty, channelId };

    const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;
    let latestVideos: MonitorYouTubeVideo[] = [];

    if (uploadsPlaylist) {
      const playlistData = await youtubeGet(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploadsPlaylist)}&maxResults=3&key=${encodeURIComponent(apiKey)}`
      );

      const items = playlistData.items || [];
      const ids = items.map((i: Record<string, Record<string, string>>) => i.contentDetails?.videoId).filter(Boolean);

      let statsById = new Map<string, Record<string, string>>();
      if (ids.length) {
        const videosData = await youtubeGet(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(ids.join(','))}&key=${encodeURIComponent(apiKey)}`
        );
        statsById = new Map((videosData.items || []).map((v: Record<string, unknown>) => [v.id as string, (v.statistics || {}) as Record<string, string>]));
      }

      const now = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      latestVideos = items.slice(0, 3).map((item: any) => {
        const videoId = item.contentDetails?.videoId;
        const stats = statsById.get(videoId) || {};
        const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || null;
        const views = compactNumber(stats.viewCount);
        const daysOld = publishedAt ? Math.floor((now - new Date(publishedAt).getTime()) / 86400000) : 999;
        const needsTraffic = daysOld <= 14 && (views === null || views < 5000);

        return {
          id: videoId,
          youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
          title: item.snippet?.title || 'Video',
          publishedAt,
          daysOld,
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
          views,
          needsTraffic,
        };
      });
    }

    return {
      channelId,
      title: channel.snippet?.title || null,
      thumbnail: channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url || null,
      subscribers: compactNumber(channel.statistics?.subscriberCount),
      views: compactNumber(channel.statistics?.viewCount),
      latestVideos,
    };
  });
}

function computePriority(artist: MonitorArtistResult): number {
  let score = 0;
  score += Number(artist.spotify?.monthlyListeners?.value || 0) / 100000;
  score += Number(artist.youtube?.views || 0) / 10000000;
  score += Number(artist.spotify?.followers?.value || 0) / 200000;
  score += Number(artist.spotify?.singles?.[0]?.plays || 0) / 1000000;
  score += Number(artist.youtube?.latestVideos?.[0]?.views || 0) / 1000000;
  return score;
}

// ── Public API ─────────────────────────────────────
export interface MonitorArtistInput {
  artistName: string;
  spotifyUrl: string;
  youtubeUrl?: string;
  spotifyArtistId?: string;
  cmArtistId?: number;
}

export async function fetchDashboard(inputArtists: MonitorArtistInput[]): Promise<MonitorDashboard> {
  if (!inputArtists.length) {
    return { ok: true, fetchedAt: new Date().toISOString(), artists: [], ranking: [], trafficAlerts: [] };
  }

  const artists: MonitorArtistResult[] = await Promise.all(
    inputArtists.map(async (raw) => {
      const artistName = String(raw.artistName || '').trim();
      const spotifyUrl = String(raw.spotifyUrl || '').trim();
      const youtubeUrl = String(raw.youtubeUrl || '').trim();
      const spotifyArtistId = extractSpotifyArtistId(spotifyUrl)
        || (isValidSpotifyArtistId(raw.spotifyArtistId) ? String(raw.spotifyArtistId).trim() : null);

      const rawCmId = Number(raw.cmArtistId || 0);
      let cmArtistId = Number.isFinite(rawCmId) && rawCmId > 0 ? rawCmId : null;

      const emptyStat: MonitorStat = { value: null, weeklyDiff: null, weeklyDiffPercent: null, monthlyDiff: null, monthlyDiffPercent: null, timestamp: null };

      if (!artistName || !spotifyArtistId) {
        return {
          artistName: artistName || 'Sem nome',
          spotifyArtistId: null,
          spotifyArtistUrl: null,
          chartmetricArtistId: null,
          fetchedAt: new Date().toISOString(),
          imageUrl: null,
          spotify: { monthlyListeners: emptyStat, followers: emptyStat, singles: [] },
          youtube: { channelId: null, title: null, thumbnail: null, subscribers: null, views: null, latestVideos: [] },
          error: 'Nome e link do Spotify sao obrigatorios.',
        };
      }

      try {
        if (!cmArtistId) {
          cmArtistId = await getChartmetricArtistIdFromSpotify(spotifyArtistId);
        } else {
          cacheSet(`cm:map:spotify:${spotifyArtistId}`, cmArtistId, TTL.cmArtistId);
        }

        if (!cmArtistId) {
          return {
            artistName, spotifyArtistId,
            spotifyArtistUrl: `https://open.spotify.com/artist/${spotifyArtistId}`,
            chartmetricArtistId: null,
            fetchedAt: new Date().toISOString(),
            imageUrl: null,
            spotify: { monthlyListeners: emptyStat, followers: emptyStat, singles: [] },
            youtube: { channelId: null, title: null, thumbnail: null, subscribers: null, views: null, latestVideos: [] },
            error: 'Artista nao encontrado no Chartmetric.',
          };
        }

        const [meta, listeners, followers, singles, youtube] = await Promise.all([
          getArtistMeta(cmArtistId),
          getLatestChartmetricStat(cmArtistId, 'listeners'),
          getLatestChartmetricStat(cmArtistId, 'followers'),
          getRecentSingles(cmArtistId, spotifyArtistId),
          getYouTubeChannelBundle(youtubeUrl),
        ]);

        return {
          artistName,
          spotifyArtistId,
          spotifyArtistUrl: `https://open.spotify.com/artist/${spotifyArtistId}`,
          chartmetricArtistId: cmArtistId,
          fetchedAt: new Date().toISOString(),
          imageUrl: meta.image_url || meta.image || youtube.thumbnail || null,
          spotify: { monthlyListeners: listeners, followers, singles },
          youtube: {
            channelId: youtube.channelId,
            title: youtube.title,
            thumbnail: youtube.thumbnail,
            subscribers: youtube.subscribers,
            views: youtube.views,
            latestVideos: youtube.latestVideos,
          },
        };
      } catch (error) {
        return {
          artistName,
          spotifyArtistId,
          spotifyArtistUrl: `https://open.spotify.com/artist/${spotifyArtistId}`,
          chartmetricArtistId: cmArtistId,
          fetchedAt: new Date().toISOString(),
          imageUrl: null,
          spotify: { monthlyListeners: emptyStat, followers: emptyStat, singles: [] },
          youtube: { channelId: null, title: null, thumbnail: null, subscribers: null, views: null, latestVideos: [] },
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
      }
    })
  );

  const validArtists = artists.filter((a) => !a.error);

  const ranking: MonitorRanking[] = validArtists
    .map((artist) => ({
      artistName: artist.artistName,
      imageUrl: artist.imageUrl,
      monthlyListeners: artist.spotify?.monthlyListeners?.value || 0,
      youtubeViews: artist.youtube?.views || 0,
      priorityScore: computePriority(artist),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 10);

  const trafficAlerts: MonitorTrafficAlert[] = [];
  for (const artist of validArtists) {
    for (const video of artist.youtube?.latestVideos || []) {
      if (video.needsTraffic) {
        trafficAlerts.push({
          artistName: artist.artistName,
          artistImage: artist.imageUrl,
          videoTitle: video.title,
          videoUrl: video.youtubeUrl,
          thumbnail: video.thumbnail,
          views: video.views,
          daysOld: video.daysOld,
          publishedAt: video.publishedAt,
        });
      }
    }
  }

  return { ok: true, fetchedAt: new Date().toISOString(), artists, ranking, trafficAlerts };
}

export async function checkMonitorHealth() {
  try {
    await getChartmetricAccessToken();
    return {
      ok: true,
      chartmetric: true,
      youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY),
      cacheEntries: cache.size,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro',
      youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY),
    };
  }
}
