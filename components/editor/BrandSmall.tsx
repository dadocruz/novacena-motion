'use client';

import React from 'react';

export function BrandSmall() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14, boxShadow: '0 4px 14px var(--brand-glow)',
      }}>N</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>NovaCena</div>
    </div>
  );
}
