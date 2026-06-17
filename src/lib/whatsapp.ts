const DEFAULT_WHATSAPP_PHONE = '5519993941536';
const DEFAULT_WHATSAPP_MESSAGE =
  'Olá! Vim pelo site NovaCena Motion e tenho interesse em criar motions para lançamentos musicais. Origem: site_motion_google_ads';

export type WhatsAppCtaLocation = 'header' | 'hero' | 'pricing' | 'floating';

export function buildWhatsAppUrl(location: WhatsAppCtaLocation) {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || DEFAULT_WHATSAPP_PHONE).replace(/\D/g, '');
  const baseMessage = (process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE || DEFAULT_WHATSAPP_MESSAGE).trim();
  const message = `${baseMessage} | CTA: ${location}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
