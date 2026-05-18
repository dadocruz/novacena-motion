import React from 'react';
import type { TextStroke } from './types';
import type { TextTransitionStyle } from './motionEngine';

export type StyledTextStyle = {
  color?: string;
  useGradient?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  fillOpacity?: number;
  opacity?: number;
};

type StyledTextProps = {
  text: string;
  transition: TextTransitionStyle;
  style?: StyledTextStyle;
  stroke?: TextStroke | any;
  freeze?: boolean;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value > 1) return Math.max(0, Math.min(100, value)) / 100;
  return Math.max(0, Math.min(1, value));
}

function getFillOpacity(style?: StyledTextStyle, stroke?: any): number {
  const raw =
    style?.fillOpacity ??
    style?.opacity ??
    stroke?.fillOpacity ??
    1;

  return clamp01(Number(raw));
}

function hasGradient(style?: StyledTextStyle): boolean {
  if (!style) return false;
  return Boolean(
    style.useGradient ||
    (style.gradientFrom && style.gradientTo) ||
    (style.gradientColor1 && style.gradientColor2)
  );
}

function hexToRgba(input: string | undefined, alpha: number): string {
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

function getGradient(style?: StyledTextStyle): string | null {
  if (!style || !hasGradient(style)) return null;

  const from = style.gradientFrom ?? style.gradientColor1 ?? style.color ?? '#ffffff';
  const to = style.gradientTo ?? style.gradientColor2 ?? style.color ?? '#ffffff';
  const angle = Number(style.gradientAngle ?? 90);

  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

function getFillStyle(style?: StyledTextStyle, stroke?: any): React.CSSProperties {
  const fillOpacity = getFillOpacity(style, stroke);
  const gradient = getGradient(style);

  if (gradient) {
    return {
      backgroundImage: gradient,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      opacity: fillOpacity,
      display: 'inline-block',
    };
  }

  const color = hexToRgba(style?.color ?? '#ffffff', fillOpacity);

  return {
    color,
    WebkitTextFillColor: color,
    display: 'inline-block',
  };
}

function getStrokeStyle(stroke?: TextStroke | any): React.CSSProperties | null {
  if (!stroke || stroke.mode === 'none') return null;

  const width = Number(stroke.width ?? 0);
  const opacity = clamp01(Number(stroke.opacity ?? 1));

  if (!Number.isFinite(width) || width <= 0 || opacity <= 0) return null;

  const baseColor =
    stroke.fillKind === 'gradient'
      ? stroke.gradientFrom || stroke.gradientTo || stroke.color || '#ffffff'
      : stroke.color || stroke.gradientFrom || '#ffffff';

  const color = hexToRgba(baseColor, opacity);

  return {
    WebkitTextStroke: `${width}px ${color}`,
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    paintOrder: 'stroke fill',
    textShadow: width >= 2 ? `0 0 ${Math.max(2, width * 1.25)}px ${color}` : 'none',
  } as React.CSSProperties;
}

function renderContent(text: string, transition: TextTransitionStyle, freeze: boolean) {
  const lines = String(text ?? '').split(/\r?\n/);

  return lines.map((line, lineIndex) => {
    if (transition.perChar && !freeze) {
      const chars = line.split('');

      return (
        <React.Fragment key={`line-${lineIndex}`}>
          {chars.map((char, charIndex) => (
            <span
              key={`char-${lineIndex}-${charIndex}`}
              style={transition.perChar!(charIndex, chars.length)}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {line}
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
  freeze = false,
}: StyledTextProps) {
  const strokeCss = getStrokeStyle(stroke);
  const fillCss = getFillStyle(style, stroke);
  const content = renderContent(text, transition, freeze);

  if (strokeCss) {
    return (
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span
          aria-hidden
          style={{
            ...strokeCss,
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          {content}
        </span>

        <span
          style={{
            ...fillCss,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {content}
        </span>
      </span>
    );
  }

  return <span style={fillCss}>{content}</span>;
}
