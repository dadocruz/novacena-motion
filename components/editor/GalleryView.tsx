'use client';

import React from 'react';
import type { ArtistRecord, GalleryItem } from '../../app/editorConstants';
import { miniLabel } from '../../app/editorStyles';

export function GalleryView({
  artist, items, driveFolderPath, onDriveChange, onDriveSave, onLoad, onDelete,
}: {
  artist?: ArtistRecord; items: GalleryItem[]; driveFolderPath: string;
  onDriveChange: (s: string) => void; onDriveSave: () => void;
  onLoad: (item: GalleryItem) => void; onDelete: (id: string) => void;
}) {
  if (!artist) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        Selecione um artista pra ver a galeria.
      </div>
    );
  }
  return (
    <div style={{ padding: '20px 40px', width: '100%', maxWidth: 980 }}>
      <h2 style={{ fontSize: 22, margin: '0 0 6px' }}>{artist.name}</h2>
      <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>
        Galeria · {items.length} {items.length === 1 ? 'arte salva' : 'artes salvas'}
      </div>

      <div style={{
        padding: 14, background: 'var(--surface-1)', border: '1px solid var(--border-1)',
        borderRadius: 10, marginBottom: 24,
      }}>
        <div style={miniLabel}>Pasta do Drive (sincronizada via Google Drive Desktop)</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={driveFolderPath}
            onChange={(e) => onDriveChange(e.target.value)}
            placeholder="/Users/voce/Google Drive/Artistas/Nome"
            style={{
              flex: 1, padding: '8px 12px', background: 'var(--bg-2)',
              border: '1px solid var(--border-1)', borderRadius: 8,
              color: 'var(--text-1)', fontSize: 13, outline: 'none',
            }}
          />
          <button onClick={onDriveSave} style={{
            padding: '8px 14px', background: 'var(--text-1)', color: 'var(--bg-0)',
            border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
          }}>Salvar</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          Cole o caminho local da pasta sincronizada. Os videos renderizados ficam disponiveis pra
          download nesse caminho do Drive Desktop.
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
          Nenhuma arte salva ainda. Crie uma no Studio e clique em <strong>★ Salvar na galeria</strong>.
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14,
        }}>
          {items.map((item) => (
            <div key={item.id} style={{
              borderRadius: 12, overflow: 'hidden',
              background: 'var(--surface-1)', border: '1px solid var(--border-1)',
            }}>
              <div style={{
                aspectRatio: '9 / 16', background: 'var(--bg-2)', position: 'relative', cursor: 'pointer',
              }} onClick={() => onLoad(item)}>
                {item.thumbnailPath && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.thumbnailPath} alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                  {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => onLoad(item)} style={{
                    flex: 1, padding: '5px 8px', background: 'var(--surface-2)',
                    border: '1px solid var(--border-1)', borderRadius: 6,
                    color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
                  }}>Carregar</button>
                  <button onClick={() => onDelete(item.id)} style={{
                    padding: '5px 8px', background: 'transparent',
                    border: '1px solid var(--border-1)', borderRadius: 6,
                    color: 'var(--danger)', fontSize: 11,
                  }}>x</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
