import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/adminAuth';
import { listSaasUsers } from '../../../../lib/saasUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const users = await listSaasUsers();
  return NextResponse.json({
    ok: true,
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      tokens: user.tokens,
      planId: user.planId ?? null,
      billingCycle: user.billingCycle ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
}
