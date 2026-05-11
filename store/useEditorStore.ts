import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { MotionConfig, MotionProject, TemplateId } from '../remotion/types';

export interface EditorState {
  // Project
  currentProject: Partial<MotionProject>;
  setProject: (project: Partial<MotionProject>) => void;
  updateProject: (updates: Partial<MotionProject>) => void;
  
  // Motion Config
  motionConfig: MotionConfig;
  setMotionConfig: (config: MotionConfig) => void;
  updateMotionConfig: (updates: Partial<MotionConfig>) => void;
  
  // UI State
  selectedTemplate: TemplateId;
  setSelectedTemplate: (template: TemplateId) => void;
  
  previewFormat: 'story' | 'feed';
  setPreviewFormat: (format: 'story' | 'feed') => void;
  
  panelOpen: 'motion' | 'text' | 'effects' | 'export' | null;
  setPanelOpen: (panel: 'motion' | 'text' | 'effects' | 'export' | null) => void;
  
  // Render
  isRenderingPreview: boolean;
  setIsRenderingPreview: (rendering: boolean) => void;
  
  previewProgress: number;
  setPreviewProgress: (progress: number) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentProject: {},
  motionConfig: {},
  selectedTemplate: 'available_now' as const,
  previewFormat: 'story' as const,
  panelOpen: 'motion' as const,
  isRenderingPreview: false,
  previewProgress: 0,
};

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...initialState,

        setProject: (project) => set({ currentProject: project }),
        updateProject: (updates) =>
          set((state) => ({
            currentProject: { ...state.currentProject, ...updates },
          })),

        setMotionConfig: (config) => set({ motionConfig: config }),
        updateMotionConfig: (updates) =>
          set((state) => ({
            motionConfig: { ...state.motionConfig, ...updates },
          })),

        setSelectedTemplate: (template) => set({ selectedTemplate: template }),

        setPreviewFormat: (format) => set({ previewFormat: format }),

        setPanelOpen: (panel) => set({ panelOpen: panel }),

        setIsRenderingPreview: (rendering) => set({ isRenderingPreview: rendering }),

        setPreviewProgress: (progress) => set({ previewProgress: progress }),

        reset: () => set(initialState),
      }),
      {
        name: 'novacena-editor-state',
        // Persistir apenas campos importantes
        partialize: (state) => ({
          currentProject: state.currentProject,
          motionConfig: state.motionConfig,
          selectedTemplate: state.selectedTemplate,
        }),
      }
    )
  )
);
