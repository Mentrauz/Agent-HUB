"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ExecutionDTO } from "@/types/execution";
import { AuditLogItemDTO } from "@/types/dashboard";
import { CARD, CARD_HEAD, CARD_TITLE, HEAD_LINK, META, ROW_HOVER, StatusDot } from "@/components/ui/surfaces";

function formatStamp(d: Date | string): string {
  const date = new Date(d);
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}`;
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-10 text-center font-sans text-sm text-[var(--text-muted)]">{children}</p>;
}

export function RecentExecutionsCard({ executions }: { executions: ExecutionDTO[] }) {
  return (
    <section className={clsx(CARD, "h-full")}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>Recent runs</h2>
        <Link href="/dashboard/executions" className={HEAD_LINK}>
          All executions
        </Link>
      </div>

      {executions.length === 0 ? (
        <EmptyRow>No runs in this time range</EmptyRow>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {executions.slice(0, 5).map((e) => (
            <li key={e.id}>
              <Link
                href={`/dashboard/executions/${e.id}`}
                className={clsx(
                  ROW_HOVER,
                  "flex items-center justify-between gap-3 px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="truncate font-sans text-sm text-[var(--text-primary)]">
                    {e.skillName ?? "Agent workflow"}
                  </div>
                  <div className={clsx(META, "truncate")}>
                    {e.provider ?? "default"} · {e.durationMs ? `${(e.durationMs / 1000).toFixed(1)} s` : "—"} ·{" "}
                    {formatStamp(e.startedAt)}
                  </div>
                </div>
                <StatusDot status={e.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SystemAuditActivityCard({ activity }: { activity: AuditLogItemDTO[] }) {
  return (
    <section className={clsx(CARD, "h-full")}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>Audit log</h2>
        <Link href="/dashboard/audit" className={HEAD_LINK}>
          View all
        </Link>
      </div>

      {activity.length === 0 ? (
        <EmptyRow>No audit events yet</EmptyRow>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {activity.slice(0, 5).map((a) => (
            <li key={a.id} className="space-y-1 px-5 py-3">
              <div className="truncate font-mono text-xs text-[var(--text-secondary)]">{a.action}</div>
              <div className={META}>{formatStamp(a.timestamp)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
