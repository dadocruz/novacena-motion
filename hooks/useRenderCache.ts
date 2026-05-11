import { useEffect, useState, useCallback } from 'react';
import type { MotionProject } from '../remotion/types';

export interface CacheEntry {
  id: string;
  project: MotionProject;
  videoPath: string;
  thumbnail: string;
  format: 'story' | 'feed';
  template: string;
  createdAt: number;
  size: number; // bytes
}

const CACHE_KEY = 'novacena_render_cache';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useRenderCache() {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [loading, setLoading] = useState(true);

  // Carregar cache do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheEntry[];
        const now = Date.now();
        
        // Filtrar entradas expiradas
        const valid = parsed.filter(entry => now - entry.createdAt < CACHE_TTL);
        
        setCache(new Map(valid.map(entry => [entry.id, entry])));
      }
      setLoading(false);
    } catch (error) {
      console.warn('Erro ao carregar cache:', error);
      setLoading(false);
    }
  }, []);

  // Gerar ID para cache baseado no projeto
  const generateCacheId = useCallback((project: MotionProject, format: 'story' | 'feed') => {
    const key = JSON.stringify({
      template: project.type,
      artist: project.artistName,
      song: project.songTitle,
      platforms: project.platforms.sort(),
      format,
      motion: project.motion,
    });
    return btoa(key).slice(0, 32); // Base64 hash
  }, []);

  // Obter render do cache
  const get = useCallback(
    (project: MotionProject, format: 'story' | 'feed') => {
      const id = generateCacheId(project, format);
      return cache.get(id);
    },
    [cache, generateCacheId]
  );

  // Salvar render no cache
  const set = useCallback(
    (project: MotionProject, format: 'story' | 'feed', videoPath: string, thumbnail: string, size: number) => {
      const id = generateCacheId(project, format);
      
      const entry: CacheEntry = {
        id,
        project,
        videoPath,
        thumbnail,
        format,
        template: project.type,
        createdAt: Date.now(),
        size,
      };

      setCache(prev => {
        const newCache = new Map(prev);
        newCache.set(id, entry);

        // Verificar tamanho total
        let totalSize = 0;
        newCache.forEach(e => (totalSize += e.size));

        // Se excedeu limite, remover mais antigos
        if (totalSize > MAX_CACHE_SIZE) {
          const sorted = Array.from(newCache.values())
            .sort((a, b) => a.createdAt - b.createdAt);

          for (let i = 0; i < Math.ceil(sorted.length * 0.2); i++) {
            newCache.delete(sorted[i].id);
          }
        }

        // Persistir no localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(newCache.values())));
        } catch (error) {
          console.warn('Erro ao salvar cache:', error);
        }

        return newCache;
      });
    },
    [generateCacheId]
  );

  // Limpar cache
  const clear = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setCache(new Map());
  }, []);

  // Statísticas
  const stats = {
    entries: cache.size,
    totalSize: Array.from(cache.values()).reduce((sum, e) => sum + e.size, 0),
  };

  return {
    cache,
    get,
    set,
    clear,
    stats,
    loading,
  };
}
