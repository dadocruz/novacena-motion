'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

const STORAGE_KEY = 'novacena:cookieConsent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={bar}>
      <p style={text}>
        Este site utiliza cookies para melhorar sua experiência.
        Ao continuar navegando, você concorda com nossa{' '}
        <a href="/politica-de-privacidade" style={link}>Política de Privacidade</a>.
      </p>
      <div style={buttons}>
        <button onClick={decline} style={btnDecline}>Recusar</button>
        <button onClick={accept} style={btnAccept}>Aceitar</button>
      </div>
    </div>
  );
}

const bar: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 20,
  padding: '16px 24px',
  background: 'rgba(12,14,20,0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const text: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: 'rgba(255,255,255,0.55)',
  lineHeight: 1.5,
  maxWidth: 600,
};

const link: CSSProperties = {
  color: '#5eead4',
  textDecoration: 'underline',
};

const buttons: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexShrink: 0,
};

const btnDecline: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnAccept: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#5eead4',
  color: '#000',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
