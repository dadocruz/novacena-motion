import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const PresetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  config: z.record(z.string(), z.any()),
  thumbnail: z.string().optional(),
  createdAt: z.number().optional(),
});

type Preset = z.infer<typeof PresetSchema>;

const PRESETS_FILE = path.join(process.cwd(), 'data', 'presets.json');

/**
 * Carregar presets do arquivo
 */
async function loadPresets(): Promise<Preset[]> {
  try {
    const content = await fs.readFile(PRESETS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Se arquivo não existe, return empty array
    return [];
  }
}

/**
 * Salvar presets no arquivo
 */
async function savePresets(presets: Preset[]): Promise<void> {
  const dir = path.dirname(PRESETS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(PRESETS_FILE, JSON.stringify(presets, null, 2));
}

/**
 * GET /api/presets
 * Listar todos os presets
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  try {
    const presets = await loadPresets();

    if (id) {
      const preset = presets.find((p) => p.id === id);
      if (!preset) {
        return NextResponse.json(
          { error: 'Preset não encontrado' },
          { status: 404 }
        );
      }
      return NextResponse.json({ preset });
    }

    return NextResponse.json({ presets });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao carregar presets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/presets
 * Criar novo preset
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = PresetSchema.parse(body);

    const presets = await loadPresets();

    const newPreset: Preset = {
      ...validated,
      id: validated.id || `preset-${Date.now()}`,
      createdAt: validated.createdAt || Date.now(),
    };

    presets.push(newPreset);
    await savePresets(presets);

    return NextResponse.json(
      { success: true, preset: newPreset },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao criar preset' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/presets?id=xxx
 * Atualizar preset
 */
export async function PUT(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'id é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const validated = PresetSchema.partial().parse(body);

    const presets = await loadPresets();
    const index = presets.findIndex((p) => p.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Preset não encontrado' },
        { status: 404 }
      );
    }

    presets[index] = { ...presets[index], ...validated };
    await savePresets(presets);

    return NextResponse.json({ success: true, preset: presets[index] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar preset' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/presets?id=xxx
 * Deletar preset
 */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'id é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const presets = await loadPresets();
    const filtered = presets.filter((p) => p.id !== id);

    if (filtered.length === presets.length) {
      return NextResponse.json(
        { error: 'Preset não encontrado' },
        { status: 404 }
      );
    }

    await savePresets(filtered);

    return NextResponse.json({ success: true, message: 'Preset deletado' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao deletar preset' },
      { status: 500 }
    );
  }
}
