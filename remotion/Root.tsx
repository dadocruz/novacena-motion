import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { AvailableNow } from './AvailableNow';
import { WatchOnYouTube } from './WatchOnYouTube';
import { YouTubeSubscribe } from './YouTubeSubscribe';
import { YouTubeViews } from './YouTubeViews';
import { Milestone } from './Milestone';
import { OutNow } from './OutNow';
import { SpotifyPrint } from './SpotifyPrint';
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
// IMPORTANTE: as fontes precisam ser injetadas DENTRO do contexto
// de cada composition (não no RemotionRoot), porque o Remotion CLI
// renderiza cada composition num documento isolado.

const FONT_DEFINITIONS: Array<{ family: string; file: string; format: string }> = [
  // PREMIUM IMPORTADAS
  { family: 'Akira Expanded E BOLD', file: 'premium/akiraexpandedebold.otf', format: 'opentype' },
  { family: 'Panton ExtraBlack', file: 'premium/pantonextrablack.otf', format: 'opentype' },
  { family: 'Akira Expanded', file: 'premium/akiraexpanded.otf', format: 'opentype' },
  { family: 'Gramatika Black', file: 'premium/gramatikablack.ttf', format: 'truetype' },
  { family: 'Heavitas', file: 'premium/heavitas.ttf', format: 'truetype' },
  { family: 'LEMON MILK', file: 'premium/lemonmilk.otf', format: 'opentype' },
  { family: '1797 Compressed', file: 'premium/1797compressed.otf', format: 'opentype' },
  { family: 'Aldivaro ExtraBold', file: 'premium/aldivaroextrabold.otf', format: 'opentype' },
  { family: 'Bebas Neue', file: 'premium/bebasneue.otf', format: 'opentype' },
  { family: 'Kenyan Coffee', file: 'premium/kenyancoffee.otf', format: 'opentype' },
  { family: 'BigNoodleTitling Oblique', file: 'premium/bignoodletitlingoblique.ttf', format: 'truetype' },
  { family: 'Nexa', file: 'premium/nexa.otf', format: 'opentype' },
  { family: 'Fair Prosper', file: 'premium/fairprosper.ttf', format: 'truetype' },
  { family: 'Casanova Scotia', file: 'premium/casanovascotia.otf', format: 'opentype' },
  { family: 'Candrika', file: 'premium/candrika.ttf', format: 'truetype' },
  { family: 'Varane', file: 'premium/varane.otf', format: 'opentype' },
  { family: 'AkhandSoft Light', file: 'premium/akhandsoft-light.otf', format: 'opentype' },
  { family: 'AkhandSoft Bold', file: 'premium/akhandsoft-bold.otf', format: 'opentype' },
  { family: 'AkhandSoft Black', file: 'premium/akhandsoft-black.otf', format: 'opentype' },

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

// Gera o CSS @font-face uma única vez por modulo
const FONT_FACE_CSS = FONT_DEFINITIONS.map(
  (f) =>
    `@font-face { font-family: '${f.family}'; src: url('${staticFile(`fonts/${f.file}`)}') format('${f.format}'); font-display: block; }`
).join('\n');

// Componente que injeta as fontes e segura o render até estarem prontas.
// Roda DENTRO do contexto da composition — é isso que faz funcionar no CLI.
const FontsInjector: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = React.useState(() => delayRender('Loading fonts (composition)'));
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
        if (typeof document !== 'undefined' && typeof document.fonts?.load === 'function') {
          await Promise.all(
            FONT_DEFINITIONS.map((f) =>
              document.fonts.load(`16px '${f.family}'`).catch(() => null)
            )
          );
        }
      } catch {
        // ignore
      }
      if (!cancelled) {
        setReady(true);
        continueRender(handle);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [handle]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_FACE_CSS }} />
      {ready ? children : null}
    </>
  );
};

// Wrappers que aplicam o FontsInjector a cada componente template
const AvailableNowWithFonts: React.FC<any> = (props) => (
  <FontsInjector><AvailableNow {...props} /></FontsInjector>
);
const WatchOnYouTubeWithFonts: React.FC<any> = (props) => (
  <FontsInjector><WatchOnYouTube {...props} /></FontsInjector>
);
const YouTubeSubscribeWithFonts: React.FC<any> = (props) => (
  <FontsInjector><YouTubeSubscribe {...props} /></FontsInjector>
);
const YouTubeViewsWithFonts: React.FC<any> = (props) => (
  <FontsInjector><YouTubeViews {...props} /></FontsInjector>
);
const MilestoneWithFonts: React.FC<any> = (props) => (
  <FontsInjector><Milestone {...props} /></FontsInjector>
);
const OutNowWithFonts: React.FC<any> = (props) => (
  <FontsInjector><OutNow {...props} /></FontsInjector>
);
const SpotifyPrintWithFonts: React.FC<any> = (props) => (
  <FontsInjector><SpotifyPrint {...props} /></FontsInjector>
);

const templates = [
  { id: 'AvailableNow', component: AvailableNowWithFonts, project: getProject('available_now') },
  { id: 'WatchOnYouTube', component: WatchOnYouTubeWithFonts, project: getProject('watch_youtube') },
  { id: 'YouTubeSubscribe', component: YouTubeSubscribeWithFonts, project: getProject('youtube_subscribe') },
  { id: 'YouTubeViews', component: YouTubeViewsWithFonts, project: getProject('youtube_views') },
  { id: 'Milestone', component: MilestoneWithFonts, project: getProject('milestone') },
  { id: 'OutNow', component: OutNowWithFonts, project: getProject('out_now') },
  { id: 'SpotifyPrint', component: SpotifyPrintWithFonts, project: getProject('spotify_print') },
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {templates.map((template) => (
        <React.Fragment key={template.id}>
          <Composition
            calculateMetadata={resolveDurationInFramesFromProps}
            id={template.id}
            component={template.component as any}
            width={1080}
            height={1920}
            fps={FPS}
            defaultProps={{ ...template.project, renderTarget: 'story' as const }}
          />
          <Composition
            calculateMetadata={resolveDurationInFramesFromProps}
            id={`${template.id}Feed`}
            component={template.component as any}
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
