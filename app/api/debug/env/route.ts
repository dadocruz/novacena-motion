import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/adminAuth';

export const runtime = 'nodejs';

function mask(value?: string) {
  if (!value) return null;
  if (value.length <= 6) return value.replace(/./g, '*');
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

export async function POST(req: NextRequest) {
  const authErr = requireAdmin(req);
  if (authErr) return authErr;

  const env = {
    NODE_ENV: process.env.NODE_ENV ?? null,
    NOVACENA_ADMIN_TOKEN: mask(process.env.NOVACENA_ADMIN_TOKEN),
    GEMINI_API_KEY: mask(process.env.GEMINI_API_KEY),
    NEXT_PUBLIC_NOVACENA_SAAS_MODE: process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE ?? null,
    NEXT_PUBLIC_MOTION_META_PIXEL_ID: process.env.NEXT_PUBLIC_MOTION_META_PIXEL_ID ?? null,
  };

  return NextResponse.json({ ok: true, env });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
