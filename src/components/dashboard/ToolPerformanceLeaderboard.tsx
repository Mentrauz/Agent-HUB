"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ToolLeaderboardItemDTO } from "@/types/dashboard";
import { CARD, CARD_HEAD, CARD_TITLE, HEAD_LINK, META } from "@/components/ui/surfaces";

interface ToolPerformanceLeaderboardProps {
  tools: ToolLeaderboardItemDTO[];
}

const TH = "px-5 py-3 font-sans text-[13px] font-normal text-[var(--text-muted)]";
const TD = "px-5 py-3";

export function ToolPerformanceLeaderboard({ tools }: ToolPerformanceLeaderboardProps) {
  return (
    <section className={clsx(CARD, "h-full")}>
      <div className={CARD_HEAD}>
        <div className="flex items-baseline gap-3">
          <h2 className={CARD_TITLE}>Tools</h2>
          {tools.length > 0 && <span className={META}>most called first</span>}
        </div>
        <Link href="/dashboard/tools" className={HEAD_LINK}>
          Registry
        </Link>
      </div>

      {tools.length === 0 ? (
        <p className="px-5 py-10 text-center font-sans text-sm text-[var(--text-muted)]">No tools registered yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th scope="col" className={TH}>Tool</th>
                <th scope="col" className={TH}>Type</th>
                <th scope="col" className={clsx(TH, "text-right")}>Calls</th>
                <th scope="col" className={clsx(TH, "text-right")}>Avg latency</th>
                <th scope="col" className={clsx(TH, "text-right")}>Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {tools.map((t) => (
                <tr key={t.toolName} className="transition-colors hover:bg-[var(--text-primary)]/[0.04]">
                  <td className={TD}>
                    <Link
                      href={`/dashboard/tools/${encodeURIComponent(t.toolName)}`}
                      className="block max-w-[220px] truncate font-mono text-xs text-[var(--text-primary)] hover:underline"
                      title={t.toolName}
                    >
                      {t.toolName}
                    </Link>
                    <span className="font-sans text-xs text-[var(--text-muted)]">{t.category}</span>
                  </td>
                  <td className={clsx(TD, "font-sans text-[13px]", t.type === "WRITE" ? "text-[var(--state-warning)]" : "text-[var(--text-secondary)]")}>
                    {t.type === "WRITE" ? "Write" : "Read"}
                  </td>
                  <td className={clsx(TD, META, "text-right text-[var(--text-primary)]")}>{t.callCount.toLocaleString()}</td>
                  <td className={clsx(TD, META, "text-right text-[var(--text-secondary)]")}>
                    {t.avgDurationMs > 0 ? `${t.avgDurationMs.toLocaleString()} ms` : "—"}
                  </td>
                  <td
                    className={clsx(
                      TD,
                      META,
                      "text-right",
                      t.callCount > 0 && t.errorRate > 0 ? "text-[var(--state-warning)]" : "text-[var(--text-muted)]"
                    )}
                  >
                    {t.callCount === 0 ? "—" : `${t.errorRate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
