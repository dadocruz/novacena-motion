import raw from '../data/sample-project.json';
import type { MotionProject, TemplateId } from './types';

type RawProject = typeof raw;

export const templateOrder: TemplateId[] = [
  'available_now',
  'watch_youtube',
  'milestone',
  'out_now',
  'spotify_print',
];

export const templateLabels: Record<TemplateId, string> = {
  available_now: 'Disponível',
  watch_youtube: 'Assista no YouTube',
  milestone: '100k / Milestone',
  out_now: 'Ouça Agora',
  spotify_print: '📱 Spotify Print',
};

export function getProject(template: TemplateId): MotionProject {
  const data = raw as RawProject;
  return {
    ...data.defaults,
    ...data.templates[template],
    format: data.format,
  } as MotionProject;
}
