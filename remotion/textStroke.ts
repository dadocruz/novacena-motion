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

export const textFillStyle = (stroke?: TextStroke | any): React.CSSProperties => {
  if (!stroke) return {};

  // Não usamos opacity aqui porque opacity apagaria o texto inteiro,
  // inclusive contorno/brilho. O preenchimento real já é controlado
  // pela cor/degradê do texto.
  return {};
};
