/**
 * AGENTE: Reference Analyzer
 *
 * Recebe uma imagem/vídeo de referência (motion design existente que o user
 * gostou) e extrai a ESTÉTICA pra ser replicada nos templates do Studio.
 *
 * Usa Claude vision por ser melhor em raciocínio criativo sobre design.
 *
 * Custo: ~$0.02 por referência (1 chamada Claude).
 */

import Anthropic from '@anthropic-ai/sdk';

export type ReferenceAnalysisInput = {
  referenceUrl: string;
  /** Tipo: image (PNG/JPG) ou video (MP4) */
  type: 'image' | 'video';
  /** Briefing extra */
  briefing?: string;
};

export type ReferenceAnalysis = {
  /** Resumo do estilo */
  summary: string;
  /** Paleta de cores extraída */
  palette: string[];
  /** Vibe tipográfica */
  fontStyle: string;
  /** Patterns de motion observados */
  motionPatterns: string[];
  /** Estrutura de layout (top text / cover / bottom CTA / etc.) */
  layoutStructure: string;
  /** Templates do NovaCena que mais se aproximam */
  suggestedTemplate: 'available_now' | 'milestone' | 'out_now' | 'watch_youtube' | 'spotify_print';
  /** Mood detectado */
  mood: string[];
  /** Briefing pronto pra passar pro motion director */
  motionDirectorBrief: string;
};

async function fetchImageBase64(src: string): Promise<{ base64: string; mime: string }> {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('data URL inválida');
    return { mime: m[1], base64: m[2] };
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Falha ao baixar referência: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') ?? 'image/jpeg';
  return { mime, base64: buf.toString('base64') };
}

/**
 * Analisa imagem estática (PNG/JPG) de motion design.
 */
export async function analyzeReferenceImage(input: ReferenceAnalysisInput): Promise<ReferenceAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada — Reference Analyzer usa Claude');

  const client = new Anthropic({ apiKey });
  const model = process.env.NOVACENA_CLAUDE_MODEL || 'claude-opus-4-7';

  const { base64, mime } = await fetchImageBase64(input.referenceUrl);

  const prompt = `Você é um diretor de arte BRASILEIRO especializado em motion graphics pra música.

O usuário enviou esta REFERÊNCIA — um motion design (frame ou capa) que ele gostou. Sua missão é EXTRAIR a estética e DESCREVER de forma estruturada pra que outro motion design possa replicar essa vibe.

Analise o frame com olho de designer e retorne SOMENTE JSON válido:

{
  "summary": "1-2 frases descrevendo o estilo geral",
  "palette": ["#hex","#hex","#hex","#hex"],
  "fontStyle": "Descrição RICA das fontes vistas (serif/sans/condensed/peso/textura)",
  "motionPatterns": [
    "string descrevendo motion 1 (ex: 'texto principal entra com mask reveal vertical')",
    "string descrevendo motion 2",
    "string descrevendo motion 3"
  ],
  "layoutStructure": "descrição da estrutura visual (onde fica headline, cover, CTA)",
  "suggestedTemplate": "available_now" | "milestone" | "out_now" | "watch_youtube" | "spotify_print",
  "mood": ["um ou mais de: sertanejo, trap, gospel, pop, indie, rock, funk, eletronica, premium, stage, clean, neon, elegant, romantic, youtube"],
  "motionDirectorBrief": "BRIEFING DETALHADO pronto pra passar pra outro modelo IA gerar um motion plan similar. Mencione: paleta, fontes equivalentes do tipo necessário, transições sugeridas, cover motion, BG style, level de impacto."
}

${input.briefing ? `Contexto extra do user: ${input.briefing}` : ''}

CRÍTICO:
- "palette" deve ter cores REAIS extraídas da referência (não genéricas)
- "fontStyle" deve descrever ESTILO específico (não "bold sans" — diga "Akira-like expandida bold com brilho metálico dourado")
- "motionPatterns" deve listar movimentos OBSERVÁVEIS (não inventar)
- "motionDirectorBrief" é o mais importante: outro AI vai LER e seguir, então seja CLARO e RICO

Retorne APENAS o JSON.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const text = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Claude não retornou JSON válido');
  return JSON.parse(raw.slice(start, end + 1)) as ReferenceAnalysis;
}
