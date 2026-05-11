import { useCallback, useEffect, useState } from 'react';
import type { MotionConfig } from '../remotion/types';

type MotionPreset = {
  id: string;
  name: string;
  config: MotionConfig;
  createdAt: number;
  thumbnail?: string;
};

const PRESETS_KEY = 'novacena_motion_presets';
const CURRENT_KEY = 'novacena_current_config';

export function useMotionConfig(initialConfig?: MotionConfig) {
  const [config, setConfig] = useState<MotionConfig>(initialConfig || {});
  const [presets, setPresets] = useState<MotionPreset[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar presets e config salva
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem(PRESETS_KEY);
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }

      const savedConfig = localStorage.getItem(CURRENT_KEY);
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }

      setLoading(false);
    } catch (error) {
      console.warn('Erro ao carregar configs:', error);
      setLoading(false);
    }
  }, []);

  // Atualizar config
  const update = useCallback((partial: Partial<MotionConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(CURRENT_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Erro ao salvar config:', error);
      }
      return updated;
    });
  }, []);

  // Resetar config
  const reset = useCallback((toConfig?: MotionConfig) => {
    const newConfig = toConfig || {};
    setConfig(newConfig);
    try {
      localStorage.removeItem(CURRENT_KEY);
    } catch (error) {
      console.warn('Erro ao resetar config:', error);
    }
  }, []);

  // Salvar como preset
  const savePreset = useCallback((name: string, thumbnail?: string) => {
    const preset: MotionPreset = {
      id: `preset-${Date.now()}`,
      name,
      config,
      createdAt: Date.now(),
      thumbnail,
    };

    setPresets(prev => {
      const updated = [...prev, preset];
      try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Erro ao salvar preset:', error);
      }
      return updated;
    });

    return preset.id;
  }, [config]);

  // Carregar preset
  const loadPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      update(preset.config);
      return true;
    }
    return false;
  }, [presets, update]);

  // Deletar preset
  const deletePreset = useCallback((presetId: string) => {
    setPresets(prev => {
      const updated = prev.filter(p => p.id !== presetId);
      try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Erro ao deletar preset:', error);
      }
      return updated;
    });
  }, []);

  // Renomear preset
  const renamePreset = useCallback((presetId: string, newName: string) => {
    setPresets(prev => {
      const updated = prev.map(p => (p.id === presetId ? { ...p, name: newName } : p));
      try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Erro ao renomear preset:', error);
      }
      return updated;
    });
  }, []);

  // Smart presets (Magic Presets)
  const applySmartPreset = useCallback((type: 'dark' | 'bright' | 'vibrant' | 'vintage' | 'minimal') => {
    const smartConfigs: Record<string, Partial<MotionConfig>> = {
      dark: {
        glowColor: 'rgba(190, 90, 255, 0.32)', // Purple
        background: { overlay: '0.75', blur: 12 },
        particlesEnabled: true,
        speed: 0.9,
      },
      bright: {
        glowColor: 'rgba(255, 200, 80, 0.32)', // Gold
        background: { overlay: 0.5, blur: 8 },
        particlesEnabled: true,
        speed: 1.1,
      },
      vibrant: {
        glowColor: 'rgba(255, 60, 60, 0.32)', // Red
        background: { overlay: 0.6, blur: 10 },
        particlesEnabled: true,
        speed: 1.0,
      },
      vintage: {
        glowColor: 'rgba(255, 140, 60, 0.32)', // Orange
        background: { overlay: 0.7, blur: 15 },
        particlesEnabled: false,
        speed: 0.8,
      },
      minimal: {
        glowColor: 'rgba(255, 255, 255, 0.20)', // Off-white
        background: { overlay: 0.5, blur: 20 },
        particlesEnabled: false,
        speed: 1.0,
      },
    };

    update(smartConfigs[type] as Partial<MotionConfig>);
  }, [update]);

  return {
    config,
    update,
    reset,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    renamePreset,
    applySmartPreset,
    loading,
  };
}
