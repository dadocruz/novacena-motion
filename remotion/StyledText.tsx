import React from 'react';
import type { TextStroke } from './types';

export type TextTransitionForStyledText = {
  wrapStyle?: React.CSSProperties;
  charStyle?: React.CSSProperties;
  split?: 'char' | 'word';
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
  previewMode?: boolean;
};

const PREVIEW_VISIBILITY_OPACITY = 0.34;
const INVISIBLE_OPACITY_THRESHOLD = 0.02;

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
  if (!style) return false;
  if (style.useGradient === false || style.fillKind === 'solid') return false;
  if (style.useGradient === true || style.fillKind === 'gradient') return true;

  return false;
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
    const from = colorToRgba(style?.gradientFrom ?? style?.gradientColor1 ?? style?.color ?? '#ffffff', fillOpacity);
    const to = colorToRgba(style?.gradientTo ?? style?.gradientColor2 ?? style?.color ?? '#ffffff', fillOpacity);
    const angle = Number(style?.gradientAngle ?? 90);

    return {
      backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
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

  const cssWidth = stroke.mode === 'outer' && width > 3 ? Math.max(1.5, width * 0.58) : width;
  const shadowWidth = stroke.mode === 'outer' ? Math.max(0, width - cssWidth) : 0;

  return {
    WebkitTextStroke: `${cssWidth}px ${color}`,
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    paintOrder: 'stroke fill',
    textShadow: shadowWidth > 0 ? buildStrokeShadow(color, shadowWidth) : undefined,
  };
}

function buildStrokeShadow(color: string, spread: number): string {
  const radius = Math.max(0.5, spread);
  const half = radius * 0.72;
  const points = [
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [half, half],
    [-half, half],
    [half, -half],
    [-half, -half],
  ];

  return points.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${color}`).join(', ');
}

function getPreviewSafeWrapStyle(
  wrapStyle: React.CSSProperties | undefined,
  previewMode: boolean
): React.CSSProperties {
  const next = { ...(wrapStyle ?? {}) };

  if (!previewMode) return next;

  const opacity = Number((next as any).opacity);
  const isInvisible = Number.isFinite(opacity) && opacity <= INVISIBLE_OPACITY_THRESHOLD;

  if (!isInvisible) return next;

  next.opacity = PREVIEW_VISIBILITY_OPACITY;

  if (typeof next.clipPath === 'string') {
    next.clipPath = 'none';
  }

  if (typeof (next as any).WebkitClipPath === 'string') {
    (next as any).WebkitClipPath = 'none';
  }

  return next;
}

function getOpacity(style: React.CSSProperties): number {
  const opacity = Number((style as any).opacity);
  return Number.isFinite(opacity) ? opacity : 1;
}

function getPreviewSafeCharStyle(
  charStyle: React.CSSProperties,
  previewMode: boolean
): React.CSSProperties {
  if (!previewMode) return charStyle;

  const opacity = getOpacity(charStyle);

  if (opacity >= PREVIEW_VISIBILITY_OPACITY) {
    return charStyle;
  }

  return {
    ...charStyle,
    opacity: PREVIEW_VISIBILITY_OPACITY,
  };
}

function renderLines(
  text: string,
  transition?: TextTransitionForStyledText,
  preserveFontShape = false,
  previewMode = false,
  characterBaseStyle?: React.CSSProperties
) {
  const lines = String(text ?? '').split(/\r?\n/);

  return lines.map((line, lineIndex) => {
    const shouldSplit = Boolean(transition?.perChar && !preserveFontShape);
    const splitMode = transition?.split ?? 'char';
    const chars = Array.from(line);
    const wordTokens = line.match(/\S+|\s+/g) ?? [];
    const wordTotal = wordTokens.filter((token) => /\S/.test(token)).length;
    const charStyles = shouldSplit && splitMode === 'char'
      ? chars.map((_, charIndex) => ({
          ...(characterBaseStyle ?? {}),
          ...(transition?.charStyle ?? {}),
          ...(transition?.perChar?.(charIndex, chars.length) ?? {}),
        }))
      : shouldSplit && splitMode === 'word'
        ? wordTokens
            .filter((token) => /\S/.test(token))
            .map((_, wordIndex) => ({
              ...(characterBaseStyle ?? {}),
              ...(transition?.charStyle ?? {}),
              ...(transition?.perChar?.(wordIndex, wordTotal) ?? {}),
            }))
        : [];
    const previewNeedsFloor =
      previewMode &&
      charStyles.length > 0 &&
      Math.max(...charStyles.map(getOpacity)) <= INVISIBLE_OPACITY_THRESHOLD;

    let wordIndex = -1;

    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {shouldSplit && splitMode === 'char'
          ? chars.map((char, charIndex) => (
              <span
                key={`char-${lineIndex}-${charIndex}`}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'pre',
                  ...getPreviewSafeCharStyle(charStyles[charIndex], previewMode),
                  ...(previewNeedsFloor ? { opacity: PREVIEW_VISIBILITY_OPACITY } : {}),
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))
          : shouldSplit && splitMode === 'word'
            ? wordTokens.map((token, tokenIndex) => {
                const isWord = /\S/.test(token);
                const styleIndex = isWord ? ++wordIndex : -1;
                const tokenStyle = isWord
                  ? getPreviewSafeCharStyle(charStyles[styleIndex], previewMode)
                  : {
                      ...(characterBaseStyle ?? {}),
                      whiteSpace: 'pre',
                    };

                return (
                  <span
                    key={`word-${lineIndex}-${tokenIndex}`}
                    style={{
                      display: isWord ? 'inline-block' : 'inline',
                      whiteSpace: 'pre',
                      ...tokenStyle,
                      ...(isWord && previewNeedsFloor ? { opacity: PREVIEW_VISIBILITY_OPACITY } : {}),
                    }}
                  >
                    {token.replace(/ /g, '\u00A0')}
                  </span>
                );
              })
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
  previewMode = false,
}: StyledTextProps) {
  const strokeCss = getStrokeCss(stroke);
  const fillCss = getFillCss(style, stroke);
  const wrapStyle = getPreviewSafeWrapStyle(transition?.wrapStyle, previewMode);
  const fillContent = renderLines(text, transition, preserveFontShape, previewMode, fillCss);
  const strokeContent = strokeCss
    ? renderLines(text, transition, preserveFontShape, previewMode, strokeCss)
    : null;

  const outerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    whiteSpace: 'pre-line',
    ...wrapStyle,
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
          {strokeContent}
        </span>

        <span
          style={{
            ...fillCss,
            position: 'relative',
            zIndex: 1,
            whiteSpace: 'pre-line',
          }}
        >
          {fillContent}
        </span>
      </span>
    );
  }

  return (
    <span style={outerStyle}>
      <span
        style={{
          ...fillCss,
          whiteSpace: 'pre-line',
        }}
      >
        {fillContent}
      </span>
    </span>
  );
}
