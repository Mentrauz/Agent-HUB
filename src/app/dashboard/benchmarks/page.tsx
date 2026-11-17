"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { clsx } from "clsx";
import { BUILT_IN_BENCHMARK_SUITES } from "@/modules/benchmarks/benchmarkEngine";
import { BenchmarkSuite, BenchmarkScorecard, ModelBenchmarkComparisonItem } from "@/types/benchmark";
import { BenchmarkSuiteCard } from "@/components/benchmarks/BenchmarkSuiteCard";
import { BenchmarkScorecardView } from "@/components/benchmarks/BenchmarkScorecardView";
import { ModelComparisonMatrix } from "@/components/benchmarks/ModelComparisonMatrix";
import { RunBenchmarkModal } from "@/components/benchmarks/RunBenchmarkModal";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  META,
  PageHeader,
  SECTION_TITLE,
  StatGrid,
} from "@/components/ui/surfaces";

// Real, currently-configured free-tier models (see src/providers/llm/modelLists.ts)
// this app can actually call. The comparison below runs a real suite against each.
const COMPARISON_MODEL_IDS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "groq/compound-mini",
  "llama-3.1-8b-instant",
];

export default function BenchmarksPage() {
  const [selectedSuiteForRun, setSelectedSuiteForRun] = useState<BenchmarkSuite | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeScorecard, setActiveScorecard] = useState<BenchmarkScorecard | null>(null);
  const [comparisonModels, setComparisonModels] = useState<ModelBenchmarkComparisonItem[] | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const { data: suitesData, isLoading, refetch } = useQuery({
    queryKey: ["benchmarkSuites"],
    queryFn: async () => {
      const res = await fetch("/api/benchmarks/suites");
      if (!res.ok) throw new Error("Failed to load suites");
      const json = await res.json();
      return json.data;
    },
    initialData: {
      suites: BUILT_IN_BENCHMARK_SUITES,
      totalSuites: BUILT_IN_BENCHMARK_SUITES.length,
      totalTestCases: BUILT_IN_BENCHMARK_SUITES.reduce((acc, s) => acc + s.testCases.length, 0),
    },
  });

  const suites: BenchmarkSuite[] = suitesData?.suites || BUILT_IN_BENCHMARK_SUITES;

  const handleOpenRun = (suite?: BenchmarkSuite) => {
    setSelectedSuiteForRun(suite);
    setIsModalOpen(true);
  };

  const handleRunComparison = async () => {
    setIsComparing(true);
    setComparisonError(null);
    try {
      const res = await fetch("/api/benchmarks/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suiteId: suites[0]?.id, models: COMPARISON_MODEL_IDS }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Comparison failed");
      setComparisonModels(json.data);
    } catch (err) {
      setComparisonError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setIsComparing(false);
    }
  };

  const sc = activeScorecard;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-12">
      <PageHeader
        title="Benchmarks"
        meta="Score reasoning, tool use, RAG grounding and multi-agent runs against fixed test suites"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              title="Refresh"
              aria-label="Refresh"
              disabled={isLoading}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <RotateCw className={clsx("h-4 w-4", isLoading && "animate-spin")} strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => handleOpenRun()} className={BTN_PRIMARY}>
              Run a suite
            </button>
          </div>
        }
      />

      <StatGrid
        stats={[
          {
            label: "Quality index",
            value: sc?.overallScore ?? "—",
            detail: sc ? `Grade ${sc.grade}, weighted across 6 axes` : "Run a suite to measure this",
          },
          {
            label: "Assertion pass rate",
            value: sc ? `${sc.passRate}%` : "—",
            detail: sc ? `${sc.passedTests} of ${sc.totalTests} passed` : "Measured from assertion results",
          },
          {
            label: "Mean latency",
            value: sc ? `${Math.round(sc.durationMs / Math.max(1, sc.totalTests))} ms` : "—",
            detail: "Wall clock, from the real LLM calls",
          },
          {
            label: "Safety compliance",
            value: sc ? `${sc.radar.safetyComplianceScore}%` : "—",
            detail:
              sc?.category === "SAFETY_GUARDRAILS"
                ? "Measured directly by this suite"
                : "Estimated from overall accuracy until the safety suite runs",
          },
        ]}
      />

      {/* Latest scorecard */}
      {sc ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={SECTION_TITLE}>Latest scorecard</h2>
            <span className={META}>run at {new Date(sc.executedAt).toLocaleTimeString("en-US", { hour12: false })}</span>
          </div>
          <BenchmarkScorecardView scorecard={sc} />
        </section>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[var(--border-strong)] p-8 text-center font-sans text-sm text-[var(--text-muted)]">
          No suite has run yet. Run one to execute real test cases against a live model.
        </div>
      )}

      {/* Suites */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={SECTION_TITLE}>Suites</h2>
          <span className={META}>{suites.length} available</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite) => (
            <BenchmarkSuiteCard key={suite.id} suite={suite} onRun={(s) => handleOpenRun(s)} />
          ))}
        </div>
      </section>

      {/* Model comparison */}
      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Model comparison</h2>
        {comparisonModels ? (
          <div className="space-y-3">
            <ModelComparisonMatrix models={comparisonModels} />
            <button
              type="button"
              onClick={() => void handleRunComparison()}
              disabled={isComparing}
              className={BTN_SECONDARY_SM}
            >
              {isComparing ? "Re-running" : "Re-run comparison"}
            </button>
          </div>
        ) : (
          <div className="space-y-4 rounded-[14px] border border-dashed border-[var(--border-strong)] p-8 text-center">
            <p className="mx-auto max-w-lg font-sans text-sm text-[var(--text-muted)]">
              Runs one suite against each configured model. Every score is measured fresh, none are stored.
            </p>
            <button
              type="button"
              onClick={() => void handleRunComparison()}
              disabled={isComparing}
              className={BTN_SECONDARY}
            >
              {isComparing ? "Running comparison" : "Run model comparison"}
            </button>
            {comparisonError && (
              <p className="font-sans text-[13px] text-[var(--state-error)]">{comparisonError}</p>
            )}
          </div>
        )}
      </section>

      <RunBenchmarkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        suites={suites}
        initialSuite={selectedSuiteForRun}
        onScorecardGenerated={(s) => setActiveScorecard(s)}
      />
    </div>
  );
}
