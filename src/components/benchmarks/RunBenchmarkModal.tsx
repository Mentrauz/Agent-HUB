"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { BenchmarkSuite, BenchmarkScorecard } from "@/types/benchmark";
import { ModelDropdown } from "@/components/common/ModelDropdown";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, INPUT, LABEL, META } from "@/components/ui/surfaces";

interface RunBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  suites: BenchmarkSuite[];
  initialSuite?: BenchmarkSuite;
  onScorecardGenerated: (scorecard: BenchmarkScorecard) => void;
}

export function RunBenchmarkModal({
  isOpen,
  onClose,
  suites,
  initialSuite,
  onScorecardGenerated,
}: RunBenchmarkModalProps) {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>(
    initialSuite?.id || suites[0]?.id || ""
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    initialSuite?.recommendedModel || "meta-llama/llama-3.3-70b-versatile"
  );
  const [skillName, setSkillName] = useState("Agent Mission Control Graph");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSuite = suites.find((s) => s.id === selectedSuiteId) || suites[0];

  const handleRun = async () => {
    setRunning(true);
    setError(null);

    try {
      const res = await fetch("/api/benchmarks/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suiteId: selectedSuiteId,
          model: selectedModel,
          skillName,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Benchmark evaluation failed");
      }

      onScorecardGenerated(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run benchmark");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-benchmark-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 id="run-benchmark-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
            Run a benchmark
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            aria-label="Close"
            className="h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <label htmlFor="bench-suite" className={LABEL}>
              Suite
            </label>
            <select
              id="bench-suite"
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              disabled={running}
              className={clsx(FIELD, "h-9 w-full cursor-pointer px-3")}
            >
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.testCases.length} tests)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className={LABEL}>Model</span>
            <ModelDropdown
              value={selectedModel}
              onChange={(m) => setSelectedModel(m)}
              disabled={running}
              showAutoRouter={false}
              showCustomOption={false}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bench-label" className={LABEL}>
              Label for this run
            </label>
            <input
              id="bench-label"
              type="text"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              disabled={running}
              className={clsx(INPUT, "w-full")}
            />
          </div>

          {currentSuite && (
            <div className="space-y-2">
              <div className={LABEL}>Included tests ({currentSuite.testCases.length})</div>
              <ul className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
                {currentSuite.testCases.map((tc) => (
                  <li key={tc.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="font-sans text-[13px] text-[var(--text-secondary)]">{tc.name}</span>
                    <span className={META}>{String(tc.difficulty).toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button type="button" onClick={onClose} disabled={running} className={BTN_SECONDARY}>
            Cancel
          </button>
          <button type="button" onClick={handleRun} disabled={running} className={BTN_PRIMARY}>
            {running ? "Running suite" : "Run benchmark"}
          </button>
        </div>
      </div>
    </div>
  );
}
