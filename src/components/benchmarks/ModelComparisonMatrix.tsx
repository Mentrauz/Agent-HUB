"use client";

import React from "react";
import { clsx } from "clsx";
import { ModelBenchmarkComparisonItem } from "@/types/benchmark";
import { CARD, CARD_HEAD, CARD_TITLE, META, ROW_HOVER, TH } from "@/components/ui/surfaces";

interface ModelComparisonMatrixProps {
  models: ModelBenchmarkComparisonItem[];
}

export function ModelComparisonMatrix({ models }: ModelComparisonMatrixProps) {
  // The best overall score leads; everything else stays neutral
  const best = Math.max(...models.map((m) => m.overallScore));

  return (
    <section className={clsx(CARD, "overflow-hidden")}>
      <div className={CARD_HEAD}>
        <h3 className={CARD_TITLE}>Models compared</h3>
        <span className={META}>measured by running the suite on each</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th scope="col" className={TH}>Model</th>
              <th scope="col" className={clsx(TH, "text-right")}>Grade</th>
              <th scope="col" className={clsx(TH, "text-right")}>Quality</th>
              <th scope="col" className={clsx(TH, "text-right")}>Pass rate</th>
              <th scope="col" className={clsx(TH, "text-right")}>Avg latency</th>
              <th scope="col" className={clsx(TH, "text-right")}>Cost per 1k runs</th>
              <th scope="col" className={TH}>Strengths</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {models.map((m) => (
              <tr key={m.modelName} className={ROW_HOVER}>
                <td className="px-5 py-3">
                  <div className="font-sans text-sm font-medium text-[var(--text-primary)]">{m.modelName}</div>
                  <div className={META}>{m.provider}</div>
                </td>
                <td className={clsx("px-5 py-3 text-right", META, "text-[var(--text-primary)]")}>{m.grade}</td>
                <td
                  className={clsx(
                    "px-5 py-3 text-right font-mono text-sm tabular-nums",
                    m.overallScore === best ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
                  )}
                >
                  {m.overallScore}%
                </td>
                <td className={clsx("px-5 py-3 text-right", META)}>{m.passRate}%</td>
                <td className={clsx("px-5 py-3 text-right", META)}>{m.avgLatencyMs} ms</td>
                <td className={clsx("px-5 py-3 text-right", META)}>${m.costPer1kRuns.toFixed(2)}</td>
                <td className="px-5 py-3 font-sans text-[13px] text-[var(--text-secondary)]">
                  {m.strengths.slice(0, 2).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
