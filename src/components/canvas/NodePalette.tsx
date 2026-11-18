"use client";

import React, { useState, useMemo } from "react";
import { CANVAS_NODE_TYPES } from "./nodeTypes";
import { GraphNodeType } from "@/types/graph";
import { clsx } from "clsx";

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, type: GraphNodeType) => void;
  disabled?: boolean;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "triggers", label: "Triggers" },
  { id: "agent_core", label: "Agent core" },
  { id: "actions_apis", label: "APIs and actions" },
  { id: "data_ops", label: "Data ops" },
] as const;

function getNodeCategory(type: GraphNodeType): "triggers" | "agent_core" | "actions_apis" | "data_ops" | "visuals" {
  if (type === "schedule_trigger" || type === "webhook_trigger" || type === "start" || type === "end") {
    return "triggers";
  }
  if (type === "agent" || type === "supervisor" || type === "router" || type === "approval" || type === "loop" || type === "parallel" || type === "subgraph") {
    return "agent_core";
  }
  if (
    type === "http" ||
    type === "rss_feed" ||
    type === "web_reader" ||
    type === "notification_dispatcher" ||
    type === "searxng_search" ||
    type === "crawl4ai_scrape" ||
    type === "docling_pdf_parser" ||
    type === "gotenberg_pdf_exporter" ||
    type === "audio_transcriber" ||
    type === "piper_tts" ||
    type === "tool" ||
    type === "mcp_server" ||
    type === "mcp_tool" ||
    type === "skill"
  ) {
    return "actions_apis";
  }
  if (
    type === "transform" ||
    type === "data_mapper" ||
    type === "nocodb_record" ||
    type === "pocketbase_store" ||
    type === "qdrant_vector_memory" ||
    type === "delay" ||
    type === "aggregate" ||
    type === "variable" ||
    type === "output"
  ) {
    return "data_ops";
  }
  return "visuals";
}

export function NodePalette({ onDragStart, disabled = false }: NodePaletteProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredNodes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CANVAS_NODE_TYPES.filter((meta) => {
      const cat = getNodeCategory(meta.type);
      if (activeCategory !== "all") {
        if (cat !== activeCategory) return false;
      }
      if (!q) return true;
      return (
        meta.label.toLowerCase().includes(q) ||
        meta.type.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        meta.tag.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  return (
    <div className="flex h-full select-none flex-col">
      <div className="shrink-0 space-y-2 px-1 pb-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-sans text-sm font-medium text-[var(--text-primary)]">Nodes</h2>
          <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">{filteredNodes.length}</span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search nodes"
            placeholder="Search nodes"
            className="h-8 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2.5 pr-14 font-sans text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-[4px] font-sans text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={clsx(
                "cursor-pointer rounded-[4px] font-sans text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                activeCategory === cat.id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {filteredNodes.map((meta) => {
          const Icon = meta.icon;
          return (
            <div
              key={meta.type}
              draggable={!disabled}
              onDragStart={(e) => onDragStart(e, meta.type)}
              title={meta.description}
              className={clsx(
                "flex items-center gap-2.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-2 transition-colors hover:border-[var(--border-strong)]",
                disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-[13px] text-[var(--text-primary)]">{meta.label}</div>
                <div className="truncate font-sans text-xs text-[var(--text-muted)]">{meta.description}</div>
              </div>
              <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{meta.tag}</span>
            </div>
          );
        })}
        {filteredNodes.length === 0 && (
          <div className="py-4 text-center font-sans text-[13px] text-[var(--text-muted)]">No matching nodes</div>
        )}
      </div>
    </div>
  );
}
