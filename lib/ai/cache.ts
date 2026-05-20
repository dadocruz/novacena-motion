import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), '.ai-cache');

/**
 * Cache simples em arquivo das respostas de IA.
 * Chave = hash SHA1 de (providerId + tipo + JSON do input).
 * Evita pagar 2× pela mesma capa/análise.
 *
 * TTL padrão: 30 dias.
 */

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
}

function makeKey(providerId: string, type: string, input: any): string {
  const hash = crypto.createHash('sha1');
  hash.update(providerId);
  hash.update('|');
  hash.update(type);
  hash.update('|');
  hash.update(JSON.stringify(input));
  return hash.digest('hex');
}

export async function getCached<T>(
  providerId: string,
  type: string,
  input: any,
): Promise<T | null> {
  try {
    await ensureCacheDir();
    const key = makeKey(providerId, type, input);
    const file = path.join(CACHE_DIR, `${key}.json`);
    const raw = await fs.readFile(file, 'utf-8');
    const data = JSON.parse(raw) as { ts: number; ttl: number; value: T };
    if (Date.now() - data.ts > data.ttl) {
      await fs.unlink(file).catch(() => {});
      return null;
    }
    return data.value;
  } catch {
    return null;
  }
}

export async function setCached<T>(
  providerId: string,
  type: string,
  input: any,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<void> {
  try {
    await ensureCacheDir();
    const key = makeKey(providerId, type, input);
    const file = path.join(CACHE_DIR, `${key}.json`);
    await fs.writeFile(
      file,
      JSON.stringify({ ts: Date.now(), ttl: ttlMs, value }, null, 2),
    );
  } catch {
    // cache miss não quebra o fluxo
  }
}

export async function clearCache(): Promise<number> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const jsons = files.filter((f) => f.endsWith('.json'));
    await Promise.all(jsons.map((f) => fs.unlink(path.join(CACHE_DIR, f))));
    return jsons.length;
  } catch {
    return 0;
  }
}
