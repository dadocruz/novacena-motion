import { Composition } from 'remotion';
import type { MotionProject, AudioAnalysis } from '../remotion/types';

/**
 * Novo template: Collaborator / Feat. Artist
 * Reage ao áudio com sync de beats
 * Layout: 2 covers side-by-side com names
 */

interface CollaboratorProps {
  data: MotionProject;
  audioAnalysis?: AudioAnalysis;
}

export const CollaboratorTemplate = (props: CollaboratorProps) => {
  // Este é um template placeholder
  // Would be implemented as a full Remotion composition
  // com análise em tempo real de beats/frequência

  return (
    <div>
      {/* Placeholder para Remotion Composition */}
      <div>Collaborator Template</div>
    </div>
  );
};

export function registerCollaboratorTemplates() {
  // Será registrado no remotion/index.ts
  // Incluindo story + feed variants
}
