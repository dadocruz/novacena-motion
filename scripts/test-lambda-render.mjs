/**
 * Teste de render via Remotion Lambda.
 *
 * Uso: set -a && source .env.production && set +a && node scripts/test-lambda-render.mjs
 */
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';

const region = process.env.REMOTION_AWS_REGION || 'us-east-1';
const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
const serveUrl = process.env.REMOTION_LAMBDA_SERVE_URL;
const composition = process.env.REMOTION_LAMBDA_COMPOSITION || 'AvailableNow';
const bucketName = process.env.REMOTION_LAMBDA_BUCKET_NAME;

if (!functionName || !serveUrl) {
  console.error('Defina REMOTION_LAMBDA_FUNCTION_NAME e REMOTION_LAMBDA_SERVE_URL');
  process.exit(1);
}

console.log('Iniciando render Lambda...');
console.log({ region, functionName, serveUrl, composition, bucketName });

const start = Date.now();
const result = await renderMediaOnLambda({
  region,
  functionName,
  serveUrl,
  composition,
  codec: 'h264',
  inputProps: {},
  ...(bucketName ? { forceBucketName: bucketName } : {}),
});

console.log('Render iniciado:', result);

let done = false;
while (!done) {
  await new Promise((r) => setTimeout(r, 5000));
  const progress = await getRenderProgress({
    renderId: result.renderId,
    bucketName: result.bucketName,
    functionName,
    region,
  });

  console.log({
    progress: Math.round((progress.overallProgress ?? 0) * 100),
    done: progress.done,
    outputFile: progress.outputFile ?? null,
    fatalErrorEncountered: progress.fatalErrorEncountered,
    errors: progress.errors ?? [],
  });

  if (progress.fatalErrorEncountered) {
    console.error('Erro fatal no render!');
    process.exit(1);
  }

  if (progress.done) {
    done = true;
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`Render finalizado em ${elapsed}s`);
    console.log(`Arquivo final: ${progress.outputFile}`);
  }
}
