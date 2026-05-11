import { useEffect, useState, useCallback } from 'react';
import type { FontDef } from '../lib/fontCatalog';

export interface FontLoadStatus {
  fontId: string;
  loaded: boolean;
  error?: string;
}

export function useLazyFonts(fontIds: string[]) {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar fonts dinamicamente
  useEffect(() => {
    const fontsCopy = new Set(loadedFonts);
    const toLoad = fontIds.filter(id => !fontsCopy.has(id));

    if (toLoad.length === 0) return;

    setLoading(true);

    Promise.all(
      toLoad.map(fontId =>
        loadFont(fontId)
          .then(() => {
            fontsCopy.add(fontId);
            setLoadedFonts(new Set(fontsCopy));
          })
          .catch(err => {
            setErrors(prev => ({
              ...prev,
              [fontId]: err.message,
            }));
          })
      )
    ).finally(() => setLoading(false));
  }, [fontIds, loadedFonts]);

  return {
    loadedFonts,
    loading,
    errors,
    allLoaded: fontIds.every(id => loadedFonts.has(id)),
  };
}

// Função que carrega uma font dinamicamente
async function loadFont(fontId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simular carregamento via CSS @import
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/api/fonts/css?id=${fontId}`;

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Falha ao carregar font ${fontId}`));

    document.head.appendChild(link);
  });
}

// Hook para preload de fonts mais usadas
export function usePreloadFonts(fontIds: string[]) {
  const [status, setStatus] = useState<Map<string, FontLoadStatus>>(new Map());

  useEffect(() => {
    // Priorizar fonts por ordem
    const sorted = [...fontIds];
    
    sorted.forEach((fontId, index) => {
      // Stagger o carregamento (apenas importante nas primeiras)
      const delay = index <= 2 ? 0 : 200 * (index - 2);
      
      setTimeout(() => {
        preloadFont(fontId).then(
          () => {
            setStatus(prev => new Map(prev).set(fontId, { fontId, loaded: true }));
          },
          err => {
            setStatus(prev => new Map(prev).set(fontId, { fontId, loaded: false, error: err.message }));
          }
        );
      }, delay);
    });
  }, [fontIds]);

  return status;
}

async function preloadFont(fontId: string): Promise<void> {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = `/api/fonts/css?id=${fontId}`;
  document.head.appendChild(link);

  return new Promise((resolve, reject) => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = `/api/fonts/css?id=${fontId}`;
    stylesheet.onload = () => resolve();
    stylesheet.onerror = () => reject(new Error(`Font ${fontId} failed`));
    document.head.appendChild(stylesheet);
  });
}
