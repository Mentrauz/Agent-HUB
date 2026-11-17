"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkeletonGrid } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { toast } from "@/stores/toastStore";
import { clsx } from "clsx";
import { ApprovalRequestDTO } from "@/types/approval";
import { executionsApi } from "@/lib/api/executions";
import {
  BTN_PRIMARY_SM,
  BTN_SECONDARY_SM,
  CARD,
  FIELD,
  LABEL,
  META,
  PageHeader,
  Tag,
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

const STATUS_TONE: Record<string, { label: string; tone: "warn" | "good" | "bad" | "neutral" }> = {
  PENDING: { label: "Pending", tone: "warn" },
  APPROVED: { label: "Approved", tone: "good" },
  REJECTED: { label: "Rejected", tone: "bad" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Request failed");
  }
  return json.data;
}

const FIELD_LABEL = "font-sans text-[13px] text-[var(--text-muted)]";
const PRE =
  "max-h-40 overflow-x-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 font-mono text-xs leading-5 text-[var(--text-secondary)]";

function ReviewCard({
  request,
  onApprove,
  onReject,
  onCancel,
  isProcessing,
}: {
  request: ApprovalRequestDTO;
  onApprove: (request: ApprovalRequestDTO) => void;
  onReject: (request: ApprovalRequestDTO, reason: string) => void;
  onCancel: (request: ApprovalRequestDTO) => void;
  isProcessing: boolean;
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const status = STATUS_TONE[request.status] ?? { label: request.status, tone: "neutral" as const };
  const isPending = request.status === "PENDING";

  return (
    <div className={clsx(CARD, "relative space-y-5 p-5")}>
      {/* Accent rule marks an item that is waiting on a person */}
      {isPending && (
        <span aria-hidden="true" className="absolute bottom-5 left-0 top-5 w-0.5 rounded-full bg-[var(--accent-primary)]" />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Tag tone={status.tone}>{status.label}</Tag>
          <span className={META}>{formatDate(request.requestedAt)}</span>
        </div>
        <span className={META}>{request.id.slice(0, 10)}…</span>
      </div>

      <div className="space-y-1">
        <div className={FIELD_LABEL}>Requested action</div>
        <div className="font-sans text-sm font-medium text-[var(--text-primary)]">{request.action}</div>
        <div className={META}>
          {request.toolName}
          {request.skillName && <> · {request.skillName}</>}
        </div>
      </div>

      {request.plannerReason && (
        <div className="space-y-1">
          <div className={FIELD_LABEL}>Planner&rsquo;s reason</div>
          <p className="font-sans text-sm leading-5 text-[var(--text-secondary)]">{request.plannerReason}</p>
        </div>
      )}

      <div className="space-y-1">
        <div className={FIELD_LABEL}>Arguments</div>
        <pre className={PRE}>{JSON.stringify(request.inputPayload, null, 2)}</pre>
      </div>

      {request.history && request.history.length > 0 && (
        <div className="space-y-2">
          <div className={FIELD_LABEL}>Timeline</div>
          <ul className="space-y-1.5">
            {request.history.map((h, i) => (
              <li key={i} className="flex items-baseline gap-3 font-sans text-[13px]">
                <span className="text-[var(--text-secondary)]">{h.summary}</span>
                <span className={META}>{formatDate(h.timestamp)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isPending && (
        <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onApprove(request)} disabled={isProcessing} className={BTN_PRIMARY_SM}>
              Approve and resume
            </button>
            <button
              type="button"
              onClick={() => setShowRejectInput(!showRejectInput)}
              disabled={isProcessing}
              className={BTN_SECONDARY_SM}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => onCancel(request)}
              disabled={isProcessing}
              className="h-8 cursor-pointer rounded-[8px] px-3 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Cancel workflow
            </button>
          </div>

          {showRejectInput && (
            <div className="animate-fadeIn space-y-2">
              <label htmlFor={`reject-${request.id}`} className={LABEL}>
                Reason for rejecting
              </label>
              <textarea
                id={`reject-${request.id}`}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Optional"
                className={clsx(FIELD, "h-16 w-full resize-none px-3 py-2")}
              />
              <button
                type="button"
                onClick={() => {
                  onReject(request, rejectReason);
                  setShowRejectInput(false);
                  setRejectReason("");
                }}
                disabled={isProcessing}
                className={clsx(BTN_SECONDARY_SM, "text-[var(--state-error)]")}
              >
                Confirm rejection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"PENDING" | "HISTORY">("PENDING");

  // Single query — GET /api/approvals returns every request for this user
  // (pending + history). The tabs filter client-side; no separate pending
  // route exists on the backend.
  const { data: approvalsData, isLoading } = useQuery<ApprovalRequestDTO[]>({
    queryKey: ["approvals"],
    queryFn: () => apiFetch("/api/approvals"),
  });

  const pendingList = (approvalsData ?? []).filter((r) => r.status === "PENDING");
  const historyList = (approvalsData ?? []).filter((r) => r.status !== "PENDING");

  // Approve = respond approved (single-use idempotency key) THEN resume the
  // paused execution. The engine marks the request APPROVED; the resume route
  // performs duplicate prevention, step-limit enforcement, and re-invokes the
  // graph from the restored state.
  const approveMutation = useMutation({
    mutationFn: async (request: ApprovalRequestDTO) => {
      await apiFetch("/api/approvals", {
        method: "POST",
        body: JSON.stringify({
          approvalId: request.id,
          approved: true,
          idempotencyKey: request.idempotencyKey,
        }),
      });
      await executionsApi.resume(request.executionId, request.id, request.idempotencyKey);
    },
    onSuccess: () => {
      toast.success("Action approved", "Execution is resuming");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (e) => toast.error("Approval failed", e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ request, reason }: { request: ApprovalRequestDTO; reason: string }) =>
      apiFetch("/api/approvals", {
        method: "POST",
        body: JSON.stringify({
          approvalId: request.id,
          approved: false,
          rejectionReason: reason || undefined,
          idempotencyKey: request.idempotencyKey,
        }),
      }),
    onSuccess: () => {
      toast.success("Action rejected");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (e) => toast.error("Rejection failed", e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (request: ApprovalRequestDTO) =>
      apiFetch(`/api/approvals/${request.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: request.idempotencyKey }),
      }),
    onSuccess: () => {
      toast.success("Workflow cancelled");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (e) => toast.error("Cancel failed", e.message),
  });

  const isProcessing =
    approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

  const tabs = [
    { id: "PENDING" as const, label: "Pending", count: pendingList.length },
    { id: "HISTORY" as const, label: "History", count: historyList.length },
  ];
  const list = tab === "PENDING" ? pendingList : historyList;

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Human review" meta="Approve or reject agent tool calls that paused for a person" />

      <div role="tablist" className="flex items-center gap-6 border-b border-[var(--border-subtle)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "-mb-px flex h-10 cursor-pointer items-center gap-2 border-b-2 font-sans text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
              tab === t.id
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {t.label}
            <span className={clsx(META, t.id === "PENDING" && t.count > 0 && "text-[var(--accent-primary)]")}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonGrid cards={3} />
      ) : list.length === 0 ? (
        tab === "PENDING" ? (
          <EmptyState
            title="Nothing waiting for review"
            description="When a skill reaches an action that needs a person, it pauses and appears here."
          />
        ) : (
          <EmptyState
            title="No review history"
            description="Past approvals, rejections and expired requests appear here."
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((req) => (
            <ReviewCard
              key={req.id}
              request={req}
              onApprove={(request) => approveMutation.mutate(request)}
              onReject={(request, reason) => rejectMutation.mutate({ request, reason })}
              onCancel={(request) => cancelMutation.mutate(request)}
              isProcessing={tab === "PENDING" ? isProcessing : false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
