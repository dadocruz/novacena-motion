'use client';

import { useMemo, useState } from 'react';

type ApiState = {
  loading: boolean;
  data: unknown;
  error: string | null;
};

type ProviderId = 'mock' | 'custom-http';

type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right';
};

type FormatLayout = {
  format: 'story' | 'square' | 'youtube';
  width: number;
  height: number;
  safeZone: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  boxes: Record<string, LayoutBox>;
};

type MotionPlan = {
  templateId: string;
  category: string;
  formats: string[];
  durationSeconds: number;
  texts: {
    headline?: string;
    number?: string;
    label?: string;
    platform?: string;
    title?: string;
  };
  style: {
    mood?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    fontMood?: string;
    suggestedFonts?: string[];
    glowIntensity?: number;
    textureIntensity?: number;
  };
  motion: {
    preset?: string;
    intensity?: number;
    coverMotion?: string;
    textMotion?: string;
    backgroundMotion?: string;
  };
  layouts: FormatLayout[];
  reviewChecklist?: string[];
};

const initialState: ApiState = {
  loading: false,
  data: null,
  error: null,
};

function getPlanFromState(state: ApiState): MotionPlan | null {
  if (!state.data || typeof state.data !== 'object') return null;
  if (!('plan' in state.data)) return null;

  const maybePlan = (state.data as { plan?: unknown }).plan;

  if (!maybePlan || typeof maybePlan !== 'object') return null;
  if (!('layouts' in maybePlan)) return null;

  return maybePlan as MotionPlan;
}

