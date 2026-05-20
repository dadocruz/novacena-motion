import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { listUserFonts } from '../../../../lib/storage';
import { isValidFontData } from '../../../../lib/fontValidation';

export const runtime = 'nodejs';

export async function GET() {
  const fonts = await listUserFonts();
  const lines: string[] = ['/* User fonts — auto-generated */'];
  for (const f of fonts) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'user-fonts', f.filename || '');
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat || !stat.isFile()) continue;

      // read first 4 bytes to validate signature
      const fh = await fs.open(filePath, 'r').catch(() => null);
      if (!fh) continue;

      const { buffer } = await fh.read(Buffer.alloc(4), 0, 4, 0).finally(() => fh.close());
      if (!buffer || buffer.length < 4) continue;

      if (!isValidFontData(buffer)) continue;

      const ext = path.extname(f.filename).toLowerCase();
      const format =
        ext === '.ttf'
          ? 'truetype'
          : ext === '.otf'
            ? 'opentype'
            : ext === '.woff2'
              ? 'woff2'
              : 'woff';

      lines.push(
        `@font-face { font-family: '${f.family}'; src: url('/uploads/user-fonts/${f.filename}') format('${format}'); font-display: swap; }`
      );
    } catch (e) {
      // ignore invalid font entries
      continue;
    }
  }
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
