import { mkdir, writeFile } from 'fs/promises';
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