export default function AILabPage() {
  const [providerId, setProviderId] = useState<ProviderId>('mock');
  const [briefing, setBriefing] = useState('Criar arte de milestone Spotify para 250K plays');
  const [headline, setHeadline] = useState('ULTRAPASSAMOS');
  const [number, setNumber] = useState('250.000');
  const [label, setLabel] = useState('PLAYS');
  const [platform, setPlatform] = useState('Spotify');
  const [analyzeState, setAnalyzeState] = useState<ApiState>(initialState);
  const [planState, setPlanState] = useState<ApiState>(initialState);

  const plan = useMemo(() => getPlanFromState(planState), [planState]);

  const assets = [
    {
      id: 'cover-1',
      role: 'cover',
      src: '/api/uploads/covers/exemplo.png',
    },
  ];

  async function postJson(url: string, payload: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Erro inesperado na chamada IA.');
    }

    return data;
  }

  async function runAnalyze() {
    setAnalyzeState({ loading: true, data: null, error: null });

    try {
      const data = await postJson('/api/ai/analyze', {
        providerId,
        briefing,
        assets,
      });

      setAnalyzeState({ loading: false, data, error: null });
    } catch (error) {
      setAnalyzeState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    }
  }

  async function runPlan() {
    setPlanState({ loading: true, data: null, error: null });

    try {
      const visualAnalysis =
        typeof analyzeState.data === 'object' &&
        analyzeState.data !== null &&
        'result' in analyzeState.data
          ? (analyzeState.data as { result: unknown }).result
          : undefined;

      const data = await postJson('/api/ai/plan', {
        providerId,
        targetFormats: ['story', 'square'],
        briefing,
        visualAnalysis,
        texts: {
          headline,
          number,
          label,
          platform,
        },
        assets,
      });

      setPlanState({ loading: false, data, error: null });
    } catch (error) {
      setPlanState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    }
  }

  async function runFullFlow() {
    setAnalyzeState({ loading: true, data: null, error: null });
    setPlanState({ loading: true, data: null, error: null });

    try {
      const analyze = await postJson('/api/ai/analyze', {
        providerId,
        briefing,
        assets,
      });

      setAnalyzeState({ loading: false, data: analyze, error: null });

      const plan = await postJson('/api/ai/plan', {
        providerId,
        targetFormats: ['story', 'square'],
        briefing,
        visualAnalysis: analyze.result,
        texts: {
          headline,
          number,
          label,
          platform,
        },
        assets,
      });

      setPlanState({ loading: false, data: plan, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido.';

      setAnalyzeState((current) => ({
        ...current,
        loading: false,
        error: current.data ? null : message,
      }));

      setPlanState({
        loading: false,
        data: null,
        error: message,
      });
    }
  }

  function savePlanForStudio() {
    if (!plan) {
      alert('Gere um plano antes de aplicar no Studio.');
      return;
    }

    localStorage.setItem(
      'novacena.ai.lastPlan',
      JSON.stringify({
        savedAt: new Date().toISOString(),
        source: 'ai-lab',
        plan,
      })
    );

    window.location.href = '/?aiPlan=1';
  }

  function downloadPlan() {
    if (!plan) {
      alert('Gere um plano antes de baixar.');
      return;
    }

    const blob = new Blob([JSON.stringify(plan, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.templateId || 'novacena-ai-plan'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={page}>
      <section style={hero}>
        <div>
          <div style={eyebrow}>NovaCena AI</div>
          <h1 style={title}>AI Lab</h1>
          <p style={subtitle}>
            Teste interno para validar análise visual, plano de motion, story, 1x1 e safe zones usando o provider mock.
          </p>
        </div>

        <a href="/estudio" style={backLink}>
          Voltar ao Studio
        </a>
      </section>

      <section style={grid}>
        <div style={card}>
          <h2 style={cardTitle}>Entrada</h2>

          <label style={labelStyle}>
            Provider
            <select value={providerId} onChange={(event) => setProviderId(event.target.value as ProviderId)} style={input}>
              <option value="mock">Mock interno, sem gastar token</option>
              <option value="custom-http">Custom HTTP, usa .env.local</option>
            </select>
          </label>

          {providerId === 'custom-http' && (
            <div style={warningBox}>
              Para usar API externa, configure no servidor:
              <br />
              NOVACENA_CUSTOM_AI_ENDPOINT
              <br />
              NOVACENA_CUSTOM_AI_KEY
            </div>
          )}

          <label style={labelStyle}>
            Briefing
            <textarea
              value={briefing}
              onChange={(event) => setBriefing(event.target.value)}
              style={textarea}
              rows={5}
            />
          </label>

          <div style={twoCols}>
            <label style={labelStyle}>
              Headline
              <input value={headline} onChange={(event) => setHeadline(event.target.value)} style={input} />
            </label>

            <label style={labelStyle}>
              Número
              <input value={number} onChange={(event) => setNumber(event.target.value)} style={input} />
            </label>

            <label style={labelStyle}>
              Label
              <input value={label} onChange={(event) => setLabel(event.target.value)} style={input} />
            </label>

            <label style={labelStyle}>
              Plataforma
              <input value={platform} onChange={(event) => setPlatform(event.target.value)} style={input} />
            </label>
          </div>

          <div style={actions}>
            <button type="button" onClick={runAnalyze} style={button}>
              Analisar capa
            </button>

            <button type="button" onClick={runPlan} style={button}>
              Gerar plano
            </button>

            <button type="button" onClick={runFullFlow} style={buttonPrimary}>
              Rodar fluxo completo
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Review visual do plano</h2>
          {plan ? (
            <div style={previewGrid}>
              <PlanPreview plan={plan} format="story" />
              <PlanPreview plan={plan} format="square" />
            </div>
          ) : (
            <div style={empty}>Gere um plano para ver o preview visual.</div>
          )}

          <div style={actions}>
            <button type="button" onClick={savePlanForStudio} style={buttonPrimary}>
              Aplicar plano no Studio
            </button>

            <button type="button" onClick={downloadPlan} style={button}>
              Baixar JSON
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Análise visual</h2>
          <ResultBox state={analyzeState} />
        </div>

        <div style={cardWide}>
          <h2 style={cardTitle}>Plano de motion</h2>
          <ResultBox state={planState} />
        </div>
      </section>
    </main>
  );
}

function PlanPreview({ plan, format }: { plan: MotionPlan; format: 'story' | 'square' }) {
  const layout = plan.layouts.find((item) => item.format === format);

  if (!layout) {
    return <div style={empty}>Sem layout {format}.</div>;
  }

  const maxW = format === 'story' ? 260 : 320;
  const maxH = 460;
  const scale = Math.min(maxW / layout.width, maxH / layout.height);
  const width = layout.width * scale;
  const height = layout.height * scale;

  const primary = plan.style.primaryColor || '#00F0C8';
  const secondary = plan.style.secondaryColor || '#2B1B4A';
  const bg = plan.style.backgroundColor || '#080812';

  return (
    <div style={previewWrap}>
      <div style={previewHeader}>
        {format === 'story' ? 'Story 1080×1920' : 'Feed 1×1'}
      </div>

      <div
        style={{
          ...canvas,
          width,
          height,
          background: `radial-gradient(circle at 50% 20%, ${secondary} 0%, ${bg} 48%, #020617 100%)`,
          boxShadow: `0 0 42px rgba(0,240,200,0.20)`,
        }}
      >
        <SafeZone layout={layout} scale={scale} />

        <PreviewBox layout={layout} name="logo" scale={scale} borderColor={primary}>
          <span style={{ color: '#FACC15', fontWeight: 900, fontSize: 10 }}>LOGO</span>
        </PreviewBox>

        <PreviewBox layout={layout} name="headline" scale={scale} borderColor={primary}>
          <span style={{ color: primary, fontWeight: 900, fontSize: format === 'story' ? 10 : 8 }}>
            {plan.texts.headline}
          </span>
        </PreviewBox>

        <PreviewBox layout={layout} name="number" scale={scale} borderColor={primary}>
          <span
            style={{
              color: 'transparent',
              WebkitTextStroke: `1px ${primary}`,
              fontWeight: 950,
              fontSize: format === 'story' ? 26 : 20,
              lineHeight: 1,
            }}
          >
            {plan.texts.number}
          </span>
        </PreviewBox>

        <PreviewBox layout={layout} name="label" scale={scale} borderColor={primary}>
          <span style={{ color: primary, fontWeight: 950, fontSize: format === 'story' ? 20 : 14 }}>
            {plan.texts.label}
          </span>
        </PreviewBox>

        <PreviewBox layout={layout} name="cover" scale={scale} borderColor="#ffffff">
          <div style={coverMock}>
            <div style={{ fontSize: format === 'story' ? 18 : 12, fontWeight: 900, color: primary }}>
              {plan.texts.title || 'CAPA'}
            </div>
            <div style={{ fontSize: 9, color: '#E2E8F0', marginTop: 8 }}>cover image</div>
          </div>
        </PreviewBox>

        <PreviewBox layout={layout} name="platform" scale={scale} borderColor={primary}>
          <span style={{ color: primary, fontWeight: 800, fontSize: 10 }}>
            {plan.texts.platform}
          </span>
        </PreviewBox>
      </div>

      <div style={previewMeta}>
        Motion: {plan.motion.preset}
        <br />
        Capa: {plan.motion.coverMotion}
      </div>
    </div>
  );
}

function SafeZone({ layout, scale }: { layout: FormatLayout; scale: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: layout.safeZone.left * scale,
        top: layout.safeZone.top * scale,
        width: (layout.width - layout.safeZone.left - layout.safeZone.right) * scale,
        height: (layout.height - layout.safeZone.top - layout.safeZone.bottom) * scale,
        border: '1px dashed rgba(255,255,255,0.24)',
        borderRadius: 8,
        pointerEvents: 'none',
      }}
    />
  );
}

function PreviewBox({
  layout,
  name,
  scale,
  borderColor,
  children,
}: {
  layout: FormatLayout;
  name: string;
  scale: number;
  borderColor: string;
  children: React.ReactNode;
}) {
  const box = layout.boxes[name];

  if (!box) return null;

  const left = box.anchor === 'center' || !box.anchor ? (box.x - box.width / 2) * scale : box.x * scale;
  const top = box.anchor === 'center' || !box.anchor ? (box.y - box.height / 2) * scale : box.y * scale;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: box.width * scale,
        height: box.height * scale,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        background: 'rgba(15,23,42,0.35)',
        boxShadow: `0 0 18px ${borderColor}33`,
      }}
    >
      {children}
    </div>
  );
}

