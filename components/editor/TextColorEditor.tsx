'use client';

import React from 'react';
import type { TextStyleState } from '../../app/editorConstants';
import { colorInputStyle } from '../../app/editorStyles';

export function TextColorEditor({
  label, value, onChange,
}: { label: string; value: TextStyleState; onChange: (s: TextStyleState) => void }) {
  return (
    <div style={{ marginBottom: 14, padding: '10px 12px',
      background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
        <button onClick={() => onChange({ ...value, useGradient: !value.useGradient })}
          style={{
            padding: '3px 9px', fontSize: 10, fontWeight: 600,
            background: value.useGradient ? 'linear-gradient(135deg,' + value.gradientColor1 + ',' + value.gradientColor2 + ')' : 'var(--bg-2)',
            color: '#fff', border: '1px solid var(--border-2)', borderRadius: 6,
          }}>
          {value.useGradient ? 'GRADIENTE' : 'COR SOLIDA'}
        </button>
      </div>
      {!value.useGradient ? (
        <input type="color" value={value.color}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          style={colorInputStyle} />
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input type="color" value={value.gradientColor1}
              onChange={(e) => onChange({ ...value, gradientColor1: e.target.value })}
              style={{ ...colorInputStyle, flex: 1 }} />
            <input type="color" value={value.gradientColor2}
              onChange={(e) => onChange({ ...value, gradientColor2: e.target.value })}
              style={{ ...colorInputStyle, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>Angulo</span>
            <input type="range" min={0} max={360} step={5} value={value.gradientAngle}
              onChange={(e) => onChange({ ...value, gradientAngle: parseInt(e.target.value) })}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, width: 30, textAlign: 'right' }}>
              {value.gradientAngle}°
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
