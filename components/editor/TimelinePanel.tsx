import React from 'react';

export interface TimelineTrack {
  id: string;
  label: string;
  color: string;
  /** segundo em que a layer entra */
  startSec: number;
  /** segundo em que sai; null = fica até o fim */
  endSec: number | null;
  /** overlays podem mudar a duração (arrastar a borda direita) */
  resizable: boolean;
  onChangeStart: (sec: number) => void;
  onChangeEnd?: (sec: number) => void;
  onSelect?: () => void;
}

interface TimelinePanelProps {
  durationSec: number;
  currentSec: number;
  tracks: TimelineTrack[];
  onSeek: (sec: number) => void;
  onClose: () => void;
}

const LABEL_W = 122;
const ROW_H = 30;
const round1 = (n: number) => Math.round(n * 10) / 10;

type DragState =
  | { mode: 'seek' }
  | { mode: 'move'; track: TimelineTrack; grabSec: number; startStart: number; span: number | null }
  | { mode: 'resize'; track: TimelineTrack; startStart: number };

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  durationSec,
  currentSec,
  tracks,
  onSeek,
  onClose,
}) => {
  const areaRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const dur = Math.max(0.1, durationSec);

  const secAtClientX = React.useCallback(
    (clientX: number) => {
      const el = areaRef.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const ratio = (clientX - r.left) / Math.max(1, r.width);
      return Math.max(0, Math.min(dur, ratio * dur));
    },
    [dur]
  );

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const sec = secAtClientX(e.clientX);
      if (d.mode === 'seek') {
        onSeek(round1(sec));
        return;
      }
      if (d.mode === 'move') {
        const delta = sec - d.grabSec;
        const maxStart = d.span !== null ? Math.max(0, dur - d.span) : Math.max(0, dur - 0.1);
        const ns = Math.max(0, Math.min(maxStart, d.startStart + delta));
        d.track.onChangeStart(round1(ns));
      } else if (d.mode === 'resize' && d.track.onChangeEnd) {
        const ne = Math.max(d.startStart + 0.2, Math.min(dur, sec));
        d.track.onChangeEnd(round1(ne));
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [secAtClientX, onSeek, dur]);

  const frac = Math.max(0, Math.min(1, currentSec / dur));
  const tickStep = dur <= 10 ? 1 : dur <= 20 ? 2 : dur <= 40 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= dur + 0.001; t += tickStep) ticks.push(Math.round(t));

  return (
    <div
      data-novacena-timeline="true"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 88,
        transform: 'translateX(-50%)',
        width: 'min(940px, 78vw)',
        maxHeight: '46vh',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(12,12,16,0.94)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: 'rgba(255,255,255,0.86)' }}>
          LINHA DO TEMPO · {round1(dur)}s
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.8)',
            borderRadius: 8,
            width: 26,
            height: 26,
            cursor: 'pointer',
            fontSize: 13,
            lineHeight: 1,
          }}
          aria-label="Fechar linha do tempo"
        >
          ✕
        </button>
      </div>

      {/* Régua */}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '6px 14px 0' }}>
        <div style={{ width: LABEL_W, flex: '0 0 auto' }} />
        <div style={{ position: 'relative', flex: 1, height: 16 }}>
          {ticks.map((t) => (
            <div
              key={t}
              style={{
                position: 'absolute',
                left: `${(t / dur) * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: 9,
                color: 'rgba(255,255,255,0.42)',
                fontWeight: 700,
              }}
            >
              {t}s
            </div>
          ))}
        </div>
      </div>

      {/* Faixas */}
      <div style={{ position: 'relative', padding: '6px 14px 14px', overflowY: 'auto' }}>
        {tracks.length === 0 ? (
          <div style={{ padding: '18px 4px', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            Nenhuma layer com tempo ajustável neste template.
          </div>
        ) : (
          tracks.map((track) => {
            const start = Math.max(0, Math.min(dur, track.startSec));
            const end = track.endSec === null ? dur : Math.max(start, Math.min(dur, track.endSec));
            const leftPct = (start / dur) * 100;
            const widthPct = Math.max(2.2, ((end - start) / dur) * 100);
            const span = track.endSec === null ? null : end - start;

            return (
              <div key={track.id} style={{ display: 'flex', alignItems: 'center', height: ROW_H }}>
                <button
                  type="button"
                  onClick={track.onSelect}
                  title={track.label}
                  style={{
                    width: LABEL_W,
                    flex: '0 0 auto',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.82)',
                    fontSize: 11,
                    fontWeight: 700,
                    paddingRight: 8,
                    cursor: track.onSelect ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{ color: track.color, marginRight: 6 }}>●</span>
                  {track.label}
                </button>

                <div
                  ref={track === tracks[0] ? areaRef : undefined}
                  onPointerDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    dragRef.current = { mode: 'seek' };
                    onSeek(round1(secAtClientX(e.clientX)));
                  }}
                  style={{
                    position: 'relative',
                    flex: 1,
                    height: ROW_H - 8,
                    borderRadius: 7,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      track.onSelect?.();
                      dragRef.current = {
                        mode: 'move',
                        track,
                        grabSec: secAtClientX(e.clientX),
                        startStart: start,
                        span,
                      };
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      borderRadius: 6,
                      background: `linear-gradient(180deg, ${track.color}, ${track.color}cc)`,
                      boxShadow: `0 2px 10px ${track.color}55`,
                      cursor: 'grab',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 8,
                      fontSize: 9,
                      fontWeight: 800,
                      color: 'rgba(0,0,0,0.7)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {round1(start)}s
                    {track.resizable && track.onChangeEnd && (
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          dragRef.current = { mode: 'resize', track, startStart: start };
                        }}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 12,
                          cursor: 'ew-resize',
                          borderRadius: '0 6px 6px 0',
                          background: 'rgba(0,0,0,0.22)',
                        }}
                        title="Arraste para mudar a duração"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Playhead */}
        {tracks.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              bottom: 14,
              left: `calc(${LABEL_W + 14}px + (100% - ${LABEL_W + 28}px) * ${frac})`,
              width: 2,
              background: '#ffffff',
              boxShadow: '0 0 8px rgba(255,255,255,0.7)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TimelinePanel;
