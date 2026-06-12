/**
 * Link público de aprovação do artista: /aprovar/<token>
 * Renderiza a SPA estática passando o token por querystring.
 */
export default async function AprovarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <iframe
      src={`/aprovar-app.html?t=${encodeURIComponent(token)}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
      }}
      title="Aprovação de lançamento"
    />
  );
}
