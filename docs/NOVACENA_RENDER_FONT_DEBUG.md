# NovaCena Render Font Debug

Gerado em: Sáb 16 Mai 2026 12:24:31 -03

## A) Estado do Git

```
branch:
feature/trim

últimos 10 commits:
74e3bd2 fix: sincroniza preview e exportacao
8d45e2f feat: adiciona posicao x y da capa no preview e render
354d180 ui: coloca escala primeiro nos ajustes de texto
6c1a144 ui: move ajustes principais do texto para o topo
24f49fd ui: adiciona dock principal no topo do painel direito
e6b9852 fix: unifica cor do texto no painel principal
3b8a989 fix: restaura editor de cor do texto
89bbff1 fix: remove seletor duplicado de cor do texto
cace8f2 fix: coloca posicao y antes da x no painel de texto
872572c fix: carrega fontes premium no render

status:
 M next-env.d.ts
?? ....
?? docs/NOVACENA_RENDER_FONT_DEBUG.md
```

## B) Pontos-chave em app/page.tsx

```
276:  const [fontHeadline, setFontHeadline] = useState<string>(DEFAULT_FONTS.headline);
277:  const [fontDate, setFontDate] = useState<string>(DEFAULT_FONTS.date);
278:  const [fontCta, setFontCta] = useState<string>(DEFAULT_FONTS.cta);
405:        const res = await fetch(`/api/render?jobId=${renderJobId}`);
659:    fetch('/api/render-files').then(r => r.json()).then(d => setRenderFiles(d.files ?? []));
705:  const currentFontHeadline = useMemo(() => findFont(fontHeadline), [allFonts, fontHeadline]);
706:  const currentFontDate = useMemo(() => findFont(fontDate), [allFonts, fontDate]);
707:  const currentFontCta = useMemo(() => findFont(fontCta), [allFonts, fontCta]);
800:      fontHeadline,
801:      fontDate,
802:      fontCta,
803:      customFonts: userFonts.map(userFontToFontDef),
857:      fontHeadline,
858:      fontDate,
859:      fontCta,
921:      fontHeadline,
922:      fontDate,
923:      fontCta,
969:  const motionWithStyles = React.useMemo(() => {
1006:  const project = useMemo(() => {
1034:  const liveProject = React.useMemo(() => {
1221:      setFontHeadline(m.fontHeadline ?? DEFAULT_FONTS.headline);
1222:      setFontDate(m.fontDate ?? DEFAULT_FONTS.date);
1223:      setFontCta(m.fontCta ?? DEFAULT_FONTS.cta);
1268:    const r = await fetch(`/api/render-files?file=${encodeURIComponent(name)}`, { method: 'DELETE' });
1270:      const d = await fetch('/api/render-files').then(x => x.json());
1279:    const r = await fetch('/api/render-files?all=true', { method: 'DELETE' });
1546:    const renderPropsForServer = {
1556:    const response = await fetch('/api/render', {
1559:      body: JSON.stringify({ script, props: renderPropsForServer }),
1570:    fetch('/api/render-files').then(r => r.json()).then(d => setRenderFiles(d.files ?? []));
1950:                inputProps={liveProject}
2067:                      href={`/api/render-files?file=${encodeURIComponent(f.name)}`}
2451:            fontHeadline={fontHeadline} fontDate={fontDate} fontCta={fontCta}
```

### Bloco completo do liveProject (50 linhas a partir do ponto):
```tsx
  const liveProject = React.useMemo(() => {
    return {
      ...project,
      durationSeconds,
      motion: motionWithStyles,
      renderTarget: target,
    };
  }, [project, durationSeconds, motionWithStyles, target]);

  const Component = componentByTemplate[template];

  const compositionHeight = target === 'story' ? 1920 : 1350;

  // ─── HANDLERS ────────────────────────────────────────────
  function setPlatformScale(platform: string, value: number) {
    setPlatformLogoScales((prev) => ({ ...prev, [platform]: value }));
    setPreviewNonce((n) => n + 1);
  }




  function previewCoverMotionChange(value: unknown) {
    const next = normalizeCoverMotionId(value);
    setCoverMotion(next);

    // Só a troca da animação da capa volta para o início,
    // porque a diferença está exatamente na entrada.
    requestAnimationFrame(() => {
      try {
        playerRef.current?.seekTo?.(0);
        playerRef.current?.play?.();
      } catch {
        // fallback silencioso
      }
    });
  }

  function normalizeCoverMotionId(value: unknown): CoverMotionId {
    const raw = String(value || 'zoom_bounce');

    if (raw === 'slide_up_glow') return 'slide_up';
    if (raw === 'zoom_bounce_intro') return 'zoom_bounce';
    if (raw === 'flip_card_premium') return 'flip_card';
    if (raw === 'slide_left_in') return 'slide_left';
    if (raw === 'slide_right_in') return 'slide_right';

    if (
      raw === 'zoom_bounce' ||
      raw === 'slide_up' ||
      raw === 'slide_left' ||
      raw === 'slide_right' ||
      raw === 'flip_card' ||
      raw === 'vinyl_reveal'
    ) {
      return raw as CoverMotionId;
    }

    return 'zoom_bounce';
  }

```

### Bloco do renderPropsForServer:
```tsx
    const renderPropsForServer = {
      ...liveProject,
      posterFrame: {
        enabled: posterFrameEnabled,
        frameSec: posterFrameSec,
        holdSec: posterHoldSec,
        outroEnabled: posterOutroEnabled,
      },
    };

    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, props: renderPropsForServer }),
    });
    const result = await response.json();
    setRendering(false);
    setRenderLog(result.output ?? '');
    if (!result.ok) {
      setRenderMessage(`Erro: ${result.error ?? 'falha'}`);
      return;
    }
    setRenderMessage(`${label} gerado. ✓`);
    // Atualizar lista de arquivos disponíveis para download
    fetch('/api/render-files').then(r => r.json()).then(d => setRenderFiles(d.files ?? []));
  }

  async function openOutFolder() {
    await fetch('/api/open-out', { method: 'POST' });
  }

  async function saveProjectMain() {
    setSaving(true);
    setSaveMessage('Salvando…');
    const formData = new FormData();
    formData.append('template', template);
    formData.append('artistName', activeArtist?.name ?? '');
    formData.append('songTitle', headline);
    formData.append('releaseDate', releaseDate);
    formData.append('headline', headline);
    formData.append('cta', cta);
```

## C) /api/render/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

function shQuote(value: string) {
  return JSON.stringify(value);
}


export const runtime = 'nodejs';

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

const renderQueue: Map<string, any> = new Map();

