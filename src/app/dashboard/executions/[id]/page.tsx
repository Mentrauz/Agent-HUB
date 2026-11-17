"use client";

import React, { useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { executionsApi } from "@/lib/api/executions";
import { ExecutionTimeline, TimelineLegend } from "@/components/executions/ExecutionTimeline";
import { buildExecutionTimeline } from "@/modules/timeline";
import { SkeletonExecutionDetail } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { toast } from "@/stores/toastStore";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  META,
  PageHeader,
  StatusDot,
  Tag,
} from "@/components/ui/surfaces";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

type Tone = "neutral" | "accent" | "good" | "warn" | "bad";

const STEP_TONE: Record<string, Tone> = {
  SUCCESS: "good",
  FAILED: "bad",
  RUNNING: "accent",
  AWAITING_APPROVAL: "warn",
  SKIPPED: "neutral",
};

const CALL_TONE: Record<string, Tone> = {
  SUCCESS: "good",
  BLOCKED: "warn",
  ERROR: "bad",
  REJECTED: "bad",
};

const APPROVAL_TONE: Record<string, Tone> = {
  APPROVED: "good",
  REJECTED: "bad",
};

const LOG_COLOR: Record<string, string> = {
  ERROR: "var(--state-error)",
  WARN: "var(--state-warning)",
};

const words = (s: string) => s.toLowerCase().replace(/_/g, " ");

const PRE =
  "max-h-64 overflow-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 font-mono text-xs leading-5 text-[var(--text-secondary)]";

function JsonPreview({ label, value }: { label: string; value: unknown }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>{label}</h2>
      </div>
      <div className="p-5">
        <pre className={PRE}>{JSON.stringify(value ?? {}, null, 2)}</pre>
      </div>
    </section>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>{title}</h2>
        {count !== undefined && <span className={META}>{count}</span>}
      </div>
      {children}
    </section>
  );
}

const EMPTY = "px-5 py-8 text-center font-sans text-sm text-[var(--text-muted)]";

