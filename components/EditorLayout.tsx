'use client';

import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Preview } from './Preview';
import { TemplateSelector, MotionPanel, FormatSelector } from './ControlPanels';
import { Upload, Download, Plus, Settings } from 'lucide-react';

export interface EditorLayoutProps {
  className?: string;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({ className = '' }) => {
  const {
    currentProject,
    updateProject,
    panelOpen,
    setPanelOpen,
    previewFormat,
  } = useEditorStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCoverUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      updateProject({
        coverImage: event.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  }, [updateProject]);

  return (
    <div className={`flex flex-col h-screen bg-gray-950 text-white ${className}`}>
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">NovaCena Motion</h1>
            <p className="text-sm text-white/60">Crie vídeos profissionais em minutos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Configurações avançadas"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-6 p-6 overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 bg-white/5 rounded-lg border border-white/10 overflow-y-auto space-y-4 p-4">
          {/* Project Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Informações do Projeto</h3>

            <div>
              <label className="block text-xs text-white/60 mb-1">Artista</label>
              <input
                type="text"
                value={currentProject.artistName || ''}
                onChange={(e) => updateProject({ artistName: e.target.value })}
                placeholder="Nome do artista"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Música</label>
              <input
                type="text"
                value={currentProject.songTitle || ''}
                onChange={(e) => updateProject({ songTitle: e.target.value })}
                placeholder="Título da música"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Data de Lançamento</label>
              <input
                type="date"
                value={currentProject.releaseDate || ''}
                onChange={(e) => updateProject({ releaseDate: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Cover Upload */}
            <div>
              <label className="block text-xs text-white/60 mb-1">Capa do Álbum</label>
              <label className="w-full px-3 py-2 bg-blue-600/20 border border-blue-500 rounded text-sm cursor-pointer hover:bg-blue-600/30 transition-colors flex items-center gap-2">
                <Upload size={14} />
                <span>Selecionar capa</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
              {currentProject.coverImage && (
                <div className="mt-2 rounded overflow-hidden">
                  <img
                    src={currentProject.coverImage as string}
                    alt="Cover"
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Template Selection */}
          <TemplateSelector />

          <hr className="border-white/10" />

          {/* Format Selection */}
          <FormatSelector />

          <hr className="border-white/10" />

          {/* Motion Controls */}
          <MotionPanel />

          {showAdvanced && (
            <>
              <hr className="border-white/10" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white/80">Mais Opções</h3>
                <button className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-sm hover:bg-white/10 transition-colors">
                  Efeitos Customizados
                </button>
                <button className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-sm hover:bg-white/10 transition-colors">
                  Carregar Preset
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center - Preview */}
        <div className="flex-1 bg-black rounded-lg overflow-hidden flex flex-col">
          <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex justify-between items-center">
            <span className="text-sm text-white/60">
              Preview {previewFormat === 'story' ? '📱 Story' : '📸 Feed'}
            </span>
            <div className="text-xs text-white/50 font-mono">
              {previewFormat === 'story' ? '1080x1920' : '1080x1350'}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Preview className="w-full h-full" />
          </div>
        </div>

        {/* Right Panel - Export & Queue */}
        <div className="w-80 bg-white/5 rounded-lg border border-white/10 overflow-y-auto space-y-4 p-4">
          <h3 className="text-sm font-semibold text-white/80">Exportar</h3>

          <div className="space-y-2">
            <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2">
              <Download size={16} />
              Renderizar Story
            </button>
            <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2">
              <Download size={16} />
              Renderizar Feed
            </button>
          </div>

          <hr className="border-white/10" />

          <div>
            <h4 className="text-xs font-semibold text-white/80 mb-2">Renderizar Ambos</h4>
            <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2">
              <Plus size={16} />
              Renderizar Story + Feed
            </button>
          </div>

          <hr className="border-white/10" />

          {/* Queue Status */}
          <div>
            <h4 className="text-xs font-semibold text-white/80 mb-2">Fila de Renders</h4>
            <div className="bg-black/50 rounded p-3 text-xs text-white/60 space-y-1">
              <div>Nenhum render em progresso</div>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Recent Renders */}
          <div>
            <h4 className="text-xs font-semibold text-white/80 mb-2">Renders Recentes</h4>
            <div className="bg-black/50 rounded p-3 text-xs text-white/60 text-center">
              Nenhum render ainda
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/40 px-6 py-3 text-xs text-white/50">
        <div className="flex justify-between items-center">
          <span>v1.0.0 REFACTORED</span>
          <span>
            Versão optimizada com cache, lazy loading e parallelização
          </span>
        </div>
      </footer>
    </div>
  );
};

export default EditorLayout;
