import { NextResponse } from 'next/server';
import path from 'path';
import { listUserFonts } from '../../../../lib/storage';

export const runtime = 'nodejs';

export async function GET() {
  const fonts = await listUserFonts();
  const lines: string[] = ['/* User fonts — auto-generated */'];
  for (const f of fonts) {
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
  }
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
