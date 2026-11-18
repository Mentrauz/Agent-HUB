"use client";

import React, { useMemo, useEffect, useState } from "react";
import { clsx } from "clsx";

interface ExecutionProgressOverlayProps {
  /** Current execution status string. */
  executionStatus: string | null;
  /** Map of nodeId → status. */
  nodeStatuses: Record<string, "RUNNING" | "SUCCESS" | "FAILED" | "AWAITING_APPROVAL" | "SKIPPED">;
  /** Map of nodeId → human-readable detail. */
  nodeDetails: Record<string, string>;
  /** Total number of nodes in the graph. */
  totalNodes: number;
  /** Whether SSE is connected. */
  connected: boolean;
  /** Start timestamp (ms since epoch) — for elapsed timer. */
  startedAt?: number;
  /** Cumulative token counts from LLM calls. */
  tokenSummary?: { inputTokens: number; outputTokens: number; totalCost: number };
  /** Whether this is a preview (ghost) run. */
  isPreview?: boolean;
}

export function ExecutionProgressOverlay({
  executionStatus,
  nodeStatuses,
  nodeDetails,
  totalNodes,
  connected,
  startedAt,
  tokenSummary,
  isPreview = false,
}: ExecutionProgressOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Live elapsed timer
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt]);

  const stats = useMemo(() => {
    const statuses = Object.values(nodeStatuses);
    const running = statuses.filter((s) => s === "RUNNING").length;
    const succeeded = statuses.filter((s) => s === "SUCCESS").length;
    const failed = statuses.filter((s) => s === "FAILED").length;
    const awaiting = statuses.filter((s) => s === "AWAITING_APPROVAL").length;
    const completed = succeeded + failed;
    const percent = totalNodes > 0 ? Math.round((completed / totalNodes) * 100) : 0;

    return { running, succeeded, failed, awaiting, completed, percent };
  }, [nodeStatuses, totalNodes]);

  const isTerminal = executionStatus
    ? ["COMPLETED", "FAILED", "CANCELLED", "STEP_LIMIT_EXCEEDED"].includes(executionStatus)
    : false;

  const formatMs = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60_000);
    const secs = Math.round((ms % 60_000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const label = (v: string | null) => (v ? v.toLowerCase().replace(/_/g, " ") : "starting");
  const tone =
    executionStatus === "COMPLETED"
      ? "var(--state-success)"
      : executionStatus === "FAILED"
      ? "var(--state-error)"
      : "var(--accent-primary)";

  if (isTerminal && stats.percent >= 100) {
    return (
      <div className="flex items-center gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-sans text-[13px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-2 text-[var(--text-primary)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
          {label(executionStatus)}
        </span>
        <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {stats.succeeded} succeeded · {stats.failed} failed{elapsed > 0 ? ` · ${formatMs(elapsed)}` : ""}
        </span>
      </div>
    );
  }

  const counts = [
    { label: "Running", count: stats.running, dot: "var(--accent-primary)" },
    { label: "Succeeded", count: stats.succeeded, dot: "var(--state-success)" },
    { label: "Failed", count: stats.failed, dot: "var(--state-error)" },
    { label: "Waiting", count: stats.awaiting, dot: "var(--state-warning)" },
  ];

  const nodeList = (title: string, status: "RUNNING" | "AWAITING_APPROVAL") => (
    <div className="space-y-1">
      <div className="font-sans text-xs text-[var(--text-muted)]">{title}</div>
      <ul className="max-h-20 space-y-0.5 overflow-y-auto">
        {Object.entries(nodeStatuses)
          .filter(([, st]) => st === status)
          .map(([nodeId]) => (
            <li key={nodeId} className="flex items-baseline gap-2 font-mono text-xs">
              <span className="truncate text-[var(--text-secondary)]">{nodeId}</span>
              {nodeDetails[nodeId] && <span className="truncate text-[var(--text-muted)]">{nodeDetails[nodeId]}</span>}
            </li>
          ))}
      </ul>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        aria-expanded={!collapsed}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--text-primary)]/[0.04]"
      >
        <span className="flex items-center gap-2 font-sans text-[13px] text-[var(--text-primary)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
          {isPreview ? "Ghost preview" : "Run"} · {label(executionStatus)}
        </span>
        <span className="flex items-center gap-2 font-sans text-xs text-[var(--text-muted)]">
          <span aria-hidden="true" className={clsx("h-1.5 w-1.5 rounded-full", connected ? "bg-[var(--state-success)]" : "bg-[var(--state-error)]")} />
          {connected ? "connected" : "offline"}
          <span>{collapsed ? "Show" : "Hide"}</span>
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-3 px-3 pb-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-xs tabular-nums text-[var(--text-muted)]">
              <span>
                {stats.completed} / {totalNodes} nodes
              </span>
              <span>
                {stats.percent}%{elapsed > 0 ? ` · ${formatMs(elapsed)}` : ""}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${stats.percent}%`, background: stats.percent >= 100 ? "var(--state-success)" : "var(--accent-primary)" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {counts.map((c) => (
              <div key={c.label} className="space-y-0.5">
                <div className="font-mono text-sm tabular-nums text-[var(--text-primary)]">{c.count}</div>
                <div className="flex items-center gap-1.5 font-sans text-xs text-[var(--text-muted)]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
                  {c.label}
                </div>
              </div>
            ))}
          </div>

          {stats.running > 0 && nodeList("Active", "RUNNING")}
          {stats.awaiting > 0 && nodeList("Awaiting approval", "AWAITING_APPROVAL")}

          {tokenSummary && (tokenSummary.inputTokens > 0 || tokenSummary.outputTokens > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border-subtle)] pt-2 font-mono text-xs tabular-nums text-[var(--text-muted)]">
              <span>{tokenSummary.inputTokens.toLocaleString()} in</span>
              <span>{tokenSummary.outputTokens.toLocaleString()} out</span>
              {tokenSummary.totalCost > 0 && <span>${tokenSummary.totalCost.toFixed(4)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
