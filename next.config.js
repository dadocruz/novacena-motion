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

  async redirects() {
    return [
      { source: '/vendas', destination: '/motion', permanent: true },
    ];
  },
};

module.exports = nextConfig;
