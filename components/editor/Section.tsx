'use client';

import React from 'react';
import { RIGHT_PANEL_PRESET_ORDER } from '../../lib/studioWorkflow';
import {
  DEFAULT_RIGHT_PANEL_SECTION_ORDER,
  getRightPanelSectionIndex,
  moveRightPanelSection,
} from '../../app/editorConstants';

export function Section({
  title,
  children,
  draggablePanel = false,
}: {
  title: string;
  children: React.ReactNode;
  draggablePanel?: boolean;
}) {
  const fixedPanelOrder = draggablePanel ? RIGHT_PANEL_PRESET_ORDER[title] ?? 999 : undefined;

  const sectionRef = React.useRef<HTMLElement | null>(null);
  const [orderIndex, setOrderIndex] = React.useState<number | undefined>(undefined);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const canDrag = draggablePanel && DEFAULT_RIGHT_PANEL_SECTION_ORDER.includes(title);

  React.useEffect(() => {
    if (!canDrag) return;

    const updateOrder = () => {
      setOrderIndex(getRightPanelSectionIndex(title));
    };

    updateOrder();

    window.addEventListener('novacena:right-panel-section-order-changed', updateOrder);
    window.addEventListener('storage', updateOrder);

    return () => {
      window.removeEventListener('novacena:right-panel-section-order-changed', updateOrder);
      window.removeEventListener('storage', updateOrder);
    };
  }, [canDrag, title]);

  React.useEffect(() => {
    if (!canDrag) return;

    const parent = sectionRef.current?.parentElement;
    if (!parent) return;

    parent.style.display = 'flex';
    parent.style.flexDirection = 'column';
  }, [canDrag]);

  return (
    <section
      ref={sectionRef}
      data-editor-section={title}
      data-right-panel-section={title}
      onDragOver={(event) => {
        if (!canDrag) return;
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => {
        if (!canDrag) return;
        setIsDragOver(false);
      }}
      onDrop={(event) => {
        if (!canDrag) return;
        event.preventDefault();
        setIsDragOver(false);

        const sourceTitle = event.dataTransfer.getData('text/plain');
        moveRightPanelSection(sourceTitle, title);
      }}
      style={{
        order: canDrag && typeof orderIndex === 'number' && orderIndex >= 0 ? orderIndex : fixedPanelOrder,
        padding: '12px 22px 14px',
        scrollMarginTop: 56,
        opacity: isDragging ? 0.45 : 1,
        transform: isDragging ? 'scale(0.985)' : undefined,
        borderTop: isDragOver ? '1px solid rgba(168, 85, 247, 0.75)' : undefined,
        transition: 'opacity 160ms ease, transform 160ms ease, border-color 160ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {canDrag ? (
          <span
            draggable
            title="Arrastar secao"
            onDragStart={(event) => {
              setIsDragging(true);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', title);
            }}
            onDragEnd={() => setIsDragging(false)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              userSelect: 'none',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-1)',
              background: 'rgba(255,255,255,0.04)',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ⋮⋮
          </span>
        ) : null}

        <h3
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 800,
          }}
        >
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}
