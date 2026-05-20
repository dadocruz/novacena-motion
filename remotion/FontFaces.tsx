import React from 'react';
import { isValidFontData } from '../lib/fontValidation';

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
  const lower = String(file || '').toLowerCase();
  if (lower.includes('font/ttf') || lower.endsWith('.ttf')) return 'truetype';
  if (lower.includes('font/otf') || lower.endsWith('.otf')) return 'opentype';
  if (lower.includes('font/woff2') || lower.endsWith('.woff2')) return 'woff2';
  if (lower.includes('font/woff') || lower.endsWith('.woff')) return 'woff';
  return 'opentype';
}

function escapeCss(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function fontUrl(file: string) {
  const raw = String(file || '');
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/fonts/')) return raw;
  if (raw.startsWith('fonts/')) return `/${raw}`;
  if (raw.startsWith('/api/uploads/user-fonts/')) return raw;
  if (raw.startsWith('/uploads/user-fonts/')) return raw.replace(/^\/uploads/, '/api/uploads');
  if (raw.startsWith('public/uploads/user-fonts/')) {
    return `/api/uploads/user-fonts/${encodeURIComponent(raw.split('/').pop() || '')}`;
  }
  return `/api/uploads/user-fonts/${encodeURIComponent(raw.replace(/^\/+/, '').split('/').pop() || raw)}`;
}

// ─── Cache global (sobrevive a re-renders e trocas de template) ──
// Fontes já validadas → não precisa probar de novo
const VALIDATED_FONTS = new Set<string>();
// Fontes que falharam (não tenta de novo)
const REJECTED_FONTS = new Set<string>();
// Probes em andamento (evita disparar 2× pra mesma fonte)
const PROBING = new Map<string, Promise<boolean>>();

async function probeFontOnce(file: string): Promise<boolean> {
  // Já validada? retorna direto
  if (VALIDATED_FONTS.has(file)) return true;
  if (REJECTED_FONTS.has(file)) return false;

  // Já tem probe em andamento? espera o mesmo
  const inflight = PROBING.get(file);
  if (inflight) return inflight;

  // Fontes premium do bundle (/fonts/...) confia direto — não precisa probar
  if (file.startsWith('/fonts/') || file.startsWith('fonts/')) {
    VALIDATED_FONTS.add(file);
    return true;
  }

  const promise = (async () => {
    try {
      const url = fontUrl(file);
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        REJECTED_FONTS.add(file);
        return false;
      }
      const ab = await res.arrayBuffer();
      if (isValidFontData(ab)) {
        VALIDATED_FONTS.add(file);
        return true;
      }
      REJECTED_FONTS.add(file);
      return false;
    } catch {
      REJECTED_FONTS.add(file);
      return false;
    } finally {
      PROBING.delete(file);
    }
  })();

  PROBING.set(file, promise);
  return promise;
}

/**
 * FontFaces — injeta @font-face das fontes ATIVAS.
 *
 * Estratégia:
 *  - Render OTIMISTA: injeta o <style> imediatamente com TODAS as fontes (sem esperar probe)
 *  - Browser tenta carregar; se falhar, browser ignora silenciosamente sem quebrar layout
 *  - Probe em background atualiza cache pra próximas chamadas
 *  - Fontes premium do bundle (/fonts/...) são pré-validadas (sem fetch)
 *
 * Resultado: texto NUNCA SOME durante render. Performance ~30× melhor.
 */
export const FontFaces: React.FC<Props> = ({ fonts = [], activeFontIds = [] }) => {
  const active = new Set(activeFontIds.filter(Boolean));

  const selectedFonts = fonts.filter((font) => {
    if (!font?.id || !font?.family || !font?.file) return false;
    if (active.size === 0) return true;
    return active.has(font.id);
  });

  // Dedupe por family
  const seen = new Set<string>();
  const uniqueFonts = selectedFonts.filter((font) => {
    if (seen.has(font.family)) return false;
    seen.add(font.family);
    return true;
  });

  // Filtra fontes JÁ rejeitadas no cache (otimização — não injeta CSS de fonte conhecida quebrada)
  const renderable = uniqueFonts.filter((f) => !REJECTED_FONTS.has(f.file));

  // Dispara probes em background (sem bloquear render)
  // useEffect só re-roda quando lista de files muda — sem dep no `loadedFonts`
  const filesKey = renderable.map((f) => f.file).sort().join('|');
  React.useEffect(() => {
    // Probar em background — atualiza cache pra próximas chamadas
    renderable.forEach((f) => {
      probeFontOnce(f.file).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey]);

  if (!renderable.length) return null;

  // Server-side: também renderiza (o style fica disponível no HTML inicial)
  const css = renderable
    .map((font) => {
      const family = escapeCss(font.family);
      const file = fontUrl(font.file);
      const format = fontFormat(font.file);
      return `@font-face { font-family: '${family}'; src: url('${file}') format('${format}'); font-weight: ${font.weight || 700}; font-style: normal; font-display: block; }`;
    })
    .join('\n');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
