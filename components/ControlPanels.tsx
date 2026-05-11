'use client';

import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { TemplateId } from '../remotion/types';
import { GripVertical } from 'lucide-react';

export const TEMPLATE_INFO: Record<TemplateId, { label: string; description: string; emoji: string }> = {
  available_now: {
    label: 'Disponível',
    description: 'Lançamento com countdown',
    emoji: '🚀',
  },
  watch_youtube: {
    label: 'Assista no YouTube',
    description: 'Premiação de vídeo',
    emoji: '📺',
  },
  milestone: {
    label: 'Milestone',
    description: 'Celebração de conquista',
    emoji: '🎉',
  },
  out_now: {
    label: 'Ouça Agora',
    description: 'Promoção genérica',
    emoji: '🎵',
  },
};

export interface TemplateSelectorProps {
  className?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ className = '' }) => {
  const { selectedTemplate, setSelectedTemplate } = useEditorStore();
  const templateIds: TemplateId[] = ['available_now', 'watch_youtube', 'milestone', 'out_now'];

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-semibold text-white/80 px-2">Templates</h3>

      <div className="grid grid-cols-2 gap-2">
        {templateIds.map((id) => {
          const info = TEMPLATE_INFO[id];
          const isSelected = selectedTemplate === id;

          return (
            <button
              key={id}
              onClick={() => setSelectedTemplate(id)}
              className={`
                p-3 rounded-lg transition-all cursor-pointer
                border border-white/10 hover:border-white/20
                ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-white/5 hover:bg-white/10'
                }
              `}
            >
              <div className="text-2xl mb-1">{info.emoji}</div>
              <div className="text-xs font-medium text-white">{info.label}</div>
              <div className="text-xs text-white/50">{info.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface MotionPanelProps {
  className?: string;
}

export const MotionPanel: React.FC<MotionPanelProps> = ({ className = '' }) => {
  const { motionConfig, updateMotionConfig } = useEditorStore();

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-semibold text-white/80">Configuração de Movimento</h3>

      {/* Wiggle Intensity */}
      <div>
        <label className="block text-xs text-white/60 mb-2">
          Intensidade de Wiggle: {(motionConfig.wiggleIntensity || 1).toFixed(1)}
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={motionConfig.wiggleIntensity || 1}
          onChange={(e) =>
            updateMotionConfig({ wiggleIntensity: parseFloat(e.target.value) })
          }
          className="w-full h-1 bg-white/20 rounded-lg accent-blue-500"
        />
      </div>

      {/* Spin Turns */}
      <div>
        <label className="block text-xs text-white/60 mb-2">
          Rotações da Capa: {motionConfig.spinTurns || 2}
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="1"
          value={motionConfig.spinTurns || 2}
          onChange={(e) => updateMotionConfig({ spinTurns: parseInt(e.target.value) })}
          className="w-full h-1 bg-white/20 rounded-lg accent-blue-500"
        />
      </div>

      {/* Speed */}
      <div>
        <label className="block text-xs text-white/60 mb-2">
          Velocidade: {(motionConfig.speed || 1).toFixed(1)}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={motionConfig.speed || 1}
          onChange={(e) => updateMotionConfig({ speed: parseFloat(e.target.value) })}
          className="w-full h-1 bg-white/20 rounded-lg accent-blue-500"
        />
      </div>

      {/* Particles Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">Partículas Ativas</span>
        <button
          onClick={() =>
            updateMotionConfig({ particlesEnabled: !motionConfig.particlesEnabled })
          }
          className={`
            px-3 py-1 rounded text-xs font-medium transition-colors
            ${
              motionConfig.particlesEnabled
                ? 'bg-green-600/20 text-green-300 border border-green-500'
                : 'bg-white/10 text-white/60 border border-white/20'
            }
          `}
        >
          {motionConfig.particlesEnabled ? 'Ligado' : 'Desligado'}
        </button>
      </div>

      {/* Final Flash */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">Flash Final</span>
        <button
          onClick={() => updateMotionConfig({ finalFlash: !motionConfig.finalFlash })}
          className={`
            px-3 py-1 rounded text-xs font-medium transition-colors
            ${
              motionConfig.finalFlash
                ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500'
                : 'bg-white/10 text-white/60 border border-white/20'
            }
          `}
        >
          {motionConfig.finalFlash ? 'Sim' : 'Não'}
        </button>
      </div>
    </div>
  );
};

export interface FormatSelectorProps {
  className?: string;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({ className = '' }) => {
  const { previewFormat, setPreviewFormat } = useEditorStore();

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-semibold text-white/80 px-2">Formato</h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setPreviewFormat('story')}
          className={`
            p-2 rounded-lg text-center transition-all text-xs font-medium
            ${
              previewFormat === 'story'
                ? 'bg-purple-600/20 border border-purple-500'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }
          `}
        >
          📱 Story <br /> 1080x1920
        </button>
        <button
          onClick={() => setPreviewFormat('feed')}
          className={`
            p-2 rounded-lg text-center transition-all text-xs font-medium
            ${
              previewFormat === 'feed'
                ? 'bg-purple-600/20 border border-purple-500'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }
          `}
        >
          📸 Feed <br /> 1080x1350
        </button>
      </div>
    </div>
  );
};
