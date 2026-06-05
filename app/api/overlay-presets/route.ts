import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listOverlayPresets,
  addOverlayPreset,
  deleteOverlayPreset,
} from '../../../lib/storage';

export const dynamic = 'force-dynamic';

const PresetSchema = z.object({
  label: z.string().min(1, 'Nome é obrigatório').max(80),
  template: z.string().min(1),
  pack: z.string().optional(),
  type: z.enum(['video', 'image']),
  thumbnail: z.string().optional(),
  placement: z.record(z.string(), z.any()),
});

export async function GET(req: NextRequest) {
  const template = req.nextUrl.searchParams.get('template') || undefined;
  const presets = await listOverlayPresets(template);
  return NextResponse.json({ ok: true, presets });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PresetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const data = { ...parsed.data };
    // Evita inchar o JSON: thumbnail muito grande é descartada (salva sem thumb).
    if (data.thumbnail && data.thumbnail.length > 400_000) {
      data.thumbnail = undefined;
    }

    const preset = await addOverlayPreset(data);
    return NextResponse.json({ ok: true, preset });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Falha ao salvar preset.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id obrigatório.' }, { status: 400 });
  }
  const ok = await deleteOverlayPreset(id);
  return NextResponse.json({ ok });
}
