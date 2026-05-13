import React from 'react';

type FontFaceDef = {
  id: string;
  label: string;
  file: string;
  family: string;
  weight: number;
  category: 'display' | 'sans' | 'special';
  vibe: string;
};

type Props = {
  fonts?: FontFaceDef[];
  activeFontIds?: string[];
};

function fontFormat(file: string) {
  const lower = file.toLowerCase();
  if (lower.endsWith('.ttf')) return 'truetype';
  if (lower.endsWith('.otf')) return 'opentype';
  if (lower.endsWith('.woff2')) return 'woff2';
  return 'woff';
}

function escapeCss(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export const FontFaces: React.FC<Props> = ({ fonts = [], activeFontIds = [] }) => {
  const active = new Set(activeFontIds.filter(Boolean));

  const selectedFonts = fonts.filter((font) => {
    if (!font?.id || !font?.family || !font?.file) return false;
    if (active.size === 0) return false;
    return active.has(font.id);
  });

  if (!selectedFonts.length) return null;

  const seen = new Set<string>();
  const uniqueFonts = selectedFonts.filter((font) => {
    if (seen.has(font.family)) return false;
    seen.add(font.family);
    return true;
  });

  const css = uniqueFonts
    .map((font) => {
      const family = escapeCss(font.family);
      const file = encodeURIComponent(font.file);
      const format = fontFormat(font.file);

      return `
@font-face {
  font-family: '${family}';
  src: url('/api/uploads/user-fonts/${file}') format('${format}');
  font-weight: ${font.weight || 700};
  font-style: normal;
  font-display: block;
}`;
    })
    .join('\n');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
