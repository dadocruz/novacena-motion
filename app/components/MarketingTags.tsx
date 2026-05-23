import Script from 'next/script';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

const GOOGLE_TAG_IDS = Array.from(new Set([GA_ID, GOOGLE_ADS_ID].filter(Boolean)));

export default function MarketingTags() {
  return (
    <>
      {GTM_ID && (
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
      )}

      {GOOGLE_TAG_IDS.length > 0 && (
        <>
          <Script
            id="novacena-google-tag-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_IDS[0]}`}
            strategy="afterInteractive"
          />
          <Script
            id="novacena-google-tag"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = window.gtag || gtag;
                gtag('js', new Date());
                ${GOOGLE_TAG_IDS.map((id) => `gtag('config', ${JSON.stringify(id)});`).join('\n')}
              `,
            }}
          />
        </>
      )}

      {META_PIXEL_ID && (
        <>
          <Script
            id="novacena-meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', ${JSON.stringify(META_PIXEL_ID)});
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}
