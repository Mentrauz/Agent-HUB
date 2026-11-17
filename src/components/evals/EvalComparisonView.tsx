"use client";

import React, { useState, useEffect } from "react";
import { clsx } from "clsx";
import { EvalRunReport, EvalRunComparisonReport } from "@/types/evals";
import { CARD, CARD_HEAD, CARD_TITLE, FIELD, LABEL, META, StatGrid } from "@/components/ui/surfaces";

interface EvalComparisonViewProps {
  runs: EvalRunReport[];
}

const signed = (n: number, unit: string) => `${n > 0 ? "+" : ""}${n}${unit}`;

export function EvalComparisonView({ runs }: EvalComparisonViewProps) {
  const [runAId, setRunAId] = useState<string>(runs[1]?.id || runs[0]?.id || "");
  const [runBId, setRunBId] = useState<string>(runs[0]?.id || "");
  const [comparison, setComparison] = useState<EvalRunComparisonReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!runAId || !runBId || runAId === runBId) {
      setComparison(null);
      return;
    }

    setLoading(true);
    fetch(`/api/evals/compare?runA=${runAId}&runB=${runBId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setComparison(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [runAId, runBId]);

  if (runs.length < 2) {
    return (
      <div className="space-y-1 rounded-[14px] border border-dashed border-[var(--border-strong)] p-10 text-center">
        <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">Two runs are needed to compare</h3>
        <p className="font-sans text-[13px] text-[var(--text-muted)]">
          Run evaluations on different models or prompts to spot quality regressions and drift.
        </p>
      </div>
    );
  }

  const selectClass = clsx(FIELD, "h-9 w-full cursor-pointer px-3");

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h3 className={CARD_TITLE}>Compare two runs</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className={LABEL}>Baseline (A)</span>
            <select value={runAId} onChange={(e) => setRunAId(e.target.value)} className={selectClass}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.summary.overallScore}%)
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={LABEL}>Candidate (B)</span>
            <select value={runBId} onChange={(e) => setRunBId(e.target.value)} className={selectClass}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.summary.overallScore}%)
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading && <p className="font-sans text-sm text-[var(--text-muted)]">Computing differences</p>}

      {comparison && (
        <div className="space-y-6">
          <StatGrid
            stats={[
              {
                label: "Quality change",
                value: (
                  <span className={comparison.overallDelta < 0 ? "text-[var(--state-error)]" : undefined}>
                    {signed(comparison.overallDelta, "%")}
                  </span>
                ),
                detail: `${comparison.runA.summary.overallScore}% to ${comparison.runB.summary.overallScore}%`,
              },
              {
                label: "Pass rate change",
                value: (
                  <span className={comparison.passRateDelta < 0 ? "text-[var(--state-error)]" : undefined}>
                    {signed(comparison.passRateDelta, "%")}
                  </span>
                ),
                detail: `${comparison.runA.summary.passRate}% to ${comparison.runB.summary.passRate}%`,
              },
              {
                label: "Latency change",
                value: (
                  <span className={comparison.latencyDeltaMs > 0 ? "text-[var(--state-warning)]" : undefined}>
                    {signed(comparison.latencyDeltaMs, " ms")}
                  </span>
                ),
                detail: `${comparison.runA.summary.avgLatencyMs} ms to ${comparison.runB.summary.avgLatencyMs} ms`,
              },
            ]}
          />

          <section className={CARD}>
            <div className={CARD_HEAD}>
              <h3 className={CARD_TITLE}>Score change by metric</h3>
            </div>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-1 p-5 sm:grid-cols-2">
              {Object.entries(comparison.metricDeltas).map(([metricKey, delta]) => (
                <li
                  key={metricKey}
                  className="flex items-baseline justify-between gap-3 border-b border-[var(--border-subtle)] py-2 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
                >
                  <span className="font-sans text-[13px] text-[var(--text-secondary)]">
                    {metricKey.charAt(0) + metricKey.slice(1).toLowerCase().replace(/_/g, " ")}
                  </span>
                  <span className={clsx(META, delta < 0 ? "text-[var(--state-error)]" : "text-[var(--text-primary)]")}>
                    {signed(Math.round(delta * 100), "%")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {comparison.keyFindings.length > 0 && (
            <section className={CARD}>
              <div className={CARD_HEAD}>
                <h3 className={CARD_TITLE}>Findings</h3>
              </div>
              <ul className="space-y-2 p-5">
                {comparison.keyFindings.map((finding, i) => (
                  <li key={i} className="font-sans text-sm leading-6 text-[var(--text-secondary)]">
                    {finding}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
