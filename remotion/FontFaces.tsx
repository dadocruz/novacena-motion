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
  const lower = String(file || '').toLowerCase();

  if (lower.includes('font/ttf') || lower.endsWith('.ttf')) return 'truetype';
  if (lower.includes('font/otf') || lower.endsWith('.otf')) return 'opentype';
  if (lower.includes('font/woff2') || lower.endsWith('.woff2')) return 'woff2';
  if (lower.includes('font/woff') || lower.endsWith('.woff')) return 'woff';

  return 'opentype';
}

function escapeCss(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function fontUrl(file: string) {
  const raw = String(file || '');

  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/api/uploads/user-fonts/')) return raw;
  if (raw.startsWith('/uploads/user-fonts/')) return raw.replace(/^\/uploads/, '/api/uploads');
  if (raw.startsWith('public/uploads/user-fonts/')) {
    return `/api/uploads/user-fonts/${encodeURIComponent(raw.split('/').pop() || '')}`;
  }

  return `/api/uploads/user-fonts/${encodeURIComponent(raw.replace(/^\/+/, '').split('/').pop() || raw)}`;
}

export const FontFaces: React.FC<Props> = ({ fonts = [], activeFontIds = [] }) => {
  const active = new Set(activeFontIds.filter(Boolean));

  const selectedFonts = fonts.filter((font) => {
    if (!font?.id || !font?.family || !font?.file) return false;
    if (active.size === 0) return true;
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
      const file = fontUrl(font.file);
      const format = fontFormat(font.file);

      return `
@font-face {
  font-family: '${family}';
  src: url('${file}') format('${format}');
  font-weight: ${font.weight || 700};
  font-style: normal;
  font-display: block;
}`;
    })
    .join('\n');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
