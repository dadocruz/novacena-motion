/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera build standalone — empacota apenas o necessário para rodar.
  // Reduz drasticamente o tamanho da imagem Docker final.
  output: 'standalone',

  // Inclui arquivos de dados e public no tracing (Remotion precisa de assets em runtime)
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/**/*', './data/**/*'],
  },

  experimental: {
    // Permite upload de arquivos grandes (capas, áudios, vídeos) via Server Actions
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;
