"use client";

import React, { useMemo } from "react";

interface BranchInfo {
  nodeId: string;
  label: string;
  status?: "RUNNING" | "SUCCESS" | "FAILED" | "AWAITING_APPROVAL" | "SKIPPED";
  durationMs?: number;
}

interface ParallelBranchProgressProps {
  /** The parallel node's ID. */
  parentNodeId: string;
  /** Branches spawned by this parallel node. */
  branches: BranchInfo[];
  /** Total expected branches. */
  totalBranches?: number;
  /** Map of active branches from the execution stream. */
  activeBranches?: string[];
}

export function ParallelBranchProgress({
  parentNodeId: _parentNodeId,
  branches,
  totalBranches,
  activeBranches = [],
}: ParallelBranchProgressProps) {
  const stats = useMemo(() => {
    const running = branches.filter((b) => b.status === "RUNNING").length;
    const succeeded = branches.filter((b) => b.status === "SUCCESS").length;
    const failed = branches.filter((b) => b.status === "FAILED").length;
    const total = totalBranches ?? branches.length;
    const completed = succeeded + failed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { running, succeeded, failed, total, completed, percent };
  }, [branches, totalBranches]);

  if (branches.length === 0 && activeBranches.length === 0) return null;

  const dot = (status?: BranchInfo["status"]) =>
    status === "RUNNING"
      ? "var(--accent-primary)"
      : status === "SUCCESS"
      ? "var(--state-success)"
      : status === "FAILED"
      ? "var(--state-error)"
      : "var(--text-muted)";

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${stats.percent}%`,
              background: stats.failed > 0 ? "var(--state-warning)" : stats.percent >= 100 ? "var(--state-success)" : "var(--accent-primary)",
            }}
          />
        </div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
          {stats.completed}/{stats.total}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {branches.map((branch) => (
          <div
            key={branch.nodeId}
            className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border-subtle)] px-1.5 py-0.5 font-sans text-[10px] text-[var(--text-secondary)]"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: dot(branch.status) }} />
            {branch.label}
            {branch.durationMs !== undefined && (
              <span className="font-mono tabular-nums text-[var(--text-muted)]">
                {branch.durationMs >= 1000 ? `${(branch.durationMs / 1000).toFixed(1)}s` : `${branch.durationMs}ms`}
              </span>
            )}
          </div>
        ))}

        {Array.from({ length: Math.max(0, (totalBranches ?? 0) - branches.length) }).map((_, i) => (
          <div
            key={`ghost-${i}`}
            className="inline-flex items-center rounded-[4px] border border-dashed border-[var(--border-subtle)] px-1.5 py-0.5 font-sans text-[10px] text-[var(--text-muted)]"
          >
            pending
          </div>
        ))}
      </div>
    </div>
  );
}
