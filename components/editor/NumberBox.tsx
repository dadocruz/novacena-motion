'use client';

import React from 'react';
import { miniNumberInputStyle } from '../../app/editorStyles';

export function NumberBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{label}</span>
      <input
        type="number"
        min={-200}
        max={200}
        step={1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={miniNumberInputStyle}
      />
    </label>
  );
}
