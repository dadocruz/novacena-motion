import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BulkRenderSchema = z.object({
  projects: z.array(
    z.object({
      artistName: z.string(),
      songTitle: z.string(),
      templates: z.array(z.enum(['available_now', 'watch_youtube', 'youtube_subscribe', 'milestone', 'out_now', 'spotify_print'])),
      formats: z.array(z.enum(['story', 'feed'])).optional().default(['story', 'feed']),
    })
  ),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

type BulkRenderRequest = z.infer<typeof BulkRenderSchema>;

/**
 * POST /api/render/bulk
 * Enfileirar múltiplos renders in batch
 * Exemplo: renderizar 10 artistas x 2 templates x 2 formatos = 40 videos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = BulkRenderSchema.parse(body);

    // Calcular total de renders
    const totalRenders = validated.projects.reduce((sum, p) => {
      return sum + p.templates.length * p.formats.length;
    }, 0);

    // Gerar batch ID
    const batchId = `batch-${Date.now()}`;

    // Enfileirar todos os renders (em produção, seria via job queue system)
    const jobs = [];

    for (const project of validated.projects) {
      for (const template of project.templates) {
        for (const format of project.formats) {
          jobs.push({
            batchId,
            template,
            format,
            artist: project.artistName,
            song: project.songTitle,
            quality: validated.quality,
            status: 'queued',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        batchId,
        totalRenders,
        estimatedTime: `~${Math.ceil((totalRenders * 4) / 60)} minutos`, // ~4min per render
        jobs,
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao processar batch' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/render/bulk?batchId=xxx
 * Obter status de um batch
 */
export async function GET(request: NextRequest) {
  const batchId = request.nextUrl.searchParams.get('batchId');

  if (!batchId) {
    return NextResponse.json({ error: 'batchId é obrigatório' }, { status: 400 });
  }

  // Em produção, consultar database
  return NextResponse.json({
    batchId,
    status: 'processing',
    completed: 15,
    total: 40,
    progress: 37.5,
    estimatedTime: '~8 minutos',
  });
}
