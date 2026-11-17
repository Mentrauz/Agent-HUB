"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { clsx } from "clsx";
import { executionsApi } from "@/lib/api/executions";
import { SkeletonTable } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ExecutionDTO, ExecutionStatus } from "@/types/execution";
import { toast } from "@/stores/toastStore";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  FIELD,
  INPUT,
  META,
  PageHeader,
  ROW_HOVER,
  StatusDot,
} from "@/components/ui/surfaces";

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

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}…` : id;
}

const statusOptions: { value: ExecutionStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "RUNNING", label: "Running" },
  { value: "PAUSED_FOR_APPROVAL", label: "Awaiting approval" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "STEP_LIMIT_EXCEEDED", label: "Step limit" },
];

export default function ExecutionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ExecutionStatus | "">("");
  const [sortBy, setSortBy] = useState<"startedAt" | "durationMs" | "status">("startedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["executions", debouncedSearch, status, sortBy, sortOrder],
    queryFn: () =>
      executionsApi.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const replayMutation = useMutation({
    mutationFn: (id: string) => executionsApi.replay(id),
    onSuccess: (execution) => {
      toast.success("Execution replayed", "A new linked run was created");
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      router.push(`/dashboard/executions/${execution.id}`);
    },
    onError: (e) => toast.error("Replay failed", e.message),
  });

  const downloadExport = useCallback(async (id: string) => {
    setDownloading(id);
    try {
      const report = await executionsApi.exportReport(id);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `execution-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error("Export failed", e instanceof Error ? e.message : undefined);
    } finally {
      setDownloading(null);
    }
  }, []);

  const filtered = Boolean(debouncedSearch || status);

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Executions"
        meta="Every agent run, with its plan, node timeline, tool calls and approval events"
        action={
          <Link href="/dashboard/skills" className={BTN_PRIMARY}>
            Run a skill
          </Link>
        }
      />

      {/* Search, filter, sort */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-[200px] flex-1">
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
            className={clsx(INPUT, "w-full pl-9")}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ExecutionStatus | "")}
            className={clsx(FIELD, "h-9 flex-1 cursor-pointer px-3 sm:flex-initial")}
            aria-label="Filter by status"
          >
            {statusOptions.map((s) => (
              <option key={s.value || "all"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={clsx(FIELD, "h-9 flex-1 cursor-pointer px-3 sm:flex-initial")}
            aria-label="Sort by"
          >
            <option value="startedAt">Sort by started</option>
            <option value="durationMs">Sort by duration</option>
            <option value="status">Sort by status</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className={BTN_SECONDARY}
            aria-label={sortOrder === "desc" ? "Descending, switch to ascending" : "Ascending, switch to descending"}
          >
            {sortOrder === "desc" ? (
              <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
            )}
            {sortOrder === "desc" ? "Newest first" : "Oldest first"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable cols={5} rows={7} />
      ) : isError ? (
        <EmptyState
          title="Couldn't load executions"
          description="There was an error fetching your executions."
          action={
            <button onClick={() => refetch()} className={BTN_SECONDARY_SM}>
              Retry
            </button>
          }
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={filtered ? "No matching executions" : "No executions yet"}
          description={
            filtered
              ? "No runs match the current search or filters."
              : "Run a skill to see its plan, node timeline, tool calls and final output here."
          }
          action={
            <Link href="/dashboard/skills" className={BTN_SECONDARY_SM}>
              Browse skills
            </Link>
          }
        />
      ) : (
        <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
          {data.map((execution: ExecutionDTO) => (
            <li key={execution.id} className={clsx("flex flex-col sm:flex-row sm:items-center", ROW_HOVER)}>
              <Link
                href={`/dashboard/executions/${execution.id}`}
                className="block min-w-0 flex-1 space-y-2 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">
                      {execution.skillName ?? (execution.skillVersionId ? `v${shortId(execution.skillVersionId)}` : "Deleted skill")}
                    </span>
                    <StatusDot status={execution.status} />
                    {execution.replayedFromExecutionId && (
                      <span className={META} title={`Replayed from ${execution.replayedFromExecutionId}`}>
                        replay
                      </span>
                    )}
                  </div>
                  <div className={clsx(META, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
                    <span>{shortId(execution.id)}</span>
                    {execution.provider && <span>{execution.provider}</span>}
                    <span>{execution.durationMs != null ? `${(execution.durationMs / 1000).toFixed(1)} s` : "—"}</span>
                    <span>{formatDate(execution.startedAt)}</span>
                  </div>
                </div>
                {execution.errorMessage && (
                  <p className="truncate font-sans text-[13px] text-[var(--state-error)]">{execution.errorMessage}</p>
                )}
              </Link>

              <div className="flex shrink-0 items-center gap-2 px-5 pb-4 sm:py-4 sm:pl-0">
                <button
                  type="button"
                  onClick={() => replayMutation.mutate(execution.id)}
                  disabled={replayMutation.isPending}
                  className={BTN_SECONDARY_SM}
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={() => downloadExport(execution.id)}
                  disabled={downloading === execution.id}
                  className={BTN_SECONDARY_SM}
                >
                  Export JSON
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
