'use client';

import React from 'react';

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
