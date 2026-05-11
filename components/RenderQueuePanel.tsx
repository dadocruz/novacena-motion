'use client';

import React from 'react';
import { useRenderQueueStore } from '../store/useRenderQueueStore';
import { Loader, Check, AlertCircle, Trash2 } from 'lucide-react';

export interface RenderQueuePanelProps {
  className?: string;
}

export const RenderQueuePanel: React.FC<RenderQueuePanelProps> = ({ className = '' }) => {
  const { jobs, stats, clearCompleted, clearAll } = useRenderQueueStore();

  const activeJobs = jobs.filter((j) => j.status === 'rendering' || j.status === 'queued');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const failedJobs = jobs.filter((j) => j.status === 'failed');

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white/80">Fila de Renders</h3>
        {completedJobs.length > 0 && (
          <button
            onClick={clearCompleted}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Limpar Completos
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-blue-600/20 border border-blue-500/30 rounded p-2">
          <div className="text-blue-300 font-semibold">{stats.active}</div>
          <div className="text-blue-200/60 text-xs">Renderizando</div>
        </div>
        <div className="bg-yellow-600/20 border border-yellow-500/30 rounded p-2">
          <div className="text-yellow-300 font-semibold">{stats.queued}</div>
          <div className="text-yellow-200/60 text-xs">Na Fila</div>
        </div>
        <div className="bg-green-600/20 border border-green-500/30 rounded p-2">
          <div className="text-green-300 font-semibold">{stats.completed}</div>
          <div className="text-green-200/60 text-xs">Completos</div>
        </div>
        <div className="bg-red-600/20 border border-red-500/30 rounded p-2">
          <div className="text-red-300 font-semibold">{stats.failed}</div>
          <div className="text-red-200/60 text-xs">Falhas</div>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide">
            Em Progresso
          </h4>
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <div key={job.id} className="bg-black/50 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">
                    {job.template} - {job.format}
                  </span>
                  {job.status === 'rendering' ? (
                    <Loader size={14} className="animate-spin text-blue-400" />
                  ) : (
                    <span className="text-xs text-yellow-400">Aguardando...</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Progresso</span>
                    <span className="font-mono text-white/80">{job.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide">
            Completos
          </h4>
          <div className="space-y-2">
            {completedJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="bg-green-600/10 border border-green-500/30 rounded p-2 flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  <span className="text-xs text-white/80">
                    {job.template} - {job.format}
                  </span>
                </div>
                <span className="text-xs text-white/50">
                  {job.completedAt
                    ? new Date(job.completedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Jobs */}
      {failedJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-red-400 uppercase tracking-wide">
            Falhas
          </h4>
          <div className="space-y-2">
            {failedJobs.slice(0, 3).map((job) => (
              <div
                key={job.id}
                className="bg-red-600/10 border border-red-500/30 rounded p-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-xs text-white/80">
                    {job.template} - {job.format}
                  </span>
                </div>
                <p className="text-xs text-red-300/60">{job.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="bg-black/50 rounded p-4 text-center text-xs text-white/50">
          Nenhum render em fila
        </div>
      )}

      {/* Clear All */}
      {jobs.length > 0 && (
        <button
          onClick={clearAll}
          className="w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 bg-red-600/10 border border-red-500/30 rounded hover:bg-red-600/20 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={14} />
          Limpar Tudo
        </button>
      )}
    </div>
  );
};

export default RenderQueuePanel;
