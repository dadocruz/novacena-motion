import React from 'react';
import { Composition } from 'remotion';
import { AvailableNow } from './AvailableNow';
import { WatchOnYouTube } from './WatchOnYouTube';
import { Milestone } from './Milestone';
import { OutNow } from './OutNow';
import { getProject } from './project';

const FPS = 30;
const DURATION_FRAMES = 240;

const templates = [
  { id: 'AvailableNow', component: AvailableNow, project: getProject('available_now') },
  { id: 'WatchOnYouTube', component: WatchOnYouTube, project: getProject('watch_youtube') },
  { id: 'Milestone', component: Milestone, project: getProject('milestone') },
  { id: 'OutNow', component: OutNow, project: getProject('out_now') },
] as const;

export const RemotionRoot: React.FC = () => (
  <>
    {templates.map((template) => (
      <React.Fragment key={template.id}>
        <Composition
          id={template.id}
          component={template.component}
          width={1080}
          height={1920}
          fps={FPS}
          durationInFrames={DURATION_FRAMES}
          defaultProps={{ ...template.project, renderTarget: 'story' as const }}
        />
        <Composition
          id={`${template.id}Feed`}
          component={template.component}
          width={1080}
          height={1350}
          fps={FPS}
          durationInFrames={DURATION_FRAMES}
          defaultProps={{ ...template.project, renderTarget: 'feed' as const }}
        />
      </React.Fragment>
    ))}
  </>
);
