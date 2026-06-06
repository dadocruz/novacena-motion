import raw from '../data/sample-project.json';
import type { MotionProject, TemplateId } from './types';

type RawProject = typeof raw;

export const templateOrder: TemplateId[] = [
  'available_now',
  'out_now',
  'watch_youtube',
  'youtube_subscribe',
  'youtube_views',
  'milestone',
  'spotify_print',
  'listen_deezer',
];

export const templateLabels: Record<TemplateId, string> = {
  available_now: 'PRÉ-SAVE',
  watch_youtube: 'Assista no YouTube',
  youtube_subscribe: 'Inscreva-se',
  youtube_views: 'Visualizações YT',
  milestone: 'Plays no single',
  out_now: 'DISPONÍVEL',
  spotify_print: 'Ouvintes Mensais',
  listen_deezer: 'Ouça na Deezer',
};

export function getProject(template: TemplateId): MotionProject {
  const data = raw as RawProject;
  return {
    ...data.defaults,
    ...data.templates[template],
    format: data.format,
  } as MotionProject;
}
