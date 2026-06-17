'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { trackWhatsAppClick } from '../../src/lib/tracking';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

function isWhatsAppHref(href: string) {
  return /(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp:)/i.test(href);
}

export default function GoogleTagManager() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || !isWhatsAppHref(anchor.href)) return;
      if (anchor.dataset.trackManualWhatsapp === 'true') return;

      const location =
        anchor.dataset.trackingLocation ||
        anchor.getAttribute('aria-label') ||
        anchor.textContent?.trim() ||
        anchor.href;

      trackWhatsAppClick(location || 'whatsapp_link');
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!GTM_ID) return null;

  return (
    <>
      <Script
        id="novacena-gtm"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
