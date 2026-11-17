"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { clsx } from "clsx";
import { EvalDataset, EvalRunReport } from "@/types/evals";
import { BUILT_IN_GOLDEN_DATASETS } from "@/modules/evals/datasetStore";
import { EvalDatasetsTab } from "@/components/evals/EvalDatasetsTab";
import { EvalRunModal } from "@/components/evals/EvalRunModal";
import { EvalRunDetailsDrawer } from "@/components/evals/EvalRunDetailsDrawer";
import { EvalComparisonView } from "@/components/evals/EvalComparisonView";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  META,
  PageHeader,
  ROW_HOVER,
  SECTION_TITLE,
  StatGrid,
} from "@/components/ui/surfaces";

export default function EvalsPage() {
  const [activeTab, setActiveTab] = useState<"runs" | "datasets" | "compare">("runs");
  const [selectedDatasetForRun, setSelectedDatasetForRun] = useState<EvalDataset | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EvalRunReport | null>(null);

  const { data: datasetsData, refetch: refetchDatasets } = useQuery({
    queryKey: ["evalDatasets"],
    queryFn: async () => {
      const res = await fetch("/api/evals/datasets");
      if (!res.ok) throw new Error("Failed to load datasets");
      const json = await res.json();
      return json.data as EvalDataset[];
    },
    initialData: BUILT_IN_GOLDEN_DATASETS,
  });

  const { data: runsData, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
    queryKey: ["evalRuns"],
    queryFn: async () => {
      const res = await fetch("/api/evals/runs");
      if (!res.ok) throw new Error("Failed to load runs");
      const json = await res.json();
      return json.data as EvalRunReport[];
    },
    initialData: [],
  });

  const datasets = datasetsData || BUILT_IN_GOLDEN_DATASETS;
  const runs = runsData || [];

  // Computed dynamic stats across all real evaluation runs
  const totalRuns = runs.length;
  const overallQualityIndex =
    totalRuns > 0
      ? Math.round(runs.reduce((acc, r) => acc + r.summary.overallScore, 0) / totalRuns)
      : null;
  const overallPassRate =
    totalRuns > 0
      ? Math.round(runs.reduce((acc, r) => acc + r.summary.passRate, 0) / totalRuns)
      : null;

  const faithfulnessScores = runs
    .map((r) => r.summary.metricSummaries?.FAITHFULNESS?.averageScore)
    .filter((s): s is number => typeof s === "number");
  const avgFaithfulness =
    faithfulnessScores.length > 0
      ? ((faithfulnessScores.reduce((a, b) => a + b, 0) / faithfulnessScores.length) * 100).toFixed(1) + "%"
      : null;

  const activeRegressionAlertsCount = runs.reduce((acc, r) => acc + (r.regressionAlerts?.length || 0), 0);
  const totalTestSamples = datasets.reduce((acc, d) => acc + (d.items?.length || 0), 0);

  const handleOpenRun = (dataset?: EvalDataset) => {
    setSelectedDatasetForRun(dataset);
    setIsModalOpen(true);
  };

  const handleRunCompleted = (report: EvalRunReport) => {
    setSelectedReport(report);
    refetchRuns();
  };

  const tabs = [
    { id: "runs" as const, label: "Runs", count: runs.length },
    { id: "datasets" as const, label: "Datasets", count: datasets.length },
    { id: "compare" as const, label: "Regression compare", count: null },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-12">
      <PageHeader
        title="Evals"
        meta="Score runs against golden datasets with an LLM judge, and catch regressions between models"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refetchDatasets();
                refetchRuns();
              }}
              title="Refresh"
              aria-label="Refresh"
              disabled={runsLoading}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <RotateCw className={clsx("h-4 w-4", runsLoading && "animate-spin")} strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => handleOpenRun()} className={BTN_PRIMARY}>
              Run evaluation
            </button>
          </div>
        }
      />

      <StatGrid
        stats={[
          {
            label: "Quality index",
            value: overallQualityIndex !== null ? `${overallQualityIndex}%` : "—",
            detail:
              overallPassRate !== null
                ? `${overallPassRate}% pass, across ${totalRuns} ${totalRuns === 1 ? "run" : "runs"}`
                : "No runs yet",
          },
          {
            label: "Golden datasets",
            value: datasets.length,
            detail: `${totalTestSamples.toLocaleString()} samples`,
          },
          {
            label: "Faithfulness",
            value: avgFaithfulness ?? "—",
            detail: "Answers grounded in the retrieved context",
          },
          {
            label: "Regression alerts",
            value: activeRegressionAlertsCount,
            detail: activeRegressionAlertsCount === 0 ? "None active" : "Needs attention",
          },
        ]}
      />

      <div role="tablist" className="flex items-center gap-6 border-b border-[var(--border-subtle)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={clsx(
              "-mb-px flex h-10 cursor-pointer items-center gap-2 border-b-2 font-sans text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
              activeTab === t.id
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {t.label}
            {t.count !== null && <span className={META}>{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "runs" && (
        <div className="space-y-4">
          {selectedReport && (
            <EvalRunDetailsDrawer report={selectedReport} onClose={() => setSelectedReport(null)} />
          )}

          {runs.length === 0 && !selectedReport ? (
            <div className="space-y-4 rounded-[14px] border border-dashed border-[var(--border-strong)] p-10 text-center">
              <div className="space-y-1">
                <h2 className="font-sans text-sm font-medium text-[var(--text-primary)]">No evaluations yet</h2>
                <p className="mx-auto max-w-md font-sans text-[13px] text-[var(--text-muted)]">
                  Run an evaluation against a golden dataset to score faithfulness, answer relevance and semantic
                  correctness with an LLM judge.
                </p>
              </div>
              <button type="button" onClick={() => handleOpenRun()} className={BTN_SECONDARY}>
                Run first evaluation
              </button>
            </div>
          ) : (
            <section className="space-y-3">
              <h2 className={SECTION_TITLE}>Past runs</h2>
              <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
                {runs.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(r)}
                      className={clsx(
                        ROW_HOVER,
                        "flex w-full cursor-pointer flex-col gap-2 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                      )}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{r.name}</div>
                        <div className="font-sans text-[13px] text-[var(--text-secondary)]">
                          {r.datasetName} · {r.targetName}
                        </div>
                      </div>
                      <div className={clsx(META, "flex shrink-0 items-center gap-x-6")}>
                        <span>{r.summary.totalItems} samples</span>
                        <span>{r.summary.avgLatencyMs} ms avg</span>
                        <span className="text-[var(--text-primary)]">
                          {r.summary.overallScore}% · {r.summary.passRate}% pass
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {activeTab === "datasets" && (
        <EvalDatasetsTab
          datasets={datasets}
          onRunDataset={(ds) => handleOpenRun(ds)}
          onRefresh={() => refetchDatasets()}
        />
      )}

      {activeTab === "compare" && <EvalComparisonView runs={runs} />}

      <EvalRunModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        datasets={datasets}
        initialDataset={selectedDatasetForRun}
        onRunCompleted={handleRunCompleted}
      />
    </div>
  );
}
