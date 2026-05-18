import React from 'react';
import type { TextStroke } from './types';

export type TextTransitionForStyledText = {
  wrapStyle?: React.CSSProperties;
  charStyle?: React.CSSProperties;
  perChar?: (index: number, total: number) => React.CSSProperties;
};

export type StyledTextStyle = {
  color?: string;
  useGradient?: boolean;
  fillKind?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  fillOpacity?: number;
  textOpacity?: number;
  opacityFill?: number;
  fillAlpha?: number;
  opacity?: number;
};

type StyledTextProps = {
  text: string;
  transition?: TextTransitionForStyledText;
  style?: StyledTextStyle | any;
  stroke?: TextStroke | any;
  preserveFontShape?: boolean;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value > 1) return Math.max(0, Math.min(100, value)) / 100;
  return Math.max(0, Math.min(1, value));
}

function getFillOpacity(style?: any, stroke?: any): number {
  const raw =
    style?.fillOpacity ??
    style?.textOpacity ??
    style?.opacityFill ??
    style?.fillAlpha ??
    stroke?.fillOpacity ??
    stroke?.textOpacity ??
    stroke?.opacityFill ??
    stroke?.fillAlpha ??
    1;

  return clamp01(Number(raw));
}

function hasGradient(style?: any): boolean {
  return Boolean(
    style?.useGradient ||
    style?.fillKind === 'gradient' ||
    (style?.gradientFrom && style?.gradientTo) ||
    (style?.gradientColor1 && style?.gradientColor2)
  );
}

function colorToRgba(input: string | undefined, alpha: number): string {
  const a = clamp01(alpha);
  if (!input) return `rgba(255,255,255,${a})`;

  const color = String(input).trim();

  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\(([^)]+)\)/, (_, inner) => {
      const parts = String(inner).split(',').map((v) => v.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
    });
  }

  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
  }

  const hex = color.replace('#', '');

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return color;
}

function getFillCss(style?: any, stroke?: any): React.CSSProperties {
  const fillOpacity = getFillOpacity(style, stroke);

  if (hasGradient(style)) {
    const from = style?.gradientFrom ?? style?.gradientColor1 ?? style?.color ?? '#ffffff';
    const to = style?.gradientTo ?? style?.gradientColor2 ?? style?.color ?? '#ffffff';
    const angle = Number(style?.gradientAngle ?? 90);

    return {
      backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      opacity: fillOpacity,
      display: 'inline-block',
    };
  }

  const color = colorToRgba(style?.color ?? '#ffffff', fillOpacity);

  return {
    color,
    WebkitTextFillColor: color,
    display: 'inline-block',
  };
}

function getStrokeCss(stroke?: any): React.CSSProperties | null {
  if (!stroke || stroke.mode === 'none') return null;

  const width = Number(stroke.width ?? 0);
  const opacity = clamp01(Number(stroke.opacity ?? 1));

  if (!Number.isFinite(width) || width <= 0 || opacity <= 0) return null;

  const color = colorToRgba(
    stroke.fillKind === 'gradient'
      ? stroke.gradientFrom || stroke.gradientTo || stroke.color || '#ffffff'
      : stroke.color || stroke.gradientFrom || '#ffffff',
    opacity
  );

  return {
    WebkitTextStroke: `${width}px ${color}`,
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    paintOrder: 'stroke fill',
    textShadow: width >= 2 ? `0 0 ${Math.max(2, width * 1.25)}px ${color}` : undefined,
  };
}

function renderLines(
  text: string,
  transition?: TextTransitionForStyledText,
  preserveFontShape = false
) {
  const lines = String(text ?? '').split(/\r?\n/);

  return lines.map((line, lineIndex) => {
    const shouldSplit = Boolean(transition?.perChar && !preserveFontShape);

    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {shouldSplit
          ? line.split('').map((char, charIndex, chars) => (
              <span
                key={`char-${lineIndex}-${charIndex}`}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'pre',
                  ...transition?.charStyle,
                  ...(() => {
                    const s = transition?.perChar?.(charIndex, chars.length) ?? {};
                    const opacity = Number((s as any).opacity);

                    // MODO SEGURO:
                    // Algumas transições por letra começam com opacity 0.
                    // Isso fazia headline/CTA sumirem no preview e parecer que a transição quebrou.
                    // Mantemos movimento/rotação/escala, mas nunca deixamos a letra invisível.
                    if (Number.isFinite(opacity) && opacity <= 0.02) {
                      return { ...s, opacity: 1 };
                    }

                    return s;
                  })(),
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))
          : line}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </React.Fragment>
    );
  });
}

export function StyledText({
  text,
  transition,
  style,
  stroke,
  preserveFontShape = false,
}: StyledTextProps) {
  const strokeCss = getStrokeCss(stroke);
  const fillCss = getFillCss(style, stroke);

  const content = renderLines(text, transition, preserveFontShape);

  const outerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    whiteSpace: 'pre-line',
  };

  if (strokeCss) {
    return (
      <span style={outerStyle}>
        <span
          aria-hidden
          style={{
            ...strokeCss,
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            whiteSpace: 'pre-line',
          }}
        >
          {content}
        </span>

        <span
          style={{
            ...fillCss,
            position: 'relative',
            zIndex: 1,
            whiteSpace: 'pre-line',
          }}
        >
          {content}
        </span>
      </span>
    );
  }

  return (
    <span
      style={{
        ...outerStyle,
        ...fillCss,
      }}
    >
      {content}
    </span>
  );
}
