"use client";

import React from "react";
import { clsx } from "clsx";
import { BenchmarkScorecard } from "@/types/benchmark";
import { CARD, CARD_HEAD, CARD_TITLE, META, SECTION_TITLE, Tag } from "@/components/ui/surfaces";

interface BenchmarkScorecardViewProps {
  scorecard: BenchmarkScorecard;
  onClose?: () => void;
}

export function BenchmarkScorecardView({ scorecard, onClose }: BenchmarkScorecardViewProps) {
  const radarItems = [
    { label: "Accuracy and intent grounding", value: scorecard.radar.accuracyScore },
    { label: "Tool calling precision", value: scorecard.radar.toolPrecisionScore },
    { label: "Latency and throughput", value: scorecard.radar.latencyScore },
    { label: "Token and cost efficiency", value: scorecard.radar.costEfficiencyScore },
    { label: "Safety and approval compliance", value: scorecard.radar.safetyComplianceScore },
    { label: "Multi-agent cohesion", value: scorecard.radar.multiAgentCohesionScore },
  ];
  // The weakest axis is the one worth acting on, so it gets the highlight
  const weakest = Math.min(...radarItems.map((r) => r.value));

  const facts = [
    { label: "Pass rate", value: `${scorecard.passRate}%`, detail: `${scorecard.passedTests} of ${scorecard.totalTests} tests` },
    { label: "Duration", value: `${(scorecard.durationMs / 1000).toFixed(2)} s`, detail: "End to end" },
    {
      label: "Average latency",
      value: `${Math.round(scorecard.durationMs / Math.max(1, scorecard.totalTests))} ms`,
      detail: "Per test",
    },
    { label: "Model", value: scorecard.modelEvaluated.split("/").pop() ?? "—", detail: "Evaluated endpoint" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <div className="min-w-0 space-y-1">
            <h2 className={CARD_TITLE}>{scorecard.suiteName}</h2>
            <div className={clsx(META, "truncate")}>
              {scorecard.skillName} · {scorecard.modelEvaluated}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-6">
            <div className="text-right">
              <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">
                {scorecard.overallScore}
                <span className="font-sans text-sm text-[var(--text-muted)]"> / 100</span>
              </div>
              <div className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">Quality, grade {scorecard.grade}</div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--border-subtle)] sm:grid-cols-4 sm:divide-y-0">
          {facts.map((f) => (
            <div key={f.label} className="space-y-1 px-5 py-4">
              <dt className="font-sans text-[13px] text-[var(--text-muted)]">{f.label}</dt>
              <dd className="truncate font-mono text-sm tabular-nums text-[var(--text-primary)]">{f.value}</dd>
              <dd className="font-sans text-[13px] text-[var(--text-secondary)]">{f.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Dimensions */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h3 className={CARD_TITLE}>Dimensions</h3>
          <span className={META}>weakest in amber</span>
        </div>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 md:grid-cols-2">
          {radarItems.map((item) => (
            <li key={item.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-sans text-[13px] text-[var(--text-secondary)]">{item.label}</span>
                <span className={clsx(META, "text-[var(--text-primary)]")}>{item.value}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.value}%`,
                    background: item.value === weakest ? "var(--state-warning)" : "var(--text-muted)",
                    opacity: item.value === weakest ? 1 : 0.6,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Tests */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={SECTION_TITLE}>Test cases</h3>
          <span className={META}>{scorecard.testResults.length}</span>
        </div>
        <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
          {scorecard.testResults.map((t, idx) => (
            <li key={t.testCaseId} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className={META}>{idx + 1}</span>
                  <span className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{t.name}</span>
                </div>
                <div className="flex items-center gap-x-4">
                  <span className={META}>
                    {t.durationMs} ms · {t.tokensUsed} tokens · {t.tokensPerSec} tok/s
                  </span>
                  <Tag tone={t.passed ? "good" : "bad"}>{t.passed ? "Passed" : "Failed"}</Tag>
                </div>
              </div>

              <ul className="space-y-1 pl-6">
                {t.assertions.map((a, aIdx) => (
                  <li key={aIdx} className="flex items-baseline gap-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full"
                      style={{ background: a.passed ? "var(--state-success)" : "var(--state-error)" }}
                    />
                    <span className="sr-only">{a.passed ? "Passed:" : "Failed:"}</span>
                    {a.message}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* Recommendations */}
      {scorecard.recommendations.length > 0 && (
        <section className={CARD}>
          <div className={CARD_HEAD}>
            <h3 className={CARD_TITLE}>Recommendations</h3>
          </div>
          <ul className="space-y-2 p-5">
            {scorecard.recommendations.map((rec, i) => (
              <li key={i} className="font-sans text-sm leading-6 text-[var(--text-secondary)]">
                {rec}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
