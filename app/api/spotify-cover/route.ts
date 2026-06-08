import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';
import { PUBLIC_UPLOADS, safeFileName, deleteOldFiles } from '../../../lib/uploadHelpers';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Token client-credentials cacheado em memória (dura ~1h).
let tokenCache: { token: string; exp: number } | null = null;

function parseSpotify(input: string): { type: string; id: string } | null {
  const s = String(input || '').trim();
  const uri = s.match(/spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]+)/i);
  if (uri) return { type: uri[1].toLowerCase(), id: uri[2] };
  const url = s.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/i);
  if (url) return { type: url[1].toLowerCase(), id: url[2] };
  return null;
}

async function getToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tokenCache && tokenCache.exp > Date.now() + 5000) return tokenCache.token;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.access_token) return null;
  tokenCache = { token: data.access_token, exp: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function coverViaApi(
  type: string,
  id: string
): Promise<{ image?: string; title?: string; artist?: string } | null> {
  const token = await getToken();
  if (!token) return null;
  const endpoint = type === 'track' ? `tracks/${id}` : type === 'album' ? `albums/${id}` : null;
  if (!endpoint) return null; // playlist/episode caem no oEmbed
  const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const images = type === 'track' ? data?.album?.images : data?.images;
  const image = Array.isArray(images) && images.length ? images[0]?.url : undefined;
  const title = data?.name;
  const artist = Array.isArray(data?.artists) ? data.artists.map((a: any) => a?.name).filter(Boolean).join(', ') : undefined;
  return image ? { image, title, artist } : null;
}

async function coverViaOembed(url: string): Promise<{ image?: string; title?: string } | null> {
  const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.thumbnail_url ? { image: data.thumbnail_url, title: data?.title } : null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ ok: false, error: 'Cole o link do Spotify.' }, { status: 400 });
    }

    const parsed = parseSpotify(url);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: 'Link do Spotify inválido. Use o link da música ou do álbum.' },
        { status: 400 }
      );
    }

    // 1) Web API (se houver SPOTIFY_CLIENT_ID/SECRET no ambiente), senão oEmbed.
    let info = await coverViaApi(parsed.type, parsed.id).catch(() => null);
    if (!info?.image) info = await coverViaOembed(url).catch(() => null);
    if (!info?.image) {
      return NextResponse.json({ ok: false, error: 'Não consegui pegar a capa desse link.' }, { status: 404 });
    }

    // 2) baixa a imagem da CDN do Spotify
    const imgRes = await fetch(info.image);
    if (!imgRes.ok) {
      return NextResponse.json({ ok: false, error: 'Falha ao baixar a capa do Spotify.' }, { status: 502 });
    }
    const raw = Buffer.from(await imgRes.arrayBuffer());

    // 3) processa + salva igual a uma capa normal (/api/uploads/covers/...)
    const filename = safeFileName(`spotify-${parsed.id}.jpg`, '.jpg');
    const dir = path.join(PUBLIC_UPLOADS, 'covers');
    const processed = await sharp(raw)
      .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();
    await deleteOldFiles(dir, filename);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), processed);

    return NextResponse.json({
      ok: true,
      coverSrc: `/api/uploads/covers/${filename}`,
      title: info.title,
      artist: (info as any).artist,
      source: process.env.SPOTIFY_CLIENT_ID ? 'api' : 'oembed',
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro ao buscar a capa.' },
      { status: 500 }
    );
  }
}
