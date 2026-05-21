import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda";

const region = process.env.REMOTION_AWS_REGION || "us-east-1";
const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
const serveUrl = process.env.REMOTION_LAMBDA_SERVE_URL;

if (!functionName) {
  throw new Error("Faltou REMOTION_LAMBDA_FUNCTION_NAME no .env.local");
}

if (!serveUrl) {
  throw new Error("Faltou REMOTION_LAMBDA_SERVE_URL no .env.local");
}

const composition = process.env.REMOTION_LAMBDA_COMPOSITION || "AvailableNow";

const inputProps = {
  title: "CHAMA PLAY",
  artist: "ARTISTA TESTE",
  releaseDate: "07/06",
  cta: "DISPONÍVEL EM TODOS OS APPS DE MÚSICA",
};

const start = Date.now();

console.log("Iniciando render Lambda...");
console.log({
  region,
  functionName,
  serveUrl,
  composition,
});

const render = await renderMediaOnLambda({
  region,
  functionName,
  serveUrl,
  composition,
  codec: "h264",
  imageFormat: "jpeg",
  maxRetries: 1,
  framesPerLambda: 30,
  privacy: "public",
  inputProps,
});

console.log("Render iniciado:");
console.log(render);

let finished = false;

while (!finished) {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const progress = await getRenderProgress({
    renderId: render.renderId,
    bucketName: render.bucketName,
    functionName,
    region,
  });

  console.log({
    progress: Math.round(progress.overallProgress * 100),
    done: progress.done,
    outputFile: progress.outputFile,
    fatalErrorEncountered: progress.fatalErrorEncountered,
    errors: progress.errors,
  });

  if (progress.fatalErrorEncountered) {
    console.error("Erro fatal no render:");
    console.error(progress.errors);
    process.exit(1);
  }

  if (progress.done) {
    finished = true;
    const seconds = Math.round((Date.now() - start) / 1000);
    console.log(`Render finalizado em ${seconds}s`);
    console.log("Arquivo final:", progress.outputFile);
  }
}
