'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { AvailableNow } from '../remotion/AvailableNow';
import { WatchOnYouTube } from '../remotion/WatchOnYouTube';
import { Milestone } from '../remotion/Milestone';
import { OutNow } from '../remotion/OutNow';
import { getProject, templateLabels, templateOrder } from '../remotion/project';
import type {
  MotionConfig,
  PlatformName,
  RenderTarget,
  TemplateId,
  TemplateProps,
} from '../remotion/types';
import { FONT_CATALOG, DEFAULT_FONTS, type FontDef } from '../lib/fontCatalog';

// ============================================================
// CONSTANTES
// ============================================================
const componentByTemplate = {
  available_now: AvailableNow,
  watch_youtube: WatchOnYouTube,
  milestone: Milestone,
  out_now: OutNow,
};

const allPlatforms: PlatformName[] = [
  'Spotify',
  'Deezer',
  'Apple Music',
  'YouTube Music',
];

const GLOW_PRESETS: { label: string; color: string }[] = [
  { label: 'Roxo', color: 'rgba(190, 90, 255, 0.32)' },
  { label: 'Laranja', color: 'rgba(255, 140, 60, 0.32)' },
  { label: 'Verde', color: 'rgba(60, 220, 130, 0.32)' },
  { label: 'Vermelho', color: 'rgba(255, 60, 60, 0.32)' },
  { label: 'Azul', color: 'rgba(80, 140, 255, 0.32)' },
  { label: 'Dourado', color: 'rgba(255, 200, 80, 0.32)' },
  { label: 'Rosa', color: 'rgba(255, 90, 180, 0.32)' },
  { label: 'Off-white', color: 'rgba(255, 255, 255, 0.20)' },
];

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
export default function Home() {
  const [template, setTemplate] = useState<TemplateId>('available_now');
  const [target, setTarget] = useState<RenderTarget>('story');
  const [showSafeArea, setShowSafeArea] = useState(false);

  const [artistName] = useState(getProject('available_now').artistName);
  const [songTitle] = useState(getProject('available_now').songTitle);
  const [releaseDate, setReleaseDate] = useState(
    getProject('available_now').releaseDate ?? ''
  );
  const [coverImage, setCoverImage] = useState(
    getProject('available_now').coverImage
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [platforms, setPlatforms] = useState<PlatformName[]>(
    getProject('available_now').platforms
  );
  const [headline, setHeadline] = useState(getProject('available_now').headline);
  const [cta, setCta] = useState(getProject('available_now').cta);
  const [channelName, setChannelName] = useState(
    getProject('available_now').channelName ?? ''
  );
  const [metricPrefix, setMetricPrefix] = useState(
    getProject('available_now').metricPrefix ?? 'ULTRAPASSAMOS'
  );
  const [metricNumber, setMetricNumber] = useState(
    getProject('available_now').metricNumber ?? '100.000'
  );
  const [metricLabel, setMetricLabel] = useState(
    getProject('available_now').metricLabel ?? 'OUVINTES'
  );

  // ─── MOTION CONFIG ────────────────────────────────────────
  const [fontHeadline, setFontHeadline] = useState<string>(DEFAULT_FONTS.headline);
  const [fontDate, setFontDate] = useState<string>(DEFAULT_FONTS.date);
  const [fontCta, setFontCta] = useState<string>(DEFAULT_FONTS.cta);
  const [coverSize, setCoverSize] = useState<number>(510);
  const [spinTurns, setSpinTurns] = useState<number>(2);
  const [wiggleIntensity, setWiggleIntensity] = useState<number>(1);
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(true);
  const [finalFlash, setFinalFlash] = useState<boolean>(true);
  const [glowColor, setGlowColor] = useState<string>(GLOW_PRESETS[0].color);

  // ─── PROJECT SETTINGS ─────────────────────────────────────
  const [durationSeconds, setDurationSeconds] = useState<number>(8);
  const [bgVideo, setBgVideo] = useState<string>('');
  const [bgVideoStartSec, setBgVideoStartSec] = useState<number>(0);
  const [bgVideoDuration, setBgVideoDuration] = useState<number>(0); // duração total do vídeo
  const [bgVideoOpacity, setBgVideoOpacity] = useState<number>(1);
  const [bgColor, setBgColor] = useState<string>('#030205');
  const [bgVideoBlur, setBgVideoBlur] = useState<number>(22);
  const [bgVideoSaturation, setBgVideoSaturation] = useState<number>(1.15);
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [videoUploadMsg, setVideoUploadMsg] = useState<string>('');
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [rendering, setRendering] = useState(false);
  const [renderMessage, setRenderMessage] = useState('');
  const [renderLog, setRenderLog] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const next = getProject(template);
    setHeadline(next.headline);
    setCta(next.cta);
    setChannelName(next.channelName ?? '');
    setMetricPrefix(next.metricPrefix ?? 'ULTRAPASSAMOS');
    setMetricNumber(next.metricNumber ?? '100.000');
    setMetricLabel(next.metricLabel ?? 'OUVINTES');
  }, [template]);

  const previewCover = coverPreview ?? coverImage;
  const Component = componentByTemplate[template];
  const compositionHeight = target === 'story' ? 1920 : 1350;

  const motion: MotionConfig = useMemo(
    () => ({
      fontHeadline,
      fontDate,
      fontCta,
      coverSize,
      spinTurns,
      wiggleIntensity,
      particlesEnabled,
      finalFlash,
      glowColor,
      durationSeconds,
      background: {
        videoSrc: bgVideo || undefined,
        videoStartFrame: Math.floor(bgVideoStartSec * 30),
        videoOpacity: bgVideoOpacity,
        bgColor,
        videoBlur: bgVideoBlur,
        videoSaturation: bgVideoSaturation,
      },
    }),
    [
      fontHeadline,
      fontDate,
      fontCta,
      coverSize,
      spinTurns,
      wiggleIntensity,
      particlesEnabled,
      finalFlash,
      glowColor,
      durationSeconds,
      bgVideo,
      bgVideoStartSec,
      bgVideoOpacity,
      bgColor,
      bgVideoBlur,
      bgVideoSaturation,
    ]
  );

  const project = useMemo(() => {
    const base = getProject(template);
    return {
      ...base,
      artistName,
      songTitle,
      releaseDate,
      headline,
      cta,
      channelName,
      metricPrefix,
      metricNumber,
      metricLabel,
      platforms,
      coverImage: previewCover,
      motion,
      media: {
        type: 'image' as const,
        file: previewCover,
        sourceFormat: 'square' as const,
        framingMode: 'background_blur' as const,
      },
      renderTarget: target,
    } satisfies TemplateProps;
  }, [
    artistName,
    songTitle,
    releaseDate,
    headline,
    cta,
    channelName,
    metricPrefix,
    metricNumber,
    metricLabel,
    platforms,
    previewCover,
    target,
    template,
    motion,
  ]);

  // ─── HANDLERS ─────────────────────────────────────────────
  function togglePlatform(p: PlatformName) {
    setPlatforms((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    const url = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverPreview(url);
    setSaveMessage('Capa carregada no preview. Salve o projeto antes de renderizar.');
  }

  async function renderScript(script: string, label: string) {
    setRendering(true);
    setRenderMessage(`Gerando ${label}…`);
    setRenderLog('');
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    const result = await response.json();
    setRendering(false);
    setRenderLog(result.output ?? '');
    if (!result.ok) {
      setRenderMessage(`Erro: ${result.error ?? 'falha desconhecida'}`);
      return;
    }
    setRenderMessage(`${label} gerado. Abra a pasta dos vídeos.`);
  }

  async function openOutFolder() {
    await fetch('/api/open-out', { method: 'POST' });
  }

  async function saveProject() {
    setSaving(true);
    setSaveMessage('Salvando…');
    const formData = new FormData();
    formData.append('template', template);
    formData.append('artistName', artistName);
    formData.append('songTitle', songTitle);
    formData.append('releaseDate', releaseDate);
    formData.append('headline', headline);
    formData.append('cta', cta);
    formData.append('channelName', channelName);
    formData.append('metricPrefix', metricPrefix);
    formData.append('metricNumber', metricNumber);
    formData.append('metricLabel', metricLabel);
    formData.append('platforms', JSON.stringify(platforms));
    formData.append('coverImage', coverImage);
    if (coverFile) formData.append('cover', coverFile);
    const response = await fetch('/api/project', { method: 'POST', body: formData });
    const result = await response.json();
    setSaving(false);
    if (!result.ok) {
      setSaveMessage(`Erro: ${result.error ?? 'falha desconhecida'}`);
      return;
    }
    setCoverImage(result.coverImage);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setCoverFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSaveMessage('Projeto salvo. Pronto pra renderizar.');
  }

  function resetMotion() {
    setFontHeadline(DEFAULT_FONTS.headline);
    setFontDate(DEFAULT_FONTS.date);
    setFontCta(DEFAULT_FONTS.cta);
    setCoverSize(510);
    setSpinTurns(2);
    setWiggleIntensity(1);
    setParticlesEnabled(true);
    setFinalFlash(true);
    setGlowColor(GLOW_PRESETS[0].color);
    setDurationSeconds(8);
    setBgVideo('');
    setBgVideoStartSec(0);
    setBgVideoDuration(0);
    setBgVideoOpacity(1);
    setBgColor('#030205');
    setBgVideoBlur(22);
    setBgVideoSaturation(1.15);
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setVideoUploadMsg('Enviando vídeo…');

    // Detecta a duração do vídeo lendo metadata localmente
    const videoUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = videoUrl;
    await new Promise<void>((resolve) => {
      tempVideo.onloadedmetadata = () => resolve();
      tempVideo.onerror = () => resolve();
    });
    const totalDuration = tempVideo.duration || 0;
    URL.revokeObjectURL(videoUrl);

    const formData = new FormData();
    formData.append('video', file);
    try {
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!result.ok) {
        setVideoUploadMsg(`Erro: ${result.error}`);
        setUploadingVideo(false);
        return;
      }
      setBgVideo(result.videoSrc);
      setBgVideoStartSec(0);
      setBgVideoDuration(totalDuration);
      setVideoUploadMsg(`Vídeo carregado (${totalDuration.toFixed(1)}s)`);
    } catch (err) {
      setVideoUploadMsg(`Falha no upload: ${err}`);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  function clearBgVideo() {
    setBgVideo('');
    setBgVideoStartSec(0);
    setBgVideoDuration(0);
    setVideoUploadMsg('');
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '380px 1fr 340px',
        gap: 0,
      }}
    >
      {/* ─── SIDEBAR ESQUERDA — CONTEÚDO ─── */}
      <aside style={sidebarStyle}>
        <Brand />

        <Section title="Template">
          <div style={gridTwoCols}>
            {templateOrder.map((id) => (
              <TemplateButton
                key={id}
                active={template === id}
                onClick={() => setTemplate(id)}
              >
                {templateLabels[id]}
              </TemplateButton>
            ))}
          </div>
        </Section>

        <Section title="Conteúdo">
          <Field
            label="Data"
            value={releaseDate}
            onChange={setReleaseDate}
            placeholder="07.JANEIRO"
          />
          <Field
            label="Headline"
            value={headline}
            onChange={setHeadline}
            placeholder="LANÇAMENTO"
          />
          <Field
            label="Chamada / CTA"
            value={cta}
            onChange={setCta}
            placeholder="EM TODAS AS PLATAFORMAS DIGITAIS"
          />

          {template === 'watch_youtube' && (
            <Field
              label="Nome do canal"
              value={channelName}
              onChange={setChannelName}
              placeholder="Canal Oficial"
            />
          )}

          {template === 'milestone' && (
            <>
              <Field
                label="Texto acima"
                value={metricPrefix}
                onChange={setMetricPrefix}
              />
              <div style={gridTwoCols}>
                <Field label="Número" value={metricNumber} onChange={setMetricNumber} />
                <Field label="Métrica" value={metricLabel} onChange={setMetricLabel} />
              </div>
            </>
          )}
        </Section>

        <Section title="Capa do single">
          <button
            style={uploadCardStyle}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={uploadThumbStyle}>
              {previewCover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewCover}
                  alt="capa"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {coverFile ? coverFile.name.slice(0, 22) : 'Trocar capa'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                PNG ou JPG quadrado
              </div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleCoverChange}
            style={{ display: 'none' }}
          />
        </Section>

        <Section title="Plataformas">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allPlatforms.map((p) => (
              <ChipButton
                key={p}
                active={platforms.includes(p)}
                onClick={() => togglePlatform(p)}
              >
                {p}
              </ChipButton>
            ))}
          </div>
        </Section>

        <div style={{ marginTop: 'auto', padding: '20px 22px' }}>
          <button
            onClick={saveProject}
            disabled={saving}
            style={primaryBtn}
          >
            {saving ? 'Salvando…' : 'Salvar projeto'}
          </button>
          {saveMessage && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: saveMessage.startsWith('Erro') ? 'var(--danger)' : 'var(--text-2)',
              }}
            >
              {saveMessage}
            </div>
          )}
        </div>
      </aside>

      {/* ─── ÁREA CENTRAL — PREVIEW ─── */}
      <section style={centerStyle}>
        <div style={previewToolbarStyle}>
          <SegmentedControl
            options={[
              { id: 'story', label: 'Story 1080×1920' },
              { id: 'feed', label: 'Feed 1080×1350' },
            ]}
            value={target}
            onChange={(v) => setTarget(v as RenderTarget)}
          />

          <button
            onClick={() => setShowSafeArea((s) => !s)}
            style={showSafeArea ? chipActive : chip}
          >
            {showSafeArea ? '✓ ' : ''}Safe area
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            width: target === 'story' ? 380 : 460,
            aspectRatio: target === 'story' ? '9 / 16' : '1080 / 1350',
            borderRadius: 22,
            overflow: 'hidden',
            boxShadow:
              '0 30px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          <Player
            component={Component}
            inputProps={project}
            durationInFrames={durationSeconds * 30}
            compositionWidth={1080}
            compositionHeight={compositionHeight}
            fps={30}
            style={{ width: '100%', height: '100%' }}
            controls
            loop
            initialFrame={Math.max(0, durationSeconds * 30 - 15)}
          />
          {showSafeArea && target === 'story' && (
            <div
              style={{
                position: 'absolute',
                top: `${(285 / 1920) * 100}%`,
                left: 0,
                width: '100%',
                height: `${(1350 / 1920) * 100}%`,
                border: '2px dashed rgba(255, 80, 200, 0.85)',
                boxShadow: '0 0 0 9999px rgba(255, 80, 200, 0.05)',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: -22,
                  left: 0,
                  fontSize: 10,
                  color: 'rgba(255,80,200,0.95)',
                  background: 'rgba(0,0,0,0.78)',
                  padding: '3px 7px',
                  borderRadius: 4,
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                SAFE AREA 1080×1350
              </span>
            </div>
          )}
        </div>

        {/* RENDER ACTIONS */}
        <div style={renderBarStyle}>
          <button
            disabled={rendering}
            onClick={() =>
              renderScript(
                renderScriptFor(template, target),
                `${templateLabels[template]} ${target}`
              )
            }
            style={renderBtnStyle}
          >
            {rendering ? 'Renderizando…' : `Renderizar ${target}`}
          </button>
          <button
            disabled={rendering}
            onClick={() => renderScript('render:all', 'todos os vídeos')}
            style={ghostBtnStyle}
          >
            Gerar todos
          </button>
          <button onClick={openOutFolder} style={ghostBtnStyle}>
            Abrir pasta
          </button>
        </div>
        {renderMessage && (
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: renderMessage.startsWith('Erro') ? 'var(--danger)' : 'var(--text-2)',
            }}
          >
            {renderMessage}
          </div>
        )}
        {renderLog && (
          <details style={{ marginTop: 14, maxWidth: 520 }}>
            <summary
              style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 12 }}
            >
              Ver log técnico
            </summary>
            <pre
              style={{
                marginTop: 8,
                padding: 14,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 10,
                color: 'var(--text-2)',
                fontSize: 11,
                maxHeight: 220,
                overflow: 'auto',
                lineHeight: 1.5,
              }}
            >
              {renderLog.slice(-4000)}
            </pre>
          </details>
        )}
      </section>

      {/* ─── SIDEBAR DIREITA — MOTION CONTROLS ─── */}
      <aside style={{ ...sidebarStyle, borderLeft: '1px solid var(--border-1)', borderRight: 'none' }}>
        <div style={{ padding: '24px 22px 6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600 }}>
                Studio
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                Motion controls
              </div>
            </div>
            <button onClick={resetMotion} style={resetBtnStyle} title="Resetar tudo">
              ↺
            </button>
          </div>
        </div>

        <Section title="Projeto">
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Duração
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
              {[8, 15, 20, 30, 40].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationSeconds(d)}
                  style={{
                    padding: '8px 0',
                    fontSize: 12,
                    fontWeight: 600,
                    border:
                      durationSeconds === d
                        ? '1px solid var(--border-3)'
                        : '1px solid var(--border-1)',
                    background:
                      durationSeconds === d
                        ? 'var(--surface-active)'
                        : 'var(--surface-1)',
                    color:
                      durationSeconds === d ? 'var(--text-1)' : 'var(--text-3)',
                    borderRadius: 7,
                  }}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginBottom: 6,
                fontWeight: 500,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Vídeo de fundo</span>
              {bgVideo && (
                <button
                  onClick={clearBgVideo}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  remover
                </button>
              )}
            </div>
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: bgVideo ? 'var(--surface-active)' : 'var(--surface-1)',
                border: bgVideo
                  ? '1px solid var(--border-3)'
                  : '1px dashed var(--border-2)',
                borderRadius: 8,
                color: 'var(--text-2)',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              {uploadingVideo
                ? 'Enviando…'
                : bgVideo
                  ? `✓ Vídeo carregado (${bgVideoDuration.toFixed(1)}s)`
                  : '+ Carregar MP4/MOV (até 200 MB)'}
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleVideoUpload}
              style={{ display: 'none' }}
            />
            {videoUploadMsg && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  color: videoUploadMsg.startsWith('Erro')
                    ? 'var(--danger)'
                    : 'var(--text-3)',
                }}
              >
                {videoUploadMsg}
              </div>
            )}
          </div>

          {bgVideo && bgVideoDuration > 0 && (
            <>
              <SliderRow
                label="Início (refrão)"
                value={bgVideoStartSec}
                min={0}
                max={Math.max(0, bgVideoDuration - durationSeconds)}
                step={0.1}
                onChange={setBgVideoStartSec}
                format={(v) => `${v.toFixed(1)}s`}
              />
              <SliderRow
                label="Opacidade do vídeo"
                value={bgVideoOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={setBgVideoOpacity}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <SliderRow
                label="Blur do vídeo"
                value={bgVideoBlur}
                min={0}
                max={60}
                step={1}
                onChange={setBgVideoBlur}
                format={(v) => `${v}px`}
              />
              <SliderRow
                label="Saturação"
                value={bgVideoSaturation}
                min={0}
                max={2}
                step={0.05}
                onChange={setBgVideoSaturation}
                format={(v) => `${v.toFixed(2)}×`}
              />
            </>
          )}

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Cor de fundo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {[
                '#000000',
                '#030205',
                '#0a0a14',
                '#1a0a2a',
                '#0a1a14',
                '#2a0a14',
                '#1a1a2a',
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  title={c}
                  style={{
                    height: 28,
                    border:
                      bgColor === c
                        ? '1px solid var(--text-1)'
                        : '1px solid var(--border-1)',
                    background: c,
                    borderRadius: 6,
                    cursor: 'pointer',
                    transform: bgColor === c ? 'scale(1.08)' : undefined,
                    transition: 'transform 0.15s ease',
                  }}
                />
              ))}
            </div>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{
                marginTop: 6,
                width: '100%',
                height: 32,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-1)',
                borderRadius: 7,
                cursor: 'pointer',
              }}
            />
          </div>
        </Section>

        <Section title="Fontes">
          <FontPicker
            label="Headline"
            sampleText={headline || 'LANÇAMENTO'}
            value={fontHeadline}
            onChange={setFontHeadline}
          />
          <FontPicker
            label="Data"
            sampleText={releaseDate || '07.JANEIRO'}
            value={fontDate}
            onChange={setFontDate}
          />
          <FontPicker
            label="CTA"
            sampleText="OUÇA AGORA"
            value={fontCta}
            onChange={setFontCta}
          />
        </Section>

        <Section title="Capa">
          <SliderRow
            label="Tamanho"
            value={coverSize}
            min={320}
            max={680}
            step={10}
            onChange={setCoverSize}
            format={(v) => `${v}px`}
          />
          <SliderRow
            label="Voltas Y"
            value={spinTurns}
            min={0}
            max={4}
            step={0.5}
            onChange={setSpinTurns}
            format={(v) => `${v}×`}
          />
          <SliderRow
            label="Wiggle"
            value={wiggleIntensity}
            min={0}
            max={2}
            step={0.1}
            onChange={setWiggleIntensity}
            format={(v) => v.toFixed(1)}
          />
        </Section>

        <Section title="Brilho / glow">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}
          >
            {GLOW_PRESETS.map((g) => (
              <button
                key={g.label}
                onClick={() => setGlowColor(g.color)}
                title={g.label}
                style={{
                  height: 36,
                  borderRadius: 8,
                  border:
                    glowColor === g.color
                      ? '1px solid var(--text-1)'
                      : '1px solid var(--border-1)',
                  background: g.color.replace('0.32', '0.85'),
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                  transform: glowColor === g.color ? 'scale(1.06)' : undefined,
                }}
              />
            ))}
          </div>
        </Section>

        <Section title="Efeitos">
          <ToggleRow
            label="Partículas bokeh"
            value={particlesEnabled}
            onChange={setParticlesEnabled}
          />
          <ToggleRow
            label="Flash final"
            value={finalFlash}
            onChange={setFinalFlash}
          />
        </Section>
      </aside>
    </main>
  );
}

