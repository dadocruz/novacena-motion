/* ── Types e defaults do conteúdo do site ──────────── */
/* Safe para import em client components                */

export interface SiteLogo {
  name: string;
  src: string;
}

export interface SiteTestimonialVideo {
  youtubeId: string;
  label: string;
}

export interface SiteReview {
  name: string;
  initials: string;
  role: string;
  text: string;
  verified: boolean;
}

export interface SiteFaq {
  q: string;
  a: string;
}

/** Vídeo demo do produto (showcase). src aceita: caminho local (/uploads/site/demo.mp4),
 *  URL .mp4/.webm, ou link/ID do YouTube. */
export interface SiteShowcaseVideo {
  src: string;
  label: string;
}

/** Barra de cupom fixa no topo (estilo "USE O CUPOM X E GANHE Y OFF").
 *  endsAt (ISO ou "YYYY-MM-DD HH:MM") liga o countdown 00d 00h 00m 00s. */
export interface SiteCouponBar {
  enabled: boolean;
  code: string;
  discount: string;
  endsAt?: string;
}

export interface SiteContent {
  heroVideoId: string;
  logos: SiteLogo[];
  testimonialVideos: SiteTestimonialVideo[];
  showcaseVideos: SiteShowcaseVideo[];
  couponBar: SiteCouponBar;
  usersLine: string;
  reviews: SiteReview[];
  faqs: SiteFaq[];
  heroTagline: string;
  heroTitle: string;
  heroSubtitle: string;
  trustLine: string;
}

/** Detecta se o src do showcase é arquivo de vídeo direto ou referência YouTube. */
export function showcaseKind(src: string): 'file' | 'youtube' {
  const value = src.trim().toLowerCase();
  if (value.startsWith('/') || value.endsWith('.mp4') || value.endsWith('.webm') || value.endsWith('.mov')) {
    return 'file';
  }
  return 'youtube';
}

export function extractYouTubeVideoId(input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : value;
    }

    if (host.endsWith('youtube.com')) {
      const watchId = url.searchParams.get('v') || '';
      if (/^[A-Za-z0-9_-]{11}$/.test(watchId)) return watchId;

      const parts = url.pathname.split('/').filter(Boolean);
      for (const marker of ['embed', 'shorts', 'live']) {
        const markerIndex = parts.indexOf(marker);
        const id = markerIndex >= 0 ? parts[markerIndex + 1] || '' : '';
        if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch {
    // Keep accepting pasted fragments that contain a recognizable video id.
  }

  const match = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || value;
}

export function normalizeSiteContent(content: SiteContent): SiteContent {
  return {
    ...content,
    heroVideoId: extractYouTubeVideoId(content.heroVideoId || ''),
    testimonialVideos: content.testimonialVideos.map((video) => ({
      ...video,
      youtubeId: extractYouTubeVideoId(video.youtubeId || ''),
    })),
  };
}

export const DEFAULT_CONTENT: SiteContent = {
  heroVideoId: '',
  heroTagline: '// MOTION PARA LANÇAMENTOS MUSICAIS',
  heroTitle: 'Crie o motion do seu lançamento em menos de 5 minutos.',
  heroSubtitle:
    'Templates profissionais de pré-save, lançamento e marcos de streams. Troque a capa, ajuste o texto, exporte em Full HD. Sem After Effects. Sem designer. Sem perder horas.',
  trustLine: '✓  Conta grátis · Monte e assista o preview · Sem cartão de crédito',
  usersLine: 'Produtores e artistas independentes já lançam com a NovaCena',
  couponBar: {
    enabled: false,
    code: 'PRIMEIRACOMPRA',
    discount: '20% OFF',
    endsAt: '',
  },
  showcaseVideos: [],
  logos: [],
  testimonialVideos: [],
  reviews: [
    { name: 'Lucas Martins', initials: 'LM', role: 'Produtor musical', text: 'Em 5 minutos eu tinha o motion pronto. Antes eu gastava 2 horas no editor pra cada lançamento. Mudou completamente meu fluxo.', verified: true },
    { name: 'Camila Rocha', initials: 'CR', role: 'Social media', text: 'Meus artistas ficaram impressionados. Parece que contratamos uma agência de motion design. Entrego tudo no mesmo dia agora.', verified: true },
    { name: 'Pedro Gustavo', initials: 'PG', role: 'Artista independente', text: 'Eu não sei usar editor de vídeo. Aqui eu só troquei a capa e o texto. Ficou profissional.', verified: true },
    { name: 'Rafaela Duarte', initials: 'RD', role: 'Distribuidora digital', text: 'A gente lança 40 singles por mês. Sem essa ferramenta a gente não dava conta. Virou parte do nosso processo.', verified: true },
    { name: 'Marcos Vieira', initials: 'MV', role: 'Produtor musical', text: 'Substituiu completamente o freelancer de motion que eu pagava R$300 por vídeo. A qualidade é a mesma ou melhor.', verified: true },
    { name: 'Ana Clara Santos', initials: 'AS', role: 'Cantora', text: 'Nunca pensei que eu mesma conseguiria fazer motion pro meu single. Fiz em 10 minutos e ficou incrível.', verified: false },
    { name: 'Felipe Torres', initials: 'FT', role: 'Social media', text: 'Entrego material pra 12 artistas por semana. Antes eu terceirizava tudo. Agora resolvo sozinho em minutos.', verified: true },
    { name: 'Julia Mendes', initials: 'JM', role: 'Cantora', text: 'Meu primeiro lançamento com motion profissional. A diferença no engajamento foi absurda. Todo mundo perguntou quem fez.', verified: false },
    { name: 'Ricardo Alves', initials: 'RA', role: 'Produtor musical', text: 'A renderização na nuvem é absurda. Exporto do celular, do notebook velho, de qualquer lugar. Nunca trava.', verified: true },
    { name: 'Beatriz Lima', initials: 'BL', role: 'Social media', text: 'Os templates são lindos. Cada lançamento parece que teve direção de arte. Meus clientes amam.', verified: true },
  ],
  faqs: [
    { q: 'O que é a NovaCena?', a: 'Uma ferramenta online para criar motion graphics de divulgação musical. Você escolhe um template, personaliza com sua capa e texto, e exporta o vídeo na nuvem. Tudo no navegador.' },
    { q: 'Preciso instalar algum software?', a: 'Não. A NovaCena funciona 100% no navegador. Chrome, Safari, Edge. Qualquer computador com internet.' },
    { q: 'Funciona no celular?', a: 'Você pode criar sua conta e assinar agora mesmo pelo celular. O editor é otimizado para o navegador do computador — seus projetos ficam salvos na nuvem, prontos pra quando você abrir no desktop.' },
    { q: 'Quanto tempo leva pra exportar um vídeo?', a: 'Entre 2 e 5 minutos. A renderização é feita na nuvem — seu computador não trava e não precisa ficar aberto.' },
    { q: 'Posso usar minha própria capa e vídeo de fundo?', a: 'Sim. Você faz upload da arte do lançamento, vídeo de fundo, e ajusta texto, cor, opacidade, blur e saturação no editor visual.' },
    { q: 'O que é um render?', a: 'Um render é uma exportação de vídeo. Cada vez que você exporta um motion, consome 1 render do seu saldo. Você compra pacotes de renders nos planos.' },
    { q: 'Como funciona o teste grátis?', a: 'Você cria a conta grátis e usa o estúdio completo: monta o motion com sua capa, textos e vídeo, e assiste o preview na hora. Pra exportar o MP4 em Full HD, é só assinar um plano.' },
  ],
};
