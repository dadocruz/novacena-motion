import { useCallback, useEffect, useRef, useState } from 'react';

export interface RenderJob {
  id: string;
  template: string;
  format: 'story' | 'feed';
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt?: number;
  completedAt?: number;
  error?: string;
  outputPath?: string;
}

export interface RenderQueueState {
  jobs: RenderJob[];
  activeCount: number;
  maxParallel: number;
}

export function useRenderQueue(maxParallel: number = 2) {
  const [queue, setQueue] = useState<RenderQueueState>({
    jobs: [],
    activeCount: 0,
    maxParallel,
  });

  const processRef = useRef<NodeJS.Timeout>();

  // Adicionar job à fila
  const enqueue = useCallback((template: string, format: 'story' | 'feed') => {
    const id = `${template}-${format}-${Date.now()}`;
    const job: RenderJob = {
      id,
      template,
      format,
      status: 'queued',
      progress: 0,
    };

    setQueue(prev => ({
      ...prev,
      jobs: [...prev.jobs, job],
    }));

    return id;
  }, []);

  // Processar fila automáticamente
  useEffect(() => {
    processRef.current = setInterval(() => {
      setQueue(prev => {
        const active = prev.jobs.filter(j => j.status === 'rendering').length;
        
        if (active < prev.maxParallel) {
          // Encontrar próximo job na fila
          const nextJob = prev.jobs.find(j => j.status === 'queued');
          
          if (nextJob) {
            return {
              ...prev,
              jobs: prev.jobs.map(j =>
                j.id === nextJob.id
                  ? { ...j, status: 'rendering', startedAt: Date.now(), progress: 1 }
                  : j
              ),
              activeCount: active + 1,
            };
          }
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(processRef.current);
  }, []);

  // Atualizar progresso de um job
  const updateProgress = useCallback((jobId: string, progress: number) => {
    setQueue(prev => ({
      ...prev,
      jobs: prev.jobs.map(j =>
        j.id === jobId ? { ...j, progress: Math.min(progress, 99) } : j
      ),
    }));
  }, []);

  // Marcar job como completo
  const complete = useCallback((jobId: string, outputPath: string) => {
    setQueue(prev => ({
      ...prev,
      jobs: prev.jobs.map(j =>
        j.id === jobId
          ? { ...j, status: 'completed', progress: 100, completedAt: Date.now(), outputPath }
          : j
      ),
      activeCount: Math.max(0, prev.activeCount - 1),
    }));
  }, []);

  // Marcar job como erro
  const fail = useCallback((jobId: string, error: string) => {
    setQueue(prev => ({
      ...prev,
      jobs: prev.jobs.map(j =>
        j.id === jobId ? { ...j, status: 'failed', error, completedAt: Date.now() } : j
      ),
      activeCount: Math.max(0, prev.activeCount - 1),
    }));
  }, []);

  // Limpar jobs completos
  const clearCompleted = useCallback(() => {
    setQueue(prev => ({
      ...prev,
      jobs: prev.jobs.filter(j => j.status !== 'completed' && j.status !== 'failed'),
    }));
  }, []);

  // Estatísticas
  const stats = {
    total: queue.jobs.length,
    queued: queue.jobs.filter(j => j.status === 'queued').length,
    active: queue.jobs.filter(j => j.status === 'rendering').length,
    completed: queue.jobs.filter(j => j.status === 'completed').length,
    failed: queue.jobs.filter(j => j.status === 'failed').length,
  };

  return {
    queue: queue.jobs,
    enqueue,
    updateProgress,
    complete,
    fail,
    clearCompleted,
    stats,
    maxParallel,
  };
}
