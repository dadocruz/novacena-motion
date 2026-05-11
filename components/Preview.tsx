'use client';

import React, { useMemo, useCallback } from 'react';
import { Player } from '@remotion/player';
import { useEditorStore } from '../store/useEditorStore';
import { useLazyFonts } from '../hooks/useLazyFonts';
import { useRenderCache } from '../hooks/useRenderCache';
import type { TemplateId, MotionProject } from '../remotion/types';

// Lazy load componentes
const AvailableNow = React.lazy(() => import('../remotion/AvailableNow').then((m) => ({ default: m.AvailableNow })));
const WatchOnYouTube = React.lazy(() => import('../remotion/WatchOnYouTube').then((m) => ({ default: m.WatchOnYouTube })));
const Milestone = React.lazy(() => import('../remotion/Milestone').then((m) => ({ default: m.Milestone })));
const OutNow = React.lazy(() => import('../remotion/OutNow').then((m) => ({ default: m.OutNow })));

const COMPONENTS: Record<TemplateId, React.LazyExoticComponent<any>> = {
  available_now: AvailableNow,
  watch_youtube: WatchOnYouTube,
  milestone: Milestone,
  out_now: OutNow,
};

export interface PreviewProps {
  className?: string;
}

export const Preview: React.FC<PreviewProps> = ({ className = '' }) => {
  const {
    currentProject,
    selectedTemplate,
    previewFormat,
    motionConfig,
    isRenderingPreview,
    setIsRenderingPreview,
    setPreviewProgress,
  } = useEditorStore();

  const { get: getCachedRender, set: setCachedRender } = useRenderCache();

  // Lazy load fonts necessários
  const fontIds = useMemo(() => {
    const ids: string[] = [];
    if (motionConfig.fontHeadline) ids.push(motionConfig.fontHeadline);
    if (motionConfig.fontDate) ids.push(motionConfig.fontDate);
    if (motionConfig.fontCta) ids.push(motionConfig.fontCta);
    return ids;
  }, [motionConfig]);

  const { allLoaded: allFontsLoaded } = useLazyFonts(fontIds);

  // Construir MotionProject para render
  const project: MotionProject | null = useMemo(() => {
    if (!currentProject.artistName || !currentProject.songTitle) return null;

    return {
      type: selectedTemplate,
      artistName: currentProject.artistName,
      songTitle: currentProject.songTitle,
      headline: currentProject.headline || '',
      cta: currentProject.cta || '',
      releaseDate: currentProject.releaseDate,
      platforms: currentProject.platforms || [],
      coverImage: currentProject.coverImage || '',
      media: currentProject.media || {},
      format: currentProject.format || { width: previewFormat === 'story' ? 1080 : 1080, height: previewFormat === 'story' ? 1920 : 1350 },
      motion: motionConfig,
    } as MotionProject;
  }, [currentProject, selectedTemplate, previewFormat, motionConfig]);

  // Checar cache
  const cachedRender = useMemo(() => {
    if (!project) return null;
    return getCachedRender(project, previewFormat);
  }, [project, previewFormat, getCachedRender]);

  // Componente a renderizar
  const Component = project ? COMPONENTS[selectedTemplate] : null;

  if (!project) {
    return (
      <div className={`flex items-center justify-center bg-black/50 ${className}`}>
        <div className="text-center text-white/60">
          <p className="text-sm">Preencha os dados do projeto para ver preview</p>
        </div>
      </div>
    );
  }

  if (!allFontsLoaded) {
    return (
      <div className={`flex items-center justify-center bg-black/50 ${className}`}>
        <div className="text-center text-white/60">
          <p className="text-sm">Carregando fontes...</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className={`flex items-center justify-center bg-black/50 ${className}`}>
        <p className="text-white/60">Template não encontrado</p>
      </div>
    );
  }

  return (
    <div className={`bg-black overflow-hidden ${className}`}>
      <React.Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-black/50">
            <p className="text-white/60 text-sm">Carregando preview...</p>
          </div>
        }
      >
        <Player
          component={Component}
          durationInFrames={240}
          compositionWidth={project.format.primary.width}
          compositionHeight={project.format.primary.height}
          fps={30}
          controls
          loop
          inputProps={project}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </React.Suspense>

      {/* Overlay de loading */}
      {isRenderingPreview && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-white text-sm">Renderizando...</div>
        </div>
      )}
    </div>
  );
};

export default Preview;
