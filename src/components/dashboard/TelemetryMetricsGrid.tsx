"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { TelemetryMetricsDTO } from "@/types/dashboard";
import { ROW_HOVER } from "@/components/ui/surfaces";

interface TelemetryMetricsGridProps {
  telemetry: TelemetryMetricsDTO;
  activeSkillsCount: number;
  publishedSkillsCount: number;
  agentGraphsCount: number;
  pendingApprovalsCount: number;
}

interface Stat {
  label: string;
  value: string;
  detail: React.ReactNode;
  href?: string;
  accent?: boolean;
}

export function TelemetryMetricsGrid({
  telemetry,
  activeSkillsCount,
  publishedSkillsCount,
  agentGraphsCount,
  pendingApprovalsCount,
}: TelemetryMetricsGridProps) {
  // Success rate is meaningless (server defaults it to 100) until a run has completed or failed
  const hasFinishedRuns = telemetry.completed + telemetry.failed > 0;

  const stats: Stat[] = [
    {
      label: "Active skills",
      value: activeSkillsCount.toLocaleString(),
      detail: `${publishedSkillsCount.toLocaleString()} published`,
      href: "/dashboard/skills",
    },
    {
      label: "Agent canvases",
      value: agentGraphsCount.toLocaleString(),
      detail: "Multi-agent graphs",
      href: "/dashboard/canvas",
    },
    {
      label: "Executions",
      value: telemetry.totalExecutions.toLocaleString(),
      detail: (
        <>
          {telemetry.completed.toLocaleString()} completed ·{" "}
          <span className={telemetry.failed > 0 ? "text-[var(--state-error)]" : undefined}>
            {telemetry.failed.toLocaleString()} failed
          </span>
        </>
      ),
      href: "/dashboard/executions",
    },
    {
      label: "Success rate",
      value: hasFinishedRuns ? `${telemetry.successRate}%` : "—",
      detail: hasFinishedRuns ? "Completed of finished runs" : "No finished runs yet",
    },
    {
      label: "Average run time",
      value: `${(telemetry.avgDurationMs / 1000).toFixed(2)} s`,
      detail: "Wall clock, per run",
    },
    {
      label: "Review queue",
      value: pendingApprovalsCount.toLocaleString(),
      detail: pendingApprovalsCount > 0 ? "Waiting for approval" : "Queue clear",
      href: "/dashboard/review",
      accent: pendingApprovalsCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-3 2xl:grid-cols-6">
      {stats.map((s) => {
        const body = (
          <>
            <div className="font-sans text-[13px] text-[var(--text-muted)]">{s.label}</div>
            <div
              className={clsx(
                "font-pixel text-3xl font-medium leading-none tabular-nums",
                s.accent ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
              )}
            >
              {s.value}
            </div>
            <div className="font-sans text-[13px] text-[var(--text-secondary)]">{s.detail}</div>
          </>
        );
        const cell = "block space-y-3 bg-[var(--surface-raised)] p-5";
        return s.href ? (
          <Link
            key={s.label}
            href={s.href}
            className={clsx(cell, ROW_HOVER, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]")}
          >
            {body}
          </Link>
        ) : (
          <div key={s.label} className={cell}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
