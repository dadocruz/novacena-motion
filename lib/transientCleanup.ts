import { readdir, stat, unlink } from 'fs/promises';
import type { Dirent } from 'fs';
import path from 'path';

type CleanupTarget = {
  dir: string;
  ttlMs: number;
  maxBytes?: number;
  extensions?: string[];
};

type CleanupOptions = {
  dryRun?: boolean;
  now?: number;
};

type DeletedFile = {
  path: string;
  size: number;
  ageHours: number;
  reason: 'ttl' | 'quota';
};

const HOUR = 60 * 60 * 1000;
const GB = 1024 * 1024 * 1024;

const root = process.cwd();

function boolEnv(name: string, fallback = false) {
  const value = process.env[name];
  if (value == null) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function uploadsDir(...parts: string[]) {
  return path.join(root, 'public', 'uploads', ...parts);
}

function outDir() {
  return path.join(root, 'out');
}

function isInside(base: string, filePath: string) {
  const relative = path.relative(base, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function extAllowed(filePath: string, extensions?: string[]) {
  if (!extensions?.length) return true;
  return extensions.includes(path.extname(filePath).toLowerCase());
}

async function listFiles(dir: string, extensions?: string[]) {
  const files: Array<{ path: string; size: number; mtimeMs: number }> = [];

  async function walk(currentDir: string) {
    let entries: Dirent[];
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const filePath = path.join(currentDir, entry.name);
      if (!isInside(dir, filePath)) continue;
      if (entry.isDirectory()) {
        await walk(filePath);
        continue;
      }
      if (!entry.isFile() || !extAllowed(filePath, extensions)) continue;
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat) continue;
      files.push({ path: filePath, size: fileStat.size, mtimeMs: fileStat.mtimeMs });
    }
  }

  await walk(dir);
  return files;
}

function cleanupTargets(): CleanupTarget[] {
  const sourceHours = numberEnv('NOVACENA_CLEANUP_SOURCE_TTL_HOURS', 2);
  const mediaHours = numberEnv('NOVACENA_CLEANUP_MEDIA_TTL_HOURS', 24);
  const outHours = numberEnv('NOVACENA_CLEANUP_OUT_TTL_HOURS', 24);
  const mediaMaxGb = numberEnv('NOVACENA_CLEANUP_MEDIA_MAX_GB', 8);
  const outMaxGb = numberEnv('NOVACENA_CLEANUP_OUT_MAX_GB', 2);

  return [
    {
      dir: uploadsDir('video-sources'),
      ttlMs: sourceHours * HOUR,
      maxBytes: Math.max(1, mediaMaxGb) * GB,
      extensions: ['.mp4', '.mov', '.webm', '.m4v'],
    },
    {
      dir: uploadsDir('videos'),
      ttlMs: mediaHours * HOUR,
      maxBytes: Math.max(1, mediaMaxGb) * GB,
      extensions: ['.mp4', '.mov', '.webm', '.m4v'],
    },
    {
      dir: uploadsDir('audio'),
      ttlMs: mediaHours * HOUR,
      maxBytes: Math.max(1, Math.ceil(mediaMaxGb / 4)) * GB,
      extensions: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.mp4', '.mov', '.webm'],
    },
    {
      dir: uploadsDir('backgrounds'),
      ttlMs: mediaHours * HOUR,
      maxBytes: 1 * GB,
      extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    },
    {
      dir: uploadsDir('ai-backgrounds'),
      ttlMs: mediaHours * HOUR,
      maxBytes: 1 * GB,
      extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    },
    {
      dir: uploadsDir('motion-references'),
      ttlMs: mediaHours * HOUR,
      maxBytes: 1 * GB,
      extensions: ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov', '.webm'],
    },
    {
      dir: outDir(),
      ttlMs: outHours * HOUR,
      maxBytes: Math.max(1, outMaxGb) * GB,
      extensions: ['.mp4', '.png', '.json', '.txt'],
    },
  ];
}

export async function cleanupTransientFiles(options: CleanupOptions = {}) {
  if (!boolEnv('NOVACENA_ENABLE_TRANSIENT_CLEANUP', true) && !options.dryRun) {
    return { ok: true, skipped: true, deletedCount: 0, deletedBytes: 0, deleted: [] as DeletedFile[] };
  }

  const now = options.now ?? Date.now();
  const deleted: DeletedFile[] = [];

  for (const target of cleanupTargets()) {
    const files = await listFiles(target.dir, target.extensions);
    const ttlExpired = files.filter((file) => now - file.mtimeMs > target.ttlMs);

    let totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const quotaExpired: typeof files = [];
    if (target.maxBytes && totalBytes > target.maxBytes) {
      const newestFirst = [...files].sort((a, b) => b.mtimeMs - a.mtimeMs);
      for (const file of newestFirst.reverse()) {
        if (totalBytes <= target.maxBytes) break;
        quotaExpired.push(file);
        totalBytes -= file.size;
      }
    }

    const deleteMap = new Map<string, DeletedFile>();
    for (const file of ttlExpired) {
      deleteMap.set(file.path, {
        path: file.path,
        size: file.size,
        ageHours: Number(((now - file.mtimeMs) / HOUR).toFixed(1)),
        reason: 'ttl',
      });
    }
    for (const file of quotaExpired) {
      if (!deleteMap.has(file.path)) {
        deleteMap.set(file.path, {
          path: file.path,
          size: file.size,
          ageHours: Number(((now - file.mtimeMs) / HOUR).toFixed(1)),
          reason: 'quota',
        });
      }
    }

    for (const item of deleteMap.values()) {
      if (!options.dryRun) await unlink(item.path).catch(() => {});
      deleted.push(item);
    }
  }

  const deletedBytes = deleted.reduce((sum, file) => sum + file.size, 0);
  return {
    ok: true,
    dryRun: Boolean(options.dryRun),
    deletedCount: deleted.length,
    deletedBytes,
    deleted,
  };
}
