#!/usr/bin/env node
/**
 * cut-media.mjs
 *
 * Lê data/sample-project.json e corta o trecho do vídeo definido por
 * media.startTime e media.duration usando FFmpeg.
 *
 * Saída: public + o caminho de media.clipFile (por padrão: /uploads/video/sample-clip.mp4)
 *
 * Uso:
 *   npm run cut-media
 *
 * Pré-requisito: FFmpeg instalado no sistema (ffmpeg disponível no PATH).
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function log(msg) {
  console.log(`[cut-media] ${msg}`);
}

function fail(msg) {
  console.error(`[cut-media] ERRO: ${msg}`);
  process.exit(1);
}

// 1. Verificar ffmpeg
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch {
  fail(
    'ffmpeg não encontrado no PATH.\n' +
      '  macOS:   brew install ffmpeg\n' +
      '  Ubuntu:  sudo apt install ffmpeg\n' +
      '  Windows: https://ffmpeg.org/download.html'
  );
}

// 2. Ler JSON
const jsonPath = join(projectRoot, 'data', 'sample-project.json');
if (!existsSync(jsonPath)) fail(`JSON não encontrado: ${jsonPath}`);

const project = JSON.parse(readFileSync(jsonPath, 'utf8'));
const media = project.media;

if (!media) fail('campo "media" não encontrado no JSON');
if (media.type !== 'video') {
  log(`media.type = "${media.type}" — nada a cortar. Saindo.`);
  process.exit(0);
}
if (typeof media.startTime !== 'number' || typeof media.duration !== 'number') {
  fail('media.startTime e media.duration são obrigatórios (em segundos).');
}

// 3. Resolver caminhos
// media.file e media.clipFile começam com "/" e são relativos a /public
const inputPath = join(projectRoot, 'public', media.file.replace(/^\//, ''));
const outputRel =
  media.clipFile ?? media.file.replace(/(\.[^./]+)$/, '-clip$1');
const outputPath = join(projectRoot, 'public', outputRel.replace(/^\//, ''));

if (!existsSync(inputPath)) {
  fail(
    `Vídeo de entrada não encontrado: ${inputPath}\n` +
      `  Coloque o arquivo do cliente em: public${media.file}`
  );
}

// 4. Garantir pasta de saída
mkdirSync(dirname(outputPath), { recursive: true });

// 5. Montar comando FFmpeg
// -ss antes de -i = seek rápido (não-exato em alguns codecs)
// -ss depois de -i = seek exato (lento). Como queremos exatidão no refrão,
// usamos a abordagem combinada: -ss rápido para chegar perto + re-encode.
const startTime = media.startTime;
const duration = media.duration;

// Re-encode garante frame-accuracy e compatibilidade total com Remotion.
const cmd = [
  'ffmpeg',
  '-y', // sobrescrever sem perguntar
  `-ss ${startTime}`,
  `-i "${inputPath}"`,
  `-t ${duration}`,
  '-c:v libx264',
  '-preset medium',
  '-crf 18',
  '-pix_fmt yuv420p',
  '-c:a aac',
  '-b:a 192k',
  '-movflags +faststart',
  `"${outputPath}"`,
].join(' ');

log(`Cortando ${startTime}s → ${startTime + duration}s (duração: ${duration}s)`);
log(`Entrada: ${inputPath}`);
log(`Saída:   ${outputPath}`);

try {
  execSync(cmd, { stdio: 'inherit' });
} catch {
  fail('FFmpeg falhou. Confira a saída acima.');
}

log('✓ Corte concluído.');
log(`Pronto pra renderizar com: npm run render:story  ou  npm run render:feed`);
