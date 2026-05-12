import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import type { MotionProject } from '../../../remotion/types';

const execAsync = promisify(exec);

export const runtime = 'nodejs';

// Validação com Zod
const RenderRequestSchema = z.object({
  project: z.object({
    type: z.enum(['available_now', 'watch_youtube', 'milestone', 'out_now', 'collaborator']),
    artistName: z.string().min(1),
    songTitle: z.string().min(1),
    formats: z.array(z.enum(['story', 'feed'])),
  }),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  streaming: z.boolean().optional().default(false),
});

type RenderRequest = z.infer<typeof RenderRequestSchema>;

const ScriptRenderSchema = z.object({
  script: z.string().min(1),
});

const ALLOWED_RENDER_SCRIPTS = new Set([
  'render:available',
  'render:available:feed',
  'render:youtube',
  'render:youtube:feed',
  'render:milestone',
  'render:milestone:feed',
  'render:outnow',
  'render:outnow:feed',
  'render:all',
  'render:all:v2',
]);

// In-memory render queue (em produção, usar Redis ou Kafka)
const renderQueue: Map<string, any> = new Map();

/**
 * POST /api/render
 * Enfileirar novo job de render
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Fluxo usado pelo editor atual: { script: "render:...", props?: {...} }
    if (body && typeof body === 'object' && 'script' in body) {
      const parsed = ScriptRenderSchema.parse(body);
      const script = parsed.script.trim();
      const props = body.props ?? null;

      if (!ALLOWED_RENDER_SCRIPTS.has(script)) {
        return NextResponse.json(
          { ok: false, error: `Script não permitido: ${script}` },
          { status: 400 }
        );
      }

      // Mapear script para composition id e output
      const scriptToComposition: Record<string, { id: string; out: string; target: string }> = {
        'render:available':      { id: 'AvailableNow',       out: 'out/available-now-story.mp4', target: 'story' },
        'render:available:feed': { id: 'AvailableNowFeed',   out: 'out/available-now-feed.mp4',  target: 'feed'  },
        'render:youtube':        { id: 'WatchOnYouTube',     out: 'out/youtube-story.mp4',       target: 'story' },
        'render:youtube:feed':   { id: 'WatchOnYouTubeFeed', out: 'out/youtube-feed.mp4',        target: 'feed'  },
        'render:milestone':      { id: 'Milestone',          out: 'out/milestone-story.mp4',     target: 'story' },
        'render:milestone:feed': { id: 'MilestoneFeed',      out: 'out/milestone-feed.mp4',      target: 'feed'  },
        'render:outnow':         { id: 'OutNow',             out: 'out/out-now-story.mp4',       target: 'story' },
        'render:outnow:feed':    { id: 'OutNowFeed',         out: 'out/out-now-feed.mp4',        target: 'feed'  },
      };

      const comp = scriptToComposition[script];

      // Se temos props do editor E é um script individual (não render:all), usar --props
      if (props && comp) {
        const { mkdirSync } = await import('fs');
        mkdirSync('out', { recursive: true });

        // Converter URLs relativas para absolutas no audioSrc
        const renderProps = JSON.parse(JSON.stringify(props));
        const bg = renderProps?.motion?.background;
        if (bg?.audioSrc && bg.audioSrc.startsWith('/')) {
          bg.audioSrc = `http://localhost:3000${bg.audioSrc}`;
        }
        if (bg?.videoSrc && bg.videoSrc.startsWith('/')) {
          bg.videoSrc = `http://localhost:3000${bg.videoSrc}`;
        }
        if (renderProps?.coverImage && renderProps.coverImage.startsWith('/')) {
          renderProps.coverImage = `http://localhost:3000${renderProps.coverImage}`;
        }
        // Garantir renderTarget
        renderProps.renderTarget = comp.target;

        const propsJson = JSON.stringify(renderProps).replace(/'/g, "\'");
        const cmd = `npx remotion render remotion/index.ts ${comp.id} ${comp.out} --props='${propsJson}'`;

        try {
          const { stdout, stderr } = await execAsync(cmd, {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 50,
          });
          const output = [stdout, stderr].filter(Boolean).join('\n');
          return NextResponse.json({ ok: true, output, outputFile: comp.out });
        } catch (err: any) {
          const output = [err?.stdout, err?.stderr].filter(Boolean).join('\n');
          return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Falha no render', output }, { status: 500 });
        }
      }

      // Fallback: render sem props (usa sample-project.json)
      try {
        const { stdout, stderr } = await execAsync(`npm run ${script}`, {
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10,
        });
        const output = [stdout, stderr].filter(Boolean).join('\n');
        return NextResponse.json({ ok: true, output });
      } catch (err: any) {
        const output = [err?.stdout, err?.stderr].filter(Boolean).join('\n');
        return NextResponse.json(
          {
            ok: false,
            error: err instanceof Error ? err.message : 'Falha no render',
            output,
          },
          { status: 500 }
        );
      }
    }

    // Validar request
    const validated = RenderRequestSchema.parse(body);

    // Gerar job ID
    const jobId = `render-${validated.project.type}-${Date.now()}`;

    // Criar job
    const job = {
      id: jobId,
      ...validated,
      status: 'queued' as const,
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    // Armazenar na queue
    renderQueue.set(jobId, job);

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: `${validated.project.formats.length} render(s) enfileirado(s)`,
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao processar request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/render?jobId=xxx
 * Obter status de um job
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const listAll = request.nextUrl.searchParams.get('list');

  if (listAll === 'true') {
    // Retornar todos os jobs (útil para dashboard)
    const jobs = Array.from(renderQueue.values());
    return NextResponse.json({
      total: jobs.length,
      queued: jobs.filter((j) => j.status === 'queued').length,
      active: jobs.filter((j) => j.status === 'rendering').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      jobs: jobs.slice(-20), // Ultimos 20
    });
  }

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId é obrigatório' },
      { status: 400 }
    );
  }

  const job = renderQueue.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job não encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({ job });
}

/**
 * DELETE /api/render?jobId=xxx
 * Cancelar um render
 */
export async function DELETE(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId é obrigatório' },
      { status: 400 }
    );
  }

  const job = renderQueue.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job não encontrado' },
      { status: 404 }
    );
  }

  if (job.status === 'completed') {
    return NextResponse.json(
      { error: 'Não pode cancelar um render completo' },
      { status: 400 }
    );
  }

  // Remover da queue
  renderQueue.delete(jobId);

  return NextResponse.json({
    success: true,
    message: 'Render cancelado',
  });
}
