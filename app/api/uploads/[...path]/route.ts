import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { createReadStream, existsSync } from 'fs';
import { Readable } from 'stream';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await params;
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const filePath = path.join(uploadsDir, ...pathParts);
  const relativePath = path.relative(uploadsDir, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (!existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.m4v': 'video/x-m4v',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpeg',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.3gp': 'video/3gpp',
    '.3gpp': 'video/3gpp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
    const fileStat = await stat(filePath);
    const range = request.headers.get('range');

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const [, startRaw, endRaw] = match;
        let start: number;
        let end: number;

        if (!startRaw && endRaw) {
          const suffixLength = parseInt(endRaw, 10);
          start = Number.isFinite(suffixLength) && suffixLength > 0
            ? Math.max(fileStat.size - suffixLength, 0)
            : NaN;
          end = fileStat.size - 1;
        } else {
          start = startRaw ? parseInt(startRaw, 10) : 0;
          end = endRaw ? Math.min(parseInt(endRaw, 10), fileStat.size - 1) : fileStat.size - 1;
        }

        if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < fileStat.size) {
          const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
          return new NextResponse(stream, {
            status: 206,
            headers: {
              'Content-Type': contentType,
              'Content-Length': String(end - start + 1),
              'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      }

      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileStat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
    },
  });
}
