"use client";

import React from "react";
import {
  AlignStartVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  Rows3,
  Columns3,
  LayoutTemplate,
  X,
} from "lucide-react";
import type { Edge } from "@xyflow/react";
import type { CanvasNode } from "./graphUtils";
import { computeLayout } from "./autoLayout";

interface AlignmentBarProps {
  selectedNodes: CanvasNode[];
  edges: Edge[];
  onAlign: (updatedNodes: CanvasNode[]) => void;
  onDismiss: () => void;
}

/**
 * Multi-Node Alignment & Distribution Bar:
 * Shows when 2+ nodes are marquee-selected. Provides alignment and distribution tools.
 */
export function AlignmentBar({ selectedNodes, edges, onAlign, onDismiss }: AlignmentBarProps) {
  if (selectedNodes.length < 2) return null;

  const alignTop = () => {
    const minY = Math.min(...selectedNodes.map((n) => n.position.y));
    onAlign(selectedNodes.map((n) => ({ ...n, position: { ...n.position, y: minY } })));
  };

  const alignBottom = () => {
    const maxY = Math.max(...selectedNodes.map((n) => n.position.y + 100));
    onAlign(selectedNodes.map((n) => ({ ...n, position: { ...n.position, y: maxY - 100 } })));
  };

  const alignLeft = () => {
    const minX = Math.min(...selectedNodes.map((n) => n.position.x));
    onAlign(selectedNodes.map((n) => ({ ...n, position: { ...n.position, x: minX } })));
  };

  const alignRight = () => {
    const maxX = Math.max(...selectedNodes.map((n) => n.position.x + 220));
    onAlign(selectedNodes.map((n) => ({ ...n, position: { ...n.position, x: maxX - 220 } })));
  };

  const distributeHorizontal = () => {
    if (selectedNodes.length < 3) return;
    const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const minX = sorted[0].position.x;
    const maxX = sorted[sorted.length - 1].position.x;
    const step = (maxX - minX) / (sorted.length - 1);
    onAlign(sorted.map((n, i) => ({ ...n, position: { ...n.position, x: minX + step * i } })));
  };

  const distributeVertical = () => {
    if (selectedNodes.length < 3) return;
    const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const minY = sorted[0].position.y;
    const maxY = sorted[sorted.length - 1].position.y;
    const step = (maxY - minY) / (sorted.length - 1);
    onAlign(sorted.map((n, i) => ({ ...n, position: { ...n.position, y: minY + step * i } })));
  };

  const autoTidy = () => {
    const positions = computeLayout(selectedNodes, edges);
    onAlign(selectedNodes.map((n, i) => ({ ...n, position: positions[i] ?? n.position })));
  };

  const btnClass =
    "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-30";
  const divider = <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />;

  return (
    <div className="absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
      <span className="mr-1.5 font-mono text-xs tabular-nums text-[var(--text-muted)]">{selectedNodes.length} selected</span>

      {divider}

      <button onClick={alignLeft} className={btnClass} title="Align left">
        <AlignStartVertical className="h-3.5 w-3.5" />
      </button>
      <button onClick={alignRight} className={btnClass} title="Align right">
        <AlignEndVertical className="h-3.5 w-3.5" />
      </button>
      <button onClick={alignTop} className={btnClass} title="Align top">
        <AlignStartHorizontal className="h-3.5 w-3.5" />
      </button>
      <button onClick={alignBottom} className={btnClass} title="Align bottom">
        <AlignEndHorizontal className="h-3.5 w-3.5" />
      </button>

      {divider}

      <button
        onClick={distributeHorizontal}
        className={btnClass}
        disabled={selectedNodes.length < 3}
        title="Distribute horizontally (requires 3+ nodes)"
      >
        <Rows3 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={distributeVertical}
        className={btnClass}
        disabled={selectedNodes.length < 3}
        title="Distribute vertically (requires 3+ nodes)"
      >
        <Columns3 className="h-3.5 w-3.5" />
      </button>

      {divider}

      <button onClick={autoTidy} className={btnClass} title="Auto-tidy layout">
        <LayoutTemplate className="h-3.5 w-3.5" />
      </button>

      {divider}

      <button onClick={onDismiss} className={btnClass} title="Dismiss">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
