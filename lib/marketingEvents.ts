type MarketingParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// Conversão do Google Ads no formato "AW-XXXXXXXXX/abcDEFghi" (ID/label).
// Definir NEXT_PUBLIC_MOTION_GOOGLE_ADS_CONVERSION no ambiente para ativar.
const GOOGLE_ADS_PURCHASE_CONVERSION = process.env.NEXT_PUBLIC_MOTION_GOOGLE_ADS_CONVERSION || '';

export function trackMarketingEvent(eventName: string, params: MarketingParams = {}) {
  if (typeof window === 'undefined') return;

  window.dataLayer?.push({ event: eventName, ...params });
  window.gtag?.('event', eventName, params);
  window.fbq?.('track', eventName, params);

  // Google Ads exige um evento 'conversion' com send_to (ID/label) — o evento
  // genérico acima alimenta GA4/GTM, mas não conta como conversão de Ads.
  if (eventName === 'Purchase' && GOOGLE_ADS_PURCHASE_CONVERSION) {
    window.gtag?.('event', 'conversion', {
      send_to: GOOGLE_ADS_PURCHASE_CONVERSION,
      value: params.value,
      currency: params.currency || 'BRL',
      transaction_id: '',
    });
  }
}
