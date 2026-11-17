"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ApprovalRequestDTO } from "@/types/approval";
import { executionsApi } from "@/lib/api/executions";
import { toast } from "@/stores/toastStore";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, CARD, CARD_HEAD, CARD_TITLE, HEAD_LINK, META } from "@/components/ui/surfaces";

interface EnhancedApprovalQueueProps {
  approvals: ApprovalRequestDTO[];
  /** Total pending approvals; `approvals` holds only the few most recent. */
  totalCount: number;
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function EnhancedApprovalQueue({ approvals, totalCount }: EnhancedApprovalQueueProps) {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: async (req: ApprovalRequestDTO) => {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: req.id,
          approved: true,
          idempotencyKey: req.idempotencyKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Approval failed");
      await executionsApi.resume(req.executionId, req.id, req.idempotencyKey);
    },
    onSuccess: () => {
      toast.success("Action approved", "Execution resuming");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error("Approval failed", e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ req, reason }: { req: ApprovalRequestDTO; reason: string }) => {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: req.id,
          approved: false,
          rejectionReason: reason || undefined,
          idempotencyKey: req.idempotencyKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Rejection failed");
    },
    onSuccess: () => {
      toast.success("Action rejected");
      setRejectingId(null);
      setRejectReason("");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error("Rejection failed", e.message),
  });

  const isBusy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <section className={clsx(CARD, "h-full")}>
      <div className={CARD_HEAD}>
        <div className="flex items-baseline gap-3">
          <h2 className={CARD_TITLE}>Human review</h2>
          <span className={clsx(META, totalCount > 0 && "text-[var(--accent-primary)]")}>{totalCount} pending</span>
        </div>
        <Link href="/dashboard/review" className={HEAD_LINK}>
          Open queue
        </Link>
      </div>

      {approvals.length === 0 ? (
        <div className="space-y-1 px-5 py-10 text-center">
          <p className="font-sans text-sm text-[var(--text-primary)]">Nothing waiting for review</p>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">
            Write actions that need a human appear here
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {approvals.slice(0, 3).map((req) => (
            <li key={req.id} className="relative space-y-3 px-5 py-4">
              {/* Accent rule marks the item as waiting on a person */}
              <span aria-hidden="true" className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-[var(--accent-primary)]" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{req.action}</div>
                  <div className={clsx(META, "truncate")}>
                    {req.toolName} · {req.skillName || "Agent workflow"}
                  </div>
                </div>
                <span className={clsx(META, "shrink-0")}>{formatTime(req.requestedAt)}</span>
              </div>

              {req.plannerReason && (
                <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                  {req.plannerReason}
                </p>
              )}

              {rejectingId === req.id ? (
                <div className="space-y-2">
                  <label htmlFor={`reject-${req.id}`} className="block font-sans text-[13px] text-[var(--text-secondary)]">
                    Reason for rejecting
                  </label>
                  <input
                    id={`reject-${req.id}`}
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Optional"
                    className="h-9 w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-3 font-sans text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => rejectMutation.mutate({ req, reason: rejectReason })}
                      disabled={isBusy}
                      className={clsx(BTN_SECONDARY_SM, "text-[var(--state-error)]")}
                    >
                      Confirm reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                      className="h-8 rounded-[8px] px-3 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(req)}
                    disabled={isBusy}
                    className={BTN_PRIMARY_SM}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(req.id);
                      setRejectReason("");
                    }}
                    disabled={isBusy}
                    className={BTN_SECONDARY_SM}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