export default function ExecutionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["execution", id],
    queryFn: () => executionsApi.detail(id),
  });

  const execution = data?.execution;

  const timelineEvents = useMemo(() => (execution ? buildExecutionTimeline(execution) : []), [execution]);

  const cancelMutation = useMutation({
    mutationFn: () => executionsApi.cancel(id),
    onSuccess: () => {
      toast.success("Execution cancelled");
      queryClient.invalidateQueries({ queryKey: ["execution", id] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (e) => toast.error("Cancel failed", e.message),
  });

  const retryMutation = useMutation({
    mutationFn: () => executionsApi.retry(id),
    onSuccess: () => {
      toast.success("Safe Step Recovery Started", "Resuming directly from failed step without repeating completed safe steps");
      queryClient.invalidateQueries({ queryKey: ["execution", id] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (e) => toast.error("Recovery failed", e.message),
  });

  const replayMutation = useMutation({
    mutationFn: () => executionsApi.replay(id),
    onSuccess: (execution) => {
      toast.success("Execution replayed", "A new linked run was created");
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      router.push(`/dashboard/executions/${execution.id}`);
    },
    onError: (e) => toast.error("Replay failed", e.message),
  });

  const downloadExport = useCallback(async () => {
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
    }
  }, [id]);

  if (isLoading) return <SkeletonExecutionDetail />;
  if (isError || !execution) {
    return (
      <EmptyState
        title="Execution not found"
        description="This run does not exist or was removed."
        action={
          <Link href="/dashboard/executions" className={BTN_SECONDARY_SM}>
            Back to executions
          </Link>
        }
      />
    );
  }

  const isRunning = execution.status === "RUNNING" || execution.status === "PAUSED_FOR_APPROVAL";
  const isRecoverable = execution.status === "FAILED" || execution.status === "CANCELLED" || execution.status === "STEP_LIMIT_EXCEEDED";
  const skillLabel = execution.skillName ?? (execution.skillVersionId ? `v${execution.skillVersionId.slice(0, 8)}` : "Deleted skill");

  return (
    <div className="w-full space-y-6">
      <Link
        href="/dashboard/executions"
        className="inline-flex rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        Executions
      </Link>

      <PageHeader
        title={skillLabel}
        meta={
          <span className={clsx(META, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
            <StatusDot status={execution.status} />
            <span>{execution.id.slice(0, 12)}…</span>
            <span>{formatDate(execution.startedAt)}</span>
            <span>{execution.durationMs != null ? `${(execution.durationMs / 1000).toFixed(2)} s` : "running"}</span>
            {execution.provider && <span>{execution.provider}</span>}
            {execution.replayedFromExecutionId && <span>replay of {execution.replayedFromExecutionId.slice(0, 8)}</span>}
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isRecoverable && (
              <button
                type="button"
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className={BTN_PRIMARY}
                title="Resume from the failed step without repeating completed safe steps"
              >
                Retry from failed step
              </button>
            )}
            {isRunning && (
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className={clsx(BTN_SECONDARY, "text-[var(--state-error)]")}
              >
                Cancel run
              </button>
            )}
            <button type="button" onClick={() => replayMutation.mutate()} disabled={replayMutation.isPending} className={BTN_SECONDARY}>
              Replay
            </button>
            <button type="button" onClick={downloadExport} className={BTN_SECONDARY}>
              Export JSON
            </button>
            <button type="button" onClick={() => refetch()} className={BTN_SECONDARY}>
              Refresh
            </button>
          </div>
        }
      />

      {execution.errorMessage && (
        <div role="alert" className={clsx(CARD, "relative px-5 py-4")}>
          <span aria-hidden="true" className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-[var(--state-error)]" />
          <div className="font-sans text-[13px] text-[var(--text-muted)]">Error</div>
          <p className="font-sans text-sm text-[var(--text-primary)]">{execution.errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <JsonPreview label="Input" value={execution.inputData} />
        <JsonPreview label="Output" value={execution.finalOutput} />
      </div>

      {/* Trace */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h2 className={CARD_TITLE}>Trace</h2>
          <TimelineLegend />
        </div>
        <div className="p-5">
          <ExecutionTimeline events={timelineEvents} />
        </div>
      </section>

      {/* Nodes */}
      <Section title="Nodes" count={execution.steps?.length ?? 0}>
        {!execution.steps || execution.steps.length === 0 ? (
          <p className={EMPTY}>No node executions recorded</p>
        ) : (
          <ol className="divide-y divide-[var(--border-subtle)]">
            {execution.steps.map((step) => (
              <li key={step.id} className="flex flex-col justify-between gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-baseline gap-4">
                  <span className={clsx(META, "w-6 shrink-0")}>{step.stepNumber}</span>
                  <span className="truncate font-sans text-sm text-[var(--text-primary)]">{step.nodeName}</span>
                  <Tag tone={STEP_TONE[step.status] ?? "neutral"}>{words(step.status)}</Tag>
                </div>
                <div className={clsx(META, "flex min-w-0 shrink-0 items-center gap-4")}>
                  {step.stateSnapshot && (
                    <span className="hidden max-w-xs truncate md:inline">{JSON.stringify(step.stateSnapshot).slice(0, 60)}</span>
                  )}
                  <span>{formatDate(step.startedAt)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Tool calls */}
      <Section title="Tool calls" count={execution.toolCalls?.length ?? 0}>
        {!execution.toolCalls || execution.toolCalls.length === 0 ? (
          <p className={EMPTY}>No tool calls recorded</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {execution.toolCalls.map((call) => {
              const outputObj =
                typeof call.outputResult === "object" && call.outputResult !== null
                  ? (call.outputResult as Record<string, unknown>)
                  : null;
              const decisionExplanation = outputObj?.decisionExplanation as string | undefined;
              const reasoning = outputObj?.reasoning as string | undefined;
              const formattedMarkdown = outputObj?.formattedMarkdown as string | undefined;
              const note = decisionExplanation ?? reasoning;

              return (
                <li key={call.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-mono text-sm text-[var(--text-primary)]">{call.toolName}</span>
                    <span className={META}>{call.action}</span>
                    <Tag tone={CALL_TONE[call.status] ?? "neutral"}>{words(call.status)}</Tag>
                    {call.errorMessage && <span className="font-sans text-[13px] text-[var(--state-error)]">{call.errorMessage}</span>}
                  </div>

                  {note && (
                    <div className="relative pl-4">
                      <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-0.5 rounded-full bg-[var(--accent-primary)]" />
                      <div className="font-sans text-[13px] text-[var(--text-muted)]">
                        {decisionExplanation ? "Why this path was taken" : "Classification reasoning"}
                      </div>
                      <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">{note}</p>
                    </div>
                  )}

                  <pre className="overflow-x-auto font-mono text-xs leading-5 text-[var(--text-muted)]">
                    {JSON.stringify(call.inputArgs)}
                    {call.outputResult !== null && call.outputResult !== undefined
                      ? ` → ${JSON.stringify(call.outputResult).slice(0, 200)}`
                      : ""}
                  </pre>

                  {formattedMarkdown && (
                    <details className="font-sans text-[13px]">
                      <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        Rendered report
                      </summary>
                      <div className="mt-2 whitespace-pre-wrap rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 leading-5 text-[var(--text-secondary)]">
                        {formattedMarkdown}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Approvals */}
      <Section title="Approvals" count={data?.approvals?.length ?? 0}>
        {!data?.approvals || data.approvals.length === 0 ? (
          <p className={EMPTY}>No approval checkpoints in this run</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {data.approvals.map((approval) => (
              <li key={approval.id} className="space-y-1 px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-sans text-sm text-[var(--text-primary)]">{approval.action}</span>
                  <span className={META}>{approval.toolName}</span>
                  <Tag tone={APPROVAL_TONE[approval.status] ?? "warn"}>{words(approval.status)}</Tag>
                  <span className={META}>{formatDate(approval.requestedAt)}</span>
                </div>
                {approval.plannerReason && (
                  <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{approval.plannerReason}</p>
                )}
                {approval.rejectionReason && (
                  <p className="font-sans text-[13px] leading-5 text-[var(--state-error)]">Rejected: {approval.rejectionReason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Logs */}
      <Section title="Logs" count={data?.logs?.length ?? 0}>
        {!data?.logs || data.logs.length === 0 ? (
          <p className={EMPTY}>No structured logs recorded</p>
        ) : (
          <ul className="max-h-80 divide-y divide-[var(--border-subtle)] overflow-y-auto font-mono text-xs">
            {data.logs.map((log) => (
              <li key={log.id} className="flex items-baseline gap-4 px-5 py-2">
                <span className="shrink-0 text-[var(--text-muted)]">{formatDate(log.timestamp)}</span>
                <span className="w-10 shrink-0" style={{ color: LOG_COLOR[log.level] ?? "var(--text-muted)" }}>
                  {log.level.toLowerCase()}
                </span>
                <span className="shrink-0 text-[var(--text-primary)]">{log.event}</span>
                {log.status && <span className="shrink-0 text-[var(--text-muted)]">{log.status.toLowerCase()}</span>}
                {log.durationMs != null && (
                  <span className="shrink-0 text-[var(--text-secondary)]">{(log.durationMs / 1000).toFixed(3)} s</span>
                )}
                {Object.keys(log.metadata ?? {}).length > 0 && (
                  <span className="truncate text-[var(--text-muted)]">{JSON.stringify(log.metadata)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
