import { registerRoot } from 'remotion';
import { RemotionRoot } from '../remotion/Root';

const FPS = 30;

const resolveDurationInFramesFromProps = ({ props }: { props: any }) => {
  const seconds = Number(props?.durationSeconds ?? props?.project?.durationSeconds ?? 8);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 8;

  return {
    durationInFrames: Math.round(safeSeconds * FPS),
  };
};




registerRoot(RemotionRoot);
