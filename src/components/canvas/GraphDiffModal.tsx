"use client";

import React, { useState } from "react";
import { X, Plus, Minus, Pencil, GitBranch, CheckCircle2, LayoutGrid, List, ArrowRight } from "lucide-react";
import { GraphDiff } from "./graphDiff";
import { clsx } from "clsx";
import { CANVAS_NODE_TYPE_MAP } from "./nodeTypes";
import { GraphNodeType } from "@/types/graph";

interface GraphDiffModalProps {
  diff: GraphDiff;
  baseLabel: string;
  onClose: () => void;
}

function Section({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className={`text-xs font-medium ${tone}`}>{title} ({items.length})</div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)]">
            <span className="shrink-0">{icon}</span>
            <span className="truncate">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATE_DOT = {
  added: "var(--state-success)",
  removed: "var(--state-error)",
  changed: "var(--state-warning)",
} as const;

function DiffNodeCard({ type, label, status, details }: { type: string; label: string; status: "added" | "removed" | "changed"; details?: string }) {
  const meta = CANVAS_NODE_TYPE_MAP[type as GraphNodeType];
  const Icon = meta?.icon;

  return (
    <div className="flex items-center gap-2.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2.5">
      <div className="shrink-0">
        {Icon ? <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" /> : <div className="h-3.5 w-3.5 rounded bg-[var(--surface-sunken)]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-sans text-[13px] text-[var(--text-primary)]">{label}</span>
          <span className="font-mono text-xs text-[var(--text-muted)]">{type}</span>
        </div>
        {details && <div className="mt-0.5 truncate font-sans text-xs text-[var(--text-muted)]">{details}</div>}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 font-sans text-xs text-[var(--text-secondary)]">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: STATE_DOT[status] }} />
        {status}
      </span>
    </div>
  );
}

function DiffEdgeCard({ source, target, label, status }: { source: string; target: string; label?: string; status: "added" | "removed" }) {
  return (
    <div className="flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2 font-mono text-xs">
      <span className="truncate text-[var(--text-secondary)]">{source}</span>
      <ArrowRight className="h-2.5 w-2.5 shrink-0 text-[var(--text-muted)]" />
      <span className="truncate text-[var(--text-secondary)]">{target}</span>
      {label && <span className="shrink-0 text-[var(--text-muted)]">{label}</span>}
      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-sans text-xs text-[var(--text-secondary)]">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: STATE_DOT[status === "added" ? "added" : "removed"] }} />
        {status === "added" ? "added" : "removed"}
      </span>
    </div>
  );
}

export function GraphDiffModal({ diff, baseLabel, onClose }: GraphDiffModalProps) {
  const [viewMode, setViewMode] = useState<"visual" | "list">("visual");
  const total = diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length + diff.addedEdges.length + diff.removedEdges.length;

  const hasNodes = diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length > 0;
  const hasEdges = diff.addedEdges.length + diff.removedEdges.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/95">
          <div className="flex items-center gap-3">
            <div className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> Version diff
            </div>
            <span className="text-xs text-[var(--text-muted)]">vs {baseLabel}</span>
            {total > 0 && (
              <div className="flex items-center gap-1">
                {diff.addedNodes.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--state-success)]/10 text-[var(--state-success)] text-xs font-medium">
                    +{diff.addedNodes.length}
                  </span>
                )}
                {diff.removedNodes.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--state-error)]/10 text-[var(--state-error)] text-xs font-medium">
                    -{diff.removedNodes.length}
                  </span>
                )}
                {diff.changedNodes.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--state-warning)]/10 text-[var(--state-warning)] text-xs font-medium">
                    ~{diff.changedNodes.length}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center rounded border border-[var(--border-subtle)] overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className={clsx(
                  "p-1 transition-colors cursor-pointer",
                  viewMode === "visual"
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                title="Visual diff view"
              >
                <LayoutGrid className="h-3 w-3" />
              </button>
              <div className="w-px h-3 bg-[var(--surface-sunken)]" />
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={clsx(
                  "p-1 transition-colors cursor-pointer",
                  viewMode === "list"
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                title="Compact list view"
              >
                <List className="h-3 w-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--state-error)]/40 hover:text-[var(--state-error)] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {total === 0 ? (
            <div className="flex items-center gap-2 text-xs text-[var(--state-success)] font-medium py-8 justify-center">
              <CheckCircle2 className="h-5 w-5" /> No differences. the working graph matches {baseLabel}.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Node Changes */}
              {hasNodes && (
                <div className="space-y-2">
                  <div className="text-xs text-[var(--text-secondary)] font-medium">
                    Node changes
                  </div>
                  {viewMode === "visual" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {diff.addedNodes.map((n) => (
                        <DiffNodeCard key={`added-${n.id}`} type={n.type} label={n.label} status="added" details={n.id} />
                      ))}
                      {diff.removedNodes.map((n) => (
                        <DiffNodeCard key={`removed-${n.id}`} type={n.type} label={n.label} status="removed" details={n.id} />
                      ))}
                      {diff.changedNodes.map((n) => (
                        <DiffNodeCard
                          key={`changed-${n.id}`}
                          type="agent"
                          label={n.label}
                          status="changed"
                          details={`Modified: ${n.fields.join(", ")}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Section icon={<Plus className="h-3 w-3 text-[var(--state-success)]" />} title="Added nodes" items={diff.addedNodes.map((n) => `[${n.type}] ${n.label} (${n.id})`)} tone="text-[var(--state-success)]" />
                      <Section icon={<Minus className="h-3 w-3 text-[var(--state-error)]" />} title="Removed nodes" items={diff.removedNodes.map((n) => `[${n.type}] ${n.label} (${n.id})`)} tone="text-[var(--state-error)]" />
                      <Section icon={<Pencil className="h-3 w-3 text-[var(--state-warning)]" />} title="Changed nodes" items={diff.changedNodes.map((n) => `${n.label}. ${n.fields.join(", ")}`)} tone="text-[var(--state-warning)]" />
                    </div>
                  )}
                </div>
              )}

              {/* Edge Changes */}
              {hasEdges && (
                <div className="space-y-2">
                  <div className="text-xs text-[var(--text-secondary)] font-medium">
                    Edge changes
                  </div>
                  {viewMode === "visual" ? (
                    <div className="space-y-1">
                      {diff.addedEdges.map((e, i) => (
                        <DiffEdgeCard key={`added-e-${i}`} source={e.source} target={e.target} label={e.label} status="added" />
                      ))}
                      {diff.removedEdges.map((e, i) => (
                        <DiffEdgeCard key={`removed-e-${i}`} source={e.source} target={e.target} label={e.label} status="removed" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Section icon={<Plus className="h-3 w-3 text-[var(--accent-primary)]" />} title="Added edges" items={diff.addedEdges.map((e) => `${e.source} → ${e.target}${e.label ? ` [${e.label}]` : ""}`)} tone="text-[var(--accent-primary)]" />
                      <Section icon={<Minus className="h-3 w-3 text-[var(--state-warning)]" />} title="Removed edges" items={diff.removedEdges.map((e) => `${e.source} → ${e.target}${e.label ? ` [${e.label}]` : ""}`)} tone="text-[var(--state-warning)]" />
                    </div>
                  )}
                </div>
              )}

              {/* Summary Stats */}
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { label: "Added", count: diff.addedNodes.length, color: "text-[var(--state-success)]" },
                    { label: "Removed", count: diff.removedNodes.length, color: "text-[var(--state-error)]" },
                    { label: "Changed", count: diff.changedNodes.length, color: "text-[var(--state-warning)]" },
                    { label: "Edges +", count: diff.addedEdges.length, color: "text-[var(--text-secondary)]" },
                    { label: "Edges -", count: diff.removedEdges.length, color: "text-[var(--state-warning)]" },
                  ].map((s) => (
                    <div key={s.label} className="space-y-0.5">
                      <div className={clsx("text-[12px] font-medium", s.color)}>{s.count}</div>
                      <div className="text-xs text-[var(--text-muted)] font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
