type MarketingParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMarketingEvent(eventName: string, params: MarketingParams = {}) {
  if (typeof window === 'undefined') return;

  window.dataLayer?.push({ event: eventName, ...params });
  window.gtag?.('event', eventName, params);
  window.fbq?.('track', eventName, params);
}
