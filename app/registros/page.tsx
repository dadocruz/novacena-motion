'use client';

/**
 * Registros & Distribuição — serve a SPA via iframe (mesmo padrão do /monitor).
 * O app estático em /registro-app.html consome /api/catalog/* (sessão por cookie).
 */
export default function RegistrosPage() {
  return (
    <iframe
      src="/registro-app.html"
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
      title="NovaCena Registros & Distribuição"
    />
  );
}
