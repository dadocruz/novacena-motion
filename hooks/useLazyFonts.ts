import { useEffect, useState } from 'react';
import type { FontDef } from '../lib/fontCatalog';

export interface FontLoadStatus {
  fontId: string;
  loaded: boolean;
  error?: string;
}

// ─── Cache GLOBAL (sobrevive a re-renders e mudanças de template) ──
const LOADED_FONT_IDS = new Set<string>();
const FAILED_FONT_IDS = new Set<string>();
const LOADING = new Map<string, Promise<void>>();

async function loadFontOnce(fontId: string): Promise<void> {
  if (LOADED_FONT_IDS.has(fontId)) return;
  if (FAILED_FONT_IDS.has(fontId)) throw new Error(`Font ${fontId} já falhou antes`);
  const inflight = LOADING.get(fontId);
  if (inflight) return inflight;

  const promise = new Promise<void>((resolve, reject) => {
    // Verifica se já tem link CSS no head (evita duplicar)
    const href = `/api/fonts/css?id=${fontId}`;
    if (document.querySelector(`link[href="${href}"]`)) {
      LOADED_FONT_IDS.add(fontId);
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => {
      LOADED_FONT_IDS.add(fontId);
      resolve();
    };
    link.onerror = () => {
      FAILED_FONT_IDS.add(fontId);
      reject(new Error(`Falha ao carregar font ${fontId}`));
    };
    document.head.appendChild(link);
  })
    .finally(() => {
      LOADING.delete(fontId);
    });

  LOADING.set(fontId, promise);
  return promise;
}

export function useLazyFonts(fontIds: string[]) {
  // Render conta os IDs já carregados — sem state pra dispensar re-renders desnecessários
  const [, forceUpdate] = useState({});

  // Estável: só re-roda quando lista de IDs muda
  const idsKey = [...new Set(fontIds.filter(Boolean))].sort().join('|');

  useEffect(() => {
    const ids = [...new Set(fontIds.filter(Boolean))];
    const toLoad = ids.filter((id) => !LOADED_FONT_IDS.has(id) && !FAILED_FONT_IDS.has(id));
    if (toLoad.length === 0) return;

    Promise.allSettled(toLoad.map((id) => loadFontOnce(id))).then(() => {
      forceUpdate({});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const ids = [...new Set(fontIds.filter(Boolean))];
  return {
    loadedFonts: new Set(ids.filter((id) => LOADED_FONT_IDS.has(id))),
    loading: ids.some((id) => LOADING.has(id)),
    errors: Object.fromEntries(ids.filter((id) => FAILED_FONT_IDS.has(id)).map((id) => [id, 'falhou'])),
    allLoaded: ids.every((id) => LOADED_FONT_IDS.has(id)),
  };
}

export function usePreloadFonts(fontIds: string[]) {
  const [status, setStatus] = useState<Map<string, FontLoadStatus>>(new Map());

  const idsKey = [...new Set(fontIds.filter(Boolean))].sort().join('|');

  useEffect(() => {
    const ids = [...new Set(fontIds.filter(Boolean))];
    ids.forEach((fontId, index) => {
      if (LOADED_FONT_IDS.has(fontId)) {
        setStatus((prev) => new Map(prev).set(fontId, { fontId, loaded: true }));
        return;
      }
      const delay = index <= 2 ? 0 : 200 * (index - 2);
      setTimeout(() => {
        loadFontOnce(fontId)
          .then(() => setStatus((prev) => new Map(prev).set(fontId, { fontId, loaded: true })))
          .catch((err) =>
            setStatus((prev) =>
              new Map(prev).set(fontId, { fontId, loaded: false, error: err.message })
            )
          );
      }, delay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return status;
}
