'use client';

import { useEffect } from 'react';

/**
 * Deterrente de inspeção — NÃO é blindagem (é bypassável por quem insiste).
 * Afasta o curioso casual: bloqueia menu de contexto + atalhos de DevTools/
 * view-source e deixa um aviso no console. Só roda em produção.
 * A proteção REAL é: sem source maps (next.config) + lógica no servidor.
 */
export default function AntiInspect() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const onContext = (e: MouseEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const blocked =
        e.key === 'F12' ||
        (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) ||
        (mod && k === 'u');
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('contextmenu', onContext);
    window.addEventListener('keydown', onKey, true);
    try {
      console.log(
        '%cÁrea restrita — NovaCena Motion',
        'color:#a855f7;font-size:15px;font-weight:900'
      );
    } catch {
      /* noop */
    }

    return () => {
      window.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  return null;
}