async function pathToDataUrl(urlPath: string): Promise<string | null> {
  try {
    let cleanPath = urlPath;
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      const u = new URL(cleanPath);
      cleanPath = u.pathname;
    }
    if (cleanPath.startsWith('/api/uploads/')) {
      cleanPath = cleanPath.replace('/api/uploads/', '/uploads/');
    }
    if (!cleanPath.startsWith('/uploads/')) {
      return null;
    }
    const filePath = join(process.cwd(), 'public', cleanPath);
    const buf = await readFile(filePath);
    const ext = (filePath.split('.').pop() || 'png').toLowerCase();
    const mime =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'svg' ? 'image/svg+xml' :
      ext === 'webp' ? 'image/webp' :
      'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

      if (props && comp) {
        await mkdir('out', { recursive: true });

        const renderProps = JSON.parse(JSON.stringify(props));

        // Cover image → base64 (evita 404 do Remotion CLI na porta 3001)
        if (renderProps?.coverImage && typeof renderProps.coverImage === 'string' && renderProps.coverImage.startsWith('/')) {
          const dataUrl = await pathToDataUrl(renderProps.coverImage);
          if (dataUrl) renderProps.coverImage = dataUrl;
        }

        // Audio/Video de fundo → continua HTTP (arquivos grandes)
        const bg = renderProps?.motion?.background;
        if (bg?.audioSrc && typeof bg.audioSrc === 'string' && bg.audioSrc.startsWith('/')) {
          bg.audioSrc = `http://localhost:3000${bg.audioSrc}`;
        }
        if (bg?.videoSrc && typeof bg.videoSrc === 'string' && bg.videoSrc.startsWith('/')) {
          bg.videoSrc = `http://localhost:3000${bg.videoSrc}`;
        }

        // Custom logos → base64 inline
        if (renderProps?.motion?.customLogos && typeof renderProps.motion.customLogos === 'object') {
          for (const key of Object.keys(renderProps.motion.customLogos)) {
            const val = renderProps.motion.customLogos[key];
            if (typeof val === 'string' && val.startsWith('/')) {
              const dataUrl = await pathToDataUrl(val);
              if (dataUrl) {
                renderProps.motion.customLogos[key] = dataUrl;
              } else {
                delete renderProps.motion.customLogos[key];
              }
            }
          }
        }

        
        // Normaliza logos customizados dentro de motion.customLogos.
        // O frontend envia customLogos dentro de motion, não na raiz.
        if (renderProps?.motion?.customLogos && typeof renderProps.motion.customLogos === 'object') {
          for (const key of Object.keys(renderProps.motion.customLogos)) {
            const val = renderProps.motion.customLogos[key];

            if (typeof val === 'string') {
              let fixed = val;

              if (fixed.startsWith('/uploads/')) {
                fixed = fixed.replace('/uploads/', '/api/uploads/');
              }

              if (fixed.startsWith('/')) {
                fixed = `http://localhost:3000${fixed}`;
              }

              renderProps.motion.customLogos[key] = fixed;
            }
          }
        }

        renderProps.renderTarget = comp.target;

        // FIX E2BIG: escreve props num arquivo temp em vez de passar via --props='...'
        // O macOS limita argumentos da linha de comando a ~262KB, base64 estoura isso.
        const tmpFile = join(tmpdir(), `novacena-render-${randomBytes(8).toString('hex')}.json`);
        await writeFile(tmpFile, JSON.stringify(renderProps), 'utf-8');

        const outputFileForRender = comp.out.replace(/\.mp4$/, `-${Date.now()}.mp4`);

        const posterCfg = renderProps?.posterFrame;
        const posterEnabled = Boolean(posterCfg?.enabled);
        const posterHoldSecRaw = Number(posterCfg?.holdSec ?? 1);
        const posterHoldSec = Number.isFinite(posterHoldSecRaw) && posterHoldSecRaw > 0 ? Math.min(posterHoldSecRaw, 5) : 1;
        const posterFrameSecRaw = Number(posterCfg?.frameSec ?? 0);
        const posterFrameSec = Number.isFinite(posterFrameSecRaw) && posterFrameSecRaw >= 0 ? posterFrameSecRaw : 0;
        const posterOutroEnabled = posterCfg?.outroEnabled !== false;

        const normalOutputFile = posterEnabled
          ? outputFileForRender.replace(/\.mp4$/, `.normal.mp4`)
          : outputFileForRender;

        const cmd = `npx remotion render remotion-entry/index.ts ${comp.id} ${normalOutputFile} --props=${tmpFile}`;

        try {
          const { stdout, stderr } = await execAsync(cmd, {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 100,
          });

          let output = [stdout, stderr].filter(Boolean).join('\n');

          if (posterEnabled) {
            const fps = 30;
            const durationSecondsForPoster = Number(renderProps?.durationSeconds ?? 8);
            const safeDurationSeconds = Number.isFinite(durationSecondsForPoster) && durationSecondsForPoster > 0
              ? durationSecondsForPoster
              : 8;

            const maxFrame = Math.max(0, Math.round(safeDurationSeconds * fps) - 1);
            const posterFrame = Math.max(0, Math.min(maxFrame, Math.round(posterFrameSec * fps)));

            const posterPng = outputFileForRender.replace(/\.mp4$/, `-poster-${posterFrame}f.png`);
            const posterIntroMp4 = outputFileForRender.replace(/\.mp4$/, `.poster-intro.mp4`);
            const posterOutroMp4 = outputFileForRender.replace(/\.mp4$/, `.poster-outro.mp4`);
            const concatList = outputFileForRender.replace(/\.mp4$/, `.concat.txt`);

            const stillCmd = `npx remotion still remotion-entry/index.ts ${comp.id} ${posterPng} --props=${tmpFile} --frame=${posterFrame}`;
            const { stdout: stillStdout, stderr: stillStderr } = await execAsync(stillCmd, {
              cwd: process.cwd(),
              maxBuffer: 1024 * 1024 * 100,
            });

            output += '\n' + [stillStdout, stillStderr].filter(Boolean).join('\n');

            const makePosterClip = async (file: string) => {
              const ffmpegCmd = [
                'ffmpeg -y',
                '-loop 1',
                `-t ${posterHoldSec}`,
                `-i ${shQuote(posterPng)}`,
                `-f lavfi -t ${posterHoldSec} -i anullsrc=channel_layout=stereo:sample_rate=48000`,
                '-vf "format=yuv420p"',
                '-r 30',
                '-c:v libx264',
                '-c:a aac',
                '-shortest',
                shQuote(file),
              ].join(' ');

              return execAsync(ffmpegCmd, {
                cwd: process.cwd(),
                maxBuffer: 1024 * 1024 * 100,
              });
            };

            await makePosterClip(posterIntroMp4);
            if (posterOutroEnabled) {
              await makePosterClip(posterOutroMp4);
            }

            const concatContent = posterOutroEnabled
              ? `file '${posterIntroMp4.replace(/'/g, "'\\''")}'\nfile '${normalOutputFile.replace(/'/g, "'\\''")}'\nfile '${posterOutroMp4.replace(/'/g, "'\\''")}'\n`
              : `file '${posterIntroMp4.replace(/'/g, "'\\''")}'\nfile '${normalOutputFile.replace(/'/g, "'\\''")}'\n`;

            await writeFile(concatList, concatContent, 'utf-8');

            const concatCmd = [
              'ffmpeg -y',
              '-f concat',
              '-safe 0',
              `-i ${shQuote(concatList)}`,
              '-c copy',
              shQuote(outputFileForRender),
            ].join(' ');

            const { stdout: ffStdout, stderr: ffStderr } = await execAsync(concatCmd, {
              cwd: process.cwd(),
              maxBuffer: 1024 * 1024 * 100,
            });

            output += '\n' + [ffStdout, ffStderr].filter(Boolean).join('\n');
            output += `\nPoster salvo: ${posterPng}`;
            output += `\nVideo final com poster: ${outputFileForRender}`;

            await unlink(normalOutputFile).catch(() => {});
            await unlink(posterIntroMp4).catch(() => {});
            await unlink(posterOutroMp4).catch(() => {});
            await unlink(concatList).catch(() => {});
          }

          await unlink(tmpFile).catch(() => {});
          return NextResponse.json({ ok: true, output, outputFile: outputFileForRender });
        } catch (err: any) {
          await unlink(tmpFile).catch(() => {});
          const output = [err?.stdout, err?.stderr].filter(Boolean).join('\n');
          return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Falha no render', output }, { status: 500 });
        }
      }

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
          { ok: false, error: err instanceof Error ? err.message : 'Falha no render', output },
          { status: 500 }
        );
      }
    }

    const validated = RenderRequestSchema.parse(body);
    const jobId = `render-${validated.project.type}-${Date.now()}`;
    const job = {
      id: jobId,
      ...validated,
      status: 'queued' as const,
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };
    renderQueue.set(jobId, job);
    return NextResponse.json(
      { success: true, jobId, message: `${validated.project.formats.length} render(s) enfileirado(s)` },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validação falhou', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao processar request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const listAll = request.nextUrl.searchParams.get('list');

  if (listAll === 'true') {
    const jobs = Array.from(renderQueue.values());
    return NextResponse.json({
      total: jobs.length,
      queued: jobs.filter((j) => j.status === 'queued').length,
      active: jobs.filter((j) => j.status === 'rendering').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      jobs: jobs.slice(-20),
    });
  }

  if (!jobId) {
    return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 });
  }
  const job = renderQueue.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ job });
}

