/**
 * Per-user artist list for the Monitor feature.
 * Each user has their own JSON file at data/monitor/{userId}.json
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { DATA_DIR, uid } from './storage';

const MONITOR_DIR = path.join(DATA_DIR, 'monitor');

export interface MonitoredArtist {
  id: string;
  artistName: string;
  spotifyUrl: string;
  youtubeUrl: string;
  addedAt: string;
}

function userFile(userId: string) {
  return path.join(MONITOR_DIR, `${userId}.json`);
}

export async function listUserArtists(userId: string): Promise<MonitoredArtist[]> {
  try {
    const raw = await readFile(userFile(userId), 'utf-8');
    return JSON.parse(raw) as MonitoredArtist[];
  } catch {
    return [];
  }
}

async function saveUserArtists(userId: string, artists: MonitoredArtist[]) {
  await mkdir(MONITOR_DIR, { recursive: true });
  await writeFile(userFile(userId), JSON.stringify(artists, null, 2), 'utf-8');
}

export async function addUserArtist(
  userId: string,
  input: { artistName: string; spotifyUrl: string; youtubeUrl?: string }
): Promise<MonitoredArtist> {
  const artists = await listUserArtists(userId);

  const duplicate = artists.find(
    (a) => a.spotifyUrl.trim().toLowerCase() === input.spotifyUrl.trim().toLowerCase()
  );
  if (duplicate) throw new Error('Este artista ja esta na sua lista.');

  const artist: MonitoredArtist = {
    id: uid('ma_'),
    artistName: input.artistName.trim(),
    spotifyUrl: input.spotifyUrl.trim(),
    youtubeUrl: (input.youtubeUrl || '').trim(),
    addedAt: new Date().toISOString(),
  };

  artists.unshift(artist);
  await saveUserArtists(userId, artists);
  return artist;
}

export async function removeUserArtist(userId: string, artistId: string): Promise<boolean> {
  const artists = await listUserArtists(userId);
  const filtered = artists.filter((a) => a.id !== artistId);
  if (filtered.length === artists.length) return false;
  await saveUserArtists(userId, filtered);
  return true;
}

export async function updateUserArtist(
  userId: string,
  artistId: string,
  patch: { artistName?: string; spotifyUrl?: string; youtubeUrl?: string }
): Promise<MonitoredArtist | null> {
  const artists = await listUserArtists(userId);
  const idx = artists.findIndex((a) => a.id === artistId);
  if (idx < 0) return null;

  if (patch.artistName) artists[idx].artistName = patch.artistName.trim();
  if (patch.spotifyUrl) artists[idx].spotifyUrl = patch.spotifyUrl.trim();
  if (patch.youtubeUrl !== undefined) artists[idx].youtubeUrl = patch.youtubeUrl.trim();

  await saveUserArtists(userId, artists);
  return artists[idx];
}
