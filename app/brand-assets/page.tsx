'use client';

import { useMemo, useState } from 'react';

const platforms = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'deezer', label: 'Deezer' },
  { value: 'apple-music', label: 'Apple Music' },
  { value: 'youtube-music', label: 'YouTube Music' },
  { value: 'amazon-music', label: 'Amazon Music' },
  { value: 'tidal', label: 'Tidal' },
];

const variants = [
  { value: 'icon-white', label: 'Ícone branco' },
  { value: 'icon-color', label: 'Ícone colorido' },
  { value: 'logo-white', label: 'Logo branco' },
  { value: 'logo-black', label: 'Logo preto' },
  { value: 'logo-color', label: 'Logo colorido' },
  { value: 'badge-white', label: 'Badge branco' },
  { value: 'badge-dark', label: 'Badge escuro' },
  { value: 'badge-round', label: 'Badge redondo' },
];

export default function BrandAssetsPage() {
  const [platform, setPlatform] = useState('spotify');
  const [variant, setVariant] = useState('logo-color');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const objectPath = useMemo(() => {
    const ext = file?.name.split('.').pop() || 'svg';
    return `platforms/${platform}/${variant}.${ext}`;
  }, [platform, variant, file]);

  async function upload() {
    if (!file) {
      setStatus('Escolha um arquivo primeiro.');
      return;
    }

    setStatus('Enviando logo para o MinIO...');

    const formData = new FormData();
    formData.append('platform', platform);
    formData.append('variant', variant);
    formData.append('file', file);

    const response = await fetch('/api/brand-assets/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setStatus(`Erro: ${data.error || 'falha ao enviar.'}`);
      return;
    }

    setStatus(`Enviado com sucesso: ${data.asset.objectName}`);
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <a href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Voltar para o app
          </a>

          <h1 className="mt-4 text-3xl font-black tracking-tight">
            Biblioteca de Marcas
          </h1>

          <p className="mt-2 max-w-2xl text-zinc-400">
            Envie aqui os logos corretos das plataformas. O app vai salvar tudo no bucket
            <span className="mx-1 rounded bg-zinc-900 px-2 py-1 text-zinc-200">
              novacena-brand-assets
            </span>
            para usar nos motions.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Enviar logo oficial</h2>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-300">Plataforma</span>
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                >
                  {platforms.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-300">Tipo do asset</span>
                <select
                  value={variant}
                  onChange={(event) => setVariant(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                >
                  {variants.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-300">Arquivo</span>
                <input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp,image/*"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] || null;
                    setFile(selected);
                    setPreview(selected ? URL.createObjectURL(selected) : null);
                    setStatus('');
                  }}
                  className="rounded-xl border border-dashed border-white/20 bg-black px-4 py-4 text-sm text-zinc-300"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Caminho no MinIO
                </p>
                <p className="mt-2 break-all font-mono text-sm text-zinc-200">
                  {objectPath}
                </p>
              </div>

              <button
                onClick={upload}
                className="rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:scale-[1.01]"
              >
                Enviar para biblioteca
              </button>

              {status ? (
                <p
                  className={
                    status.startsWith('Erro')
                      ? 'text-sm font-bold text-red-400'
                      : 'text-sm font-bold text-emerald-400'
                  }
                >
                  {status}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Preview</h2>

            <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_top,#4c1d95,#09090b_65%)] p-10">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Preview do logo"
                  className="max-h-48 max-w-full object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="text-center text-zinc-500">
                  <p className="text-lg font-bold">Nenhum logo selecionado</p>
                  <p className="mt-1 text-sm">SVG ou PNG com transparência é o ideal.</p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-400">
              <p className="font-bold text-white">Padrão recomendado:</p>
              <p className="mt-2">
                Use SVG sempre que possível. Para badge redondo ou branco, PNG com transparência também funciona bem.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