function ResultBox({ state }: { state: ApiState }) {
  if (state.loading) {
    return <div style={empty}>Processando...</div>;
  }

  if (state.error) {
    return <pre style={errorBox}>{state.error}</pre>;
  }

  if (!state.data) {
    return <div style={empty}>Nenhum resultado ainda.</div>;
  }

  return <pre style={codeBox}>{JSON.stringify(state.data, null, 2)}</pre>;
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#090A12',
  color: '#F8FAFC',
  padding: 32,
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

const hero: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 24,
  alignItems: 'flex-start',
  marginBottom: 28,
};

const eyebrow: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#38BDF8',
  fontWeight: 700,
};

const title: React.CSSProperties = {
  fontSize: 42,
  margin: '6px 0 8px',
  lineHeight: 1,
};

const subtitle: React.CSSProperties = {
  color: '#CBD5E1',
  maxWidth: 760,
  lineHeight: 1.5,
  margin: 0,
};

const backLink: React.CSSProperties = {
  color: '#E2E8F0',
  textDecoration: 'none',
  border: '1px solid rgba(255,255,255,0.14)',
  padding: '10px 14px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(320px, 0.8fr) minmax(320px, 1fr)',
  gap: 18,
  alignItems: 'start',
};

const card: React.CSSProperties = {
  background: 'rgba(15,23,42,0.92)',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
};

