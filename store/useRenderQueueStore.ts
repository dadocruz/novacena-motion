import { create } from 'zustand';
import type { RenderJob } from '../hooks/useRenderQueue';

export interface RenderQueueState {
  jobs: RenderJob[];
  maxParallel: number;
  
  enqueue: (template: string, format: 'story' | 'feed') => string;
  updateProgress: (jobId: string, progress: number) => void;
  complete: (jobId: string, outputPath: string) => void;
  fail: (jobId: string, error: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  
  stats: {
    total: number;
    queued: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export const useRenderQueueStore = create<RenderQueueState>((set, get) => ({
  jobs: [],
  maxParallel: 2,

  enqueue: (template: string, format: 'story' | 'feed') => {
    const id = `${template}-${format}-${Date.now()}`;
    const job: RenderJob = {
      id,
      template,
      format,
      status: 'queued',
      progress: 0,
    };

    set((state) => ({
      jobs: [...state.jobs, job],
    }));

    return id;
  },

  updateProgress: (jobId: string, progress: number) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, progress: Math.min(progress, 99) } : j
      ),
    }));
  },

  complete: (jobId: string, outputPath: string) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'completed',
              progress: 100,
              completedAt: Date.now(),
              outputPath,
            }
          : j
      ),
    }));
  },

  fail: (jobId: string, error: string) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? { ...j, status: 'failed', error, completedAt: Date.now() }
          : j
      ),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      jobs: state.jobs.filter(
        (j) => j.status !== 'completed' && j.status !== 'failed'
      ),
    }));
  },

  clearAll: () => {
    set({ jobs: [] });
  },

  get stats() {
    const state = get();
    return {
      total: state.jobs.length,
      queued: state.jobs.filter((j) => j.status === 'queued').length,
      active: state.jobs.filter((j) => j.status === 'rendering').length,
      completed: state.jobs.filter((j) => j.status === 'completed').length,
      failed: state.jobs.filter((j) => j.status === 'failed').length,
    };
  },
}));
