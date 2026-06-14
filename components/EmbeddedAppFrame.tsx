'use client';

import type { SyntheticEvent } from 'react';

type EmbeddedAppFrameProps = {
  src: string;
  title: string;
};

export default function EmbeddedAppFrame({ src, title }: EmbeddedAppFrameProps) {
  function promoteNestedNavigation(event: SyntheticEvent<HTMLIFrameElement>) {
    const frame = event.currentTarget;

    try {
      const frameLocation = frame.contentWindow?.location;
      if (!frameLocation || frameLocation.pathname === src) return;

      window.location.assign(
        `${frameLocation.pathname}${frameLocation.search}${frameLocation.hash}`
      );
    } catch {
      // Cross-origin pages, such as Google OAuth, cannot be inspected here.
    }
  }

  return (
    <iframe
      src={src}
      onLoad={promoteNestedNavigation}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
      }}
      title={title}
    />
  );
}
