import React from 'react';
import { Sparkles, Type, Zap, ZoomIn, ZoomOut } from 'lucide-react';

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
  selected?: boolean;
}

export interface TimelineTool {
  id: string;
  label: string;
  icon: 'reveal' | 'pop' | 'letters';
  active?: boolean;
  onClick: () => void;
}

export interface TimelineRawSelection {
  label: string;
  color: string;
  durationSec: number;
  startSec: number;
  endSec: number;
}

interface TimelinePanelProps {
  durationSec: number;
  currentSec: number;
  tracks: TimelineTrack[];
  tools?: TimelineTool[];
  rawSelection?: TimelineRawSelection | null;
  onSeek: (sec: number) => void;
  onClose: () => void;
}

const LABEL_W = 108;
const ROW_H = 20;
const PAD_X = 14;
const BASE_TIME_W = 760;
const BASE_PX_PER_SEC = 12;
const MIN_ZOOM_STEP = 0;
const MAX_ZOOM_STEP = 9;
const round1 = (n: number) => Math.round(n * 10) / 10;

type DragState =
  | { mode: 'seek' }
  | { mode: 'move'; track: TimelineTrack; grabSec: number; startStart: number; span: number | null }
  | { mode: 'resize'; track: TimelineTrack; startStart: number };

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  durationSec,
  currentSec,
  tracks,
  tools = [],
  rawSelection,
  onSeek,
  onClose,
}) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const areaRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const timelineKeyboardActiveRef = React.useRef(false);
  const [zoomStep, setZoomStep] = React.useState(0);
  const [pressedToolId, setPressedToolId] = React.useState<string | null>(null);
  const dur = Math.max(0.1, durationSec);
  const zoomScale = Math.pow(1.32, zoomStep);
  const timeAreaWidth = Math.max(BASE_TIME_W, Math.round(dur * BASE_PX_PER_SEC * zoomScale));
  const innerWidth = LABEL_W + timeAreaWidth;
  const canZoomOut = zoomStep > MIN_ZOOM_STEP;
  const canZoomIn = zoomStep < MAX_ZOOM_STEP;
  const renderToolIcon = (icon: TimelineTool['icon']) => {
    if (icon === 'pop') return <Zap size={14} strokeWidth={2.5} />;
    if (icon === 'letters') return <Type size={14} strokeWidth={2.5} />;
    return <Sparkles size={14} strokeWidth={2.5} />;
  };

  const changeZoom = React.useCallback((direction: 'in' | 'out') => {
    timelineKeyboardActiveRef.current = true;
    panelRef.current?.focus({ preventScroll: true });
    setZoomStep((current) => {
      if (direction === 'in') return Math.min(MAX_ZOOM_STEP, current + 1);
      return Math.max(MIN_ZOOM_STEP, current - 1);
    });
  }, []);

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

  React.useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    timelineKeyboardActiveRef.current = true;
  }, []);

  React.useEffect(() => {
    if (!pressedToolId) return;
    const timeout = window.setTimeout(() => setPressedToolId(null), 420);
    return () => window.clearTimeout(timeout);
  }, [pressedToolId]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget = Boolean(
        target?.isContentEditable ||
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select'
      );
      const pressedZoomIn = event.key === '2' || event.code === 'Digit2' || event.code === 'Numpad2';
      const pressedZoomOut = event.key === '1' || event.code === 'Digit1' || event.code === 'Numpad1';
      if (!pressedZoomIn && !pressedZoomOut) return;

      const panel = panelRef.current;
      const targetIsInsideTimeline = Boolean(panel && target && panel.contains(target));
      if (!timelineKeyboardActiveRef.current && !targetIsInsideTimeline) return;
      if (isTypingTarget && !timelineKeyboardActiveRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      changeZoom(pressedZoomIn ? 'in' : 'out');
    };

    const onPointerDown = (event: PointerEvent) => {
      const panel = panelRef.current;
      const target = event.target as Node | null;
      timelineKeyboardActiveRef.current = Boolean(panel && target && panel.contains(target));
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [changeZoom]);

  const startScrub = (clientX: number) => {
    dragRef.current = { mode: 'seek' };
    onSeek(round1(secAtClientX(clientX)));
  };

  const frac = Math.max(0, Math.min(1, currentSec / dur));
  const tickStep = zoomScale >= 3 || dur <= 10 ? 1 : zoomScale >= 1.6 || dur <= 20 ? 2 : dur <= 40 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= dur + 0.001; t += tickStep) ticks.push(Math.round(t));

  // posição do playhead relativa ao container (label + área), descontando os paddings
  const playheadLeft = LABEL_W + timeAreaWidth * frac;
  const displayedTracks = React.useMemo(
    () =>
      tracks
        .map((track, index) => ({ track, index }))
        .sort((a, b) => {
          const byTime = b.track.startSec - a.track.startSec;
          if (Math.abs(byTime) > 0.001) return byTime;
          return b.index - a.index;
        }),
    [tracks]
  );
  const rawSelectionMeta = React.useMemo(() => {
    if (!rawSelection || rawSelection.durationSec <= 0) return null;
    const rawDur = Math.max(0.1, rawSelection.durationSec);
    const start = Math.max(0, Math.min(rawDur, rawSelection.startSec));
    const end = Math.max(start, Math.min(rawDur, rawSelection.endSec));
    return {
      ...rawSelection,
      rawDur,
      start,
      end,
      leftPct: (start / rawDur) * 100,
      widthPct: Math.max(1.4, ((end - start) / rawDur) * 100),
    };
  }, [rawSelection]);

  return (
    <div
      ref={panelRef}
      data-novacena-timeline="true"
      tabIndex={0}
      onPointerDown={(event) => {
        timelineKeyboardActiveRef.current = true;
        event.currentTarget.focus({ preventScroll: true });
      }}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 84,
        transform: 'translateX(-50%)',
        width: 'min(940px, 80vw)',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(12,12,16,0.95)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 20px 56px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, color: 'rgba(255,255,255,0.82)' }}>
          LINHA DO TEMPO · {round1(dur)}s · {round1(currentSec)}s
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            flex: '0 0 auto',
          }}
        >
          {tools.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 3,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.045)',
              }}
            >
              {tools.map((tool) => {
                const pressed = pressedToolId === tool.id;
                const highlighted = tool.active || pressed;

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setPressedToolId(tool.id);
                      tool.onClick();
                    }}
                    title={tool.label}
                    aria-label={tool.label}
                    style={{
                      border: highlighted ? '1px solid rgba(255,255,255,0.38)' : '1px solid rgba(255,255,255,0.12)',
                      background: highlighted
                        ? 'linear-gradient(135deg, rgba(34,211,238,0.38), rgba(190,80,255,0.34))'
                        : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      borderRadius: 7,
                      width: 28,
                      height: 24,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: highlighted ? '0 0 0 1px rgba(255,255,255,0.12), 0 0 16px rgba(34,211,238,0.26)' : undefined,
                      transform: 'translateY(0) scale(1)',
                      transition: 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                    }}
                  >
                    {renderToolIcon(tool.icon)}
                  </button>
                );
              })}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 3,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.045)',
            }}
          >
            <button
              type="button"
              onClick={() => changeZoom('out')}
              disabled={!canZoomOut}
              title="Diminuir zoom da timeline"
              aria-label="Diminuir zoom da timeline"
              aria-keyshortcuts="1"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                background: canZoomOut ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.025)',
                color: canZoomOut ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.28)',
                borderRadius: 7,
                width: 28,
                height: 24,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canZoomOut ? 'pointer' : 'not-allowed',
              }}
            >
              <ZoomOut size={15} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() => changeZoom('in')}
              disabled={!canZoomIn}
              title="Aumentar zoom da timeline"
              aria-label="Aumentar zoom da timeline"
              aria-keyshortcuts="2"
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                background: canZoomIn
                  ? 'linear-gradient(135deg, rgba(190,80,255,0.34), rgba(255,123,58,0.28))'
                  : 'rgba(255,255,255,0.025)',
                color: canZoomIn ? '#fff' : 'rgba(255,255,255,0.28)',
                borderRadius: 7,
                width: 28,
                height: 24,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canZoomIn ? 'pointer' : 'not-allowed',
              }}
            >
              <ZoomIn size={15} strokeWidth={2.4} />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: 7,
              width: 22,
              height: 22,
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
            }}
            aria-label="Fechar linha do tempo"
          >
            ✕
          </button>
        </div>
      </div>

      <div ref={scrollRef} style={{ position: 'relative', padding: `4px ${PAD_X}px 8px`, overflow: 'auto', maxHeight: '34vh' }}>
        <div style={{ position: 'relative', width: innerWidth }}>
          {/* Régua = barra de scrub (clica/arrasta = move o vídeo, igual ao player) */}
          <div style={{ display: 'flex', alignItems: 'center', height: 18 }}>
            <div
              style={{
                width: LABEL_W,
                flex: '0 0 auto',
                position: 'sticky',
                left: 0,
                zIndex: 8,
                background: 'rgba(12,12,16,0.98)',
              }}
            />
            <div
              ref={areaRef}
              onPointerDown={(e) => startScrub(e.clientX)}
              style={{ position: 'relative', width: timeAreaWidth, flex: '0 0 auto', height: 18, cursor: 'col-resize' }}
            >
              {ticks.map((t) => (
                <div
                  key={t}
                  style={{
                    position: 'absolute',
                    left: `${(t / dur) * 100}%`,
                    transform: 'translateX(-50%)',
                    fontSize: 8.5,
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 700,
                    pointerEvents: 'none',
                  }}
                >
                  {t}s
                </div>
              ))}
            </div>
          </div>

          {rawSelectionMeta && (
            <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: ROW_H + 2,
                  marginBottom: 3,
                  borderRadius: 7,
                  background: `linear-gradient(90deg, ${rawSelectionMeta.color}24, rgba(255,255,255,0.04) 42%, transparent)`,
                  boxShadow: `inset 3px 0 0 ${rawSelectionMeta.color}`,
                }}
              >
                <div
                  title={rawSelectionMeta.label}
                  style={{
                    width: LABEL_W,
                    flex: '0 0 auto',
                    position: 'sticky',
                    left: 0,
                    zIndex: 8,
                    borderRadius: 7,
                    background: 'rgba(255,255,255,0.09)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 900,
                    paddingRight: 6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{ color: rawSelectionMeta.color, marginRight: 5 }}>●</span>
                  {rawSelectionMeta.label}
                </div>
                <div
                  style={{
                    position: 'relative',
                    width: timeAreaWidth,
                    flex: '0 0 auto',
                    height: ROW_H - 6,
                    borderRadius: 5,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${rawSelectionMeta.color}66`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${rawSelectionMeta.leftPct}%`,
                      width: `${rawSelectionMeta.widthPct}%`,
                      minWidth: 10,
                      borderRadius: 4,
                      background: `linear-gradient(180deg, ${rawSelectionMeta.color}, ${rawSelectionMeta.color}cc)`,
                      boxShadow: `0 0 0 2px rgba(255,255,255,0.72), 0 0 14px ${rawSelectionMeta.color}aa`,
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8.5,
                        fontWeight: 900,
                        color: 'rgba(0,0,0,0.78)',
                        padding: '0 4px',
                      }}
                    >
                      {round1(rawSelectionMeta.start)}s → {round1(rawSelectionMeta.end)}s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Faixas */}
            {tracks.length === 0 ? (
            <div style={{ padding: '12px 4px', fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              Nenhuma layer com tempo ajustável neste template.
            </div>
          ) : (
            displayedTracks.map(({ track }) => {
              const start = Math.max(0, Math.min(dur, track.startSec));
              const end = track.endSec === null ? dur : Math.max(start, Math.min(dur, track.endSec));
              const leftPct = (start / dur) * 100;
              const widthPct = Math.max(2, ((end - start) / dur) * 100);
              const span = track.endSec === null ? null : end - start;
              const selected = Boolean(track.selected);

              return (
                <div
                  key={track.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: ROW_H,
                    borderRadius: 7,
                    background: selected ? `linear-gradient(90deg, ${track.color}3d, rgba(255,255,255,0.06) 42%, transparent)` : 'transparent',
                    boxShadow: selected ? `inset 3px 0 0 ${track.color}` : undefined,
                  }}
                >
                  <button
                    type="button"
                    onClick={track.onSelect}
                    title={track.label}
                    style={{
                      width: LABEL_W,
                      flex: '0 0 auto',
                      position: 'sticky',
                      left: 0,
                      zIndex: 8,
                      textAlign: 'left',
                      border: selected ? `1px solid ${track.color}80` : '1px solid transparent',
                      borderRadius: 7,
                      background: selected ? 'rgba(255,255,255,0.10)' : 'transparent',
                      color: selected ? '#fff' : 'rgba(255,255,255,0.82)',
                      fontSize: 10,
                      fontWeight: selected ? 900 : 700,
                      paddingRight: 6,
                      cursor: track.onSelect ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span style={{ color: track.color, marginRight: 5 }}>●</span>
                    {track.label}
                  </button>

                  <div
                    onPointerDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      startScrub(e.clientX);
                    }}
                    style={{
                      position: 'relative',
                      width: timeAreaWidth,
                      flex: '0 0 auto',
                      height: ROW_H - 6,
                      borderRadius: 5,
                      background: selected ? `${track.color}16` : 'rgba(255,255,255,0.05)',
                      border: selected ? `1px solid ${track.color}90` : '1px solid rgba(255,255,255,0.06)',
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
                        borderRadius: 4,
                        background: `linear-gradient(180deg, ${track.color}, ${track.color}cc)`,
                        boxShadow: selected ? `0 0 0 2px rgba(255,255,255,0.9), 0 0 14px ${track.color}aa` : undefined,
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 800,
                          color: 'rgba(0,0,0,0.72)',
                          padding: '0 4px',
                          pointerEvents: 'none',
                        }}
                      >
                        {round1(start)}s
                      </span>
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
                            width: 11,
                            cursor: 'ew-resize',
                            borderRadius: '0 4px 4px 0',
                            background: selected ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.24)',
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

          {/* Playhead — atravessa régua + faixas */}
          <div
            style={{
              position: 'absolute',
              top: 4,
              bottom: 8,
              left: playheadLeft,
              width: 2,
              background: '#ffffff',
              boxShadow: '0 0 7px rgba(255,255,255,0.75)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
