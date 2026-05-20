'use client';

import React, { useState } from 'react';
import { fieldInputStyle, miniInputLabel } from '../../app/editorStyles';
import type { FontDef } from '../../lib/fontCatalog';

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={miniInputLabel}>{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...fieldInputStyle,
          minHeight: Math.max(50, rows * 30),
          lineHeight: 1.35,
          resize: 'vertical',
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}

export function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={miniInputLabel}>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        style={fieldInputStyle} />
    </label>
  );
}

export function TemplateButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 12px',
      background: active ? 'var(--surface-active)' : 'var(--surface-1)',
      border: active ? '1px solid var(--border-3)' : '1px solid var(--border-1)',
      borderRadius: 10, color: active ? 'var(--text-1)' : 'var(--text-2)',
      fontSize: 12, fontWeight: 600,
    }}>{children}</button>
  );
}

export function ChipButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      background: active ? 'var(--surface-active)' : 'var(--surface-1)',
      border: active ? '1px solid var(--border-3)' : '1px solid var(--border-1)',
      borderRadius: 999, color: active ? 'var(--text-1)' : 'var(--text-2)',
      fontSize: 12, fontWeight: 500,
    }}>{children}</button>
  );
}

export function SegmentedControl({ options, value, onChange }: {
  options: { id: string; label: string }[]; value: string; onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg-2)',
      border: '1px solid var(--border-1)', borderRadius: 10, padding: 3 }}>
      {options.map((opt) => (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          padding: '7px 14px',
          background: value === opt.id ? 'var(--surface-active)' : 'transparent',
          border: 'none', borderRadius: 7,
          color: value === opt.id ? 'var(--text-1)' : 'var(--text-3)',
          fontSize: 12, fontWeight: 600,
        }}>{opt.label}</button>
      ))}
    </div>
  );
}

export function SliderRow({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max?: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-3)' }}>{label}</span>
        <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

export function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 32, height: 18, borderRadius: 999,
        background: value ? 'var(--brand)' : 'var(--border-2)',
        border: 'none', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 14, height: 14, borderRadius: 999, background: '#fff',
          transition: 'left 0.2s ease',
        }} />
      </button>
    </div>
  );
}

export function FontPicker({
  label, sampleText, value, onChange, fonts,
}: {
  label: string; sampleText: string; value: string;
  onChange: (id: string) => void; fonts: FontDef[];
}) {
  const [open, setOpen] = useState(false);
  const selected = fonts.find((f) => f.id === value) ?? fonts[0];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={miniInputLabel}>{label}</div>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: '100%', textAlign: 'left', padding: '8px 10px',
        background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: `'${selected.family}', sans-serif`,
            fontSize: 16, fontWeight: selected.weight, lineHeight: 1.1, color: 'var(--text-1)',
          }}>{sampleText.slice(0, 14) || 'Aa'}</div>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{selected.label}</div>
        </div>
        <span style={{ color: 'var(--text-3)' }}>{open ? 'x' : '⌄'}</span>
      </button>
      {open && (
        <div style={{
          marginTop: 6, maxHeight: 280, overflow: 'auto', background: 'var(--bg-2)',
          border: '1px solid var(--border-1)', borderRadius: 8, padding: 4,
        }}>
          {(['display', 'sans', 'special'] as const).map((cat) => (
            <div key={cat}>
              <div style={{
                padding: '6px 8px 2px', fontSize: 9, letterSpacing: 1.4,
                color: 'var(--text-4)', textTransform: 'uppercase', fontWeight: 700,
              }}>
                {cat}
              </div>
              {fonts.filter((f) => f.category === cat).map((f) => (
                <button key={f.id} onClick={() => { onChange(f.id); setOpen(false); }} style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: f.id === value ? 'var(--surface-active)' : 'transparent',
                  border: 'none', borderRadius: 6,
                }}>
                  <div style={{
                    fontFamily: `'${f.family}', sans-serif`,
                    fontSize: 18, fontWeight: f.weight, lineHeight: 1, color: 'var(--text-1)',
                  }}>{sampleText.slice(0, 18) || f.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3 }}>{f.label}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
