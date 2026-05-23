import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — NovaCena',
  description: 'Política de privacidade e proteção de dados da NovaCena, em conformidade com a LGPD.',
};

export default function PrivacyPage() {
  return (
    <main style={page}>
      <article style={content}>
        <a href="/motion" style={back}>← Voltar</a>
        <h1 style={h1}>Política de Privacidade</h1>
        <p style={updated}>Última atualização: 22 de maio de 2026</p>

        <p style={p}>
          A NovaCena (&ldquo;nós&rdquo;, &ldquo;nosso&rdquo;) opera a plataforma NovaCena Motion Studio.
          Esta política descreve como coletamos, usamos e protegemos suas informações pessoais,
          em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <h2 style={h2}>1. Dados que coletamos</h2>
        <p style={p}>
          <strong style={strong}>Dados de cadastro:</strong> nome, endereço de e-mail e senha (criptografada)
          fornecidos ao criar sua conta por e-mail ou via login com Google.
        </p>
        <p style={p}>
          <strong style={strong}>Dados de uso:</strong> informações sobre como você utiliza a plataforma,
          incluindo templates selecionados, exportações realizadas e saldo de renders.
        </p>
        <p style={p}>
          <strong style={strong}>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional
          e dados de cookies essenciais para o funcionamento do serviço.
        </p>
        <p style={p}>
          <strong style={strong}>Arquivos enviados:</strong> imagens de capa, vídeos e áudios que você
          envia para personalizar seus templates. Esses arquivos são armazenados temporariamente
          para fins de renderização.
        </p>

        <h2 style={h2}>2. Como usamos seus dados</h2>
        <ul style={ul}>
          <li style={li}>Criar e gerenciar sua conta na plataforma</li>
          <li style={li}>Processar exportações de vídeo (renders) via AWS Lambda</li>
          <li style={li}>Controlar seu saldo de renders e plano contratado</li>
          <li style={li}>Enviar comunicações sobre sua conta e o serviço</li>
          <li style={li}>Melhorar a plataforma com base em dados agregados de uso</li>
        </ul>

        <h2 style={h2}>3. Serviços de terceiros</h2>
        <p style={p}>Utilizamos os seguintes serviços de terceiros:</p>
        <ul style={ul}>
          <li style={li}><strong style={strong}>Amazon Web Services (AWS):</strong> renderização de vídeos via Lambda e armazenamento temporário via S3</li>
          <li style={li}><strong style={strong}>Google OAuth:</strong> autenticação via conta Google, quando você escolhe essa opção de login</li>
        </ul>

        <h2 style={h2}>4. Cookies</h2>
        <p style={p}>
          Utilizamos cookies essenciais para manter sua sessão ativa e cookies de preferência
          para lembrar suas escolhas. Você pode recusar cookies não essenciais através do
          banner exibido ao acessar o site.
        </p>

        <h2 style={h2}>5. Retenção de dados</h2>
        <p style={p}>
          Seus dados de cadastro são mantidos enquanto sua conta estiver ativa.
          Arquivos enviados para renderização são excluídos automaticamente após a exportação.
          Você pode solicitar a exclusão de sua conta e dados a qualquer momento.
        </p>

        <h2 style={h2}>6. Seus direitos (LGPD)</h2>
        <p style={p}>De acordo com a LGPD, você tem direito a:</p>
        <ul style={ul}>
          <li style={li}>Confirmar a existência de tratamento de dados pessoais</li>
          <li style={li}>Acessar seus dados pessoais</li>
          <li style={li}>Corrigir dados incompletos ou desatualizados</li>
          <li style={li}>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
          <li style={li}>Solicitar a portabilidade dos dados</li>
          <li style={li}>Revogar o consentimento a qualquer momento</li>
        </ul>

        <h2 style={h2}>7. Segurança</h2>
        <p style={p}>
          Empregamos medidas técnicas e organizacionais para proteger seus dados,
          incluindo criptografia de senhas, conexões HTTPS e controle de acesso restrito.
        </p>

        <h2 style={h2}>8. Contato</h2>
        <p style={p}>
          Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
        </p>
        <p style={p}>
          <strong style={strong}>E-mail:</strong> estudionovacena@gmail.com
        </p>

        <h2 style={h2}>9. Alterações</h2>
        <p style={p}>
          Esta política pode ser atualizada periodicamente. Recomendamos que você a consulte
          regularmente. A data da última atualização está indicada no topo desta página.
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
