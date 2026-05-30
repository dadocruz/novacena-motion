'use client';

/**
 * Monitor page — serves the full gaveta-monitor SPA via iframe.
 * Auth is handled by the proxy middleware on /monitor.
 * The iframe loads /monitor-app.html which calls /api/monitor/* endpoints.
 */
export default function MonitorPage() {
  return (
    <iframe
      src="/monitor-app.html"
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
      title="NovaCena Monitor"
    />
  );
}
