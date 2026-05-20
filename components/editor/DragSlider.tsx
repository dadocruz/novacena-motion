'use client';

import React from 'react';

export function DragSlider({
  label, value, min, max, step, onChange, format, accent
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void;
  format?: (v: number) => string; accent?: string;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const accentColor = accent ?? 'rgba(168,85,247,0.9)';

  function calcValue(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const raw = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, raw));
    const raw_val = min + clamped * (max - min);
    const snapped = Math.round(raw_val / step) * step;
    return Math.max(min, Math.min(max, snapped));
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    onChange(calcValue(e.clientX));
    function onMove(ev: MouseEvent) { if (dragging.current) onChange(calcValue(ev.clientX)); }
    function onUp() { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.75)', fontVariantNumeric:'tabular-nums', minWidth:38, textAlign:'right' }}>
          {format ? format(value) : String(value)}
        </span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        style={{
          position:'relative', height:20, cursor:'ew-resize',
          display:'flex', alignItems:'center',
        }}
      >
        <div style={{ position:'absolute', left:0, right:0, height:3, borderRadius:2, background:'rgba(255,255,255,0.08)' }} />
        <div style={{ position:'absolute', left:0, width:`${pct*100}%`, height:3, borderRadius:2, background: accentColor, transition:'width 0ms' }} />
        <div style={{
          position:'absolute', left:`calc(${pct*100}% - 8px)`,
          width:16, height:16, borderRadius:'50%',
          background: '#fff',
          boxShadow:`0 0 0 3px ${accentColor}, 0 2px 8px rgba(0,0,0,0.5)`,
          cursor:'grab', transition:'box-shadow 120ms ease',
          zIndex:2,
        }} />
      </div>
    </div>
  );
}
