import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { AvailableNow } from './AvailableNow';
import { WatchOnYouTube } from './WatchOnYouTube';
import { Milestone } from './Milestone';
import { OutNow } from './OutNow';
import { getProject } from './project';


const FPS = 30;

const resolveDurationInFramesFromProps = ({ props }: { props: any }) => {
  const seconds = Number(props?.durationSeconds ?? 8);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 8;

  return {
    durationInFrames: Math.round(safeSeconds * FPS),
  };
};

// ============================================================
// CARREGAMENTO DE FONTES PARA O RENDER
// ============================================================
// O Remotion CLI roda num Chromium isolado que NÃO tem acesso ao app/fonts.css.
// Sem isso, todas as fontes caem pra Arial (Sans-Serif default).
// Aqui injetamos as 18 fontes via @font-face antes de qualquer composition renderizar.

const FONT_DEFINITIONS: Array<{ family: string; file: string; format: string }> = [
  // DISPLAY
  { family: 'TuskerGrotesk Super',   file: 'TuskerGrotesk-8800Super.otf',    format: 'opentype' },
  { family: 'TuskerGrotesk Medium',  file: 'TuskerGrotesk-6500Medium.otf',   format: 'opentype' },
  { family: 'TuskerGrotesk Thin',    file: 'TuskerGrotesk-5500Medium.otf',   format: 'opentype' },
  { family: 'BebasNeue',             file: 'BebasNeue-Regular.otf',          format: 'opentype' },
  { family: 'Antonio',               file: 'Antonio-VariableFont_wght.ttf',  format: 'truetype' },
  { family: 'Oswald',                file: 'Oswald-VariableFont_wght.ttf',   format: 'truetype' },
  { family: 'BurbankBig',            file: 'BurbankBig-Black.otf',           format: 'opentype' },
  { family: 'BurbankCond',           file: 'BurbankBigCond-Bold.otf',        format: 'opentype' },
  { family: 'Gobold',                file: 'Gobold-Extra.otf',               format: 'opentype' },
  { family: 'InterstateBlackCond',   file: 'Interstate-BlackCond.otf',       format: 'opentype' },
  { family: 'PantonBlackItalic',     file: 'Panton-BlackitalicCaps.otf',     format: 'opentype' },
  { family: 'BoldVision',            file: 'BoldVision-Regular.ttf',         format: 'truetype' },

  // SANS
  { family: 'Panton',                file: 'Panton-Regular.otf',             format: 'opentype' },
  { family: 'Klein',                 file: 'Klein-Text.ttf',                 format: 'truetype' },
  { family: 'Coco',                  file: 'Coco-Regular.otf',               format: 'opentype' },
  { family: 'Ubuntu',                file: 'Ubuntu-Medium.ttf',              format: 'truetype' },

  // SPECIAL
  { family: 'AuthorityRounded',      file: 'Authority-Rounded.ttf',          format: 'truetype' },
  { family: 'Toxico',                file: 'Toxico.otf',                     format: 'opentype' },
];

let fontsInjected = false;

function injectFontsOnce(): Promise<void> {
  if (fontsInjected || typeof document === 'undefined') {
    return Promise.resolve();
  }
  fontsInjected = true;

  // Cria um <style> com @font-face apontando pra /public/fonts/
  // staticFile() resolve a URL correta tanto no preview quanto no render CLI.
  const css = FONT_DEFINITIONS.map(
    (f) =>
      `@font-face { font-family: '${f.family}'; src: url('${staticFile(`fonts/${f.file}`)}') format('${f.format}'); font-display: block; }`
  ).join('\n');

  const style = document.createElement('style');
  style.setAttribute('data-novacena-fonts', 'true');
  style.textContent = css;
  document.head.appendChild(style);

  // Força o navegador (Chromium do render) a baixar e parsear cada fonte
  // ANTES de qualquer frame ser renderizado.
  if (typeof document.fonts?.load === 'function') {
    return Promise.all(
      FONT_DEFINITIONS.map((f) =>
        document.fonts.load(`16px '${f.family}'`).catch(() => null)
      )
    ).then(() => undefined);
  }

  // Fallback simples se a Font Loading API não existir
  return new Promise((resolve) => setTimeout(resolve, 300));
}

// Hook que segura o render até as fontes estarem prontas
function useFontsReady() {
  const [handle] = React.useState(() => delayRender('Loading fonts'));

  React.useEffect(() => {
    injectFontsOnce()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
}

const templates = [
  { id: 'AvailableNow', component: AvailableNow, project: getProject('available_now') },
  { id: 'WatchOnYouTube', component: WatchOnYouTube, project: getProject('watch_youtube') },
  { id: 'Milestone', component: Milestone, project: getProject('milestone') },
  { id: 'OutNow', component: OutNow, project: getProject('out_now') },
] as const;

export const RemotionRoot: React.FC = () => {
  useFontsReady();

  return (
    <>
      {templates.map((template) => (
        <React.Fragment key={template.id}>
          <Composition
            calculateMetadata={resolveDurationInFramesFromProps}
            id={template.id}
            component={template.component}
            width={1080}
            height={1920}
            fps={FPS}
            defaultProps={{ ...template.project, renderTarget: 'story' as const }}
          />
          <Composition
            calculateMetadata={resolveDurationInFramesFromProps}
            id={`${template.id}Feed`}
            component={template.component}
            width={1080}
            height={1350}
            fps={FPS}
            defaultProps={{ ...template.project, renderTarget: 'feed' as const }}
          />
        </React.Fragment>
      ))}
    </>
  );
};
