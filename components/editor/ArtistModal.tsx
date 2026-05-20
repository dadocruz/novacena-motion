'use client';

import React, { useState } from 'react';

export function ArtistModal({ onCreate, onClose }: { onCreate: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-1)', padding: 24, borderRadius: 14,
        border: '1px solid var(--border-2)', minWidth: 340,
      }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>Novo artista</h3>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nome do artista" style={{
            width: '100%', padding: '10px 12px', background: 'var(--surface-1)',
            border: '1px solid var(--border-1)', borderRadius: 8, color: 'var(--text-1)',
            fontSize: 14, marginBottom: 14, outline: 'none',
          }} onKeyDown={(e) => e.key === 'Enter' && name && onCreate(name)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', background: 'transparent', border: '1px solid var(--border-1)',
            borderRadius: 8, color: 'var(--text-2)', fontSize: 13,
          }}>Cancelar</button>
          <button disabled={!name} onClick={() => onCreate(name)} style={{
            padding: '8px 18px', background: 'linear-gradient(135deg,var(--brand),var(--brand-2))',
            border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13,
          }}>Criar</button>
        </div>
      </div>
    </div>
  );
}
