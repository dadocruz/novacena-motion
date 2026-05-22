import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso — NovaCena',
  description: 'Termos de uso da plataforma NovaCena Motion Studio.',
};

export default function TermsPage() {
  return (
    <main style={page}>
      <article style={content}>
        <a href="/vendas" style={back}>← Voltar</a>
        <h1 style={h1}>Termos de Uso</h1>
        <p style={updated}>Última atualização: 22 de maio de 2026</p>

        <p style={p}>
          Ao acessar e utilizar a plataforma NovaCena Motion Studio (&ldquo;Plataforma&rdquo;),
          operada por Estúdio NovaCena (&ldquo;NovaCena&rdquo;, &ldquo;nós&rdquo;),
          você concorda com os termos descritos abaixo.
        </p>

        <h2 style={h2}>1. Descrição do serviço</h2>
        <p style={p}>
          A NovaCena é uma ferramenta online para criação de motion graphics voltados à
          divulgação de lançamentos musicais. O usuário seleciona templates, personaliza
          com suas próprias artes e textos, e exporta vídeos renderizados na nuvem.
        </p>

        <h2 style={h2}>2. Cadastro e conta</h2>
        <p style={p}>
          Para utilizar a Plataforma, é necessário criar uma conta fornecendo nome, e-mail
          e senha, ou utilizando login via Google. Você é responsável por manter a
          confidencialidade de suas credenciais de acesso.
        </p>

        <h2 style={h2}>3. Renders e créditos</h2>
        <p style={p}>
          A Plataforma opera com um sistema de créditos chamados &ldquo;renders&rdquo;.
          Cada exportação de vídeo consome 1 render. Ao criar sua conta, você recebe
          1 render de demonstração gratuito. Renders adicionais são adquiridos através
          dos planos disponíveis.
        </p>
        <p style={p}>
          Renders adquiridos não são reembolsáveis após o uso. Renders não utilizados
          permanecem em sua conta enquanto ela estiver ativa.
        </p>

        <h2 style={h2}>4. Planos e pagamentos</h2>
        <p style={p}>
          A NovaCena oferece planos com diferentes quantidades de renders e ciclos de
          faturamento (mensal, anual e trienal). Os preços estão disponíveis na página
          de planos e podem ser atualizados com aviso prévio.
        </p>

        <h2 style={h2}>5. Uso aceitável</h2>
        <p style={p}>Ao utilizar a Plataforma, você concorda em:</p>
        <ul style={ul}>
          <li style={li}>Utilizar o serviço apenas para fins legais e legítimos</li>
          <li style={li}>Não enviar conteúdo ilegal, ofensivo, difamatório ou que viole direitos de terceiros</li>
          <li style={li}>Não tentar acessar áreas restritas da Plataforma ou contornar medidas de segurança</li>
          <li style={li}>Não utilizar bots, scripts ou ferramentas automatizadas para acessar o serviço</li>
          <li style={li}>Respeitar os direitos autorais dos assets que você envia (capas, vídeos, áudios)</li>
        </ul>

        <h2 style={h2}>6. Propriedade intelectual</h2>
        <p style={p}>
          Os templates, designs, código-fonte e marca NovaCena são de propriedade
          exclusiva da NovaCena. Os vídeos exportados por você são de sua propriedade,
          desde que os assets utilizados (capas, áudios, vídeos) sejam de sua autoria
          ou licenciados para seu uso.
        </p>

        <h2 style={h2}>7. Limitação de responsabilidade</h2>
        <p style={p}>
          A NovaCena não se responsabiliza por perdas ou danos decorrentes de
          indisponibilidade temporária do serviço, falhas na renderização, ou uso
          indevido da Plataforma por parte do usuário. O serviço é fornecido
          &ldquo;como está&rdquo;.
        </p>

        <h2 style={h2}>8. Disponibilidade</h2>
        <p style={p}>
          Nos empenhamos em manter a Plataforma disponível 24 horas por dia,
          mas não garantimos disponibilidade ininterrupta. Manutenções programadas
          e atualizações podem causar indisponibilidade temporária.
        </p>

        <h2 style={h2}>9. Encerramento</h2>
        <p style={p}>
          Você pode encerrar sua conta a qualquer momento entrando em contato conosco.
          A NovaCena se reserva o direito de suspender ou encerrar contas que violem
          estes termos, sem aviso prévio.
        </p>

        <h2 style={h2}>10. Alterações</h2>
        <p style={p}>
          Estes termos podem ser atualizados periodicamente. Alterações significativas
          serão comunicadas por e-mail. O uso continuado da Plataforma após alterações
          constitui aceitação dos novos termos.
        </p>

        <h2 style={h2}>11. Legislação aplicável</h2>
        <p style={p}>
          Estes termos são regidos pelas leis da República Federativa do Brasil.
          Eventuais disputas serão resolvidas no foro da comarca do domicílio do usuário.
        </p>

        <h2 style={h2}>12. Contato</h2>
        <p style={p}>
          Para dúvidas sobre estes termos, entre em contato:
        </p>
        <p style={p}>
          <strong style={strong}>E-mail:</strong> estudionovacena@gmail.com
        </p>
      </article>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: '100dvh', background: '#080a0f', color: '#e8e8ec', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '40px 24px 80px', overflow: 'auto' };
const content: React.CSSProperties = { width: 'min(720px, 100%)', margin: '0 auto', display: 'grid', gap: 8 };
const back: React.CSSProperties = { color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 14, marginBottom: 16 };
const h1: React.CSSProperties = { margin: '0 0 4px', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' };
const updated: React.CSSProperties = { margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.3)' };
const h2: React.CSSProperties = { margin: '32px 0 8px', fontSize: 20, fontWeight: 700 };
const p: React.CSSProperties = { margin: '0 0 12px', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 };
const strong: React.CSSProperties = { color: '#e8e8ec', fontWeight: 600 };
const ul: React.CSSProperties = { margin: '0 0 12px', paddingLeft: 20, display: 'grid', gap: 6 };
const li: React.CSSProperties = { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 };
