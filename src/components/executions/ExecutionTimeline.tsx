"use client";

import React from "react";
import { TimelineEvent } from "@/types/observability";
import { clsx } from "clsx";
import { META } from "@/components/ui/surfaces";

// Only the run itself and approvals get a colour; the rest stay neutral so the trace reads as one line.
const DOT: Record<TimelineEvent["type"], string> = {
  execution: "var(--accent-primary)",
  node: "var(--text-secondary)",
  tool: "var(--text-secondary)",
  approval: "var(--state-warning)",
  log: "var(--text-muted)",
};

const TYPE_NAME: Record<TimelineEvent["type"], string> = {
  execution: "Run",
  node: "Node",
  tool: "Tool",
  approval: "Approval",
  log: "Log",
};

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/** Vertical, time-ordered trace. */
export function ExecutionTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="font-sans text-sm text-[var(--text-muted)]">No timeline events recorded</p>;
  }

  return (
    <ol>
      {events.map((event, idx) => {
        const type = (event.type in DOT ? event.type : "log") as TimelineEvent["type"];
        const isLast = idx === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
            {!isLast && <span aria-hidden="true" className="absolute bottom-0 left-[3px] top-3 w-px bg-[var(--border-subtle)]" />}
            <span
              aria-hidden="true"
              className="relative z-10 mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: DOT[type] }}
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="font-sans text-sm text-[var(--text-primary)]">
                  <span className="sr-only">{TYPE_NAME[type]}: </span>
                  {event.label}
                  {event.status && <span className={clsx(META, "ml-3")}>{event.status.toLowerCase().replace(/_/g, " ")}</span>}
                </span>
                <span className={META}>
                  {formatTime(event.at)}
                  {event.durationMs != null && <> · {(event.durationMs / 1000).toFixed(3)} s</>}
                </span>
              </div>
              {event.detail && (
                <p className={clsx(META, "truncate")} title={event.detail}>
                  {event.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function TimelineLegend() {
  const keys = Object.keys(TYPE_NAME) as TimelineEvent["type"][];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {keys.map((key) => (
        <li key={key} className="flex items-center gap-2 font-sans text-[13px] text-[var(--text-muted)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: DOT[key] }} />
          {TYPE_NAME[key]}
        </li>
      ))}
    </ul>
  );
}
