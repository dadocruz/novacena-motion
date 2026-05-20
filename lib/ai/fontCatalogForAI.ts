/**
 * Constrói catálogo completo de fontes formatado pra prompt de IA.
 * A IA recebe a lista REAL (lida dinamicamente do fontCatalog.ts)
 * com vibe + weight + categoria pra fazer match preciso com a capa.
 */

import { FONT_CATALOG } from '../fontCatalog';

/**
 * Retorna lista compacta das fontes pra IA escolher.
 * Cada item: { id, label, weight, category, vibe }
 */
export function getFontCatalogForAI(): string {
  const lines = FONT_CATALOG.map((f) => {
    // Limpa o label (remove "⭐ ") e foco no que importa
    const cleanLabel = f.label.replace(/^⭐\s*/, '');
    return `  "${f.id}": "${cleanLabel}" — weight ${f.weight}, ${f.category}, vibe: "${f.vibe}"`;
  }).join('\n');
  return `[\n${lines}\n]`;
}

/**
 * Set de IDs válidos pra validação rápida.
 */
export function getValidFontIds(): Set<string> {
  return new Set(FONT_CATALOG.map((f) => f.id));
}

/**
 * Acha a fonte mais similar a um nome aproximado (fallback inteligente).
 * Útil quando a IA inventa um ID que não existe.
 */
export function findSimilarFont(approximateName: string): string | null {
  const target = approximateName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let best: { id: string; score: number } | null = null;

  for (const f of FONT_CATALOG) {
    const id = f.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const family = f.family.toLowerCase().replace(/[^a-z0-9]/g, '');

    let score = 0;
    if (id === target) score = 100;
    else if (id.includes(target) || target.includes(id)) score = 80;
    else if (family === target) score = 90;
    else if (family.includes(target) || target.includes(family)) score = 70;
    else {
      // similaridade por substring
      const common = [...target].filter((c) => id.includes(c)).length;
      score = (common / target.length) * 40;
    }

    if (!best || score > best.score) best = { id: f.id, score };
  }

  return best && best.score > 30 ? best.id : null;
}
