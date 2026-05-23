/**
 * Server-only: leitura e escrita do conteúdo do site.
 * Para types e defaults no client, use './siteContentTypes'.
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './storage';
import { DEFAULT_CONTENT } from './siteContentTypes';
import type { SiteContent } from './siteContentTypes';

// Re-export tudo do types para uso na API
export * from './siteContentTypes';

const CONTENT_FILE = path.join(DATA_DIR, 'site-content.json');

export async function readSiteContent(): Promise<SiteContent> {
  try {
    const raw = await readFile(CONTENT_FILE, 'utf-8');
    const saved = JSON.parse(raw) as Partial<SiteContent>;
    return { ...DEFAULT_CONTENT, ...saved };
  } catch {
    return { ...DEFAULT_CONTENT };
  }
}

export async function writeSiteContent(content: SiteContent): Promise<void> {
  await mkdir(path.dirname(CONTENT_FILE), { recursive: true });
  await writeFile(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf-8');
}
