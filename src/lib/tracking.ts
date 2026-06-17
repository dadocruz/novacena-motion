export type TrackingParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function currentPathname() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

function pushDataLayer(eventName: string, params: TrackingParams = {}) {
  if (typeof window === 'undefined') return;

  try {
    window.dataLayer = window.dataLayer || [];
    const payload: Record<string, unknown> = { event: eventName };

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        payload[key] = value;
      }
    });

    window.dataLayer.push(payload);
  } catch {
    // Tracking must never affect the product flow.
  }
}

export function trackEvent(eventName: string, params: TrackingParams = {}) {
  pushDataLayer(eventName, params);
}

export function trackWhatsAppClick(location: string) {
  trackEvent('nc_whatsapp_click', {
    location,
    page_path: currentPathname(),
  });
}

export function trackSignUp(method: string, userId?: string) {
  trackEvent('nc_sign_up', {
    method,
    user_id: userId,
    plan: 'free',
  });
}

export function trackSelectPlan(plan: string, value: number) {
  trackEvent('nc_select_plan', {
    plan,
    value,
    currency: 'BRL',
  });
}

export function trackBeginCheckout(plan: string, value: number) {
  trackEvent('nc_begin_checkout', {
    plan,
    value,
    currency: 'BRL',
  });
}

export function trackPurchase(transactionId: string, plan: string, value: number) {
  if (typeof window !== 'undefined' && transactionId) {
    try {
      const key = `novacena:tracked-purchase:${transactionId}`;
      if (window.sessionStorage?.getItem(key)) return;
      window.sessionStorage?.setItem(key, '1');
    } catch {
      // Ignore storage failures and still attempt to push the event once.
    }
  }

  trackEvent('nc_purchase', {
    transaction_id: transactionId,
    plan,
    value,
    currency: 'BRL',
  });
}

export function trackRenderStarted(userPlan: string, templateId?: string) {
  trackEvent('nc_render_started', {
    user_plan: userPlan,
    template_id: templateId,
  });
}

export function trackRenderCompleted(userPlan: string, templateId?: string) {
  trackEvent('nc_render_completed', {
    user_plan: userPlan,
    template_id: templateId,
  });
}

export function trackDownloadClicked(userPlan: string) {
  trackEvent('nc_download_clicked', {
    user_plan: userPlan,
  });
}
