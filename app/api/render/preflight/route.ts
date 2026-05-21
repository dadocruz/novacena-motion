import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Check = {
  id: string;
  ok: boolean;
  label: string;
  detail?: string;
};

const APP_ORIGIN = process.env.NOVACENA_APP_ORIGIN || '';

function checkEnv(name: string, label: string): Check {
  const value = process.env[name];
  return {
    id: name,
    ok: Boolean(value),
    label,
    detail: value ? 'configurado' : 'ausente',
  };
}

async function checkPublicHealth(): Promise<Check> {
  if (!APP_ORIGIN) {
    return {
      id: 'public_health',
      ok: false,
      label: 'Health público',
      detail: 'NOVACENA_APP_ORIGIN ausente',
    };
  }

  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(APP_ORIGIN) && process.env.NODE_ENV === 'production') {
    return {
      id: 'public_health',
      ok: false,
      label: 'Health público',
      detail: `origem inválida para produção: ${APP_ORIGIN}`,
    };
  }

  try {
    const response = await fetch(`${APP_ORIGIN.replace(/\/$/, '')}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const json = await response.json().catch(() => null);

    return {
      id: 'public_health',
      ok: response.ok && json?.ok === true,
      label: 'Health público',
      detail: `${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      id: 'public_health',
      ok: false,
      label: 'Health público',
      detail: error instanceof Error ? error.message : 'falha desconhecida',
    };
  }
}

export async function GET() {
  const checks: Check[] = [
    checkEnv('NOVACENA_APP_ORIGIN', 'Origem pública do app'),
    checkEnv('REMOTION_LAMBDA_FUNCTION_NAME', 'Função Lambda'),
    checkEnv('REMOTION_LAMBDA_SERVE_URL', 'Site Remotion no S3'),
    checkEnv('REMOTION_LAMBDA_BUCKET_NAME', 'Bucket Remotion'),
  ];

  checks.push(await checkPublicHealth());

  const ok = checks.every((check) => check.ok);

  return NextResponse.json({
    ok,
    provider: ok ? 'lambda' : 'blocked',
    region: process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
    appOrigin: APP_ORIGIN || null,
    checks,
    message: ok
      ? 'Pronto para renderizar no Lambda.'
      : 'Pré-voo falhou. Corrija os itens antes de renderizar.',
  }, { status: ok ? 200 : 503 });
}