// ============================================================
// COMPONENTES
// ============================================================
function Brand() {
  return (
    <div style={{ padding: '22px 22px 12px', borderBottom: '1px solid var(--border-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
            boxShadow: '0 8px 24px var(--brand-glow)',
          }}
        >
          N
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
            NovaCena
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
            Motion Studio
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 22px 4px', borderTop: '1px solid var(--border-1)' }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1.6,
          color: 'var(--text-3)',
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span
        style={{
          display: 'block',
          fontSize: 11,
          color: 'var(--text-3)',
          marginBottom: 5,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 12px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 8,
          color: 'var(--text-1)',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.15s ease, background 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-3)';
          e.currentTarget.style.background = 'var(--surface-2)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-1)';
          e.currentTarget.style.background = 'var(--surface-1)';
        }}
      />
    </label>
  );
}

function TemplateButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 12px',
        background: active ? 'var(--surface-active)' : 'var(--surface-1)',
        border: active ? '1px solid var(--border-3)' : '1px solid var(--border-1)',
        borderRadius: 10,
        color: active ? 'var(--text-1)' : 'var(--text-2)',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {active && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'var(--brand)',
            boxShadow: '0 0 8px var(--brand-glow)',
          }}
        />
      )}
      {children}
    </button>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: active ? 'var(--surface-active)' : 'var(--surface-1)',
        border: active
          ? '1px solid var(--border-3)'
          : '1px solid var(--border-1)',
        borderRadius: 999,
        color: active ? 'var(--text-1)' : 'var(--text-2)',
        fontSize: 12,
        fontWeight: 500,
        transition: 'all 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {active && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: 'var(--success)',
          }}
        />
      )}
      {children}
    </button>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg-2)',
        border: '1px solid var(--border-1)',
        borderRadius: 10,
        padding: 3,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            padding: '7px 14px',
            background: value === opt.id ? 'var(--surface-active)' : 'transparent',
            border: 'none',
            borderRadius: 7,
            color: value === opt.id ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: 12,
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          marginBottom: 6,
        }}
      >
        <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: value ? 'var(--brand)' : 'var(--border-2)',
          border: 'none',
          position: 'relative',
          transition: 'background 0.2s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: '#fff',
            transition: 'left 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}

