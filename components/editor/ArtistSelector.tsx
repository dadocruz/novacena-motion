'use client';

import React, { useState } from 'react';
import type { ArtistRecord } from '../../app/editorConstants';

export function ArtistSelector({
  artists, activeSlug, onSelect, onNew,
}: {
  artists: ArtistRecord[]; activeSlug: string | null;
  onSelect: (slug: string) => void; onNew: () => void;
}) {
  const active = artists.find((a) => a.slug === activeSlug);
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        padding: '6px 14px', background: 'var(--surface-1)',
        border: '1px solid var(--border-1)', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-1)',
      }}>
        <span style={{ color: 'var(--text-3)' }}>Artista:</span>
        <strong>{active?.name ?? 'Nenhum'}</strong>
        <span style={{ color: 'var(--text-3)' }}>⌄</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          minWidth: 220, background: 'var(--bg-2)',
          border: '1px solid var(--border-1)', borderRadius: 8,
          padding: 4, zIndex: 100, maxHeight: 320, overflow: 'auto',
        }}>
          {artists.map((a) => (
            <button
              key={a.slug}
              onClick={() => { onSelect(a.slug); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 10px',
                background: a.slug === activeSlug ? 'var(--surface-active)' : 'transparent',
                border: 'none', borderRadius: 6, fontSize: 13, color: 'var(--text-1)',
              }}
            >
              {a.name}
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
          <button onClick={() => { onNew(); setOpen(false); }} style={{
            width: '100%', textAlign: 'left', padding: '8px 10px',
            background: 'transparent', border: 'none', borderRadius: 6,
            color: 'var(--brand)', fontSize: 13, fontWeight: 600,
          }}>
            + Novo artista
          </button>
        </div>
      )}
    </div>
  );
}
