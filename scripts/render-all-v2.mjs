#!/usr/bin/env node

/**
 * Parallel Render Script v2 - OTIMIZADO
 * Renderiza todos os 8 templates simultânea (story + feed)
 * Com streaming, progresso em tempo real, e cache
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = './out';
const TEMPLATES = ['AvailableNow', 'WatchOnYouTube', 'Milestone', 'OutNow'];

// Criar diretório de output
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fila de renders com limit de parallelização
 */
class ParallelRenderQueue {
  constructor(maxParallel = 2) {
    this.maxParallel = maxParallel;
    this.activeJobs = new Set();
    this.queue = [];
    this.results = [];
  }

  async addTask(task) {
    this.queue.push(task);
  }

  async processAll() {
    console.log(`\n🎬 Iniciando render paralelo de ${this.queue.length} videos...`);
    console.log(`⚙️  Max paralelo: ${this.maxParallel}\n`);

    while (this.queue.length > 0 || this.activeJobs.size > 0) {
      // Preencher slots disponíveis
      while (this.activeJobs.size < this.maxParallel && this.queue.length > 0) {
        const task = this.queue.shift();
        const jobId = `${task.template}-${task.format}`;
        this.activeJobs.add(jobId);

        this.renderVideo(task, jobId).finally(() => {
          this.activeJobs.delete(jobId);
        });
      }

      // Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return this.results;
  }

  renderVideo(task, jobId) {
    const startTime = Date.now();
    const template =
      task.template +
      (task.format === 'feed' ? 'Feed' : '');

    console.log(`⏱️  [${jobId}] Iniciando render...`);

    return new Promise(resolve => {
      const cmd = 'remotion';
      const args = [
        'render',
        'remotion/index.ts',
        template,
        task.outputPath,
        '--fps',
        '30',
        '--codec',
        'h264',
        '--crf',
        '23',
        '--preset',
        'fast',
        '--concurrency',
        '2',
      ];

      const proc = spawn(cmd, args);
      let output = '';
      let lastFrame = 0;

      proc.stdout.on('data', data => {
        output += data.toString();
        
        // Parse frame progress
        const frameMatch = output.match(/frame=\s*(\d+)/);
        if (frameMatch) {
          const frame = parseInt(frameMatch[1]);
          if (frame > lastFrame) {
            lastFrame = frame;
            process.stdout.write(
              `\r✓ [${jobId}] Frame: ${frame} | ` +
              `Tempo decorrido: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
            );
          }
        }
      });

      proc.stderr.on('data', data => {
        // Silenciar warnings não-críticos
        const msg = data.toString();
        if (msg.includes('error') || msg.includes('Error')) {
          console.error(`\n✗ [${jobId}] ${msg}`);
        }
      });

      proc.on('close', code => {
        const duration = (Date.now() - startTime) / 1000;

        if (code === 0) {
          console.log(
            `\n✅ [${jobId}] Concluído em ${duration.toFixed(1)}s\n`
          );
          this.results.push({
            task,
            success: true,
            duration,
          });
        } else {
          console.log(`\n❌ [${jobId}] Falhou com código ${code}\n`);
          this.results.push({
            task,
            success: false,
            duration,
            error: `Process exited with code ${code}`,
          });
        }

        resolve();
      });
    });
  }
}

/**
 * Main
 */
async function main() {
  console.log('════════════════════════════════════════════');
  console.log('  NovaCena Motion - Parallel Render v2');
  console.log('════════════════════════════════════════════');

  const queue = new ParallelRenderQueue(2); // 2 renders simultâneos

  // Adicionar todas as tasks
  for (const template of TEMPLATES) {
    for (const format of ['story', 'feed']) {
      const outputPath = path.join(OUTPUT_DIR, `${template}-${format}.mp4`);
      await queue.addTask({ template, format, outputPath });
    }
  }

  // Executar
  const startTime = Date.now();
  const results = await queue.processAll();
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Resumo
  console.log('\n════════════════════════════════════════════');
  console.log('📊 RESUMO DO RENDER');
  console.log('════════════════════════════════════════════');
  console.log(`Total: ${results.length} videos`);
  console.log(
    `✅ Sucesso: ${results.filter(r => r.success).length}`
  );
  console.log(
    `❌ Falhas: ${results.filter(r => !r.success).length}`
  );
  console.log(`⏱️  Tempo total: ${totalTime}s`);
  console.log(`📁 Output: ${path.resolve(OUTPUT_DIR)}`);
  console.log('════════════════════════════════════════════\n');

  // Log detalhado
  if (results.some(r => !r.success)) {
    console.log('⚠️  Falhas detectadas:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.task.template} (${r.task.format}): ${r.error}`);
      });
  }

  process.exit(results.every(r => r.success) ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
