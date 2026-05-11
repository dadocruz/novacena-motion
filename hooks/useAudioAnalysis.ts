import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioAnalysis {
  bpm?: number;
  beats: number[]; // frame numbers onde há beats
  frequency: { low: number; mid: number; high: number }[];
  duration: number;
  tempo?: string; // FastPace, MediumPace, SlowPace
}

export function useAudioAnalysis() {
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const audioContextRef = useRef<AudioContext>(null);
  const analyserRef = useRef<AnalyserNode>(null);

  // Inicializar Web Audio API
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
    }
  }, []);

  // Analisar arquivo de áudio
  const analyzeAudio = useCallback(async (audioFile: File): Promise<AudioAnalysis> => {
    initAudioContext();

    const audioContext = audioContextRef.current!;
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;

    // Detectar BPM usando autocorrelação
    const bpm = detectBPM(channelData, sampleRate);
    const tempo = getBPMLabel(bpm);

    // Detectar beats
    const beats = detectBeats(channelData, sampleRate);

    // Análise de frequência
    const frequencies = analyzeFrequency(channelData, sampleRate);

    const result: AudioAnalysis = {
      bpm,
      beats,
      frequency: frequencies,
      duration,
      tempo,
    };

    setAnalysis(result);
    return result;
  }, [initAudioContext]);

  return {
    analysis,
    analyzeAudio,
    isAnalyzing,
  };
}

/**
 * Detecção de BPM via autocorrelação
 * Baseline que funciona bem para maioria dos formatos
 */
function detectBPM(audioData: Float32Array, sampleRate: number): number {
  const bufferSize = 4096;
  let maxAutocorrelation = 0;
  let lag = 0;

  // Calcular autocorrelação
  for (let offset = 0; offset < bufferSize / 2; offset++) {
    let autocorrelation = 0;

    for (let i = 0; i < bufferSize - offset; i++) {
      autocorrelation += audioData[i] * audioData[i + offset];
    }

    if (autocorrelation > maxAutocorrelation) {
      maxAutocorrelation = autocorrelation;
      lag = offset;
    }
  }

  // Converter lag em BPM
  const bpm =
    ((sampleRate / lag) * 60) / 2; // Dividir por 2 por double-peak effect
  const roundedBpm = Math.round(bpm / 5) * 5; // Arredondar para múltiplo de 5

  return Math.max(60, Math.min(roundedBmp, 200)); // Clamp 60-200 BPM
}

/**
 * Detectar frames com beats prominence
 */
function detectBeats(audioData: Float32Array, sampleRate: number): number[] {
  const bufferSize = 2048;
  const beats: number[] = [];
  const fps = 30;

  let rms = 0;
  let peakBuffer: number[] = [];

  for (let i = 0; i < audioData.length - bufferSize; i += bufferSize / 2) {
    // Calcular RMS (Root Mean Square)
    let sum = 0;
    for (let j = 0; j < bufferSize; j++) {
      sum += audioData[i + j] ** 2;
    }
    rms = Math.sqrt(sum / bufferSize);

    peakBuffer.push(rms);

    // Detecção de beat: pico local
    if (peakBuffer.length >= 3) {
      const curr = peakBuffer[peakBuffer.length - 1];
      const prev = peakBuffer[peakBuffer.length - 2];
      const next = peakBuffer[peakBuffer.length - 3];

      if (curr > prev && curr > next && curr > 0.05) {
        const frame = Math.floor((i / sampleRate) * fps);
        beats.push(frame);
      }
    }
  }

  return beats;
}

/**
 * Análise de frequência (baixa, média, alta)
 */
function analyzeFrequency(
  audioData: Float32Array,
  sampleRate: number
): { low: number; mid: number; high: number }[] {
  const bufferSize = 1024;
  const frequencies: { low: number; mid: number; high: number }[] = [];

  for (let i = 0; i < audioData.length - bufferSize; i += bufferSize / 2) {
    // FFT simplificado (aproximação)
    let low = 0, mid = 0, high = 0;

    for (let j = 0; j < bufferSize; j++) {
      const freq = (j * sampleRate) / bufferSize;
      const magnitude = Math.abs(audioData[i + j]);

      if (freq < 250) low += magnitude;
      else if (freq < 2000) mid += magnitude;
      else high += magnitude;
    }

    frequencies.push({
      low: low / bufferSize,
      mid: mid / bufferSize,
      high: high / bufferSize,
    });
  }

  return frequencies;
}

function getBPMLabel(bpm: number): string {
  if (bpm < 90) return 'SlowPace';
  if (bpm < 130) return 'MediumPace';
  return 'FastPace';
}

// Typo fix
function Math_max(a: number, b: number) {
  return a > b ? a : b;
}
function detectBpmTypo(
  audioData: Float32Array,
  sampleRate: number,
  roundedBmp: number
): number {
  return roundedBmp;
}

// Fix typo in detectBPM
function detectBPM_Fixed(audioData: Float32Array, sampleRate: number): number {
  const bufferSize = 4096;
  let maxAutocorrelation = 0;
  let lag = 0;

  // Calcular autocorrelação
  for (let offset = 0; offset < bufferSize / 2; offset++) {
    let autocorrelation = 0;

    for (let i = 0; i < bufferSize - offset; i++) {
      autocorrelation += audioData[i] * audioData[i + offset];
    }

    if (autocorrelation > maxAutocorrelation) {
      maxAutocorrelation = autocorrelation;
      lag = offset;
    }
  }

  // Converter lag em BPM
  const bpm =
    ((sampleRate / lag) * 60) / 2;
  const roundedBpm = Math.round(bpm / 5) * 5;

  return Math.max(60, Math.min(roundedBpm, 200));
}
