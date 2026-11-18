"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CANVAS_NODE_TYPES } from "./nodeTypes";
import { GraphNodeType } from "@/types/graph";
import { clsx } from "clsx";
import {
  Search,
  CircleDot,
  Target,
  Bot,
  GitFork,
  Wrench,
  Split,
  ShieldCheck,
  Repeat,
  Flag,
  Boxes,
  ServerCog,
  Plug,
  Puzzle,
  Globe,
  Shuffle,
  Timer,
  Layers,
  Variable,
  FileOutput,
  StickyNote,
  Frame,
  Clock,
  Radio,
  Rss,
  FileText,
  Send,
  Binary,
  FileSpreadsheet,
  FileCheck,
  HardDrive,
  Database,
  BrainCircuit,
  Mic,
  Volume2,
  Network,
  MessagesSquare,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  start: CircleDot,
  end: Flag,
  agent: Bot,
  supervisor: GitFork,
  tool: Wrench,
  router: Split,
  approval: ShieldCheck,
  loop: Repeat,
  parallel: Target,
  subgraph: Boxes,
  mcp_server: ServerCog,
  mcp_tool: Plug,
  skill: Puzzle,
  http: Globe,
  transform: Shuffle,
  delay: Timer,
  aggregate: Layers,
  variable: Variable,
  output: FileOutput,
  schedule_trigger: Clock,
  webhook_trigger: Radio,
  rss_feed: Rss,
  web_reader: FileText,
  notification_dispatcher: Send,
  data_mapper: Binary,
  searxng_search: Search,
  crawl4ai_scrape: FileSpreadsheet,
  docling_pdf_parser: FileCheck,
  gotenberg_pdf_exporter: FileOutput,
  nocodb_record: Database,
  pocketbase_store: HardDrive,
  qdrant_vector_memory: BrainCircuit,
  audio_transcriber: Mic,
  piper_tts: Volume2,
  a2a_delegate: Network,
  a2a_channel: MessagesSquare,
  sticky_note: StickyNote,
  frame: Frame,
};

interface QuickConnectSearchProps {
  /** Position in viewport coordinates where the menu should appear. */
  position: { x: number; y: number };
  /** Called when the user selects a node type to create. */
  onSelect: (type: GraphNodeType) => void;
  /** Called to close the menu without selection. */
  onClose: () => void;
  /** The source node/edge handle this connection is being dragged from (for labeling hint). */
  sourceNodeId?: string;
}

/**
 * Quick-Connect Radial Search:
 * Pops up a fuzzy-search menu when a connection handle is dragged onto empty canvas space.
 * User can type to filter node types, then press Enter or click to drop + auto-wire.
 */
export function QuickConnectSearch({
  position,
  onSelect,
  onClose,
  sourceNodeId,
}: QuickConnectSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredTypes = useMemo(() => {
    const q = query.toLowerCase().trim();
    return CANVAS_NODE_TYPES.filter((meta) => {
      if (!q) return true;
      return (
        meta.type.includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        meta.tag.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredTypes.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filteredTypes.length > 0) {
        e.preventDefault();
        onSelect(filteredTypes[selectedIndex].type);
      }
    },
    [filteredTypes, selectedIndex, onSelect, onClose]
  );

  // Clamp selected index when list shrinks
  useEffect(() => {
    if (selectedIndex >= filteredTypes.length) {
      setSelectedIndex(Math.max(0, filteredTypes.length - 1));
    }
  }, [filteredTypes.length, selectedIndex]);

  return (
    <div
      className="pointer-events-auto fixed z-[10000]"
      style={{ left: position.x, top: position.y, transform: "translate(-50%, -100%) translateY(-12px)" }}
    >
      <div
        className="w-72 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between px-0.5">
          <span className="font-sans text-[13px] font-medium text-[var(--text-primary)]">Quick connect</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[4px] font-sans text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>

        {sourceNodeId && (
          <div className="mb-1.5 truncate px-0.5 font-mono text-xs text-[var(--text-muted)]">from {sourceNodeId}</div>
        )}

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search node types"
          placeholder="Search nodes. Arrows to move, Enter to add"
          className="mb-2 h-8 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2.5 font-sans text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
        />

        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {filteredTypes.map((meta, i) => {
            const Icon = ICON_MAP[meta.type] ?? CircleDot;
            return (
              <button
                key={meta.type}
                type="button"
                onClick={() => onSelect(meta.type)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={clsx(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors",
                  i === selectedIndex ? "bg-[var(--text-primary)]/[0.06]" : "hover:bg-[var(--text-primary)]/[0.04]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-sans text-[13px] text-[var(--text-primary)]">{meta.label}</span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">{meta.tag}</span>
                  </div>
                  <div className="truncate font-sans text-xs text-[var(--text-muted)]">{meta.description}</div>
                </div>
              </button>
            );
          })}
          {filteredTypes.length === 0 && (
            <div className="py-4 text-center font-sans text-[13px] text-[var(--text-muted)]">No matching node types</div>
          )}
        </div>
      </div>
    </div>
  );
}
