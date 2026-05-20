'use client';

import React from 'react';
import type { TextStyleState } from '../../app/editorConstants';
import { miniInputLabel, segBtn, segBtnActive, textBoxGridStyle } from '../../app/editorStyles';
import { NumberBox } from './NumberBox';
import { SliderRow } from './SliderRow';

export function TextLayoutEditor({
  label, value, onChange,
}: { label: string; value: TextStyleState; onChange: (s: TextStyleState) => void }) {
  const setNum = (key: keyof TextStyleState, next: number) => onChange({ ...value, [key]: next });
  const textAlign = value.textAlign ?? 'center';

  return (
    <div style={{ marginBottom: 14, padding: '10px 12px',
      background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>{label}</div>

      <SliderRow
        label="Espacamento entre letras"
        value={value.letterSpacing ?? 0}
        min={-20}
        max={30}
        step={0.5}
        onChange={(v) => setNum('letterSpacing', v)}
        format={(v) => `${v.toFixed(1)}px`}
      />

      <div style={{ marginBottom: 10 }}>
        <div style={miniInputLabel}>Alinhamento / justificado</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {(['left', 'center', 'right', 'justify'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ ...value, textAlign: align })}
              style={textAlign === align ? segBtnActive : segBtn}
            >
              {align === 'left' ? 'Esq' : align === 'center' ? 'Centro' : align === 'right' ? 'Dir' : 'Just'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={miniInputLabel}>Padding interno (px)</div>
        <div style={textBoxGridStyle}>
          <NumberBox label="Top" value={value.paddingTop ?? 0} onChange={(v) => setNum('paddingTop', v)} />
          <NumberBox label="Right" value={value.paddingRight ?? 0} onChange={(v) => setNum('paddingRight', v)} />
          <NumberBox label="Bottom" value={value.paddingBottom ?? 0} onChange={(v) => setNum('paddingBottom', v)} />
          <NumberBox label="Left" value={value.paddingLeft ?? 0} onChange={(v) => setNum('paddingLeft', v)} />
        </div>
      </div>

      <div>
        <div style={miniInputLabel}>Padding externo / margem (px)</div>
        <div style={textBoxGridStyle}>
          <NumberBox label="Top" value={value.marginTop ?? 0} onChange={(v) => setNum('marginTop', v)} />
          <NumberBox label="Right" value={value.marginRight ?? 0} onChange={(v) => setNum('marginRight', v)} />
          <NumberBox label="Bottom" value={value.marginBottom ?? 0} onChange={(v) => setNum('marginBottom', v)} />
          <NumberBox label="Left" value={value.marginLeft ?? 0} onChange={(v) => setNum('marginLeft', v)} />
        </div>
      </div>
    </div>
  );
}