export async function DELETE(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 });
  }
  const job = renderQueue.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
  }
  if (job.status === 'completed') {
    return NextResponse.json({ error: 'Não pode cancelar um render completo' }, { status: 400 });
  }
  renderQueue.delete(jobId);
  return NextResponse.json({ success: true, message: 'Render cancelado' });
}
```

## D) remotion/Root.tsx

```tsx
import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { AvailableNow } from './AvailableNow';
import { WatchOnYouTube } from './WatchOnYouTube';
import { Milestone } from './Milestone';
import { OutNow } from './OutNow';
import { getProject } from './project';


const FPS = 30;

const resolveDurationInFramesFromProps = ({ props }: { props: any }) => {
  const seconds = Number(props?.durationSeconds ?? 8);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 8;

  return {
    durationInFrames: Math.round(safeSeconds * FPS),
  };
};

// ============================================================
// CARREGAMENTO DE FONTES PARA O RENDER
// ============================================================
// O Remotion CLI roda num Chromium isolado que NÃO tem acesso ao app/fonts.css.
// Sem isso, todas as fontes caem pra Arial (Sans-Serif default).
// Aqui injetamos as 18 fontes via @font-face antes de qualquer composition renderizar.

const FONT_DEFINITIONS: Array<{ family: string; file: string; format: string }> = [
  // PREMIUM IMPORTADAS
  { family: 'Akira Expanded E BOLD', file: 'premium/akiraexpandedebold.otf', format: 'opentype' },
  { family: 'Panton ExtraBlack', file: 'premium/pantonextrablack.otf', format: 'opentype' },
  { family: 'Akira Expanded', file: 'premium/akiraexpanded.otf', format: 'opentype' },
  { family: 'Gramatika Black', file: 'premium/gramatikablack.ttf', format: 'truetype' },
  { family: 'Heavitas', file: 'premium/heavitas.ttf', format: 'truetype' },
  { family: 'LEMON MILK', file: 'premium/lemonmilk.otf', format: 'opentype' },
  { family: '1797 Compressed', file: 'premium/1797compressed.otf', format: 'opentype' },
  { family: 'Aldivaro ExtraBold', file: 'premium/aldivaroextrabold.otf', format: 'opentype' },
  { family: 'Bebas Neue', file: 'premium/bebasneue.otf', format: 'opentype' },
  { family: 'Kenyan Coffee', file: 'premium/kenyancoffee.otf', format: 'opentype' },
  { family: 'BigNoodleTitling Oblique', file: 'premium/bignoodletitlingoblique.ttf', format: 'truetype' },
  { family: 'Nexa', file: 'premium/nexa.otf', format: 'opentype' },
  { family: 'Fair Prosper', file: 'premium/fairprosper.ttf', format: 'truetype' },
  { family: 'Casanova Scotia', file: 'premium/casanovascotia.otf', format: 'opentype' },
  { family: 'Candrika', file: 'premium/candrika.ttf', format: 'truetype' },
  { family: 'Varane', file: 'premium/varane.otf', format: 'opentype' },

  // DISPLAY
  { family: 'TuskerGrotesk Super',   file: 'TuskerGrotesk-8800Super.otf',    format: 'opentype' },
  { family: 'TuskerGrotesk Medium',  file: 'TuskerGrotesk-6500Medium.otf',   format: 'opentype' },
  { family: 'TuskerGrotesk Thin',    file: 'TuskerGrotesk-5500Medium.otf',   format: 'opentype' },
  { family: 'BebasNeue',             file: 'BebasNeue-Regular.otf',          format: 'opentype' },
  { family: 'Antonio',               file: 'Antonio-VariableFont_wght.ttf',  format: 'truetype' },
  { family: 'Oswald',                file: 'Oswald-VariableFont_wght.ttf',   format: 'truetype' },
  { family: 'BurbankBig',            file: 'BurbankBig-Black.otf',           format: 'opentype' },
  { family: 'BurbankCond',           file: 'BurbankBigCond-Bold.otf',        format: 'opentype' },
  { family: 'Gobold',                file: 'Gobold-Extra.otf',               format: 'opentype' },
  { family: 'InterstateBlackCond',   file: 'Interstate-BlackCond.otf',       format: 'opentype' },
  { family: 'PantonBlackItalic',     file: 'Panton-BlackitalicCaps.otf',     format: 'opentype' },
  { family: 'BoldVision',            file: 'BoldVision-Regular.ttf',         format: 'truetype' },

  // SANS
  { family: 'Panton',                file: 'Panton-Regular.otf',             format: 'opentype' },
  { family: 'Klein',                 file: 'Klein-Text.ttf',                 format: 'truetype' },
  { family: 'Coco',                  file: 'Coco-Regular.otf',               format: 'opentype' },
  { family: 'Ubuntu',                file: 'Ubuntu-Medium.ttf',              format: 'truetype' },

  // SPECIAL
  { family: 'AuthorityRounded',      file: 'Authority-Rounded.ttf',          format: 'truetype' },
  { family: 'Toxico',                file: 'Toxico.otf',                     format: 'opentype' },
];

