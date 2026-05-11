#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('out', { recursive: true });

const renders = [
  ['AvailableNow Story', 'AvailableNow', 'out/available-now-story.mp4'],
  ['AvailableNow Feed', 'AvailableNowFeed', 'out/available-now-feed.mp4'],
  ['WatchOnYouTube Story', 'WatchOnYouTube', 'out/youtube-story.mp4'],
  ['WatchOnYouTube Feed', 'WatchOnYouTubeFeed', 'out/youtube-feed.mp4'],
  ['Milestone Story', 'Milestone', 'out/milestone-story.mp4'],
  ['Milestone Feed', 'MilestoneFeed', 'out/milestone-feed.mp4'],
  ['OutNow Story', 'OutNow', 'out/out-now-story.mp4'],
  ['OutNow Feed', 'OutNowFeed', 'out/out-now-feed.mp4'],
];

for (const [name, composition, output] of renders) {
  console.log(`\n=== Renderizando ${name} ===`);
  execSync(`npx remotion render remotion/index.ts ${composition} ${output}`, { stdio: 'inherit' });
}

console.log('\n✓ Todos os 8 renders concluídos na pasta out/');
