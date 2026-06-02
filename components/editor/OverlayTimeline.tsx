'use client';

import React from 'react';
import type { OverlayPlacement } from '../../remotion/types';
import { tinyNumInput, tinySelect, linkBtnDanger } from '../../app/editorStyles';

function clampNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function MiniControl({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 9, color: 'var(--text-3)' }}>
      {label}
      {children}
    </label>
  );
}

export function OverlayTimeline({
  overlays, durationSeconds, selectedId, onSelect, onUpdate, onRemove,
}: {
  overlays: OverlayPlacement[]; durationSeconds: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onUpdate: (id: string, patch: Partial<OverlayPlacement>) => void;
  onRemove: (id: string) => void;
}) {
  if (overlays.length === 0) return null;
  return (
    <div style={{
      width: '100%', padding: 12,
      background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 12,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
        color: 'var(--text-3)', fontWeight: 600, marginBottom: 10 }}>
        Timeline · {durationSeconds}s · {overlays.length} overlay{overlays.length > 1 ? 's' : ''}
      </div>
      {overlays.map((ov) => (
        <div key={ov.id} style={{
          padding: '8px 10px', marginBottom: 8,
          background: selectedId === ov.id ? 'var(--surface-active)' : 'var(--bg-2)',
          border: selectedId === ov.id ? '1px solid var(--border-3)' : '1px solid transparent',
          borderRadius: 8,
          display: 'grid', gap: 8, fontSize: 11,
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            gap: 8, alignItems: 'center',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ov.type === 'video' ? '🎞' : '🖼'} {ov.label}
            </span>
            {ov.type === 'image' && (ov.layout ?? 'element') === 'element' ? (
              <button
                type="button"
                onClick={() => onSelect?.(ov.id)}
                style={{
                  height: 26,
                  padding: '0 8px',
                  borderRadius: 7,
                  border: selectedId === ov.id ? '1px solid var(--brand)' : '1px solid var(--border-1)',
                  background: selectedId === ov.id ? 'var(--surface-active)' : 'var(--surface-1)',
                  color: 'var(--text-1)',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                selecionar
              </button>
            ) : null}
            <button onClick={() => onRemove(ov.id)} style={linkBtnDanger}>x</button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            alignItems: 'end',
          }}>
              <MiniControl label="início">
                <input type="number" step="0.1" min={0} max={durationSeconds - 0.1}
                  value={(ov.startSec ?? 0).toFixed(1)}
                  onChange={(e) => onUpdate(ov.id, { startSec: clampNumber(parseFloat(e.target.value), 0) })}
                  style={tinyNumInput} />
              </MiniControl>
              <MiniControl label="duração">
                <input type="number" step="0.1" min={0.1}
                  value={(ov.durationSec ?? durationSeconds).toFixed(1)}
                  onChange={(e) => onUpdate(ov.id, { durationSec: clampNumber(parseFloat(e.target.value), durationSeconds) })}
                  style={tinyNumInput} />
              </MiniControl>
              <MiniControl label="opacidade">
                <input type="range" min={0} max={1} step={0.05} value={ov.opacity}
                  onChange={(e) => onUpdate(ov.id, { opacity: parseFloat(e.target.value) })}
                  style={{ width: '100%' }} />
              </MiniControl>
              <select value={ov.blendMode}
                onChange={(e) => onUpdate(ov.id, { blendMode: e.target.value as OverlayPlacement['blendMode'] })}
                style={tinySelect}>
                <option value="screen">screen</option>
                <option value="overlay">overlay</option>
                <option value="lighten">lighten</option>
                <option value="soft-light">soft</option>
                <option value="normal">normal</option>
              </select>
              {ov.type === 'video' ? (
                <select
                  value={ov.loopEnabled ? (ov.loopMode ?? 'normal') : 'off'}
                  onChange={(e) => {
                    const value = e.target.value as 'off' | 'normal' | 'pingpong';
                    onUpdate(ov.id, {
                      loopEnabled: value !== 'off',
                      loopMode: value === 'off' ? 'normal' : value,
                    });
                  }}
                  title="Escolha sem loop para vídeos longos; use loop para overlays curtos."
                  style={tinySelect}
                >
                  <option value="off">sem loop</option>
                  <option value="normal">loop normal</option>
                  <option value="pingpong">loop ida/volta</option>
                </select>
              ) : (
                <select
                  value={ov.layout ?? 'element'}
                  onChange={(e) => {
                    onSelect?.(ov.id);
                    onUpdate(ov.id, { layout: e.target.value as OverlayPlacement['layout'] });
                  }}
                  style={tinySelect}
                >
                  <option value="element">elemento</option>
                  <option value="cover">tela cheia</option>
                </select>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
