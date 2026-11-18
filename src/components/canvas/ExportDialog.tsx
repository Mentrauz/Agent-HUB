"use client";

import React, { useCallback, useState } from "react";
import { clsx } from "clsx";
import {
  EXPORT_FORMATS,
  type ExportFormat,
  exportCanvasAsPng,
  exportCanvasAsSvg,
  exportCanvasAsPdf,
  graphToMermaid,
  graphToLangGraphPython,
  graphToLangGraphTS,
  exportGraphAsJson,
} from "./exportUtils";
import type { AgentGraphDefinition } from "@/types/graph";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  graph: AgentGraphDefinition;
  canvasContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const CATEGORIES = ["visual", "code", "data"] as const;

/**
 * Export & Portability Suite dialog:
 * Visual export (PNG/SVG/PDF), Code/Framework export (Mermaid/LangGraph), JSON import/export.
 */
export function ExportDialog({ isOpen, onClose, graph, canvasContainerRef }: ExportDialogProps) {
  const [activeCategory, setActiveCategory] = useState<"visual" | "code" | "data">("visual");
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(format.id);
      try {
        switch (format.id) {
          case "png":
            if (canvasContainerRef?.current) {
              await exportCanvasAsPng(canvasContainerRef.current);
            }
            break;
          case "svg":
            if (canvasContainerRef?.current) {
              await exportCanvasAsSvg(canvasContainerRef.current);
            }
            break;
          case "pdf":
            if (canvasContainerRef?.current) {
              await exportCanvasAsPdf(canvasContainerRef.current);
            }
            break;
          case "mermaid": {
            const code = graphToMermaid(graph);
            downloadText(code, "agent-graph.md", "text/markdown");
            break;
          }
          case "langgraph-py": {
            const code = graphToLangGraphPython(graph);
            downloadText(code, "agent_graph.py", "text/x-python");
            break;
          }
          case "langgraph-ts": {
            const code = graphToLangGraphTS(graph);
            downloadText(code, "agentGraph.ts", "text/typescript");
            break;
          }
          case "json": {
            const code = exportGraphAsJson(graph);
            downloadText(code, "agent-graph.json", "application/json");
            break;
          }
        }
        onClose();
      } catch (e) {
        console.error("Export failed:", e);
      } finally {
        setExporting(null);
      }
    },
    [graph, canvasContainerRef, onClose]
  );

  if (!isOpen) return null;

  const filteredFormats = EXPORT_FORMATS.filter((f) => f.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-[480px] max-w-[90vw] overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 id="export-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
            Export graph
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>

        <div className="flex items-center gap-5 px-5 pt-4 font-sans text-sm">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "cursor-pointer rounded-[6px] capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                activeCategory === cat ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <ul className="m-5 divide-y divide-[var(--border-subtle)] rounded-[10px] border border-[var(--border-subtle)]">
          {filteredFormats.map((format) => (
            <li key={format.id}>
              <button
                type="button"
                onClick={() => handleExport(format)}
                disabled={exporting !== null}
                className="flex w-full cursor-pointer items-baseline justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--text-primary)]/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="block font-sans text-sm text-[var(--text-primary)]">{format.label}</span>
                  <span className="block font-sans text-[13px] text-[var(--text-muted)]">{format.description}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{exporting === format.id ? "Exporting" : "Download"}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
