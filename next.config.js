/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera build standalone — empacota apenas o necessário para rodar.
  // Reduz drasticamente o tamanho da imagem Docker final.
  output: 'standalone',

  // Inclui assets apenas nas rotas que realmente precisam deles.
  // Evita o Turbopack interpretar que toda rota /api depende do projeto inteiro.
  outputFileTracingIncludes: {
    '/api/render': ['./public/**/*', './data/**/*', './remotion/**/*', './remotion-entry/**/*'],
    '/api/uploads/[...path]': ['./public/uploads/**/*'],
    '/api/video/trim': ['./public/uploads/**/*'],
    '/api/upload-video/raw': ['./public/uploads/**/*'],
    '/api/upload-video': ['./public/uploads/**/*'],
    '/api/upload-audio': ['./public/uploads/**/*'],
    '/api/upload-cover': ['./public/uploads/**/*'],
    '/api/upload-overlay': ['./public/uploads/**/*', './data/**/*'],
    '/api/platform-logos': ['./public/uploads/**/*', './data/**/*'],
    '/api/fonts/upload': ['./public/uploads/**/*', './data/**/*'],
    '/api/fonts/css': ['./public/uploads/**/*', './data/**/*'],
    '/api/artists/**/*': ['./public/uploads/**/*', './data/**/*'],
    '/api/presets': ['./data/**/*'],
    '/api/genre-presets': ['./data/**/*'],
    '/api/render-files': ['./out/**/*'],
  },

  experimental: {
    // Permite upload de arquivos grandes (capas, áudios, vídeos) via Server Actions
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;
