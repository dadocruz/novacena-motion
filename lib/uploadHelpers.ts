import { mkdir, writeFile, readdir, unlink } from 'fs/promises';
import path from 'path';

export function safeFileName(name: string, defaultExt = '.bin'): string {
  const ext = path.extname(name || defaultExt).toLowerCase() || defaultExt;
  const base =
    path
      .basename(name || 'file', ext)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 42) || 'file';
  return `${Date.now()}-${base}${ext}`;
}

export async function saveFile(
  dir: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  return filePath;
}

export const PUBLIC_UPLOADS = path.join(process.cwd(), 'public', 'uploads');

export async function deleteOldFiles(dir: string, newFilename: string): Promise<void> {
  try {
    const newBase = newFilename.replace(/^[0-9]+-/, '');
    const entries = await readdir(dir);
    await Promise.all(
      entries
        .filter(f => f !== newFilename && f.replace(/^[0-9]+-/, '') === newBase)
        .map(f => unlink(path.join(dir, f)).catch(() => {}))
    );
  } catch {}
}
