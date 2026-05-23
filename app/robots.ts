import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin-motion', '/admin/conteudo', '/api/', '/_next/'],
      },
    ],
    sitemap: 'https://www.estudionovacena.com/sitemap.xml',
  };
}
