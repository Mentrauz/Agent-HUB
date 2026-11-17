"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { auditApi, AuditFilters } from "@/lib/api/audit";
import { SkeletonTable } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { toast } from "@/stores/toastStore";
import { BTN_SECONDARY, BTN_SECONDARY_SM, CARD, FIELD, INPUT, META, PageHeader, ROW_HOVER, TH } from "@/components/ui/surfaces";

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

// Failures and deletions read as errors; everything else stays neutral so the log is scannable.
function actionColor(action: string): string {
  if (/(FAILED|REJECTED|DELETED)$/.test(action)) return "var(--state-error)";
  if (/(ARCHIVED|CANCELLED|REQUESTED)$/.test(action)) return "var(--state-warning)";
  return "var(--text-muted)";
}

const ACTIONS = [
  "SKILL_CREATED",
  "SKILL_UPDATED",
  "SKILL_PUBLISHED",
  "SKILL_ARCHIVED",
  "SKILL_DELETED",
  "EXECUTION_STARTED",
  "EXECUTION_COMPLETED",
  "EXECUTION_FAILED",
  "EXECUTION_CANCELLED",
  "EXECUTION_REPLAYED",
  "APPROVAL_REQUESTED",
  "APPROVAL_APPROVED",
  "APPROVAL_REJECTED",
  "TOOL_EXECUTED",
];

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [action, setAction] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filters: AuditFilters = {
    search: debounced || undefined,
    action: action || undefined,
    limit: 200,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit", debounced, action],
    queryFn: () => auditApi.list(filters),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const payload = await auditApi.export(filters);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit log exported", `${payload.count} entries`);
    } catch (e) {
      toast.error("Export failed", e instanceof Error ? e.message : undefined);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Audit log"
        meta="Every skill, execution, approval and tool action, with a timestamp"
        action={
          <button type="button" onClick={handleExport} disabled={isExporting || !data?.length} className={BTN_SECONDARY}>
            Export JSON
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search the audit log</span>
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action or execution id"
            className={clsx(INPUT, "w-full pl-9")}
          />
        </label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className={clsx(FIELD, "h-9 cursor-pointer px-3 font-mono text-xs")}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <SkeletonTable cols={4} rows={8} />
      ) : isError ? (
        <EmptyState
          title="Couldn't load the audit log"
          description="There was an error fetching the audit trail."
          action={
            <button onClick={() => refetch()} className={BTN_SECONDARY_SM}>
              Retry
            </button>
          }
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No audit entries"
          description="Skill changes, runs, approvals and tool calls appear here."
        />
      ) : (
        <div className={clsx(CARD, "overflow-hidden")}>
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-[var(--surface-raised)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th scope="col" className={TH}>Time</th>
                  <th scope="col" className={TH}>Action</th>
                  <th scope="col" className={TH}>Execution</th>
                  <th scope="col" className={TH}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {data.map((entry) => (
                  <tr key={entry.id} className={clsx(ROW_HOVER, "align-top")}>
                    <td className={clsx("whitespace-nowrap px-5 py-3", META)}>{formatDate(entry.timestamp)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 font-mono text-xs text-[var(--text-primary)]">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: actionColor(entry.action) }} />
                        {entry.action}
                      </span>
                    </td>
                    <td className={clsx("px-5 py-3", META)}>{shortId(entry.executionId)}</td>
                    <td
                      className={clsx("max-w-md truncate px-5 py-3", META)}
                      title={JSON.stringify(entry.details)}
                    >
                      {Object.keys(entry.details ?? {}).length > 0 ? JSON.stringify(entry.details) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
