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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* CSS dinâmico das fontes do usuário (gerado on-the-fly pela API) */}
        <link rel="stylesheet" href="/api/fonts/css" />
        <link rel="stylesheet" href="/fonts/premium/premium-fonts.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
