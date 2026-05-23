import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/adminAuth';
import { cleanupTransientFiles } from '../../../../lib/transientCleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const result = await cleanupTransientFiles({ dryRun });
  return NextResponse.json(result);
}
