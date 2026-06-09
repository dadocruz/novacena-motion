/**
 * Persistência local em JSON.
 * Tudo fica em `data/` (não vai pro git).
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export const DATA_DIR = process.env.NOVACENA_DATA_DIR || path.join(process.cwd(), 'data');
const ARTISTS_FILE = path.join(DATA_DIR, 'artists.json');
const USER_FONTS_FILE = path.join(DATA_DIR, 'user-fonts.json');
const OVERLAYS_FILE = path.join(DATA_DIR, 'overlays.json');

// ============================================================
// TYPES
// ============================================================

export type Artist = {
  id: string;
  slug: string;
  name: string;
  driveFolderPath?: string;
  coverArtUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  template: string;
  thumbnailPath?: string;
  videoPath?: string;
  motionConfig?: unknown;
  projectSnapshot?: unknown;
  createdAt: string;
};

export type ArtistPhoto = {
  id: string;
  filename: string;
  path: string;
  width?: number;
  height?: number;
  uploadedAt: string;
};

export type UserFont = {
  id: string;
  label: string;
  filename: string;
  family: string;
  category: 'display' | 'sans' | 'special';
  weight: number;
  uploadedAt: string;
};

export type OverlayAsset = {
  id: string;
  label: string;
  filename: string;
  path: string;
  type: 'video' | 'image';
  blendMode: 'screen' | 'overlay' | 'lighten' | 'soft-light' | 'normal';
  durationSec?: number;
  uploadedAt: string;
};

// ============================================================
// HELPERS
// ============================================================

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

async function readJson<T>(filepath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filepath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filepath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filepath), { recursive: true });
  await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

function safeUserSegment(userId?: string | null): string | null {
  if (!userId) return null;
  return userId.replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || null;
}

function safeSlugSegment(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || 'artist';
}

function artistsFile(userId?: string | null) {
  const safeUserId = safeUserSegment(userId);
  return safeUserId ? path.join(DATA_DIR, 'users', safeUserId, 'artists.json') : ARTISTS_FILE;
}

function artistDataDir(slug: string, userId?: string | null) {
  const safeUserId = safeUserSegment(userId);
  return safeUserId
    ? path.join(DATA_DIR, 'users', safeUserId, 'artists', safeSlugSegment(slug))
    : path.join(DATA_DIR, 'artists', safeSlugSegment(slug));
}

// ============================================================
// ARTISTS
// ============================================================

export async function listArtists(userId?: string | null): Promise<Artist[]> {
  return readJson<Artist[]>(artistsFile(userId), []);
}

export async function getArtist(slug: string, userId?: string | null): Promise<Artist | undefined> {
  const all = await listArtists(userId);
  return all.find((a) => a.slug === slug);
}

export async function createArtist(name: string, userId?: string | null): Promise<Artist> {
  const all = await listArtists(userId);
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let i = 2;
  while (all.find((a) => a.slug === slug)) {
    slug = `${baseSlug}-${i++}`;
  }
  const now = new Date().toISOString();
  const artist: Artist = {
    id: uid('art_'),
    slug,
    name,
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(artist);
  await writeJson(artistsFile(userId), all);
  return artist;
}

export async function updateArtist(
  slug: string,
  patch: Partial<Pick<Artist, 'name' | 'driveFolderPath' | 'coverArtUrl'>>,
  userId?: string | null
): Promise<Artist | null> {
  const all = await listArtists(userId);
  const idx = all.findIndex((a) => a.slug === slug);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  await writeJson(artistsFile(userId), all);
  return all[idx];
}

export async function deleteArtist(slug: string, userId?: string | null): Promise<boolean> {
  const all = await listArtists(userId);
  const filtered = all.filter((a) => a.slug !== slug);
  if (filtered.length === all.length) return false;
  await writeJson(artistsFile(userId), filtered);
  return true;
}

// ============================================================
// GALERIA POR ARTISTA
// ============================================================

function galleryFile(slug: string, userId?: string | null) {
  return path.join(artistDataDir(slug, userId), 'gallery.json');
}

export async function listGallery(slug: string, userId?: string | null): Promise<GalleryItem[]> {
  return readJson<GalleryItem[]>(galleryFile(slug, userId), []);
}

export async function addGalleryItem(
  slug: string,
  item: Omit<GalleryItem, 'id' | 'createdAt'>,
  userId?: string | null
): Promise<GalleryItem> {
  const all = await listGallery(slug, userId);
  const newItem: GalleryItem = {
    ...item,
    id: uid('gal_'),
    createdAt: new Date().toISOString(),
  };
  all.unshift(newItem);
  await writeJson(galleryFile(slug, userId), all);
  return newItem;
}

export async function deleteGalleryItem(slug: string, id: string, userId?: string | null): Promise<boolean> {
  const all = await listGallery(slug, userId);
  const filtered = all.filter((g) => g.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(galleryFile(slug, userId), filtered);
  return true;
}

// ============================================================
// FOTOS POR ARTISTA
// ============================================================

function photosFile(slug: string, userId?: string | null) {
  return path.join(artistDataDir(slug, userId), 'photos.json');
}

export async function listPhotos(slug: string, userId?: string | null): Promise<ArtistPhoto[]> {
  return readJson<ArtistPhoto[]>(photosFile(slug, userId), []);
}

export async function addPhoto(
  slug: string,
  photo: Omit<ArtistPhoto, 'id' | 'uploadedAt'>,
  userId?: string | null
): Promise<ArtistPhoto> {
  const all = await listPhotos(slug, userId);
  const newPhoto: ArtistPhoto = {
    ...photo,
    id: uid('ph_'),
    uploadedAt: new Date().toISOString(),
  };
  all.unshift(newPhoto);
  await writeJson(photosFile(slug, userId), all);
  return newPhoto;
}

export async function deletePhoto(slug: string, id: string, userId?: string | null): Promise<boolean> {
  const all = await listPhotos(slug, userId);
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(photosFile(slug, userId), filtered);
  return true;
}

// ============================================================
// USER FONTS
// ============================================================

export async function listUserFonts(): Promise<UserFont[]> {
  return readJson<UserFont[]>(USER_FONTS_FILE, []);
}

export async function addUserFont(
  font: Omit<UserFont, 'id' | 'uploadedAt'>
): Promise<UserFont> {
  const all = await listUserFonts();
  const newFont: UserFont = {
    ...font,
    id: uid('font_'),
    uploadedAt: new Date().toISOString(),
  };
  all.unshift(newFont);
  await writeJson(USER_FONTS_FILE, all);
  return newFont;
}

export async function deleteUserFont(id: string): Promise<boolean> {
  const all = await listUserFonts();
  const filtered = all.filter((f) => f.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(USER_FONTS_FILE, filtered);
  return true;
}

// ============================================================
// OVERLAYS
// ============================================================

export async function listOverlays(): Promise<OverlayAsset[]> {
  return readJson<OverlayAsset[]>(OVERLAYS_FILE, []);
}

export async function addOverlay(
  overlay: Omit<OverlayAsset, 'id' | 'uploadedAt'>
): Promise<OverlayAsset> {
  const all = await listOverlays();
  const newOv: OverlayAsset = {
    ...overlay,
    id: uid('ov_'),
    uploadedAt: new Date().toISOString(),
  };
  all.unshift(newOv);
  await writeJson(OVERLAYS_FILE, all);
  return newOv;
}

export async function deleteOverlay(id: string): Promise<boolean> {
  const all = await listOverlays();
  const filtered = all.filter((o) => o.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(OVERLAYS_FILE, filtered);
  return true;
}

// ============================================================
// OVERLAY PRESETS — biblioteca reutilizável POR TEMPLATE
// Cada preset guarda o placement completo (p/ reaplicar igual) + uma thumbnail
// do frame escolhido na timeline. Futuro: campo `pack` p/ packs visuais.
// ============================================================
const OVERLAY_PRESETS_FILE = path.join(DATA_DIR, 'overlay-presets.json');

export type OverlayPreset = {
  id: string;
  label: string;
  template: string;
  pack?: string;
  type: 'video' | 'image';
  thumbnail?: string;
  placement: Record<string, any>;
  createdAt: string;
};

export async function listOverlayPresets(template?: string): Promise<OverlayPreset[]> {
  const all = await readJson<OverlayPreset[]>(OVERLAY_PRESETS_FILE, []);
  return template ? all.filter((p) => p.template === template) : all;
}

export async function addOverlayPreset(
  preset: Omit<OverlayPreset, 'id' | 'createdAt'>
): Promise<OverlayPreset> {
  const all = await readJson<OverlayPreset[]>(OVERLAY_PRESETS_FILE, []);
  const newPreset: OverlayPreset = {
    ...preset,
    id: uid('ovp_'),
    createdAt: new Date().toISOString(),
  };
  all.unshift(newPreset);
  await writeJson(OVERLAY_PRESETS_FILE, all);
  return newPreset;
}

export async function deleteOverlayPreset(id: string): Promise<boolean> {
  const all = await readJson<OverlayPreset[]>(OVERLAY_PRESETS_FILE, []);
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(OVERLAY_PRESETS_FILE, filtered);
  return true;
}

export async function updateOverlayPreset(
  id: string,
  patch: Partial<Omit<OverlayPreset, 'id' | 'createdAt'>>
): Promise<OverlayPreset | null> {
  const all = await readJson<OverlayPreset[]>(OVERLAY_PRESETS_FILE, []);
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id: all[idx].id, createdAt: all[idx].createdAt };
  await writeJson(OVERLAY_PRESETS_FILE, all);
  return all[idx];
}

// ============================================================
// CUSTOM PLATFORM LOGOS
// ============================================================
const PLATFORM_LOGOS_FILE = path.join(DATA_DIR, 'platform-logos.json');

export type CustomPlatformLogo = {
  /** Nome da plataforma (Spotify, Apple Music, etc) ou um nome custom */
  platform: string;
  /** Caminho público do logo */
  path: string;
  filename: string;
  uploadedAt: string;
};

export async function listPlatformLogos(): Promise<CustomPlatformLogo[]> {
  return readJson<CustomPlatformLogo[]>(PLATFORM_LOGOS_FILE, []);
}

export async function setPlatformLogo(
  platform: string,
  filename: string,
  publicPath: string
): Promise<CustomPlatformLogo> {
  const all = await listPlatformLogos();
  const filtered = all.filter((l) => l.platform !== platform);
  const newLogo: CustomPlatformLogo = {
    platform,
    path: publicPath,
    filename,
    uploadedAt: new Date().toISOString(),
  };
  filtered.unshift(newLogo);
  await writeJson(PLATFORM_LOGOS_FILE, filtered);
  return newLogo;
}

export async function deletePlatformLogo(platform: string): Promise<boolean> {
  const all = await listPlatformLogos();
  const filtered = all.filter((l) => l.platform !== platform);
  if (filtered.length === all.length) return false;
  await writeJson(PLATFORM_LOGOS_FILE, filtered);
  return true;
}
