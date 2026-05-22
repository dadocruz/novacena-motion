import type { Metadata } from 'next';
import './globals.css';
import './fonts.css';

export const metadata: Metadata = {
  title: 'NovaCena Motion Studio',
  description: 'Motion graphics para lançamentos musicais',
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
      </head>
      <body
        suppressHydrationWarning
        style={{ height: '100%', margin: 0, overflow: 'hidden', background: '#0a0a0c' }}
      >
        {children}
      </body>
    </html>
  );
}
