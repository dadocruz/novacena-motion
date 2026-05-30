import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/adminAuth';
import { readSiteContent, writeSiteContent, normalizeSiteContent, type SiteContent } from '../../../lib/siteContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/site-content — público, retorna conteúdo do site */
export async function GET() {
  const content = await readSiteContent();
  return NextResponse.json({ ok: true, content });
}

/** PUT /api/site-content — admin, atualiza conteúdo do site */
export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as { content: SiteContent };
    if (!body.content) {
      return NextResponse.json({ ok: false, error: 'Campo "content" obrigatório.' }, { status: 400 });
    }
    const content = normalizeSiteContent(body.content);
    await writeSiteContent(content);
    return NextResponse.json({ ok: true, content });
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido.' }, { status: 400 });
  }
}
