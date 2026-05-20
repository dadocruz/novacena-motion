'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TEXT_TRANSITIONS } from '../remotion/motionEngine';
import type { TextStroke, TextStrokeMode, TextTransitionId, TextTransitionTuning } from '../remotion/types';

export type FontDef = {
  id: string;
  label: string;
  family: string;
  weight?: number;
  category?: string;
  vibe?: string;
};

export type FontRole = 'headline' | 'date' | 'cta' | 'cta1' | 'cta2';
type TextTransitionRole = 'headline' | 'date' | 'cta1' | 'cta2';
type TextTransitionPreset = {
  id: string;
  label: string;
  values: Required<TextTransitionTuning>;
};

type Props = {
  activeRole?: FontRole;
  onActiveRoleChange?: (role: FontRole) => void;
  styleHeadline?: any;
  styleDate?: any;
  styleCta?: any;
  styleCta1?: any;
  styleCta2?: any;
  onChangeTextStyle?: (role: FontRole, next: any) => void;
  allFonts: FontDef[];
  fontHeadline: string;
  fontDate: string;
  fontCta: string;
  fontCta1?: string;
  fontCta2?: string;
  onChangeFont: (role: FontRole, id: string) => void;

  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;

  strokeHeadline: TextStroke;
  strokeDate: TextStroke;
  strokeCta: TextStroke;
  strokeCta1?: TextStroke;
  strokeCta2?: TextStroke;
  onChangeStroke: (role: FontRole, stroke: TextStroke) => void;

  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  uploadFont: (event: React.ChangeEvent<HTMLInputElement>) => void;

  textOpacity: number;
  onChangeTextOpacity: (v: number) => void;
  sampleHeadline: string;
  sampleDate: string;
  sampleCta: string;
  sampleCta2?: string;

  // controles de escala/posição por role
  txScale: Record<string,number>;
  txLS:    Record<string,number>;
  txLH:    Record<string,number>;
  txOX:    Record<string,number>;
  txOY:    Record<string,number>;
  txWiggle: Record<string,number>;
  onTxScale: (role: string, v: number) => void;
  onTxLS:    (role: string, v: number) => void;
  onTxLH:    (role: string, v: number) => void;
  onTxOX:    (role: string, v: number) => void;
  onTxOY:    (role: string, v: number) => void;
  onTxWiggle: (role: string, v: number) => void;

  transitionByRole: Record<TextTransitionRole, TextTransitionId>;
  transitionTuningByRole: Record<TextTransitionRole, Required<TextTransitionTuning>>;
  transitionInFrameByRole?: Record<TextTransitionRole, number>;
  maxTransitionFrame?: number;
  transitionPresets: TextTransitionPreset[];
  onChangeTransition: (role: TextTransitionRole, id: TextTransitionId) => void;
  onChangeTransitionTuning: (role: TextTransitionRole, patch: Partial<TextTransitionTuning>) => void;
  onChangeTransitionInFrame?: (role: TextTransitionRole, frame: number) => void;
  onApplyTransitionPreset: (role: TextTransitionRole, values: TextTransitionTuning) => void;
  roleLabels?: Partial<Record<TextTransitionRole, string>>;
  visibleRoles?: TextTransitionRole[];
  showCtaToggles?: boolean;
  showCta1?: boolean;
  showCta2?: boolean;
  onToggleCta1?: () => void;
  onToggleCta2?: () => void;
};

const SWATCHES = ['#ffc857', '#ff4d6d', '#4ecdc4', '#845ef7', '#ffffff', '#000000', '#ff8c42', '#3a86ff'];

const panel: React.CSSProperties = {
  background: '#0e0d12',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: 14,
  color: '#f5f5f5',
  display: 'grid',
  gap: 12,
};

const tiny: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: '#686873',
  textTransform: 'uppercase',
};

