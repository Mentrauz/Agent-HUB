"use client";

import React, { useState, useCallback } from "react";
import {
  GitBranch,
  Plus,
  X,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { ConditionExpressionEditor } from "./ConditionExpressionEditor";

interface Branch {
  id: string;
  label: string;
  condition?: string;
  isDefault?: boolean;
}

interface ConditionalBranchEditorProps {
  /** Current router mode. */
  routerMode: "deterministic" | "ai";
  /** Current condition expression (deterministic mode). */
  condition: string;
  /** Current router prompt (AI mode). */
  routerPrompt: string;
  /** Outgoing branches (edges with labels) from this node. */
  branches: Branch[];
  /** Called when the user modifies any branch config. */
  onUpdate: (patch: {
    routerMode?: "deterministic" | "ai";
    condition?: string;
    routerPrompt?: string;
    branches?: Branch[];
  }) => void;
  /** Available outgoing edge labels for autocomplete. */
  edgeLabels?: string[];
  /** Node IDs in the graph for autocomplete and validation. */
  allNodeIds?: string[];
  /** Whether this is read-only (trace mode). */
  readOnly?: boolean;
}

export function ConditionalBranchEditor({
  routerMode,
  condition,
  routerPrompt,
  branches,
  onUpdate,
  edgeLabels: _edgeLabels = [],
  allNodeIds = [],
  readOnly = false,
}: ConditionalBranchEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [newBranchLabel, setNewBranchLabel] = useState("");

  const addBranch = useCallback(() => {
    if (!newBranchLabel.trim()) return;
    const branch: Branch = {
      id: `branch_${Date.now()}`,
      label: newBranchLabel.trim(),
      condition: routerMode === "deterministic" ? `results.classifier.decision == "${newBranchLabel.trim()}"` : undefined,
    };
    onUpdate({ branches: [...branches, branch] });
    setNewBranchLabel("");
  }, [newBranchLabel, branches, routerMode, onUpdate]);

  const removeBranch = useCallback(
    (branchId: string) => {
      onUpdate({ branches: branches.filter((b) => b.id !== branchId) });
    },
    [branches, onUpdate]
  );

  const updateBranch = useCallback(
    (branchId: string, patch: Partial<Branch>) => {
      onUpdate({
        branches: branches.map((b) => (b.id === branchId ? { ...b, ...patch } : b)),
      });
    },
    [branches, onUpdate]
  );

  return (
    <div className="rounded-[8px] border border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--surface-sunken)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3 text-[var(--state-warning)]" />
          <span className="text-xs text-[var(--state-warning)] font-medium">
            Branching config
          </span>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            ({branches.length} branch{branches.length !== 1 ? "es" : ""})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Mode Toggle */}
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)] font-medium">Mode</label>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onUpdate({ routerMode: "deterministic" })}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer",
                  routerMode === "deterministic"
                    ? "border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-[var(--state-warning)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--state-warning)]/25",
                  readOnly && "opacity-50 cursor-not-allowed"
                )}
              >
                <Zap className="h-2.5 w-2.5" /> Condition
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onUpdate({ routerMode: "ai" })}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer",
                  routerMode === "ai"
                    ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-subtle)]",
                  readOnly && "opacity-50 cursor-not-allowed"
                )}
              >
                <Bot className="h-2.5 w-2.5" /> AI router
              </button>
            </div>
          </div>

          {/* Condition / Prompt Input */}
          {routerMode === "deterministic" ? (
            <ConditionExpressionEditor
              value={condition}
              onChange={(v) => onUpdate({ condition: v })}
              readOnly={readOnly}
              allNodeIds={allNodeIds}
            />
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)] font-medium">
                AI router prompt
              </label>
              <textarea
                value={routerPrompt}
                onChange={(e) => onUpdate({ routerPrompt: e.target.value })}
                readOnly={readOnly}
                rows={3}
                placeholder="Describe how the AI should choose between branches…"
                className={clsx(
                  "w-full rounded border px-2.5 py-1.5 text-xs font-mono resize-y focus:outline-none transition-colors",
                  readOnly
                    ? "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                    : "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-subtle)]"
                )}
              />
              <p className="text-xs text-[var(--text-muted)] leading-tight">
                The LLM will pick one of the branch labels below as its decision.
              </p>
            </div>
          )}

          {/* Branches */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">
              Outgoing branches
            </label>
            {branches.length === 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-[var(--state-warning)]/10 border border-[var(--state-warning)]/25">
                <AlertTriangle className="h-3 w-3 text-[var(--state-warning)] shrink-0" />
                <span className="text-xs text-[var(--state-warning)]">
                  No branches defined. Add at least one outgoing branch.
                </span>
              </div>
            )}
            {branches.map((branch, idx) => (
              <div
                key={branch.id}
                className="flex items-center gap-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] group"
              >
                <ArrowRight className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--text-muted)] font-medium shrink-0">#{idx + 1}</span>
                    <input
                      value={branch.label}
                      onChange={(e) => updateBranch(branch.id, { label: e.target.value })}
                      readOnly={readOnly}
                      placeholder="branch-label"
                      className="flex-1 min-w-0 rounded border border-[var(--border-subtle)] bg-transparent px-1.5 py-0.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)]"
                    />
                    {routerMode === "deterministic" && (
                      <ConditionExpressionEditor
                        value={branch.condition ?? ""}
                        onChange={(v) => updateBranch(branch.id, { condition: v })}
                        readOnly={readOnly}
                        allNodeIds={allNodeIds}
                      />
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeBranch(branch.id)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--state-error)]/10 text-[var(--text-muted)] hover:text-[var(--state-error)] transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Add Branch */}
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                <input
                  value={newBranchLabel}
                  onChange={(e) => setNewBranchLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addBranch();
                  }}
                  placeholder="new branch label…"
                  className="flex-1 rounded border border-dashed border-[var(--border-strong)] bg-transparent px-2 py-1 text-xs font-mono text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors"
                />
                <button
                  type="button"
                  onClick={addBranch}
                  disabled={!newBranchLabel.trim()}
                  className="p-1 rounded border border-dashed border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-subtle)] transition-colors cursor-pointer disabled:opacity-30"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Visual Preview */}
          {branches.length > 0 && (
            <div className="pt-1 border-t border-[var(--border-subtle)]">
              <label className="text-xs text-[var(--text-muted)] font-medium mb-1.5 block">
                Visual preview
              </label>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <div className="shrink-0 px-2 py-1 rounded bg-[var(--surface-sunken)] text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  Router
                </div>
                <div className="text-[var(--text-muted)]">→</div>
                {branches.map((branch, idx) => (
                  <React.Fragment key={branch.id}>
                    <div className="shrink-0 px-2 py-1 rounded border text-xs font-medium">
                      {idx === 0 ? (
                        <span className="bg-[var(--state-success)]/10 text-[var(--state-success)] border-[var(--state-success)]/25">
                          {branch.label || "—"}
                        </span>
                      ) : idx === 1 ? (
                        <span className="bg-[var(--state-error)]/10 text-[var(--state-error)] border-[var(--state-error)]/25">
                          {branch.label || "—"}
                        </span>
                      ) : (
                        <span className="bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]">
                          {branch.label || "—"}
                        </span>
                      )}
                    </div>
                    {idx < branches.length - 1 && (
                      <span className="text-[var(--text-muted)] text-xs">·</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
