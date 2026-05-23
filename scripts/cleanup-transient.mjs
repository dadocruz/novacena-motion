import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const HOUR = 60 * 60 * 1000;
const GB = 1024 * 1024 * 1024;
const root = process.cwd();

const dryRun = process.argv.includes('--dry-run');

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function uploadsDir(...parts) {
  return path.join(root, 'public', 'uploads', ...parts);
}

const targets = [
  { dir: uploadsDir('video-sources'), ttlMs: numberEnv('NOVACENA_CLEANUP_SOURCE_TTL_HOURS', 2) * HOUR, maxBytes: numberEnv('NOVACENA_CLEANUP_MEDIA_MAX_GB', 8) * GB },
  { dir: uploadsDir('videos'), ttlMs: numberEnv('NOVACENA_CLEANUP_MEDIA_TTL_HOURS', 24) * HOUR, maxBytes: numberEnv('NOVACENA_CLEANUP_MEDIA_MAX_GB', 8) * GB },
  { dir: uploadsDir('audio'), ttlMs: numberEnv('NOVACENA_CLEANUP_MEDIA_TTL_HOURS', 24) * HOUR, maxBytes: Math.ceil(numberEnv('NOVACENA_CLEANUP_MEDIA_MAX_GB', 8) / 4) * GB },
  { dir: uploadsDir('backgrounds'), ttlMs: numberEnv('NOVACENA_CLEANUP_MEDIA_TTL_HOURS', 24) * HOUR, maxBytes: 1 * GB },
  { dir: uploadsDir('ai-backgrounds'), ttlMs: numberEnv('NOVACENA_CLEANUP_MEDIA_TTL_HOURS', 24) * HOUR, maxBytes: 1 * GB },
  { dir: uploadsDir('motion-references'), ttlMs: numberEnv('NOVACENA_CLEANUP_MEDIA_TTL_HOURS', 24) * HOUR, maxBytes: 1 * GB },
  { dir: path.join(root, 'out'), ttlMs: numberEnv('NOVACENA_CLEANUP_OUT_TTL_HOURS', 24) * HOUR, maxBytes: numberEnv('NOVACENA_CLEANUP_OUT_MAX_GB', 2) * GB },
];

async function listFiles(dir) {
  const files = [];
  async function walk(currentDir) {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(filePath);
      } else if (entry.isFile()) {
        const fileStat = await stat(filePath).catch(() => null);
        if (fileStat) files.push({ path: filePath, size: fileStat.size, mtimeMs: fileStat.mtimeMs });
      }
    }
  }
  await walk(dir);
  return files;
}

const now = Date.now();
const deleted = [];

for (const target of targets) {
  const files = await listFiles(target.dir);
  const byPath = new Map();
  for (const file of files) {
    if (now - file.mtimeMs > target.ttlMs) byPath.set(file.path, { ...file, reason: 'ttl' });
  }

  let totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (target.maxBytes > 0 && totalBytes > target.maxBytes) {
    for (const file of [...files].sort((a, b) => a.mtimeMs - b.mtimeMs)) {
      if (totalBytes <= target.maxBytes) break;
      byPath.set(file.path, { ...file, reason: byPath.get(file.path)?.reason || 'quota' });
      totalBytes -= file.size;
    }
  }

  for (const file of byPath.values()) {
    if (!dryRun) await unlink(file.path).catch(() => {});
    deleted.push(file);
  }
}

const deletedBytes = deleted.reduce((sum, file) => sum + file.size, 0);
console.log(JSON.stringify({
  ok: true,
  dryRun,
  deletedCount: deleted.length,
  deletedGB: Number((deletedBytes / GB).toFixed(2)),
  deletedBytes,
}, null, 2));