const tab = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
  border: active ? '1px solid rgba(255,200,80,0.45)' : '1px solid rgba(255,255,255,0.08)',
  color: active ? '#ffc857' : '#888',
  fontSize: 10,
  fontWeight: 700,
  padding: '5px 10px',
  borderRadius: 7,
  cursor: 'pointer',
});

const seg = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.025)',
  border: active ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
  color: active ? '#f4f4f5' : '#777',
  fontSize: 10,
  padding: '5px 9px',
  borderRadius: 6,
  cursor: 'pointer',
});

function getSample(role: FontRole, headline: string, date: string, cta: string, cta2?: string) {
  if (role === 'date') return date || '07/06';
  if (role === 'cta2') return cta2 || 'EM TODAS AS PLATAFORMAS DIGITAIS';
  if (role === 'cta' || role === 'cta1') return cta || 'FAÇA O PRÉ-SAVE';
  return headline || 'LANÇAMENTO';
}

function strokeStyle(s: TextStroke): React.CSSProperties {
  if (!s || s.mode === 'none' || s.width <= 0) return {};
  const color = s.fillKind === 'solid' ? s.color : (s.gradientFrom || s.color);
  if (s.mode === 'outer') {
    return { WebkitTextStroke: `${s.width}px ${color}` };
  }
  return {
    textShadow: `
      ${s.width}px 0 0 ${color},
      -${s.width}px 0 0 ${color},
      0 ${s.width}px 0 ${color},
      0 -${s.width}px 0 ${color},
      0 0 ${Math.max(2, s.width * 2)}px ${color}
    `,
  };
}


const TEXT_FILL_COLORS = [
  '#ffffff', '#000000', '#ffcf5a', '#ff5a7a',
  '#33d17a', '#8b5cf6', '#ff7a38', '#3f7cff',
  '#ff914d', '#00d6ff', '#f43f5e', '#facc15',
];


const fpSegBtn: React.CSSProperties = {
  padding: '7px 9px',
  background: 'var(--surface-1)',
  color: 'var(--text-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

const fpSegBtnActive: React.CSSProperties = {
  ...fpSegBtn,
  background: 'var(--surface-active)',
  color: 'var(--text-1)',
  border: '1px solid var(--border-3)',
};

const fpInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 32,
  padding: '0 10px',
  background: 'var(--surface-1)',
  color: 'var(--text-1)',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
  outline: 'none',
  fontSize: 12,
};

const DEFAULT_ROLE_LABELS: Record<TextTransitionRole, string> = {
  headline: 'Headline',
  date: 'Data',
  cta1: 'CTA 1',
  cta2: 'CTA 2',
};

const DEFAULT_VISIBLE_ROLES: TextTransitionRole[] = ['headline', 'date', 'cta1', 'cta2'];

function FillSliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div style={{ marginTop: 10, marginBottom: 8 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 10,
        marginBottom: 5,
        color: 'var(--text-3)',
      }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function TextTransitionEditor({
  role,
  label,
  value,
  tuning,
  inFrame,
  maxFrame,
  presets,
  onChange,
  onTuningChange,
  onFrameChange,
  onPreset,
}: {
  role: TextTransitionRole;
  label: string;
  value: TextTransitionId;
  tuning: Required<TextTransitionTuning>;
  inFrame?: number;
  maxFrame?: number;
  presets: TextTransitionPreset[];
  onChange: (role: TextTransitionRole, id: TextTransitionId) => void;
  onTuningChange: (role: TextTransitionRole, patch: Partial<TextTransitionTuning>) => void;
  onFrameChange?: (role: TextTransitionRole, frame: number) => void;
  onPreset: (role: TextTransitionRole, values: TextTransitionTuning) => void;
}) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--border-1)',
        paddingTop: 12,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={tiny}>Transição do texto · {label}</div>

      <select
        value={value}
        onChange={(event) => onChange(role, event.target.value as TextTransitionId)}
        style={fpInputStyle}
      >
        {TEXT_TRANSITIONS.map((transition) => (
          <option key={transition.id} value={transition.id}>
            {transition.label} - {transition.description}
          </option>
        ))}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPreset(role, preset.values)}
            style={fpSegBtn}
            title={`Preset ${preset.label}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {typeof inFrame === 'number' && onFrameChange && (
        <FillSliderRow
          label="Entrada no tempo"
          value={inFrame}
          min={0}
          max={maxFrame ?? 240}
          step={1}
          onChange={(next) => onFrameChange(role, Math.round(next))}
          format={(next) => `f${Math.round(next)} · ${(next / 30).toFixed(2)}s`}
        />
      )}

      <FillSliderRow
        label="Intensidade"
        value={tuning.intensity}
        min={0.15}
        max={2.4}
        step={0.05}
        onChange={(next) => onTuningChange(role, { intensity: next })}
        format={(next) => `${next.toFixed(2)}x`}
      />
      <FillSliderRow
        label="Velocidade"
        value={tuning.speed}
        min={0.35}
        max={2.4}
        step={0.05}
        onChange={(next) => onTuningChange(role, { speed: next })}
        format={(next) => `${next.toFixed(2)}x`}
      />
      <FillSliderRow
        label="Stagger / delay"
        value={tuning.stagger}
        min={0}
        max={2.4}
        step={0.05}
        onChange={(next) => onTuningChange(role, { stagger: next })}
        format={(next) => `${next.toFixed(2)}x`}
      />
    </div>
  );
}

function normalizeTextColor(raw: string) {
  const value = raw.trim();

  if (!value) return '#ffffff';

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return '#' + value.slice(1).split('').map((c) => c + c).join('');
  }

  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(',').map((p) => Number.parseFloat(p.trim()));
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return '#' + parts.slice(0, 3).map((n) => {
        const v = Math.max(0, Math.min(255, Math.round(n)));
        return v.toString(16).padStart(2, '0');
      }).join('');
    }
  }

  return value;
}

function FillColorEditor({
  role,
  value,
  onChange,
}: {
  role: FontRole;
  value?: any;
  onChange?: (role: FontRole, next: any) => void;
}) {
  const style = value ?? {};
  const current = style.color ?? '#ffffff';
  const gradientColor1 = style.gradientColor1 ?? style.gradientFrom ?? current;
  const gradientColor2 = style.gradientColor2 ?? style.gradientTo ?? '#ffcf5a';
  const useGradient = !!style.useGradient;

  const update = (patch: any) => {
    if (!onChange) return;
    onChange(role, { ...style, ...patch });
  };

  const pickFromScreen = async () => {
    try {
      const EyeDropperCtor = (window as any).EyeDropper;
      if (!EyeDropperCtor) {
        alert('A lupa de captura de cor não está disponível neste navegador. Use HEX/RGB.');
        return;
      }

      const result = await new EyeDropperCtor().open();

      if (result?.sRGBHex) {
        update({
          color: result.sRGBHex,
          gradientColor1: result.sRGBHex,
          gradientFrom: result.sRGBHex,
          useGradient: false,
        });
      }
    } catch {
      // usuário cancelou
    }
  };

  return (
    <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 12, marginTop: 12, marginBottom: 12 }}>
      <div style={{
        fontSize: 10,
        letterSpacing: 1.6,
        color: 'var(--text-3)',
        fontWeight: 800,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        Cor do texto
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 44px', gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => update({ useGradient: false })}
          style={useGradient ? fpSegBtn : fpSegBtnActive}
        >
          Cor sólida
        </button>
        <button
          type="button"
          onClick={() => update({ useGradient: true })}
          style={useGradient ? fpSegBtnActive : fpSegBtn}
        >
          Degradê
        </button>
        <button
          type="button"
          onClick={pickFromScreen}
          style={fpSegBtn}
          title="Capturar cor da tela"
        >
          🔍
        </button>
      </div>

      {!useGradient ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: 8 }}>
            {TEXT_FILL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => update({ color: c, useGradient: false })}
                style={{
                  height: 24,
                  borderRadius: 999,
                  cursor: 'pointer',
                  background: c,
                  border: current.toLowerCase() === c.toLowerCase()
                    ? '2px solid var(--text-1)'
                    : '1px solid var(--border-1)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : '#ffffff'}
              onChange={(e) => update({ color: e.target.value, useGradient: false })}
              style={{ width: 42, height: 32, padding: 0, border: '1px solid var(--border-1)', borderRadius: 8 }}
            />
            <input
              value={current}
              placeholder="#FFFFFF ou rgb(255,255,255)"
              onChange={(e) => update({ color: normalizeTextColor(e.target.value), useGradient: false })}
              style={fpInputStyle}
            />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(gradientColor1) ? gradientColor1 : '#ffffff'}
              onChange={(e) => update({
                gradientColor1: e.target.value,
                gradientFrom: e.target.value,
                color: e.target.value,
                useGradient: true,
              })}
              style={{ width: 42, height: 32, padding: 0, border: '1px solid var(--border-1)', borderRadius: 8 }}
            />
            <input
              value={gradientColor1}
              placeholder="Cor inicial"
              onChange={(e) => update({
                gradientColor1: normalizeTextColor(e.target.value),
                gradientFrom: normalizeTextColor(e.target.value),
                useGradient: true,
              })}
              style={fpInputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(gradientColor2) ? gradientColor2 : '#ffcf5a'}
              onChange={(e) => update({
                gradientColor2: e.target.value,
                gradientTo: e.target.value,
                useGradient: true,
              })}
              style={{ width: 42, height: 32, padding: 0, border: '1px solid var(--border-1)', borderRadius: 8 }}
            />
            <input
              value={gradientColor2}
              placeholder="Cor final"
              onChange={(e) => update({
                gradientColor2: normalizeTextColor(e.target.value),
                gradientTo: normalizeTextColor(e.target.value),
                useGradient: true,
              })}
              style={fpInputStyle}
            />
          </div>

          <FillSliderRow
            label="Ângulo do degradê"
            value={style.gradientAngle ?? 90}
            min={0}
            max={360}
            step={1}
            onChange={(v) => update({ gradientAngle: v, useGradient: true })}
            format={(v) => `${Math.round(v)}°`}
          />
        </>
      )}
    </div>
  );
}

export default function FontsPanel({
  activeRole,
  onActiveRoleChange,
  allFonts,
  fontHeadline,
  fontDate,
  fontCta,
  fontCta1,
  fontCta2,
  onChangeFont,
  favoriteIds,
  onToggleFavorite,
  strokeHeadline,
  strokeDate,
  strokeCta,
  strokeCta1,
  strokeCta2,
  onChangeStroke,
  styleHeadline,
  styleDate,
  styleCta,
  styleCta1,
  styleCta2,
  onChangeTextStyle,
  uploadInputRef,
  uploadFont,
  sampleHeadline,
  sampleDate,
  sampleCta,
  
  sampleCta2,textOpacity,
  onChangeTextOpacity,
  txScale, txLS, txLH, txOX, txOY, txWiggle,
  onTxScale, onTxLS, onTxLH, onTxOX, onTxOY, onTxWiggle,
  transitionByRole,
  transitionTuningByRole,
  transitionInFrameByRole,
  maxTransitionFrame,
  transitionPresets,
  onChangeTransition,
  onChangeTransitionTuning,
  onChangeTransitionInFrame,
  onApplyTransitionPreset,
  roleLabels,
  visibleRoles,
  showCtaToggles = true,
  showCta1,
  showCta2,
  onToggleCta1,
  onToggleCta2,
}: Props) {
  const [role, setRole] = useState<FontRole>('headline');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const enabledRoles = useMemo(
    () => (visibleRoles?.length ? visibleRoles : DEFAULT_VISIBLE_ROLES),
    [visibleRoles]
  );
  const labels = { ...DEFAULT_ROLE_LABELS, ...(roleLabels ?? {}) };
  const transitionRole: TextTransitionRole =
    role === 'date' ? 'date' :
    role === 'cta2' ? 'cta2' :
    role === 'cta1' || role === 'cta' ? 'cta1' :
    'headline';

  const chooseRole = (next: FontRole) => {
    setRole(next);
    onActiveRoleChange?.(next);
  };

  useEffect(() => {
    if (!activeRole || role === activeRole) return;
    const nextTransitionRole: TextTransitionRole =
      activeRole === 'date' ? 'date' :
      activeRole === 'cta2' ? 'cta2' :
      activeRole === 'cta1' || activeRole === 'cta' ? 'cta1' :
      'headline';

    if (!enabledRoles.includes(nextTransitionRole)) return;
    setRole(activeRole);
  }, [activeRole, enabledRoles, role]);

  useEffect(() => {
    if (enabledRoles.includes(transitionRole)) return;
    chooseRole((enabledRoles[0] ?? 'headline') as FontRole);
  }, [enabledRoles, transitionRole]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!/^[a-zA-Z0-9]$/.test(e.key)) return;
      setQuery(e.key);
      searchRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedId =
    role === 'headline' ? fontHeadline :
    role === 'date' ? fontDate :
    role === 'cta2' ? (fontCta2 ?? fontCta) :
    role === 'cta1' ? (fontCta1 ?? fontCta) :
    fontCta;

  const currentStroke =
    role === 'headline' ? strokeHeadline :
    role === 'date' ? strokeDate :
    role === 'cta2' ? (strokeCta2 ?? strokeCta) :
    role === 'cta1' ? (strokeCta1 ?? strokeCta) :
    strokeCta;

  const currentTextStyle =
    role === 'headline' ? styleHeadline :
    role === 'date' ? styleDate :
    role === 'cta2' ? (styleCta2 ?? styleCta) :
    role === 'cta1' ? (styleCta1 ?? styleCta) :
    styleCta;
  const patchTextStyle = (patch: any) => onChangeTextStyle?.(role, { ...(currentTextStyle || {}), ...patch });
  const sample = getSample(role, sampleHeadline, sampleDate, sampleCta, sampleCta2);
  const selectedFont = allFonts.find((f) => f.id === selectedId) ?? allFonts[0];
  const strokeWidth = Number(currentStroke?.width ?? 0);
  const strokeOpacity = Number((currentStroke as any)?.opacity ?? 1);
  const strokeFillOpacity = Number((currentStroke as any)?.fillOpacity ?? textOpacity);

  const favoriteFonts = useMemo(
    () => allFonts.filter((f) => favoriteIds.includes(f.id)),
    [allFonts, favoriteIds]
  );

  const resultFonts = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = q
      ? allFonts.filter((f) => {
          const hay = [f.label, f.family, f.category, f.vibe, f.id].filter(Boolean).join(' ').toLowerCase();
          if (q.length === 1) return f.label.toLowerCase().startsWith(q) || f.family.toLowerCase().startsWith(q);
          return hay.includes(q);
        })
      : allFonts.filter((f) => !favoriteIds.includes(f.id));

    return base.slice(0, 160);
  }, [allFonts, favoriteIds, query]);

  function patchStroke(patch: Partial<TextStroke>) {
    onChangeStroke(role, { ...currentStroke, ...patch });
  }

  function FontRow({ font, favorite }: { font: FontDef; favorite: boolean }) {
    const selected = font.id === selectedId;
    return (
      <div
        onClick={() => onChangeFont(role, font.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: selected ? 'rgba(255,200,80,0.11)' : favorite ? 'rgba(255,200,80,0.07)' : 'rgba(255,255,255,0.025)',
          border: selected ? '1px solid rgba(255,200,80,0.5)' : favorite ? '1px solid rgba(255,200,80,0.22)' : '1px solid rgba(255,255,255,0.065)',
          borderRadius: 9,
          cursor: 'pointer',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: `'${font.family}', sans-serif`,
              fontWeight: font.weight || 700,
              fontSize: 21,
              lineHeight: 1,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 210,
            }}
          >
            {sample}
          </div>
          <div style={{ fontSize: 9, color: '#777', marginTop: 4 }}>
            {font.label} · {font.category || font.vibe || 'Fonte'}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(font.id);
          }}
          style={{
            background: 'transparent',
            border: 0,
            color: favorite ? '#ffc857' : '#444',
            fontSize: 17,
            cursor: 'pointer',
          }}
        >
          ★
        </button>
      </div>
    );
  }

  return (
    <div data-text-panel-anchor="fontes" style={{ ...panel, scrollMarginTop: 78 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#555', fontSize: 13 }}>⁝⁝</span>
          <span style={tiny}>Fontes</span>
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {enabledRoles.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => chooseRole(item)}
              style={tab(item === 'cta1' ? role === 'cta1' || role === 'cta' : role === item)}
            >
              {labels[item]}
            </button>
          ))}
        </div>
      </div>

      <TextTransitionEditor
        role={transitionRole}
        label={labels[transitionRole]}
        value={transitionByRole[transitionRole]}
        tuning={transitionTuningByRole[transitionRole]}
        inFrame={transitionInFrameByRole?.[transitionRole]}
        maxFrame={maxTransitionFrame}
        presets={transitionPresets}
        onChange={onChangeTransition}
        onTuningChange={onChangeTransitionTuning}
        onFrameChange={onChangeTransitionInFrame}
        onPreset={onApplyTransitionPreset}
      />

      {showCtaToggles && (transitionRole === 'cta1' || transitionRole === 'cta2') && (
        <button
          type="button"
          onClick={transitionRole === 'cta1' ? onToggleCta1 : onToggleCta2}
          style={(transitionRole === 'cta1' ? showCta1 : showCta2) ? fpSegBtnActive : fpSegBtn}
        >
          {transitionRole === 'cta1'
            ? (showCta1 ? `${labels.cta1} ligado` : `${labels.cta1} oculto`)
            : (showCta2 ? `${labels.cta2} ligado` : `${labels.cta2} oculto`)}
        </button>
      )}

      <div
        data-text-control="primary-typography"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 12,
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={tiny}>Ajustes do elemento</div>

        <div style={tiny}>ESCALA</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="range" min={0.05} max={6} step={0.01}
            value={txScale[role] ?? 1}
            onChange={e => onTxScale(role, parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'rgba(168,85,247,0.9)' }} />
          <span style={{ fontSize:10, color:'#aaa', minWidth:42, textAlign:'right' }}>
            {(txScale[role] ?? 1).toFixed(2)}×
          </span>
        </div>

        

<div style={tiny}>POSIÇÃO Y</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="range" min={-200} max={200} step={0.5}
            value={txOY[role] ?? 0}
            onChange={e => onTxOY(role, parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'rgba(99,200,255,0.85)' }} />
          <span style={{ fontSize:10, color:'#aaa', minWidth:42, textAlign:'right' }}>
            {(txOY[role] ?? 0) > 0 ? '+' : ''}{(txOY[role] ?? 0).toFixed(1)}%
          </span>
        </div>

        

<div style={tiny}>POSIÇÃO X</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="range" min={-200} max={200} step={0.5}
            value={txOX[role] ?? 0}
            onChange={e => onTxOX(role, parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'rgba(99,200,255,0.85)' }} />
          <span style={{ fontSize:10, color:'#aaa', minWidth:42, textAlign:'right' }}>
            {(txOX[role] ?? 0) > 0 ? '+' : ''}{(txOX[role] ?? 0).toFixed(1)}%
          </span>
        </div>

        

<div style={tiny}>ESPAÇ. LETRA</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="range" min={-50} max={100} step={0.1}
            value={txLS[role] ?? 0}
            onChange={e => onTxLS(role, parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'rgba(249,115,22,0.85)' }} />
          <span style={{ fontSize:10, color:'#aaa', minWidth:42, textAlign:'right' }}>
            {(txLS[role] ?? 0).toFixed(1)}px
          </span>
        </div>

        

<div style={tiny}>ALTURA LINHA</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="range" min={0.3} max={5} step={0.05}
            value={txLH[role] ?? 1.2}
            onChange={e => onTxLH(role, parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'rgba(99,200,255,0.85)' }} />
          <span style={{ fontSize:10, color:'#aaa', minWidth:42, textAlign:'right' }}>
            {(txLH[role] ?? 1.2).toFixed(2)}
          </span>
        </div>

        <div style={tiny}>WIGGLE</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={txWiggle[role] ?? 0}
            onChange={e => onTxWiggle(role, parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'rgba(34,197,94,0.9)' }}
          />
          <span style={{ fontSize:10, color:'#aaa', minWidth:42, textAlign:'right' }}>
            {(txWiggle[role] ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'grid', gap: 10 }}>
        <div style={tiny}>Cor real / degradê</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            type="button"
            onClick={() => patchTextStyle({ useGradient: false })}
            style={seg(!currentTextStyle?.useGradient)}
          >
            Cor sólida
          </button>
          <button
            type="button"
            onClick={() => patchTextStyle({ useGradient: true })}
            style={seg(!!currentTextStyle?.useGradient)}
          >
            Degradê
          </button>
        </div>

        {!currentTextStyle?.useGradient && (
          <>
            <input
              type="color"
              value={currentTextStyle?.color || '#ffffff'}
              onChange={(e) => patchTextStyle({ color: e.target.value })}
              style={{ width: '100%', height: 34, padding: 0, border: 0, background: 'transparent' }}
            />

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {TEXT_FILL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => patchTextStyle({ color })}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    border: (currentTextStyle?.color || '#ffffff') === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                    background: color,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </>
        )}

        {currentTextStyle?.useGradient && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ ...tiny, marginBottom: 5 }}>Cor 1</div>
                <input
                  type="color"
                  value={currentTextStyle?.gradientFrom || '#ffffff'}
                  onChange={(e) => patchTextStyle({ gradientFrom: e.target.value })}
                  style={{ width: '100%', height: 34, padding: 0, border: 0, background: 'transparent' }}
                />
              </div>
              <div>
                <div style={{ ...tiny, marginBottom: 5 }}>Cor 2</div>
                <input
                  type="color"
                  value={currentTextStyle?.gradientTo || '#ff914d'}
                  onChange={(e) => patchTextStyle({ gradientTo: e.target.value })}
                  style={{ width: '100%', height: 34, padding: 0, border: 0, background: 'transparent' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#aaa', fontSize: 11 }}>Ângulo</span>
                <span style={{ color: '#777', fontSize: 10 }}>{Math.round(currentTextStyle?.gradientAngle ?? 90)}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={currentTextStyle?.gradientAngle ?? 90}
                onChange={(e) => patchTextStyle({ gradientAngle: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#ffc857' }}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'grid', gap: 10 }}>
        <div style={tiny}>Contorno</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#aaa', fontSize: 11 }}>Tipo</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['none', 'outer', 'inner'] as TextStrokeMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() =>
                  patchStroke(
                    mode === 'none'
                      ? { mode, width: 0 }
                      : { mode, width: Math.max(strokeWidth, 1.5) }
                  )
                }
                style={seg(currentStroke.mode === mode)}
              >
                {mode === 'none' ? 'Nenhum' : mode === 'outer' ? 'Externo' : 'Interno'}
              </button>
            ))}
          </div>
        </div>

        {currentStroke.mode !== 'none' && (
          <>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#aaa', fontSize: 11 }}>Espessura</span>
                <span style={{ color: '#777', fontSize: 10 }}>{strokeWidth.toFixed(1)}px</span>
              </div>
              <input type="range" min={0} max={24} step={0.1} value={strokeWidth} onChange={(e) => patchStroke({ width: Number(e.target.value) })} style={{ width: '100%', accentColor: '#ffc857' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, marginTop: 8 }}>
                <span style={{ color: '#aaa', fontSize: 11 }}>Força da borda</span>
                <span style={{ color: '#777', fontSize: 10 }}>{Math.round(strokeOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={strokeOpacity}
                onChange={(e) => patchStroke({ opacity: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#ffc857' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, marginTop: 8 }}>
                <span style={{ color: '#aaa', fontSize: 11 }}>Preenchimento</span>
                <span style={{ color: '#777', fontSize: 10 }}>{Math.round(strokeFillOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.005}
                value={strokeFillOpacity}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  patchStroke({ fillOpacity: value });
                }}
                style={{ width: '100%', accentColor: '#ffc857' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button type="button" onClick={() => patchStroke({ fillKind: 'solid' })} style={seg(currentStroke.fillKind === 'solid')}>Cor sólida</button>
              <button type="button" onClick={() => patchStroke({ fillKind: 'gradient' })} style={seg(currentStroke.fillKind === 'gradient')}>Degradê</button>
            </div>

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => patchStroke({ color, gradientFrom: color })}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    border: currentStroke.color === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                    background: color,
                    cursor: 'pointer',
                  }}
                />
              ))}
              <input type="color" value={currentStroke.color} onChange={(e) => patchStroke({ color: e.target.value })} style={{ width: 26, height: 26, padding: 0, border: 0, background: 'transparent' }} />
            </div>

            {currentStroke.fillKind === 'gradient' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="color" value={currentStroke.gradientFrom || '#ffc857'} onChange={(e) => patchStroke({ gradientFrom: e.target.value })} />
                <input type="color" value={currentStroke.gradientTo || '#ff4d6d'} onChange={(e) => patchStroke({ gradientTo: e.target.value })} />
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#666' }}>⌕</span>
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite ou aperte uma letra..."
          style={{
            width: '100%',
            height: 34,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ddd',
            padding: '0 34px 0 32px',
            borderRadius: 8,
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#555', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: 4 }}>
          {query ? query[0]?.toUpperCase() : 'B'}
        </span>
      </div>

      {favoriteFonts.length > 0 && !query && (
        <>
          <div style={tiny}>⭐ Favoritas</div>
          <div style={{ display: 'grid', gap: 5 }}>
            {favoriteFonts.slice(0, 12).map((font) => (
              <FontRow key={font.id} font={font} favorite />
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={tiny}>{query ? `Resultados · ${resultFonts.length}` : `Todas · ${allFonts.length}`}</span>
        <span style={{ color: '#555', fontSize: 9 }}>scroll ↓</span>
      </div>

      <div style={{ display: 'grid', gap: 5, maxHeight: 250, overflowY: 'auto', paddingRight: 4, maskImage: 'linear-gradient(to bottom, black 86%, transparent)' }}>
        {resultFonts.map((font) => (
          <FontRow key={font.id} font={font} favorite={favoriteIds.includes(font.id)} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => uploadInputRef.current?.click()}
        style={{
          height: 34,
          borderRadius: 9,
          border: '1px dashed rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.025)',
          color: '#aaa',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        + Subir fonte (TTF/OTF/WOFF)
      </button>
      <input ref={uploadInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={uploadFont} style={{ display: 'none' }} />

    </div>
  );
}
