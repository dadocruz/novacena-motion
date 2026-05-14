import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    await execAsync(`pkill -f "remotion render" || true`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao cancelar render',
    }, { status: 500 });
  }
}