let fontsInjected = false;

function injectFontsOnce(): Promise<void> {
  if (fontsInjected || typeof document === 'undefined') {
    return Promise.resolve();
  }
  fontsInjected = true;

  // Cria um <style> com @font-face apontando pra /public/fonts/
  // staticFile() resolve a URL correta tanto no preview quanto no render CLI.
  const css = FONT_DEFINITIONS.map(
    (f) =>
      `@font-face { font-family: '${f.family}'; src: url('${staticFile(`fonts/${f.file}`)}') format('${f.format}'); font-display: block; }`
  ).join('\n');

  const style = document.createElement('style');
  style.setAttribute('data-novacena-fonts', 'true');
  style.textContent = css;
  document.head.appendChild(style);

  // Força o navegador (Chromium do render) a baixar e parsear cada fonte
  // ANTES de qualquer frame ser renderizado.
  if (typeof document.fonts?.load === 'function') {
    return Promise.all(
      FONT_DEFINITIONS.map((f) =>
        document.fonts.load(`16px '${f.family}'`).catch(() => null)
      )
    ).then(() => undefined);
  }

  // Fallback simples se a Font Loading API não existir
  return new Promise((resolve) => setTimeout(resolve, 300));
}

// Hook que segura o render até as fontes estarem prontas
function useFontsReady() {
  const [handle] = React.useState(() => delayRender('Loading fonts'));

  React.useEffect(() => {
    injectFontsOnce()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
}

const templates = [
  { id: 'AvailableNow', component: AvailableNow, project: getProject('available_now') },
  { id: 'WatchOnYouTube', component: WatchOnYouTube, project: getProject('watch_youtube') },
  { id: 'Milestone', component: Milestone, project: getProject('milestone') },
  { id: 'OutNow', component: OutNow, project: getProject('out_now') },
] as const;

export const RemotionRoot: React.FC = () => {
  useFontsReady();

  return (
    <>
      {templates.map((template) => (
        <React.Fragment key={template.id}>
          <Composition
            calculateMetadata={resolveDurationInFramesFromProps}
            id={template.id}
            component={template.component}
            width={1080}
            height={1920}
            fps={FPS}
            defaultProps={{ ...template.project, renderTarget: 'story' as const }}
          />
          <Composition
            calculateMetadata={resolveDurationInFramesFromProps}
            id={`${template.id}Feed`}
            component={template.component}
            width={1080}
            height={1350}
            fps={FPS}
            defaultProps={{ ...template.project, renderTarget: 'feed' as const }}
          />
        </React.Fragment>
      ))}
    </>
  );
};
```

## E) remotion/FontFaces.tsx

```tsx
import React from 'react';

type FontFaceDef = {
  id: string;
  label: string;
  file: string;
  family: string;
  weight: number;
  category: 'display' | 'sans' | 'special';
  vibe: string;
};

type Props = {
  fonts?: FontFaceDef[];
  activeFontIds?: string[];
};

function fontFormat(file: string) {
  const lower = file.toLowerCase();
  if (lower.endsWith('.ttf')) return 'truetype';
  if (lower.endsWith('.otf')) return 'opentype';
  if (lower.endsWith('.woff2')) return 'woff2';
  return 'woff';
}

function escapeCss(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export const FontFaces: React.FC<Props> = ({ fonts = [], activeFontIds = [] }) => {
  const active = new Set(activeFontIds.filter(Boolean));

  const selectedFonts = fonts.filter((font) => {
    if (!font?.id || !font?.family || !font?.file) return false;
    if (active.size === 0) return false;
    return active.has(font.id);
  });

  if (!selectedFonts.length) return null;

  const seen = new Set<string>();
  const uniqueFonts = selectedFonts.filter((font) => {
    if (seen.has(font.family)) return false;
    seen.add(font.family);
    return true;
  });

  const css = uniqueFonts
    .map((font) => {
      const family = escapeCss(font.family);
      const file = encodeURIComponent(font.file);
      const format = fontFormat(font.file);

      return `
@font-face {
  font-family: '${family}';
  src: url('/api/uploads/user-fonts/${file}') format('${format}');
  font-weight: ${font.weight || 700};
  font-style: normal;
  font-display: block;
}`;
    })
    .join('\n');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
```

## F) lib/fontCatalog.ts (resumo - 200 primeiras linhas)

```ts
/**
 * Catálogo das 18 fontes premium curadas para o NovaCena Motion.
 * Cada fonte tem nome de exibição, slug usado em CSS, categoria, e arquivo.
 *
 * As fontes são carregadas via @font-face em `app/fonts.css`.
 */

import type React from 'react';

export type FontCategory = 'display' | 'sans' | 'special';

export type FontDef = {
  id: string;
  label: string;
  file: string;
  family: string; // o que vai em `font-family` do CSS
  weight: number; // peso recomendado pra preview/uso
  category: FontCategory;
  /** Dica visual pra ajudar a escolher */
  vibe: string;
  /** Texto curto de demonstração no preview */
  preview?: string;
};

export const PREMIUM_FONT_CATALOG: FontDef[] = [
  { id: 'premium-akira-expanded-e-bold', label: '⭐ Akira Expanded E BOLD', family: 'Akira Expanded E BOLD', file: '/fonts/premium/akiraexpandedebold.otf', weight: 900, category: 'display', vibe: 'premium impacto / título gigante' },
  { id: 'premium-panton-extrablack', label: '⭐ Panton ExtraBlack', family: 'Panton ExtraBlack', file: '/fonts/premium/pantonextrablack.otf', weight: 900, category: 'display', vibe: 'premium número / milestone / capa forte' },
  { id: 'premium-akira-expanded', label: '⭐ Akira Expanded', family: 'Akira Expanded', file: '/fonts/premium/akiraexpanded.otf', weight: 800, category: 'display', vibe: 'premium impacto / moderno' },
  { id: 'premium-gramatika-black', label: '⭐ Gramatika Black', family: 'Gramatika Black', file: '/fonts/premium/gramatikablack.ttf', weight: 900, category: 'display', vibe: 'premium impacto / display' },
  { id: 'premium-heavitas', label: '⭐ Heavitas', family: 'Heavitas', file: '/fonts/premium/heavitas.ttf', weight: 900, category: 'display', vibe: 'premium pesado / headline' },
  { id: 'premium-lemon-milk', label: '⭐ LEMON MILK', family: 'LEMON MILK', file: '/fonts/premium/lemonmilk.otf', weight: 800, category: 'display', vibe: 'premium clean / forte' },
  { id: 'premium-1797-compressed', label: '⭐ 1797 Compressed', family: '1797 Compressed', file: '/fonts/premium/1797compressed.otf', weight: 900, category: 'display', vibe: 'premium condensada / cartaz' },
  { id: 'premium-aldivaro-extrabold', label: '⭐ Aldivaro ExtraBold', family: 'Aldivaro ExtraBold', file: '/fonts/premium/aldivaroextrabold.otf', weight: 900, category: 'display', vibe: 'premium impacto / elegante' },

  { id: 'premium-bebas-neue', label: '⭐ Bebas Neue', family: 'Bebas Neue', file: '/fonts/premium/bebasneue.otf', weight: 700, category: 'display', vibe: 'sertanejo / show / YouTube' },
  { id: 'premium-kenyan-coffee', label: '⭐ Kenyan Coffee', family: 'Kenyan Coffee', file: '/fonts/premium/kenyancoffee.otf', weight: 700, category: 'display', vibe: 'sertanejo / divulgação' },
  { id: 'premium-big-noodle-oblique', label: '⭐ BigNoodleTitling Oblique', family: 'BigNoodleTitling Oblique', file: '/fonts/premium/bignoodletitlingoblique.ttf', weight: 700, category: 'display', vibe: 'show / inclinado / impacto' },

  { id: 'premium-nexa', label: '⭐ Nexa', family: 'Nexa', file: '/fonts/premium/nexa.otf', weight: 700, category: 'display', vibe: 'CTA / limpo / legível' },

  { id: 'premium-fair-prosper', label: '⭐ Fair Prosper', family: 'Fair Prosper', file: '/fonts/premium/fairprosper.ttf', weight: 400, category: 'display', vibe: 'premium / gospel / elegante' },
  { id: 'premium-casanova-scotia', label: '⭐ Casanova Scotia', family: 'Casanova Scotia', file: '/fonts/premium/casanovascotia.otf', weight: 400, category: 'display', vibe: 'premium / clássico' },
  { id: 'premium-candrika', label: '⭐ Candrika', family: 'Candrika', file: '/fonts/premium/candrika.ttf', weight: 400, category: 'display', vibe: 'elegante / texto' },
  { id: 'premium-varane', label: '⭐ Varane', family: 'Varane', file: '/fonts/premium/varane.otf', weight: 400, category: 'display', vibe: 'editorial / premium' },
];

export const FONT_CATALOG: FontDef[] = [
  ...PREMIUM_FONT_CATALOG,
  // ─── DISPLAY (HEADLINES GIGANTES) ───────────────────────────────
  {
    id: 'tusker-super',
    label: 'Tusker Grotesk Super',
    file: 'TuskerGrotesk-8800Super.otf',
    family: 'TuskerGrotesk Super',
    weight: 900,
    category: 'display',
    vibe: 'Editorial / A24',
  },
  {
    id: 'tusker-medium',
    label: 'Tusker Grotesk Medium',
    file: 'TuskerGrotesk-6500Medium.otf',
    family: 'TuskerGrotesk Medium',
    weight: 700,
    category: 'display',
    vibe: 'Editorial / refinado',
  },
  {
    id: 'tusker-thin',
    label: 'Tusker Grotesk Thin',
    file: 'TuskerGrotesk-5500Medium.otf',
    family: 'TuskerGrotesk Thin',
    weight: 500,
    category: 'display',
    vibe: 'Editorial / leve',
  },
  {
    id: 'bebas',
    label: 'Bebas Neue',
    file: 'BebasNeue-Regular.otf',
    family: 'BebasNeue',
    weight: 400,
    category: 'display',
    vibe: 'Clássico / impacto',
  },
  {
    id: 'antonio',
    label: 'Antonio',
    file: 'Antonio-VariableFont_wght.ttf',
    family: 'Antonio',
    weight: 800,
    category: 'display',
    vibe: 'Moderno / versátil',
  },
  {
    id: 'oswald',
    label: 'Oswald',
    file: 'Oswald-VariableFont_wght.ttf',
    family: 'Oswald',
    weight: 700,
    category: 'display',
    vibe: 'Condensada elegante',
  },
  {
    id: 'burbank-big',
    label: 'Burbank Big Black',
    file: 'BurbankBig-Black.otf',
    family: 'BurbankBig',
    weight: 900,
    category: 'display',
    vibe: 'Pop / Fortnite',
  },
  {
    id: 'burbank-cond',
    label: 'Burbank Cond Bold',
    file: 'BurbankBigCond-Bold.otf',
    family: 'BurbankCond',
    weight: 700,
    category: 'display',
    vibe: 'Pop condensada',
  },
  {
    id: 'gobold',
    label: 'Gobold Extra',
    file: 'Gobold-Extra.otf',
    family: 'Gobold',
    weight: 800,
    category: 'display',
    vibe: 'Esportiva / agressiva',
  },
  {
    id: 'interstate-cond',
    label: 'Interstate Black Cond',
    file: 'Interstate-BlackCond.otf',
    family: 'InterstateBlackCond',
    weight: 900,
    category: 'display',
    vibe: 'Display / impacto',
  },
  {
    id: 'panton-black',
    label: 'Panton Black Italic Caps',
    file: 'Panton-BlackitalicCaps.otf',
    family: 'PantonBlackItalic',
    weight: 900,
    category: 'display',
    vibe: 'Itálico premium',
  },
  {
    id: 'bold-vision',
    label: 'Bold Vision',
    file: 'BoldVision-Regular.ttf',
    family: 'BoldVision',
    weight: 700,
    category: 'display',
    vibe: 'Display sofisticado',
  },

  // ─── SANS (UI / SUBS / BADGE) ───────────────────────────────────
  {
    id: 'panton',
    label: 'Panton Regular',
    file: 'Panton-Regular.otf',
    family: 'Panton',
    weight: 400,
    category: 'sans',
    vibe: 'Geometric premium',
  },
  {
    id: 'klein',
    label: 'Klein Text',
    file: 'Klein-Text.ttf',
    family: 'Klein',
    weight: 400,
    category: 'sans',
    vibe: 'Leitura moderna',
  },
  {
    id: 'coco',
    label: 'Coco Regular',
    file: 'Coco-Regular.otf',
    family: 'Coco',
    weight: 400,
    category: 'sans',
    vibe: 'Elegante neutra',
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu Medium',
    file: 'Ubuntu-Medium.ttf',
    family: 'Ubuntu',
    weight: 500,
    category: 'sans',
    vibe: 'Humana versátil',
  },

  // ─── SPECIAL (ACENTOS / ALTERNATIVOS) ───────────────────────────
  {
    id: 'authority-rounded',
    label: 'Authority Rounded',
```

## G) Como AvailableNow resolve fontes

```
2:import { FontFaces } from './FontFaces';
14:import { DEFAULT_FONTS, findFont, applyTextStyle, userTextTransform, applyGradientStyle, hasGradient } from '../lib/fontCatalog';
38:  const fontHeadline = findFont(motion.fontHeadline ?? DEFAULT_FONTS.headline, motion.customFonts ?? []);
39:  const fontDate = findFont(motion.fontDate ?? DEFAULT_FONTS.date, motion.customFonts ?? []);
40:  const fontCta = findFont(motion.fontCta ?? DEFAULT_FONTS.cta, motion.customFonts ?? []);
143:      <FontFaces fonts={motion.customFonts} activeFontIds={[motion.fontHeadline ?? '', motion.fontDate ?? '', motion.fontCta ?? '']} />
178:                fontFamily: `'${fontHeadline?.family ?? 'Arial'}', Arial, sans-serif`,
181:                fontWeight: fontHeadline?.weight ?? 900,
200:                fontFamily: `'${fontDate?.family ?? 'Arial'}', Arial, sans-serif`,
205:                fontWeight: fontDate?.weight ?? 700,
271:              fontFamily: `'${fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
276:              fontWeight: fontCta?.weight ?? 900,
292:              fontFamily: `'${fontCta?.family ?? 'Arial'}', Arial, sans-serif`,
297:              fontWeight: fontCta?.weight ?? 900,
```

## H) Fontes em disco

```
public/fonts:
public/fonts/Antonio-VariableFont_wght.ttf
public/fonts/Authority-Rounded.ttf
public/fonts/BebasNeue-Regular.otf
public/fonts/BoldVision-Regular.ttf
public/fonts/BurbankBig-Black.otf
public/fonts/BurbankBigCond-Bold.otf
public/fonts/Coco-Regular.otf
public/fonts/Gobold-Extra.otf
public/fonts/Interstate-BlackCond.otf
public/fonts/Klein-Text.ttf
public/fonts/Oswald-VariableFont_wght.ttf
public/fonts/Panton-BlackitalicCaps.otf
public/fonts/Panton-Regular.otf
public/fonts/Toxico.otf
public/fonts/TuskerGrotesk-5500Medium.otf
public/fonts/TuskerGrotesk-6500Medium.otf
public/fonts/TuskerGrotesk-8800Super.otf
public/fonts/Ubuntu-Medium.ttf
public/fonts/premium/1797compressed.otf
public/fonts/premium/akiraexpanded.otf
public/fonts/premium/akiraexpandedebold.otf
public/fonts/premium/aldivaroextrabold.otf
public/fonts/premium/bebasneue.otf
public/fonts/premium/bignoodletitlingoblique.ttf
public/fonts/premium/candrika.ttf
public/fonts/premium/casanovascotia.otf
public/fonts/premium/fairprosper.ttf
public/fonts/premium/gramatikablack.ttf
public/fonts/premium/heavitas.ttf
public/fonts/premium/kenyancoffee.otf
public/fonts/premium/lemonmilk.otf
public/fonts/premium/nexa.otf
public/fonts/premium/pantonextrablack.otf
public/fonts/premium/premium-fonts.css
public/fonts/premium/premium-fonts.json
public/fonts/premium/varane.otf

public/uploads/user-fonts:
public/uploads/user-fonts/1778642238656-greenm03.ttf
public/uploads/user-fonts/AVANTE.otf
public/uploads/user-fonts/AbrilFatface-Regular.ttf
public/uploads/user-fonts/AlexBrush-Regular.ttf
public/uploads/user-fonts/AppleGaramond-Bold.ttf
public/uploads/user-fonts/AppleGaramond-BoldItalic.ttf
public/uploads/user-fonts/AppleGaramond-Italic.ttf
public/uploads/user-fonts/AppleGaramond-Light.ttf
public/uploads/user-fonts/AppleGaramond-LightItalic.ttf
public/uploads/user-fonts/AppleGaramond.ttf
public/uploads/user-fonts/Bebas-Regular.otf
public/uploads/user-fonts/BebasNeue-Bold.otf
public/uploads/user-fonts/BebasNeue-Book.otf
public/uploads/user-fonts/BebasNeue-Light.otf
public/uploads/user-fonts/BebasNeue-Regular.otf
public/uploads/user-fonts/BebasNeue-Regular.ttf
public/uploads/user-fonts/BebasNeue-Thin.otf
public/uploads/user-fonts/BebasNeue.otf
public/uploads/user-fonts/Birds-of-Paradise.ttf
public/uploads/user-fonts/BucklaneScript.otf
public/uploads/user-fonts/Bygonest-Bold.otf
public/uploads/user-fonts/Bygonest-Bold.ttf
public/uploads/user-fonts/Bygonest-Regular.otf
public/uploads/user-fonts/Bygonest-Regular.ttf
public/uploads/user-fonts/Bygonest-Rustic-Bold.otf
public/uploads/user-fonts/Bygonest-Rustic-Bold.ttf
public/uploads/user-fonts/Bygonest-Rustic-Regular.otf
public/uploads/user-fonts/Bygonest-Rustic-Regular.ttf
public/uploads/user-fonts/Bygonest-Rustic-Thin.otf
public/uploads/user-fonts/Bygonest-Rustic-Thin.ttf
public/uploads/user-fonts/Bygonest-Thin.otf
public/uploads/user-fonts/Bygonest-Thin.ttf
public/uploads/user-fonts/Cabin-Bold-TTF.ttf
public/uploads/user-fonts/Cabin-BoldItalic-TTF.ttf
public/uploads/user-fonts/Cabin-Italic-TTF.ttf
public/uploads/user-fonts/Cabin-Medium-TTF.ttf
public/uploads/user-fonts/Cabin-MediumItalic-TTF.ttf
public/uploads/user-fonts/Cabin-Regular-TTF.ttf
public/uploads/user-fonts/Cabin-SemiBold-TTF.ttf
public/uploads/user-fonts/Cabin-SemiBoldItalic-TTF.ttf
public/uploads/user-fonts/CairoPlay-VariableFont-slnt-wght.ttf
public/uploads/user-fonts/ChamberiDisplay-Black.otf
public/uploads/user-fonts/ChamberiDisplay-BlackItalic.otf
public/uploads/user-fonts/ChamberiDisplay-Bold.otf
public/uploads/user-fonts/ChamberiDisplay-BoldItalic.otf
public/uploads/user-fonts/ChamberiDisplay-ExtraBold.otf
public/uploads/user-fonts/ChamberiDisplay-ExtraBoldItalic.otf
public/uploads/user-fonts/ChamberiDisplay-ExtraLight.otf
public/uploads/user-fonts/ChamberiDisplay-ExtraLightItalic.otf
public/uploads/user-fonts/ChamberiDisplay-Italic.otf
public/uploads/user-fonts/ChamberiDisplay-Light.otf
public/uploads/user-fonts/ChamberiDisplay-LightItalic.otf
public/uploads/user-fonts/ChamberiDisplay-Regular.otf
public/uploads/user-fonts/ChamberiDisplay-SemiBold.otf
public/uploads/user-fonts/ChamberiDisplay-SemiBoldItalic.otf
public/uploads/user-fonts/ChamberiHeadline-Black.otf
public/uploads/user-fonts/ChamberiHeadline-BlackItalic.otf
public/uploads/user-fonts/ChamberiHeadline-Bold.otf
public/uploads/user-fonts/ChamberiHeadline-BoldItalic.otf
public/uploads/user-fonts/ChamberiHeadline-ExtraBold.otf
public/uploads/user-fonts/ChamberiHeadline-ExtraBoldItalic.otf
public/uploads/user-fonts/ChamberiHeadline-ExtraLight.otf
public/uploads/user-fonts/ChamberiHeadline-ExtraLightItalic.otf
public/uploads/user-fonts/ChamberiHeadline-Italic.otf
public/uploads/user-fonts/ChamberiHeadline-Light.otf
public/uploads/user-fonts/ChamberiHeadline-LightItalic.otf
public/uploads/user-fonts/ChamberiHeadline-Regular.otf
public/uploads/user-fonts/ChamberiHeadline-SemiBold.otf
public/uploads/user-fonts/ChamberiHeadline-SemiBoldItalic.otf
public/uploads/user-fonts/ChamberiSuperDisplay-Black.otf
public/uploads/user-fonts/ChamberiSuperDisplay-BlackItalic.otf
public/uploads/user-fonts/ChamberiSuperDisplay-Bold.otf
public/uploads/user-fonts/ChamberiSuperDisplay-BoldItalic.otf
public/uploads/user-fonts/ChamberiSuperDisplay-ExtraBold.otf
public/uploads/user-fonts/ChamberiSuperDisplay-ExtraBoldItalic.otf
public/uploads/user-fonts/ChamberiSuperDisplay-ExtraLight.otf
public/uploads/user-fonts/ChamberiSuperDisplay-ExtraLightItalic.otf
public/uploads/user-fonts/ChamberiSuperDisplay-Italic.otf
public/uploads/user-fonts/ChamberiSuperDisplay-Light.otf
public/uploads/user-fonts/ChamberiSuperDisplay-LightItalic.otf
public/uploads/user-fonts/ChamberiSuperDisplay-Regular.otf
public/uploads/user-fonts/ChamberiSuperDisplay-SemiBold.otf
public/uploads/user-fonts/ChamberiSuperDisplay-SemiBoldItalic.otf
public/uploads/user-fonts/ChamberiText-Black.otf
public/uploads/user-fonts/ChamberiText-BlackItalic.otf
public/uploads/user-fonts/ChamberiText-Bold.otf
public/uploads/user-fonts/ChamberiText-BoldItalic.otf
public/uploads/user-fonts/ChamberiText-ExtraBold.otf
public/uploads/user-fonts/ChamberiText-ExtraBoldItalic.otf
public/uploads/user-fonts/ChamberiText-ExtraLight.otf
public/uploads/user-fonts/ChamberiText-ExtraLightItalic.otf
public/uploads/user-fonts/ChamberiText-Italic.otf
public/uploads/user-fonts/ChamberiText-Light.otf
public/uploads/user-fonts/ChamberiText-LightItalic.otf
public/uploads/user-fonts/ChamberiText-Regular.otf
public/uploads/user-fonts/ChamberiText-SemiBold.otf
public/uploads/user-fonts/ChamberiText-SemiBoldItalic.otf
public/uploads/user-fonts/EBGaramond-Italic-VariableFont-wght.ttf
public/uploads/user-fonts/EBGaramond-VariableFont-wght.ttf
public/uploads/user-fonts/FontdinerSwanky-Regular.ttf
public/uploads/user-fonts/Gilroy-Black.ttf
public/uploads/user-fonts/Gilroy-BlackItalic.ttf
public/uploads/user-fonts/Gilroy-Bold.ttf
public/uploads/user-fonts/Gilroy-BoldItalic.ttf
public/uploads/user-fonts/Gilroy-ExtraBold.ttf
public/uploads/user-fonts/Gilroy-ExtraBoldItalic.ttf
public/uploads/user-fonts/Gilroy-Heavy.ttf
public/uploads/user-fonts/Gilroy-HeavyItalic.ttf
public/uploads/user-fonts/Gilroy-Light.ttf
public/uploads/user-fonts/Gilroy-LightItalic.ttf
public/uploads/user-fonts/Gilroy-Medium.ttf
public/uploads/user-fonts/Gilroy-MediumItalic.ttf
public/uploads/user-fonts/Gilroy-Regular.ttf
public/uploads/user-fonts/Gilroy-RegularItalic.ttf
public/uploads/user-fonts/Gilroy-SemiBold.ttf
public/uploads/user-fonts/Gilroy-SemiBoldItalic.ttf
public/uploads/user-fonts/Gilroy-Thin.ttf
public/uploads/user-fonts/Gilroy-ThinItalic.ttf
public/uploads/user-fonts/Gilroy-UltraLight.ttf
public/uploads/user-fonts/Gilroy-UltraLightItalic.ttf
public/uploads/user-fonts/GreatVibes-Regular.ttf
public/uploads/user-fonts/HARMONY-Personal-use.otf
public/uploads/user-fonts/Helvetica-Bold.ttf
public/uploads/user-fonts/Helvetica-BoldOblique.ttf
public/uploads/user-fonts/Helvetica-Oblique.ttf
public/uploads/user-fonts/Helvetica.ttf
public/uploads/user-fonts/Impacted.ttf
public/uploads/user-fonts/InstrumentSerif-Italic.ttf
public/uploads/user-fonts/InstrumentSerif-Regular.ttf
public/uploads/user-fonts/Inter-Black.otf
public/uploads/user-fonts/Inter-BlackItalic.otf
public/uploads/user-fonts/Inter-Bold.otf
public/uploads/user-fonts/Inter-BoldItalic.otf
public/uploads/user-fonts/Inter-ExtraBold.otf
public/uploads/user-fonts/Inter-ExtraBoldItalic.otf
public/uploads/user-fonts/Inter-ExtraLight-BETA.otf
public/uploads/user-fonts/Inter-ExtraLightItalic-BETA.otf
public/uploads/user-fonts/Inter-Italic-VariableFont-opsz-wght.ttf
public/uploads/user-fonts/Inter-Italic.otf
public/uploads/user-fonts/Inter-Light-BETA.otf
public/uploads/user-fonts/Inter-LightItalic-BETA.otf
public/uploads/user-fonts/Inter-Medium.otf
public/uploads/user-fonts/Inter-MediumItalic.otf
public/uploads/user-fonts/Inter-Regular.otf
public/uploads/user-fonts/Inter-SemiBold.otf
public/uploads/user-fonts/Inter-SemiBoldItalic.otf
public/uploads/user-fonts/Inter-Thin-BETA.otf
public/uploads/user-fonts/Inter-ThinItalic-BETA.otf
public/uploads/user-fonts/Inter-VariableFont-opsz-wght.ttf
public/uploads/user-fonts/LibreBaskerville-Italic-VariableFont-wght.ttf
public/uploads/user-fonts/LibreBaskerville-VariableFont-wght.ttf
public/uploads/user-fonts/Lobster-Regular.ttf
public/uploads/user-fonts/Montserrat-Black.ttf
public/uploads/user-fonts/Montserrat-BlackItalic.ttf
public/uploads/user-fonts/Montserrat-Bold.ttf
public/uploads/user-fonts/Montserrat-BoldItalic.ttf
public/uploads/user-fonts/Montserrat-ExtraBold.ttf
public/uploads/user-fonts/Montserrat-ExtraBoldItalic.ttf
public/uploads/user-fonts/Montserrat-ExtraLight.ttf
public/uploads/user-fonts/Montserrat-ExtraLightItalic.ttf
public/uploads/user-fonts/Montserrat-Italic-VariableFont-wght.ttf
public/uploads/user-fonts/Montserrat-Italic.ttf
public/uploads/user-fonts/Montserrat-Light.ttf
public/uploads/user-fonts/Montserrat-LightItalic.ttf
public/uploads/user-fonts/Montserrat-Medium.ttf
public/uploads/user-fonts/Montserrat-MediumItalic.ttf
public/uploads/user-fonts/Montserrat-Regular.ttf
public/uploads/user-fonts/Montserrat-SemiBold.ttf
public/uploads/user-fonts/Montserrat-SemiBoldItalic.ttf
public/uploads/user-fonts/Montserrat-Thin.ttf
public/uploads/user-fonts/Montserrat-ThinItalic.ttf
public/uploads/user-fonts/Montserrat-VariableFont-wght.ttf
public/uploads/user-fonts/OPTIMA-B.ttf
public/uploads/user-fonts/Optima-Italic.ttf
public/uploads/user-fonts/Optima-Medium.ttf
public/uploads/user-fonts/Oswald-Bold.ttf
public/uploads/user-fonts/Oswald-ExtraLight.ttf
public/uploads/user-fonts/Oswald-Light.ttf
public/uploads/user-fonts/Oswald-Medium.ttf
public/uploads/user-fonts/Oswald-Regular.ttf
public/uploads/user-fonts/Oswald-SemiBold.ttf
public/uploads/user-fonts/Oswald-VariableFont-wght.ttf
public/uploads/user-fonts/Parisienne-Regular.ttf
public/uploads/user-fonts/PlayfairDisplay-Black.ttf
public/uploads/user-fonts/PlayfairDisplay-BlackItalic.ttf
public/uploads/user-fonts/PlayfairDisplay-Bold.ttf
public/uploads/user-fonts/PlayfairDisplay-BoldItalic.ttf
public/uploads/user-fonts/PlayfairDisplay-ExtraBold.ttf
public/uploads/user-fonts/PlayfairDisplay-ExtraBoldItalic.ttf
public/uploads/user-fonts/PlayfairDisplay-Italic-VariableFont-wght.ttf
public/uploads/user-fonts/PlayfairDisplay-Italic.ttf
public/uploads/user-fonts/PlayfairDisplay-Medium.ttf
public/uploads/user-fonts/PlayfairDisplay-MediumItalic.ttf
public/uploads/user-fonts/PlayfairDisplay-Regular.ttf
public/uploads/user-fonts/PlayfairDisplay-SemiBold.ttf
public/uploads/user-fonts/PlayfairDisplay-SemiBoldItalic.ttf
public/uploads/user-fonts/PlayfairDisplay-VariableFont-wght.ttf
public/uploads/user-fonts/PlayfairDisplayRoman-Regular.otf
public/uploads/user-fonts/Poppins-Black.ttf
public/uploads/user-fonts/Poppins-BlackItalic.ttf
public/uploads/user-fonts/Poppins-Bold.ttf
public/uploads/user-fonts/Poppins-BoldItalic.ttf
public/uploads/user-fonts/Poppins-ExtraBold.ttf
public/uploads/user-fonts/Poppins-ExtraBoldItalic.ttf
public/uploads/user-fonts/Poppins-ExtraLight.ttf
public/uploads/user-fonts/Poppins-ExtraLightItalic.ttf
public/uploads/user-fonts/Poppins-Italic.ttf
public/uploads/user-fonts/Poppins-Light.ttf
public/uploads/user-fonts/Poppins-LightItalic.ttf
public/uploads/user-fonts/Poppins-Medium.ttf
public/uploads/user-fonts/Poppins-MediumItalic.ttf
public/uploads/user-fonts/Poppins-Regular.ttf
public/uploads/user-fonts/Poppins-SemiBold.ttf
public/uploads/user-fonts/Poppins-SemiBoldItalic.ttf
public/uploads/user-fonts/Poppins-Thin.ttf
public/uploads/user-fonts/Poppins-ThinItalic.ttf
public/uploads/user-fonts/Raleway-Bold.ttf
public/uploads/user-fonts/Raleway-ExtraBold.ttf
public/uploads/user-fonts/Raleway-ExtraLight.ttf
public/uploads/user-fonts/Raleway-Heavy.ttf
public/uploads/user-fonts/Raleway-Light.ttf
public/uploads/user-fonts/Raleway-Medium.ttf
public/uploads/user-fonts/Raleway-Regular.ttf
public/uploads/user-fonts/Raleway-SemiBold.ttf
public/uploads/user-fonts/Raleway-Thin.ttf
public/uploads/user-fonts/SFUIDisplay-Black.otf
public/uploads/user-fonts/SFUIDisplay-Bold.ttf
public/uploads/user-fonts/SFUIDisplay-Heavy.otf
public/uploads/user-fonts/SFUIDisplay-Light.ttf
public/uploads/user-fonts/SFUIDisplay-Medium.otf
public/uploads/user-fonts/SFUIDisplay-Regular.otf
public/uploads/user-fonts/SFUIDisplay-Semibold.otf
public/uploads/user-fonts/SFUIDisplay-Thin.otf
public/uploads/user-fonts/SFUIDisplay-Ultralight.otf
public/uploads/user-fonts/Sacramento-Regular.ttf
public/uploads/user-fonts/Satisfy-Regular.ttf
public/uploads/user-fonts/The-Seasons-Bold-Italic.ttf
public/uploads/user-fonts/The-Seasons-Bold.ttf
public/uploads/user-fonts/The-Seasons-Italic.ttf
public/uploads/user-fonts/The-Seasons-Light-Italic.ttf
public/uploads/user-fonts/The-Seasons-Light.ttf
public/uploads/user-fonts/The-Seasons-Regular.ttf
public/uploads/user-fonts/fonnts-com-Optima.ttf
public/uploads/user-fonts/garamond-allfont-ru.ttf
public/uploads/user-fonts/helvetica-compressed-5871d14b6903a.otf
public/uploads/user-fonts/helvetica-light-587ebe5a59211.ttf
public/uploads/user-fonts/helvetica-rounded-bold-5871d05ead8de.otf
public/uploads/user-fonts/impact.ttf
public/uploads/user-fonts/mytupiBOLD.ttf
public/uploads/user-fonts/unicode-impact.ttf
```

## I) Último .props.json (se existir)

_Nenhum .props.json encontrado em out/. O debug ainda não foi instalado._

