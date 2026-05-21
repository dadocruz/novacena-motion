import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const region = process.env.REMOTION_AWS_REGION || "us-east-1";
const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
const serveUrl = process.env.REMOTION_LAMBDA_SERVE_URL;
const bucketName = process.env.REMOTION_LAMBDA_BUCKET_NAME;

if (!functionName) {
  throw new Error("Faltou REMOTION_LAMBDA_FUNCTION_NAME no .env.local");
}

if (!serveUrl) {
  throw new Error("Faltou REMOTION_LAMBDA_SERVE_URL no .env.local");
}

const composition = process.env.REMOTION_LAMBDA_COMPOSITION || "AvailableNow";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sampleProjectPath = path.join(rootDir, "data", "sample-project.json");
const sampleProject = JSON.parse(await readFile(sampleProjectPath, "utf8"));

const templateByComposition = {
  AvailableNow: "available_now",
  AvailableNowFeed: "available_now",
  WatchOnYouTube: "watch_youtube",
  WatchOnYouTubeFeed: "watch_youtube",
  Milestone: "milestone",
  MilestoneFeed: "milestone",
  OutNow: "out_now",
  OutNowFeed: "out_now",
  SpotifyPrint: "spotify_print",
  SpotifyPrintFeed: "spotify_print",
};

const transparentPixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5Nn0sAAAAASUVORK5CYII=";

const templateId = templateByComposition[composition] || "available_now";
const template = sampleProject.templates[templateId];

if (!template) {
  throw new Error(`Composition sem template de teste configurado: ${composition}`);
}

const inputProps = {
  ...sampleProject.defaults,
  ...template,
  format: sampleProject.format,
  renderTarget: composition.endsWith("Feed") ? "feed" : "story",
  coverImage: transparentPixel,
  platforms: ["Spotify", "Deezer", "Apple Music", "YouTube Music"],
  media: {
    type: "image",
    file: transparentPixel,
    sourceFormat: "square",
    framingMode: "background_blur",
  },
  motion: {
    ...(template.motion || {}),
    background: {
      ...((template.motion || {}).background || {}),
      videoSrc: undefined,
      imageSrc: undefined,
      audioSrc: undefined,
    },
    customLogos: {},
    overlays: [],
  },
};

const start = Date.now();

console.log("Iniciando render Lambda...");
console.log({
  region,
  functionName,
  serveUrl,
  composition,
  bucketName: bucketName || "(bucket padrao do Remotion)",
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
