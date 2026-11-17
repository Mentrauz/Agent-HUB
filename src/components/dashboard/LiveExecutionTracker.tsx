"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { LiveExecutionItemDTO } from "@/types/dashboard";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, CARD, CARD_HEAD, CARD_TITLE, HEAD_LINK, META, plural } from "@/components/ui/surfaces";

interface LiveExecutionTrackerProps {
  liveExecutions: LiveExecutionItemDTO[];
}

export function LiveExecutionTracker({ liveExecutions }: LiveExecutionTrackerProps) {
  // Idle state is shown in SystemHealthStrip's runtime readout
  if (liveExecutions.length === 0) return null;

  return (
    <section className={CARD}>
      <div className={CARD_HEAD}>
        <div className="flex items-baseline gap-3">
          <h2 className={CARD_TITLE}>In flight</h2>
          <span className={META}>{plural(liveExecutions.length, "run")}</span>
        </div>
        <Link href="/dashboard/executions" className={HEAD_LINK}>
          All executions
        </Link>
      </div>

      <ul className="divide-y divide-[var(--border-subtle)]">
        {liveExecutions.map((item) => {
          const isPaused = item.status === "PAUSED_FOR_APPROVAL";
          const progress = item.maxSteps > 0 ? Math.min(item.stepCount / item.maxSteps, 1) : 0;
          return (
            <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">
                    {item.skillName}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
                    <span
                      aria-hidden="true"
                      className={clsx("h-1.5 w-1.5 rounded-full", !isPaused && "animate-pulse")}
                      style={{ background: isPaused ? "var(--state-warning)" : "var(--accent-primary)" }}
                    />
                    {isPaused ? "Awaiting approval" : "Running"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="h-1 w-full max-w-60 overflow-hidden rounded-full bg-[var(--border-subtle)]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={item.maxSteps}
                    aria-valuenow={item.stepCount}
                    aria-label={`Step ${item.stepCount} of ${item.maxSteps}`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress * 100}%`,
                        background: isPaused ? "var(--state-warning)" : "var(--accent-primary)",
                      }}
                    />
                  </div>
                  <span className={clsx(META, "min-w-0 truncate")}>
                    step {item.stepCount} of {item.maxSteps}
                    {item.currentToolName && <> · {item.currentToolName}</>}
                    {item.provider && <> · {item.provider}</>}
                  </span>
                </div>
              </div>

              {isPaused ? (
                <Link href="/dashboard/review" className={BTN_PRIMARY_SM}>
                  Review
                </Link>
              ) : (
                <Link href={`/dashboard/executions/${item.id}`} className={BTN_SECONDARY_SM}>
                  Live trace
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
