import React from 'react';
import type { PlatformName } from './types';

type Props = {
  name: PlatformName;
  size?: number;
  variant?: 'badge' | 'icon';
};

const COLORS: Record<PlatformName, string> = {
  Spotify: '#1DB954',
  Deezer: '#A238FF',
  'Apple Music': '#FA243C',
  'YouTube Music': '#FF0000',
  YouTube: '#FF0000',
};

export const PlatformLogo: React.FC<Props> = ({ name, size = 82, variant = 'badge' }) => {
  const color = COLORS[name];
  const label = name === 'YouTube Music' ? 'YT Music' : name;

  if (variant === 'icon') {
    return <IconOnly name={name} size={size} color={color} />;
  }

  return (
    <div
      style={{
        height: size,
        minWidth: size * 2.45,
        padding: '0 24px',
        borderRadius: size / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        background: 'rgba(255,255,255,0.94)',
        boxShadow: '0 16px 35px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.35)',
      }}
    >
      <IconOnly name={name} size={size * 0.48} color={color} />
      <span
        style={{
          color: '#111',
          fontWeight: 900,
          fontSize: size * 0.25,
          letterSpacing: -0.3,
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, -apple-system, Arial',
        }}
      >
        {label}
      </span>
    </div>
  );
};

const IconOnly: React.FC<{ name: PlatformName; size: number; color: string }> = ({ name, size, color }) => {
  if (name === 'Spotify') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill={color} />
        <path d="M28 39c17-5 36-3 49 5" stroke="#06150A" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M31 52c14-4 29-2 40 4" stroke="#06150A" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M34 64c10-3 22-2 30 3" stroke="#06150A" strokeWidth="6" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (name === 'Deezer') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="8" y="55" width="15" height="24" rx="3" fill="#FFCC00" />
        <rect x="27" y="43" width="15" height="36" rx="3" fill="#FF6600" />
        <rect x="46" y="31" width="15" height="48" rx="3" fill="#E91E63" />
        <rect x="65" y="20" width="15" height="59" rx="3" fill="#673AB7" />
        <rect x="84" y="50" width="8" height="29" rx="3" fill="#00BCD4" />
      </svg>
    );
  }
  if (name === 'Apple Music') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`apple-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FB5A7B" />
            <stop offset="1" stopColor="#FA243C" />
          </linearGradient>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="24" fill={`url(#apple-${size})`} />
        <path d="M62 24v43c0 9-7 15-16 15-8 0-14-5-14-12 0-8 7-13 16-13 3 0 6 1 8 2V31l28-6v12l-22 5z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={color} />
      <circle cx="50" cy="50" r="28" fill="#fff" />
      <path d="M44 36l24 14-24 14z" fill={color} />
    </svg>
  );
};
