import type React from 'react';

export const topbarStyle: React.CSSProperties = {
  gridArea: 'topbar',
  background: 'var(--bg-1)', borderBottom: '1px solid var(--border-1)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '0 22px', gap: 12,
  minWidth: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
};

export const separator: React.CSSProperties = {
  width: 1, height: 22, background: 'var(--border-2)',
};

export const topTab: React.CSSProperties = {
  padding: '6px 14px', background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 13, fontWeight: 600, borderRadius: 6,
};

export const topTabActive: React.CSSProperties = {
  ...topTab, background: 'var(--surface-active)', color: 'var(--text-1)',
};

export const leftSidebar: React.CSSProperties = {
  gridArea: 'left', background: 'var(--bg-1)',
  borderRight: '1px solid var(--border-1)',
  display: 'flex', flexDirection: 'column',
  overflowY: 'auto', overflowX: 'hidden',
  height: '100%', minHeight: 0,
};

export const rightSidebar: React.CSSProperties = {
  gridArea: 'right', background: 'var(--bg-1)',
  borderLeft: '1px solid var(--border-1)',
  display: 'flex', flexDirection: 'column',
  overflowY: 'auto', overflowX: 'hidden',
  height: '100%', minHeight: 0,
};

export const centerStyle: React.CSSProperties = {
  gridArea: 'center', background: 'var(--bg-0)',
  padding: 'clamp(14px, 1.6vw, 28px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 16,
  overflowY: 'auto', overflowX: 'hidden',
  height: '100%', minHeight: 0,
};

export const previewToolbarStyle: React.CSSProperties = {
  display: 'flex', gap: 12, alignItems: 'center',
};

export const renderBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
  maxWidth: 620,
};

export const downloadVideoBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  border: 'none',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 38,
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #22c55e, #14b8a6)',
  color: '#05130d',
};

export const downloadVideoWideBtnStyle: React.CSSProperties = {
  ...downloadVideoBtnStyle,
  width: 'min(420px, 100%)',
  marginTop: 8,
  padding: '12px 18px',
  fontSize: 14,
};

export const gridTwoCols: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8,
};

export const uploadCardStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 10,
  background: 'var(--surface-1)', border: '1px solid var(--border-1)', borderRadius: 12,
};

export const uploadCardStyleSmall: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  background: 'var(--surface-1)', border: '1px dashed var(--border-2)',
  borderRadius: 8, color: 'var(--text-2)', fontSize: 12, textAlign: 'center',
};

export const uploadThumbStyle: React.CSSProperties = {
  width: 46, height: 46, borderRadius: 8, background: 'var(--bg-2)',
  overflow: 'hidden', flexShrink: 0,
};

export const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '11px 16px',
  background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
  border: 'none', borderRadius: 10, color: '#fff', fontSize: 13,
  fontWeight: 700, boxShadow: '0 8px 24px var(--brand-glow)',
};

export const renderBtnStyle: React.CSSProperties = {
  padding: '10px 18px', background: 'var(--text-1)', color: 'var(--bg-0)',
  border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
};

export const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 14px', background: 'var(--surface-1)',
  color: 'var(--text-2)', border: '1px solid var(--border-1)',
  borderRadius: 10, fontWeight: 600, fontSize: 13,
};

export const chip: React.CSSProperties = {
  padding: '7px 14px', background: 'var(--bg-2)',
  border: '1px solid var(--border-1)', borderRadius: 10,
  color: 'var(--text-3)', fontSize: 12, fontWeight: 600,
};

export const chipActive: React.CSSProperties = {
  ...chip, background: 'var(--surface-active)',
  border: '1px solid var(--border-3)', color: 'var(--text-1)',
};

export const resetBtnStyle: React.CSSProperties = {
  width: 32, height: 32, background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 8,
  color: 'var(--text-2)', fontSize: 16,
};

export const miniLabel: React.CSSProperties = {
  fontSize: 10, letterSpacing: 1.4, color: 'var(--text-3)',
  textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
};

export const miniInputLabel: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-3)', marginBottom: 5, fontWeight: 500, display: 'block',
};

export const fieldInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 8,
  color: 'var(--text-1)', fontSize: 12, outline: 'none',
  colorScheme: 'dark',
};

export const segBtn: React.CSSProperties = {
  padding: '7px 0', fontSize: 11, fontWeight: 600,
  border: '1px solid var(--border-1)', background: 'var(--surface-1)',
  color: 'var(--text-3)', borderRadius: 7,
};

export const segBtnActive: React.CSSProperties = {
  ...segBtn, background: 'var(--surface-active)',
  border: '1px solid var(--border-3)', color: 'var(--text-1)',
};

export const dashedUpload: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface-1)', border: '1px dashed var(--border-2)',
  borderRadius: 8, color: 'var(--text-2)', fontSize: 12, textAlign: 'left',
};

export const linkBtnDanger: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--danger)',
  fontSize: 11, cursor: 'pointer', padding: 0,
};

export const userFontRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 8px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 6, marginBottom: 4,
};

export const overlayLibraryRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 8px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 6, marginBottom: 4,
};

export const tinyAddBtn: React.CSSProperties = {
  padding: '3px 8px', background: 'var(--brand)', color: '#fff',
  border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 600,
};

export const tinyDelBtn: React.CSSProperties = {
  padding: '3px 7px', background: 'transparent',
  border: '1px solid var(--border-2)', color: 'var(--danger)',
  borderRadius: 5, fontSize: 11, fontWeight: 700, marginLeft: 4,
};

export const platformLogoRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 10px', marginBottom: 6,
  background: 'var(--surface-1)',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
};

export const colorInputStyle: React.CSSProperties = {
  width: '100%', height: 32, background: 'transparent',
  border: '1px solid var(--border-1)', borderRadius: 6,
  padding: 0, cursor: 'pointer',
};

export const textBoxGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 6,
};

export const miniNumberInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 7px',
  marginTop: 2,
  background: 'var(--bg-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 6,
  color: 'var(--text-1)',
  fontSize: 11,
  outline: 'none',
};

export const tinyNumInput: React.CSSProperties = {
  width: 56, padding: '4px 6px',
  background: 'var(--surface-1)', border: '1px solid var(--border-1)',
  borderRadius: 4, color: 'var(--text-1)', fontSize: 11, outline: 'none',
};

export const tinySelect: React.CSSProperties = {
  padding: '4px 6px', background: 'var(--surface-1)',
  border: '1px solid var(--border-1)', borderRadius: 4,
  color: 'var(--text-1)', fontSize: 11, outline: 'none',
  colorScheme: 'dark',
};

export const photoDelBtn: React.CSSProperties = {
  position: 'absolute', top: 2, right: 2, width: 18, height: 18,
  border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff',
  borderRadius: 999, fontSize: 11, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export const logBoxStyle: React.CSSProperties = {
  marginTop: 8, padding: 14, background: 'var(--bg-2)',
  border: '1px solid var(--border-1)', borderRadius: 10,
  color: 'var(--text-2)', fontSize: 11, maxHeight: 220,
  overflow: 'auto', lineHeight: 1.5,
};
