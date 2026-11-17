"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { executionsApi } from "@/lib/api/executions";
import { SkeletonTable } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ExecutionDTO } from "@/types/execution";
import {
  BTN_SECONDARY,
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  INPUT,
  META,
  PageHeader,
  ROW_HOVER,
  StatusDot,
  TH,
  plural,
} from "@/components/ui/surfaces";

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}…` : id;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  PAUSED_FOR_APPROVAL: "Awaiting approval",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  STEP_LIMIT_EXCEEDED: "Step limit",
};

/** A ranked list with thin bars. The leader gets the accent, the rest stay neutral. */
function RankedList({
  title,
  empty,
  unit,
  rows,
}: {
  title: string;
  empty: string;
  unit: string;
  rows: { name: string; count: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className={clsx(CARD, "h-full")}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center font-sans text-sm text-[var(--text-muted)]">{empty}</p>
      ) : (
        <ul className="space-y-4 p-5">
          {rows.map((r, i) => (
            <li key={r.name} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-sans text-sm text-[var(--text-primary)]">{r.name}</span>
                <span className={META}>{plural(r.count, unit)}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(r.count / max) * 100}%`,
                    background: i === 0 ? "var(--accent-primary)" : "var(--text-muted)",
                    opacity: i === 0 ? 1 : 0.5,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => executionsApi.metrics(),
  });

  const { data: executions, isLoading: execLoading } = useQuery({
    queryKey: ["executions", "history", debounced],
    queryFn: () => executionsApi.list({ search: debounced || undefined, limit: 50 }),
  });

  const stats = [
    { label: "Executions", value: metrics ? metrics.totalExecutions.toLocaleString() : "—", detail: "All agent runs" },
    {
      label: "Success rate",
      value: metrics ? `${metrics.successRate}%` : "—",
      detail: `${metrics?.failureRate ?? 0}% failed`,
    },
    {
      label: "Average run time",
      value: metrics ? `${(metrics.avgExecutionTimeMs / 1000).toFixed(2)} s` : "—",
      detail: "Wall clock, per run",
    },
    {
      label: "Approvals",
      value: metrics ? metrics.approvalCount.toLocaleString() : "—",
      detail: `${metrics?.pendingApprovalCount ?? 0} pending review`,
    },
  ];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Observability"
        meta="Run metrics, usage and history"
        action={
          <Link href="/dashboard/executions" className={BTN_SECONDARY}>
            All executions
          </Link>
        }
      />

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--border-subtle)] lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="space-y-3 bg-[var(--surface-raised)] p-5">
            <div className="font-sans text-[13px] text-[var(--text-muted)]">{s.label}</div>
            <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">{s.value}</div>
            <div className="font-sans text-[13px] text-[var(--text-secondary)]">{s.detail}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown as one line */}
      {metrics && (
        <div className={clsx(META, "flex flex-wrap items-center gap-x-6 gap-y-2")}>
          {Object.entries(metrics.executionsByStatus).map(([status, count]) => (
            <span key={status} className="text-[var(--text-secondary)]">
              {count.toLocaleString()} <span className="text-[var(--text-muted)]">{(STATUS_LABEL[status] ?? status).toLowerCase()}</span>
            </span>
          ))}
        </div>
      )}

      {/* Usage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankedList
          title="Most used skills"
          empty="No executions yet"
          unit="run"
          rows={(metrics?.mostUsedSkills ?? []).map((s) => ({ name: s.skillName, count: s.count }))}
        />
        <RankedList
          title="Most used tools"
          empty="No tool calls yet"
          unit="call"
          rows={(metrics?.mostUsedTools ?? []).map((t) => ({ name: t.toolName, count: t.count }))}
        />
      </div>

      {/* Recent executions */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h2 className={CARD_TITLE}>Recent executions</h2>
          <label className="relative">
            <span className="sr-only">Search executions</span>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className={clsx(INPUT, "w-48 pl-9")}
            />
          </label>
        </div>

        {execLoading ? (
          <div className="p-5">
            <SkeletonTable cols={6} rows={7} />
          </div>
        ) : !executions || executions.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No executions found" description="Run a skill to start collecting history and metrics." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th scope="col" className={TH}>Run</th>
                  <th scope="col" className={TH}>Skill</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={TH}>Provider</th>
                  <th scope="col" className={clsx(TH, "text-right")}>Duration</th>
                  <th scope="col" className={TH}>Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {executions.map((execution: ExecutionDTO) => (
                  <tr key={execution.id} className={ROW_HOVER}>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/executions/${execution.id}`} className="font-mono text-xs text-[var(--text-primary)] hover:underline">
                        {shortId(execution.id)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-sans text-sm text-[var(--text-primary)]">
                      {execution.skillName ?? (execution.skillVersionId ? shortId(execution.skillVersionId) : "Deleted skill")}
                    </td>
                    <td className="px-5 py-3">
                      <StatusDot status={execution.status} />
                    </td>
                    <td className={clsx("px-5 py-3", META)}>{execution.provider ?? "—"}</td>
                    <td className={clsx("px-5 py-3 text-right", META)}>
                      {execution.durationMs != null ? `${(execution.durationMs / 1000).toFixed(1)} s` : "—"}
                    </td>
                    <td className={clsx("px-5 py-3", META)}>{formatDate(execution.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
