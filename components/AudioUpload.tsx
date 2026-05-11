'use client';

import React, { useCallback, useState } from 'react';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useEditorStore } from '../../store/useEditorStore';
import { Music, Loader } from 'lucide-react';

export interface AudioUploadProps {
  className?: string;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({ className = '' }) => {
  const { updateProject } = useEditorStore();
  const { analysis, analyzeAudio, isAnalyzing } = useAudioAnalysis();
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleAudioUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setAudioFile(file);

      // Analisar áudio
      try {
        const audioAnalysis = await analyzeAudio(file);

        // Atualizar projeto com dados de áudio
        updateProject({
          media: {
            audioFile: file,
            audioPath: URL.createObjectURL(file),
          },
          motion: {
            speed: getBPMMultiplier(audioAnalysis.bpm || 120),
            // Ajustar outros params baseado em BPM
          },
        });

        // Toast de sucesso
        console.log('🎵 Áudio analisado:', audioAnalysis);
      } catch (error) {
        console.error('Erro ao analisar áudio:', error);
      }
    },
    [analyzeAudio, updateProject]
  );

  if (isAnalyzing) {
    return (
      <div className={`flex items-center justify-center gap-2 p-4 bg-blue-600/20 border border-blue-500 rounded ${className}`}>
        <Loader size={16} className="animate-spin" />
        <span className="text-sm text-blue-300">Analisando áudio...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-600/20 border-2 border-dashed border-purple-500 rounded cursor-pointer hover:bg-purple-600/30 transition-colors">
        <Music size={24} className="text-purple-400" />
        <span className="text-sm font-medium text-purple-300">
          {audioFile ? 'Áudio carregado' : 'Clique para carregar áudio'}
        </span>
        {audioFile && (
          <span className="text-xs text-purple-200/60">{audioFile.name}</span>
        )}
        <input
          type="file"
          accept="audio/*"
          onChange={handleAudioUpload}
          className="hidden"
        />
      </label>

      {/* Análise Resultado */}
      {analysis && (
        <div className="mt-3 p-3 bg-black/50 rounded space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-white/60">BPM</span>
              <div className="font-semibold text-white">
                {analysis.bpm?.toFixed(0)}
              </div>
            </div>
            <div>
              <span className="text-white/60">Tempo</span>
              <div className="font-semibold text-white">{analysis.tempo}</div>
            </div>
            <div>
              <span className="text-white/60">Duração</span>
              <div className="font-semibold text-white">
                {analysis.duration.toFixed(1)}s
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs text-white/60">Beats Detectados</span>
            <div className="text-sm text-white/80">
              {analysis.beats.length} beats
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Calcular multiplicador de velocidade baseado em BPM
 * BPM baixo (lento) = speed reduzida
 * BPM alto (rápido) = speed aumentada
 */
function getBPMMultiplier(bpm: number): number {
  if (bpm < 90) return 0.8; // SlowPace
  if (bpm < 130) return 1.0; // MediumPace
  return 1.2; // FastPace
}

export default AudioUpload;
