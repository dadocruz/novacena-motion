'use client';

import React from 'react';
import type { OverlayPlacement } from '../../remotion/types';
import { tinyNumInput, tinySelect, linkBtnDanger, colorInputStyle } from '../../app/editorStyles';

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

const overlaySwatches = ['#ffffff', '#000000', '#ff4f73', '#ffcc33', '#22d36f', '#7c5cff', '#ff7a3d', '#24c7ef'];

function MiniButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 26,
        padding: '0 8px',
        borderRadius: 7,
        border: active ? '1px solid var(--brand)' : '1px solid var(--border-1)',
        background: active ? 'rgba(196,92,255,.22)' : 'rgba(255,255,255,.05)',
        color: active ? '#fff' : 'var(--text-2)',
        fontSize: 10,
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ ...colorInputStyle, width: 36, height: 30, padding: 2 }}
      />
      {overlaySwatches.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Usar cor ${color}`}
          onClick={() => onChange(color)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            border: value.toLowerCase() === color ? '2px solid #fff' : '1px solid rgba(255,255,255,.18)',
            background: color,
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
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
              editar
            </button>
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

          {selectedId === ov.id && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,.08)',
              paddingTop: 8,
              display: 'grid',
              gap: 8,
            }}>
              <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 800 }}>
                Cor do overlay
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                <MiniButton
                  active={!ov.tintEnabled && !ov.gradientEnabled}
                  onClick={() => onUpdate(ov.id, { tintEnabled: false, gradientEnabled: false })}
                >
                  Original
                </MiniButton>
                <MiniButton
                  active={Boolean(ov.tintEnabled) && !ov.gradientEnabled}
                  onClick={() => onUpdate(ov.id, { tintEnabled: true, gradientEnabled: false, tintColor: ov.tintColor ?? '#ffffff', tintOpacity: ov.tintOpacity ?? 1 })}
                >
                  Cor
                </MiniButton>
                <MiniButton
                  active={Boolean(ov.gradientEnabled)}
                  onClick={() => onUpdate(ov.id, {
                    tintEnabled: true,
                    gradientEnabled: true,
                    tintColor: ov.tintColor ?? ov.gradientFrom ?? '#ffffff',
                    gradientFrom: ov.gradientFrom ?? '#ffffff',
                    gradientTo: ov.gradientTo ?? '#ff4f73',
                    gradientOpacity: ov.gradientOpacity ?? 0.75,
                  })}
                >
                  Degradê
                </MiniButton>
              </div>

              {(ov.tintEnabled || ov.gradientEnabled) && (
                <>
                  <ColorSwatches
                    value={ov.gradientEnabled ? (ov.gradientFrom ?? '#ffffff') : (ov.tintColor ?? '#ffffff')}
                    onChange={(color) => onUpdate(ov.id, ov.gradientEnabled
                      ? { gradientFrom: color, tintColor: color, tintEnabled: true }
                      : { tintColor: color, tintEnabled: true })}
                  />
                  {ov.gradientEnabled && (
                    <ColorSwatches
                      value={ov.gradientTo ?? '#ff4f73'}
                      onChange={(color) => onUpdate(ov.id, { gradientTo: color, gradientEnabled: true, tintEnabled: true })}
                    />
                  )}
                  <MiniControl label={ov.gradientEnabled ? 'força do degradê' : 'força da cor'}>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={ov.gradientEnabled ? (ov.gradientOpacity ?? 0.75) : (ov.tintOpacity ?? 1)}
                      onChange={(event) => {
                        const value = parseFloat(event.target.value);
                        onUpdate(ov.id, ov.gradientEnabled ? { gradientOpacity: value } : { tintOpacity: value });
                      }}
                      style={{ width: '100%' }}
                    />
                  </MiniControl>
                </>
              )}

              <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 800 }}>
                Contorno
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <MiniButton
                  active={(ov.outlineWidth ?? 0) <= 0}
                  onClick={() => onUpdate(ov.id, { outlineWidth: 0 })}
                >
                  Nenhum
                </MiniButton>
                <MiniButton
                  active={(ov.outlineWidth ?? 0) > 0}
                  onClick={() => onUpdate(ov.id, { outlineWidth: ov.outlineWidth && ov.outlineWidth > 0 ? ov.outlineWidth : 4, outlineColor: ov.outlineColor ?? '#ffffff' })}
                >
                  Externo
                </MiniButton>
              </div>
              {(ov.outlineWidth ?? 0) > 0 && (
                <>
                  <ColorSwatches
                    value={ov.outlineColor ?? '#ffffff'}
                    onChange={(color) => onUpdate(ov.id, { outlineColor: color, outlineWidth: ov.outlineWidth && ov.outlineWidth > 0 ? ov.outlineWidth : 4 })}
                  />
                  <MiniControl label={`espessura · ${Math.round(ov.outlineWidth ?? 0)}px`}>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      step={1}
                      value={ov.outlineWidth ?? 0}
                      onChange={(event) => onUpdate(ov.id, { outlineWidth: parseFloat(event.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </MiniControl>
                </>
              )}

              <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 800 }}>
                Posição
              </div>
              <MiniControl label={`X · ${Math.round(ov.x ?? 0)}px`}>
                <input type="range" min={-800} max={800} step={5} value={ov.x ?? 0}
                  onChange={(e) => onUpdate(ov.id, { x: parseFloat(e.target.value) })} style={{ width: '100%' }} />
              </MiniControl>
              <MiniControl label={`Y · ${Math.round(ov.y ?? 0)}px`}>
                <input type="range" min={-1200} max={1200} step={5} value={ov.y ?? 0}
                  onChange={(e) => onUpdate(ov.id, { y: parseFloat(e.target.value) })} style={{ width: '100%' }} />
              </MiniControl>
              <MiniControl label={`Escala · ${(ov.scale ?? 1).toFixed(2)}×`}>
                <input type="range" min={0.2} max={3} step={0.05} value={ov.scale ?? 1}
                  onChange={(e) => onUpdate(ov.id, { scale: parseFloat(e.target.value) })} style={{ width: '100%' }} />
              </MiniControl>
              {(Math.round(ov.x ?? 0) !== 0 || Math.round(ov.y ?? 0) !== 0 || (ov.scale ?? 1) !== 1) && (
                <MiniButton onClick={() => onUpdate(ov.id, { x: 0, y: 0, scale: 1 })}>
                  Resetar posição
                </MiniButton>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
