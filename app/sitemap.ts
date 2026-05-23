import type { MetadataRoute } from 'next';

const BASE = 'https://www.estudionovacena.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/motion`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/billing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/politica-de-privacidade`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/termos-de-uso`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
