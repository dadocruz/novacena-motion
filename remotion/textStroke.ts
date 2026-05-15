import type { TextStroke } from './types';

const hexToRgba = (input: string | undefined, opacity = 1) => {
  const fallback = `rgba(255,255,255,${opacity})`;
  if (!input) return fallback;

  const value = String(input).trim();

  if (value.startsWith('rgba(') || value.startsWith('rgb(')) {
    return value;
  }

  const hex = value.replace('#', '');

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return value;
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getStrokeColor = (stroke?: TextStroke | any) => {
  if (!stroke) return '#ffffff';

  if (stroke.fillKind === 'gradient') {
    return stroke.gradientFrom || stroke.gradientTo || stroke.color || '#ffffff';
  }

  return stroke.color || stroke.gradientFrom || stroke.gradientTo || '#ffffff';
};

export const textStrokeStyle = (stroke?: TextStroke | any): React.CSSProperties => {
  if (!stroke || stroke.mode === 'none') return {};

  const width = Number(stroke.width ?? 0);
  const opacity = Number(stroke.opacity ?? 1);

  if (!Number.isFinite(width) || width <= 0 || opacity <= 0) return {};

  const color = hexToRgba(getStrokeColor(stroke), opacity);
  const strokeWidth = Math.max(1, width);

  // Glow forte o suficiente para perceber no preview pequeno.
  const glow1 = Math.max(2, strokeWidth * 1.2);
  const glow2 = Math.max(6, strokeWidth * 2.8);
  const glow3 = Math.max(12, strokeWidth * 5);

  const common: React.CSSProperties = {
    WebkitTextStroke: `${strokeWidth}px ${color}`,
    textShadow: [
      `0 0 ${glow1}px ${color}`,
      `0 0 ${glow2}px ${color}`,
      `0 0 ${glow3}px ${color}`,
    ].join(', '),
    filter: `drop-shadow(0 0 ${glow2}px ${color})`,
  };

  if (stroke.mode === 'inner') {
    return {
      ...common,
      paintOrder: 'fill stroke',
    } as React.CSSProperties;
  }

  return {
    ...common,
    paintOrder: 'stroke fill',
  } as React.CSSProperties;
};


function clamp01(value: number) {
  if (!Number.isFinite(value)) return 1;
  if (value > 1) return Math.max(0, Math.min(100, value)) / 100;
  return Math.max(0, Math.min(1, value));
}

function colorWithAlpha(color: string | undefined, alphaRaw: number | undefined) {
  const alpha = clamp01(Number(alphaRaw ?? 1));
  const fallback = `rgba(255,255,255,${alpha})`;
  if (!color) return fallback;

  const c = String(color).trim();

  if (c.startsWith('rgba(')) {
    return c.replace(/rgba\(([^)]+)\)/, (_m, inner) => {
      const parts = String(inner).split(',').map((v) => v.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
  }

  if (c.startsWith('rgb(')) {
    return c.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }

  const hex = c.replace('#', '');

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return c;
}

export const textFillStyle = (stroke?: TextStroke | any): React.CSSProperties => {
  if (!stroke) return {};

  const enabled =
    stroke.type === 'external' ||
    stroke.type === 'internal' ||
    stroke.type === 'both' ||
    stroke.enabled === true ||
    stroke.mode === 'external' ||
    stroke.mode === 'internal';

  const fillOpacity =
    stroke.fillOpacity ??
    stroke.fillAlpha ??
    stroke.textFillOpacity ??
    stroke.opacityFill ??
    stroke.opacity ??
    1;

  const fillColor =
    stroke.fillColor ??
    stroke.textColor ??
    stroke.color ??
    stroke.primaryColor ??
    '#FFFFFF';

  // Importante:
  // NÃO usar opacity aqui, porque opacity apaga preenchimento + contorno juntos.
  // Photoshop-like: só o miolo da fonte fica transparente.
  if (!enabled && Number(fillOpacity) >= 1) return {};

  const fill = colorWithAlpha(fillColor, Number(fillOpacity));

  return {
    color: fill,
    WebkitTextFillColor: fill,
  } as React.CSSProperties;
};
