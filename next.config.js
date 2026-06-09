const isSaasBuild =
  process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === '1' ||
  process.env.NEXT_PUBLIC_NOVACENA_SAAS_MODE === 'true';

const uploadTrace = isSaasBuild ? [] : ['./public/uploads/**/*'];
const publicTrace = isSaasBuild
  ? ['./public/fonts/**/*', './public/logos/**/*']
  : ['./public/**/*'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera build standalone — empacota apenas o necessário para rodar.
  // Reduz drasticamente o tamanho da imagem Docker final.
  output: 'standalone',

  // Segurança: NÃO enviar source maps do browser em produção — assim o código
  // legível não fica disponível (só o bundle minificado). Dificulta cópia.
  productionBrowserSourceMaps: false,

  // Remove o header "X-Powered-By: Next.js" (menos fingerprinting do stack).
  poweredByHeader: false,

  // Inclui assets apenas nas rotas que realmente precisam deles.
  // Evita o Turbopack interpretar que toda rota /api depende do projeto inteiro.
  outputFileTracingIncludes: {
    '/api/render': [...publicTrace, './data/**/*', './lib/**/*', './remotion/**/*', './remotion-entry/**/*'],
    '/api/uploads/[...path]': uploadTrace,
    '/api/video/trim': uploadTrace,
    '/api/upload-video/raw': uploadTrace,
    '/api/upload-video': uploadTrace,
    '/api/upload-audio': uploadTrace,
    '/api/upload-cover': uploadTrace,
    '/api/upload-overlay': [...uploadTrace, './data/**/*'],
    '/api/platform-logos': [...uploadTrace, './data/**/*'],
    '/api/fonts/upload': [...uploadTrace, './data/**/*'],
    '/api/fonts/css': [...uploadTrace, './data/**/*'],
    '/api/artists/**/*': [...uploadTrace, './data/**/*'],
    '/api/presets': ['./data/**/*'],
    '/api/genre-presets': ['./data/**/*'],
    '/api/render-files': ['./out/**/*'],
  },

  experimental: {
    // Permite upload de arquivos grandes (capas, áudios, vídeos) via Server Actions
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Aumenta o buffer de body quando o Next faz proxy/clona a request
    proxyClientMaxBodySize: '200mb',
  },

  async headers() {
    // Headers de segurança seguros (não quebram analytics/Stripe/Google/Remotion).
    // CSP completo de script-src fica como follow-up (precisa allowlist por domínio
    // + teste); aqui já travamos clickjacking via X-Frame-Options + frame-ancestors.
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  async redirects() {
    return [
      { source: '/vendas', destination: '/motion', permanent: true },
    ];
  },
};

module.exports = nextConfig;
