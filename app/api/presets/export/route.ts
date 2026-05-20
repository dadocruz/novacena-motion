import { NextRequest, NextResponse } from 'next/server';

function safeJsonFileName(name: string): string {
  const safe = String(name || 'novacena-preset.json')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);

  const withExtension = safe.toLowerCase().endsWith('.json') ? safe : `${safe}.json`;
  return withExtension || 'novacena-preset.json';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const rawPayload = String(formData.get('payload') ?? '');
    const fileName = safeJsonFileName(String(formData.get('fileName') ?? 'novacena-preset.json'));

    if (!rawPayload) {
      return NextResponse.json({ error: 'payload obrigatório' }, { status: 400 });
    }

    const parsed = JSON.parse(rawPayload);
    const body = JSON.stringify(parsed, null, 2);

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Preset JSON inválido' }, { status: 400 });
  }
}