const cardWide: React.CSSProperties = {
  ...card,
  gridColumn: '1 / -1',
};

const cardTitle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 18,
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: 12,
  color: '#CBD5E1',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 14,
};

const textarea: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.24)',
  background: 'rgba(2,6,23,0.72)',
  color: '#F8FAFC',
  padding: 12,
  fontSize: 14,
  outline: 'none',
};

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.24)',
  background: 'rgba(2,6,23,0.72)',
  color: '#F8FAFC',
  padding: '11px 12px',
  fontSize: 14,
  outline: 'none',
};

const twoCols: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

const actions: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 8,
};

const button: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.22)',
  background: 'rgba(255,255,255,0.06)',
  color: '#F8FAFC',
  borderRadius: 12,
  padding: '10px 13px',
  cursor: 'pointer',
  fontWeight: 700,
};

const buttonPrimary: React.CSSProperties = {
  ...button,
  background: 'linear-gradient(135deg, #14B8A6, #3B82F6)',
  border: 'none',
};

const codeBox: React.CSSProperties = {
  background: '#020617',
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: 14,
  padding: 16,
  overflow: 'auto',
  maxHeight: 560,
  whiteSpace: 'pre-wrap',
  color: '#D1FAE5',
  fontSize: 12,
  lineHeight: 1.5,
};

const errorBox: React.CSSProperties = {
  ...codeBox,
  color: '#FCA5A5',
};

const empty: React.CSSProperties = {
  minHeight: 120,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94A3B8',
  background: 'rgba(2,6,23,0.48)',
  borderRadius: 14,
  border: '1px dashed rgba(148,163,184,0.18)',
};


const warningBox: React.CSSProperties = {
  border: '1px solid rgba(251,191,36,0.35)',
  background: 'rgba(251,191,36,0.08)',
  color: '#FDE68A',
  borderRadius: 12,
  padding: 12,
  fontSize: 12,
  lineHeight: 1.5,
  marginBottom: 14,
};

const previewGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 18,
  alignItems: 'start',
};

const previewWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  alignItems: 'center',
};

const previewHeader: React.CSSProperties = {
  color: '#CBD5E1',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const canvas: React.CSSProperties = {
  position: 'relative',
  borderRadius: 18,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.14)',
};

const coverMock: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.20), rgba(15,23,42,0.86))',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const previewMeta: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: 11,
  lineHeight: 1.5,
  textAlign: 'center',
};