function FontPicker({
  label,
  sampleText,
  value,
  onChange,
}: {
  label: string;
  sampleText: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = FONT_CATALOG.find((f) => f.id === value) ?? FONT_CATALOG[0];

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-3)',
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '10px 12px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.15s ease',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: `'${selected.family}', sans-serif`,
              fontSize: 18,
              fontWeight: selected.weight,
              lineHeight: 1.1,
              color: 'var(--text-1)',
            }}
          >
            {sampleText.slice(0, 14) || 'Aa'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
            {selected.label} · {selected.vibe}
          </div>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>
          {open ? '×' : '⌄'}
        </span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 6,
            maxHeight: 320,
            overflow: 'auto',
            background: 'var(--bg-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(['display', 'sans', 'special'] as const).map((cat) => (
            <div key={cat}>
              <div
                style={{
                  padding: '8px 10px 4px',
                  fontSize: 9,
                  letterSpacing: 1.6,
                  color: 'var(--text-4)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                {cat === 'display' ? 'Display' : cat === 'sans' ? 'Sans' : 'Especiais'}
              </div>
              {FONT_CATALOG.filter((f) => f.category === cat).map((f) => (
                <FontOption
                  key={f.id}
                  font={f}
                  sampleText={sampleText}
                  active={f.id === value}
                  onSelect={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FontOption({
  font,
  sampleText,
  active,
  onSelect,
}: {
  font: FontDef;
  sampleText: string;
  active: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        background: active
          ? 'var(--surface-active)'
          : hover
            ? 'var(--surface-hover)'
            : 'transparent',
        border: 'none',
        borderRadius: 7,
        marginBottom: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: `'${font.family}', sans-serif`,
            fontSize: 20,
            fontWeight: font.weight,
            lineHeight: 1,
            color: 'var(--text-1)',
          }}
        >
          {sampleText.slice(0, 18) || font.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
          {font.label}
        </div>
      </div>
      {active && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'var(--brand)',
            boxShadow: '0 0 8px var(--brand-glow)',
          }}
        />
      )}
    </button>
  );
}

// ============================================================
// HELPERS
// ============================================================
function renderScriptFor(template: TemplateId, target: RenderTarget): string {
  const suffix = target === 'feed' ? ':feed' : '';
  if (template === 'available_now') return `render:available${suffix}`;
  if (template === 'watch_youtube') return `render:youtube${suffix}`;
  if (template === 'milestone') return `render:milestone${suffix}`;
  return `render:outnow${suffix}`;
}

// ============================================================
// STYLES
// ============================================================
const sidebarStyle: React.CSSProperties = {
  background: 'var(--bg-1)',
  borderRight: '1px solid var(--border-1)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  overflowY: 'auto',
};

const centerStyle: React.CSSProperties = {
  background: 'var(--bg-0)',
  padding: '32px 40px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
};

const previewToolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 4,
};

const renderBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 8,
};

const gridTwoCols: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
  marginBottom: 8,
};

const uploadCardStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 10,
  background: 'var(--surface-1)',
  border: '1px solid var(--border-1)',
  borderRadius: 12,
  transition: 'all 0.15s ease',
};

const uploadThumbStyle: React.CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: 8,
  background: 'var(--bg-2)',
  overflow: 'hidden',
  flexShrink: 0,
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  boxShadow: '0 10px 30px var(--brand-glow)',
};

const renderBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: 'var(--text-1)',
  color: 'var(--bg-0)',
  border: 'none',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--surface-1)',
  color: 'var(--text-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
};

const chip: React.CSSProperties = {
  padding: '7px 14px',
  background: 'var(--bg-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 10,
  color: 'var(--text-3)',
  fontSize: 12,
  fontWeight: 600,
};

const chipActive: React.CSSProperties = {
  ...chip,
  background: 'var(--surface-active)',
  border: '1px solid var(--border-3)',
  color: 'var(--text-1)',
};

const resetBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  background: 'var(--surface-1)',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
  color: 'var(--text-2)',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
