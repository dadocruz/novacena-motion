import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const OUT_DIR = path.join(process.cwd(), 'out');

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get('file');

  // Download de um arquivo específico
  if (file) {
    const safeName = path.basename(file);
    const filePath = path.join(OUT_DIR, safeName);
    if (!filePath.startsWith(OUT_DIR) || !existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 });
    }
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  }

  // Listar todos os arquivos renderizados
  if (!existsSync(OUT_DIR)) {
    return NextResponse.json({ files: [] });
  }
  const entries = await readdir(OUT_DIR);
  const files = await Promise.all(
    entries
      .filter(f => f.endsWith('.mp4'))
      .map(async f => {
        const s = await stat(path.join(OUT_DIR, f));
        return { name: f, size: s.size, mtime: s.mtime.toISOString() };
      })
  );
  files.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
  return NextResponse.json({ files });
}


export async function DELETE(request: NextRequest) {
  const file = request.nextUrl.searchParams.get('file');
  const all = request.nextUrl.searchParams.get('all');

  if (!existsSync(OUT_DIR)) {
    return NextResponse.json({ error: 'OUT_DIR nao existe' }, { status: 404 });
  }

  try {
    if (all === 'true') {
      const entries = await readdir(OUT_DIR);
      const videos = entries.filter(f => f.endsWith('.mp4'));
      await Promise.all(
        videos.map(f => unlink(path.join(OUT_DIR, f)))
      );
      return NextResponse.json({ deleted: videos.length });
    }

    if (!file) {
      return NextResponse.json({ error: 'parametro file obrigatorio' }, { status: 400 });
    }

    const safeName = path.basename(file);
    const filePath = path.join(OUT_DIR, safeName);
    if (!filePath.startsWith(OUT_DIR) || !existsSync(filePath)) {
      return NextResponse.json({ error: 'arquivo nao encontrado' }, { status: 404 });
    }
    await unlink(filePath);
    return NextResponse.json({ deleted: safeName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
