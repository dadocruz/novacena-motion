'use client';

import { useState } from 'react';

type ApiState = {
  loading: boolean;
  data: unknown;
  error: string | null;
};

const initialState: ApiState = {
  loading: false,
  data: null,
  error: null,
};

export default function AILabPage() {
  const [briefing, setBriefing] = useState('Criar arte de milestone Spotify para 250K plays');
  const [headline, setHeadline] = useState('ULTRAPASSAMOS');
  const [number, setNumber] = useState('250.000');
  const [label, setLabel] = useState('PLAYS');
  const [platform, setPlatform] = useState('Spotify');
  const [analyzeState, setAnalyzeState] = useState<ApiState>(initialState);
  const [planState, setPlanState] = useState<ApiState>(initialState);

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
        providerId: 'mock',
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
        providerId: 'mock',
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
        providerId: 'mock',
        briefing,
        assets,
      });

      setAnalyzeState({ loading: false, data: analyze, error: null });

      const plan = await postJson('/api/ai/plan', {
        providerId: 'mock',
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

        <a href="/" style={backLink}>
          Voltar ao Studio
        </a>
      </section>

      <section style={grid}>
        <div style={card}>
          <h2 style={cardTitle}>Entrada</h2>

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
