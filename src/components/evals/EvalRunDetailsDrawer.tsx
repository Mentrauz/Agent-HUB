"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { EvalRunReport } from "@/types/evals";
import { CARD, CARD_HEAD, CARD_TITLE, META, ROW_HOVER, SECTION_TITLE, Segmented, Tag } from "@/components/ui/surfaces";

interface EvalRunDetailsDrawerProps {
  report: EvalRunReport;
  onClose?: () => void;
}

const LABEL = "font-sans text-[13px] text-[var(--text-muted)]";
const BLOCK =
  "whitespace-pre-wrap rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 font-sans text-[13px] leading-5 text-[var(--text-secondary)]";

const metricName = (key: string) => key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, " ");

export function EvalRunDetailsDrawer({ report, onClose }: EvalRunDetailsDrawerProps) {
  const [filter, setFilter] = useState<"ALL" | "PASSED" | "FAILED">("ALL");
  const [expandedVerdictId, setExpandedVerdictId] = useState<string | null>(
    report.verdicts[0]?.id || null
  );

  const filteredVerdicts = report.verdicts.filter((v) => {
    if (filter === "PASSED") return v.passed;
    if (filter === "FAILED") return !v.passed;
    return true;
  });

  const metricRows = Object.entries(report.summary.metricSummaries).map(([key, summary]) => ({
    key,
    pct: Math.round(summary.averageScore * 100),
    passRate: summary.passRate,
  }));
  const weakest = Math.min(...metricRows.map((m) => m.pct));

  const facts = [
    { label: "Pass rate", value: `${report.summary.passRate}%`, detail: `${report.summary.passedItems} of ${report.summary.totalItems} samples` },
    { label: "Average latency", value: `${report.summary.avgLatencyMs} ms`, detail: `p90 ${report.summary.p90LatencyMs} ms` },
    { label: "Tokens", value: report.summary.totalTokens.toLocaleString(), detail: "Prompt and completion" },
    { label: "Estimated cost", value: `$${report.summary.estimatedCostUsd.toFixed(4)}`, detail: "This run" },
  ];

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <div className="min-w-0 space-y-1">
            <h2 className={CARD_TITLE}>{report.name}</h2>
            <div className={clsx(META, "truncate")}>
              {report.datasetName} · judge {report.judgeConfig.judgeModel.split("/").pop()}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-6">
            <div className="text-right">
              <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">
                {report.summary.overallScore}
                <span className="font-sans text-sm text-[var(--text-muted)]"> / 100</span>
              </div>
              <div className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">Overall quality</div>
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

        {report.regressionAlerts.length > 0 && (
          <div className="relative space-y-1 border-b border-[var(--border-subtle)] px-5 py-4">
            <span aria-hidden="true" className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-[var(--state-warning)]" />
            <div className="font-sans text-sm font-medium text-[var(--text-primary)]">Quality alerts</div>
            <ul className="space-y-1">
              {report.regressionAlerts.map((alert, i) => (
                <li key={i} className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--border-subtle)] sm:grid-cols-4 sm:divide-y-0">
          {facts.map((f) => (
            <div key={f.label} className="space-y-1 px-5 py-4">
              <dt className={LABEL}>{f.label}</dt>
              <dd className="font-mono text-sm tabular-nums text-[var(--text-primary)]">{f.value}</dd>
              <dd className="font-sans text-[13px] text-[var(--text-secondary)]">{f.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Metric breakdown */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h3 className={CARD_TITLE}>Judge scores by metric</h3>
          <span className={META}>weakest in amber</span>
        </div>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 md:grid-cols-2">
          {metricRows.map((m) => (
            <li key={m.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-sans text-[13px] text-[var(--text-secondary)]">{metricName(m.key)}</span>
                <span className={clsx(META, "text-[var(--text-primary)]")}>
                  {m.pct}% · {m.passRate}% pass
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${m.pct}%`,
                    background: m.pct === weakest ? "var(--state-warning)" : "var(--text-muted)",
                    opacity: m.pct === weakest ? 1 : 0.6,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Verdicts */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className={SECTION_TITLE}>Sample verdicts</h3>
            <span className={META}>{filteredVerdicts.length}</span>
          </div>
          <Segmented
            label="Show"
            hideLabel
            value={filter}
            onChange={setFilter}
            options={[
              { id: "ALL", label: `All ${report.verdicts.length}` },
              { id: "PASSED", label: `Passed ${report.summary.passedItems}` },
              { id: "FAILED", label: `Failed ${report.summary.failedItems}` },
            ]}
          />
        </div>

        <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
          {filteredVerdicts.map((v, idx) => {
            const isExpanded = expandedVerdictId === v.id;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setExpandedVerdictId(isExpanded ? null : v.id)}
                  aria-expanded={isExpanded}
                  className={clsx(
                    ROW_HOVER,
                    "flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                  )}
                >
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className={META}>{idx + 1}</span>
                    <Tag tone={v.passed ? "good" : "bad"}>{v.passed ? "Passed" : "Failed"}</Tag>
                    <span className="truncate font-sans text-sm text-[var(--text-primary)]">
                      {typeof v.input === "string" ? v.input : JSON.stringify(v.input)}
                    </span>
                  </div>
                  <span className={clsx(META, "shrink-0")}>
                    {Math.round(v.overallScore * 100)}% · {v.durationMs} ms
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-5 py-4">
                    <div className={clsx(META)}>{v.datasetItemId}</div>

                    {v.context && (
                      <div className="space-y-1">
                        <div className={LABEL}>Retrieved context</div>
                        <div className={BLOCK}>{Array.isArray(v.context) ? v.context.join("\n") : v.context}</div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className={LABEL}>Agent output</div>
                      <div className={BLOCK}>{v.output}</div>
                    </div>

                    {v.groundTruth && (
                      <div className="space-y-1">
                        <div className={LABEL}>Reference answer</div>
                        <div className={BLOCK}>{v.groundTruth}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className={LABEL}>Judge reasoning</div>
                      <ul className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                        {Object.entries(v.metrics).map(([mKey, res]) => (
                          <li key={mKey} className="space-y-1 px-3 py-3">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-sans text-[13px] font-medium text-[var(--text-primary)]">{metricName(mKey)}</span>
                              <Tag tone={res.passed ? "good" : "bad"}>
                                {Math.round(res.score * 100)}% {res.passed ? "pass" : "fail"}
                              </Tag>
                            </div>
                            <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{res.reasoning}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
