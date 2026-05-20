import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getOutDir() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'out');
}

export async function POST() {
  const outDir = getOutDir();

  try {
    if (!existsSync(outDir)) {
      await mkdir(outDir, { recursive: true });
    }

    if (process.platform === 'darwin') {
      await execFileAsync('open', [outDir]);
    } else if (process.platform === 'win32') {
      await execFileAsync('cmd', ['/c', 'start', '', outDir]);
    } else {
      await execFileAsync('xdg-open', [outDir]);
    }

    return NextResponse.json({ ok: true, path: outDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falha ao abrir pasta';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
