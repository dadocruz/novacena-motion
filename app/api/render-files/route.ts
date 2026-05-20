import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const GENERATED_FILE_EXTENSIONS = ['.mp4', '.png', '.json', '.txt'];

function getOutDir() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'out');
}

function isGeneratedRenderFile(fileName: string): boolean {
  const safeName = path.basename(fileName);
  return GENERATED_FILE_EXTENSIONS.some((ext) => safeName.endsWith(ext));
}

export async function GET(request: NextRequest) {
  const outDir = getOutDir();
  const file = request.nextUrl.searchParams.get('file');

  // Download de um arquivo específico
  if (file) {
    const safeName = path.basename(file);
    const filePath = path.join(outDir, safeName);
    if (!filePath.startsWith(outDir) || !existsSync(filePath)) {
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
  if (!existsSync(outDir)) {
    return NextResponse.json({ files: [] });
  }
  const entries = await readdir(outDir);
  const files = await Promise.all(
    entries
      .filter(f => f.endsWith('.mp4'))
      .map(async f => {
        const s = await stat(path.join(outDir, f));
        return { name: f, size: s.size, mtime: s.mtime.toISOString() };
      })
  );
  files.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
  return NextResponse.json({ files });
}


export async function DELETE(request: NextRequest) {
  const outDir = getOutDir();
  const file = request.nextUrl.searchParams.get('file');
  const all = request.nextUrl.searchParams.get('all');

  if (!existsSync(outDir)) {
    return NextResponse.json({ error: 'OUT_DIR nao existe' }, { status: 404 });
  }

  try {
    if (all === 'true') {
      const entries = await readdir(outDir);
      const files = entries.filter(isGeneratedRenderFile);
      await Promise.all(
        files.map(f => unlink(path.join(outDir, f)))
      );
      return NextResponse.json({ deleted: files.length });
    }

    if (!file) {
      return NextResponse.json({ error: 'parametro file obrigatorio' }, { status: 400 });
    }

    const safeName = path.basename(file);
    const filePath = path.join(outDir, safeName);
    if (!filePath.startsWith(outDir) || !existsSync(filePath)) {
      return NextResponse.json({ error: 'arquivo nao encontrado' }, { status: 404 });
    }
    await unlink(filePath);
    return NextResponse.json({ deleted: safeName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
