import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function useRenderStatus(jobId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    jobId ? `/api/render?jobId=${jobId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000, // Poll every 2s
    }
  );

  return {
    job: data?.job,
    isLoading,
    error,
    mutate,
  };
}

export function useAllRenders() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/render?list=true',
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 5000, // Poll every 5s
    }
  );

  return {
    renders: data,
    isLoading,
    error,
    mutate,
  };
}

export function usePresets() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/presets',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    presets: data?.presets || [],
    isLoading,
    error,
    mutate,
  };
}

export function usePreset(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/presets?id=${id}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    preset: data?.preset,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Criar novo render via API
 */
export async function renderProject(
  project: any,
  formats: ('story' | 'feed')[] = ['story', 'feed']
) {
  const res = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: {
        type: project.type,
        artistName: project.artistName,
        songTitle: project.songTitle,
        formats,
      },
      quality: 'medium',
    }),
  });

  if (!res.ok) throw new Error('Failed to render');
  return res.json();
}

/**
 * Enfileirar múltiplos renders (bulk)
 */
export async function bulkRender(projects: any[]) {
  const res = await fetch('/api/render/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projects: projects.map(p => ({
        artistName: p.artistName,
        songTitle: p.songTitle,
        templates: ['available_now', 'out_now'],
        formats: ['story', 'feed'],
      })),
    }),
  });

  if (!res.ok) throw new Error('Failed to bulk render');
  return res.json();
}

/**
 * Salvar preset de motion config
 */
export async function savePreset(name: string, config: any) {
  const res = await fetch('/api/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      config,
    }),
  });

  if (!res.ok) throw new Error('Failed to save preset');
  return res.json();
}

/**
 * Deletar preset
 */
export async function deletePreset(id: string) {
  const res = await fetch(`/api/presets?id=${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error('Failed to delete preset');
  return res.json();
}
