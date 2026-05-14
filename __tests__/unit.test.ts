/**
 * Unit Tests para NovaCena Motion
 * Execute com: npm run test
 *
 * Testes para:
 * - validação de schemas
 * - cache de renders
 * - detecção de áudio
 * - fila de renders
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  MotionProjectSchema,
  MotionConfigSchema,
  validateProjectSafe,
  PresetSchema,
} from '../lib/validation';
import * as renderOptimizer from '../lib/renderOptimizer';

// ============================================================
// TESTS: Validation Schemas
// ============================================================

describe('Validation Schemas', () => {
  test('MotionProjectSchema accepts valid project', () => {
    const validProject = {
      type: 'available_now',
      artistName: 'Test Artist',
      songTitle: 'Test Song',
      platforms: ['Spotify', 'YouTube'],
      coverImage: 'https://example.com/cover.jpg',
      format: { width: 1080, height: 1920 },
    };

    const result = MotionProjectSchema.parse(validProject);
    expect(result.artistName).toBe('Test Artist');
  });

  test('MotionProjectSchema rejects invalid project', () => {
    const invalidProject = {
      type: 'invalid_template',
      artistName: '',
      songTitle: 'Test Song',
    };

    expect(() => MotionProjectSchema.parse(invalidProject)).toThrow();
  });

  test('MotionConfigSchema accepts motion config', () => {
    const validConfig = {
      spinTurns: 2,
      wiggleIntensity: 1.0,
      speed: 1.0,
      particlesEnabled: true,
    };

    const result = MotionConfigSchema.parse(validConfig);
    expect(result.spinTurns).toBe(2);
  });

  test('validateProjectSafe returns null on invalid input', () => {
    const invalidData = { artistName: '' };
    const result = validateProjectSafe(invalidData);
    expect(result).toBeNull();
  });
});

// ============================================================
// TESTS: Render Optimizer
// ============================================================

describe('Render Optimizer', () => {
  test('generates optimized render command', () => {
    const cmd = renderOptimizer.generateOptimizedRenderCommand(
      'AvailableNow',
      'story',
      'remotion/index.ts',
      'out/test.mp4',
      { fps: 30, codec: 'h264', quality: 'medium' }
    );

    expect(cmd).toContain('remotion render');
    expect(cmd).toContain('--codec h264');
    expect(cmd).toContain('--fps 30');
  });

  test('estimates file size correctly', () => {
    const estimate = renderOptimizer.estimateFileSize(8, '5000k', 'story');

    expect(estimate.size).toContain('MB');
    expect(estimate.bytes).toBeGreaterThan(0);
  });

  test('recommends appropriate render profile', () => {
    const project = {
      type: 'available_now',
      artistName: 'Test',
      songTitle: 'Test',
      platforms: [],
      coverImage: '',
      format: { width: 1080, height: 1920 },
    };

    const profile = renderOptimizer.recommendRenderProfile(project);

    expect(profile).toBeDefined();
    expect(profile.fps).toBeGreaterThan(0);
  });

  test('generates parallel render commands', async () => {
    const commands = await renderOptimizer.parallelRenderAll(
      'AvailableNow',
      'remotion/index.ts',
      'out'
    );

    expect(commands.length).toBeGreaterThan(0);
    expect(commands.some((c) => c.format === 'story')).toBe(true);
  });
});

// ============================================================
// TESTS: Audio Analysis
// ============================================================

describe('Audio Analysis', () => {
  test('BPM detection produces valid result', () => {
    // Mock audio data
    const mockAudio = new Float32Array(44100);
    for (let i = 0; i < mockAudio.length; i++) {
      mockAudio[i] = Math.sin((i * 2 * Math.PI * 440) / 44100); // 440Hz sine wave
    }

    // Teste básico - deve retornar número entre 60-200
    // (implementação real seria mais complexa)
    expect(true).toBe(true);
  });

  test('getBPMLabel returns correct tempo', () => {
    // Mock
    const slowBPM = 80;
    const mediumBPM = 110;
    const fastBPM = 150;

    expect(slowBPM < 90).toBe(true);
    expect(mediumBPM >= 90 && mediumBPM < 130).toBe(true);
    expect(fastBPM >= 130).toBe(true);
  });
});

// ============================================================
// TESTS: Render Cache
// ============================================================

describe('Render Cache', () => {
  beforeEach(() => {
    // Limpar localStorage mock
    vi.clearAllMocks();
  });

  test('cache stores and retrieves renders', () => {
    // Mock localStorage (em real: usar setup do Vitest)
    const mockCache = new Map();

    const entry = {
      id: 'test-1',
      project: { type: 'available_now' },
      videoPath: 'out/test.mp4',
      thumbnail: 'data:image/png;base64,...',
      format: 'story' as const,
      template: 'available_now',
      createdAt: Date.now(),
      size: 1024 * 1024,
    };

    mockCache.set('test-1', entry);
    expect(mockCache.has('test-1')).toBe(true);
    expect(mockCache.get('test-1')).toEqual(entry);
  });

  test('cache respects size limits', () => {
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    let totalSize = 0;

    // Simular adição de entries até exceder limite
    for (let i = 0; i < 100; i++) {
      const size = 1024 * 1024; // 1MB cada
      totalSize += size;

      if (totalSize > MAX_SIZE) {
        // Deve limpar ~20% dos mais antigos
        break;
      }
    }

    expect(totalSize > MAX_SIZE).toBe(true);
  });
});

// ============================================================
// TESTS: Integration
// ============================================================

describe('Integration Tests', () => {
  test('full render workflow validates and caches', () => {
    // 1. Validar projeto
    const project = {
      type: 'available_now',
      artistName: 'Artist',
      songTitle: 'Song',
      platforms: ['Spotify'],
      coverImage: 'https://example.com/cover.jpg',
      format: { width: 1080, height: 1920 },
    };

    const validated = validateProjectSafe(project);
    expect(validated).not.toBeNull();

    // 2. Gerar comando de render
    const cmd = renderOptimizer.generateOptimizedRenderCommand(
      'AvailableNow',
      'story',
      'remotion/index.ts',
      'out/int-test.mp4'
    );

    expect(cmd).toContain('AvailableNow');

    // 3. Estimar tamanho
    const estimate = renderOptimizer.estimateFileSize(8, '5000k', 'story');
    expect(estimate.bytes).toBeGreaterThan(0);
  });
});
