import type { Metadata } from 'next';
import './globals.css';
import './fonts.css';
import CookieConsent from './components/CookieConsent';
import MarketingTags from './components/MarketingTags';
import AntiInspect from './components/AntiInspect';

const BASE_URL = 'https://www.estudionovacena.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'NovaCena — Motion Studio para Lançamentos Musicais',
    template: '%s | NovaCena',
  },
  description:
    'Crie motion graphics profissionais para divulgação musical. Vídeos animados para Spotify, YouTube e redes sociais em minutos. 100% online.',
  keywords: [
    'motion graphics musical',
    'lançamento musical',
    'divulgação musical',
    'vídeo para Spotify',
    'vídeo para YouTube',
    'animação musical',
    'marketing musical',
    'visualizer musical',
    'motion para artistas',
    'motion para produtores',
    'NovaCena',
  ],
  authors: [{ name: 'NovaCena', url: BASE_URL }],
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'NovaCena — Motion Studio para Lançamentos Musicais',
    description: 'Crie motion graphics profissionais para divulgação musical. Vídeos animados em minutos. 100% online.',
    url: BASE_URL,
    siteName: 'NovaCena Motion Studio',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NovaCena — Motion Studio para Lançamentos Musicais',
    description: 'Motion graphics profissionais para divulgação musical. Vídeos animados em minutos.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'NovaCena',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  url: BASE_URL,
  description: 'Ferramenta online para criar motion graphics de divulgação musical',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '97',
    highPrice: '497',
    priceCurrency: 'BRL',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      style={{ height: '100%', margin: 0, overflow: 'hidden', background: '#0a0a0c' }}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after { box-sizing: border-box; }
              html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #0a0a0c; }
              body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
              button, input, select, textarea { font: inherit; }
            `,
          }}
        />
        {/* CSS dinâmico das fontes do usuário (gerado on-the-fly pela API) */}
        <link rel="stylesheet" href="/api/fonts/css" />
        <link rel="stylesheet" href="/fonts/premium/premium-fonts.css" />
        {/* Google Fonts — Inter + Playfair Display (serif italic premium) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        style={{ height: '100%', margin: 0, overflow: 'hidden', background: '#0a0a0c' }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MarketingTags />
        <AntiInspect />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
