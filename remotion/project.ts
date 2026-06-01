import raw from '../data/sample-project.json';
import type { MotionProject, TemplateId } from './types';

type RawProject = typeof raw;

export const templateOrder: TemplateId[] = [
  'available_now',
  'out_now',
  'watch_youtube',
  'milestone',
  'spotify_print',
];

export const templateLabels: Record<TemplateId, string> = {
  available_now: 'PRÉ-SAVE',
  watch_youtube: 'Assista no YouTube',
  milestone: '100k / Milestone',
  out_now: 'LANÇAMENTO',
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
