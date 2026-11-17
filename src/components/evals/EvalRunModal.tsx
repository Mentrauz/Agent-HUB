"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { EvalDataset, EvalMetricType, EvalRunReport, EvalTargetType } from "@/types/evals";
import { SkillDTO } from "@/types/skill";
import { skillsApi } from "@/lib/api/skills";
import { ModelDropdown } from "@/components/common/ModelDropdown";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL, META, Segmented } from "@/components/ui/surfaces";

interface EvalRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: EvalDataset[];
  initialDataset?: EvalDataset;
  onRunCompleted: (report: EvalRunReport) => void;
}

const AVAILABLE_METRICS: { id: EvalMetricType; label: string; description: string }[] = [
  {
    id: "FAITHFULNESS",
    label: "Faithfulness",
    description: "Whether factual claims are grounded in the retrieved context.",
  },
  {
    id: "ANSWER_RELEVANCE",
    label: "Answer relevance",
    description: "Whether the answer addresses the question directly without leaving out key facts.",
  },
  {
    id: "SEMANTIC_CORRECTNESS",
    label: "Semantic correctness",
    description: "How closely the answer matches the golden reference.",
  },
  {
    id: "SAFETY_POLICY",
    label: "Safety and policy",
    description: "Resistance to prompt injection and avoidance of dangerous commands.",
  },
  {
    id: "CONTEXT_PRECISION",
    label: "Context precision",
    description: "The signal-to-noise ratio of the retrieved knowledge base chunks.",
  },
];

const SELECT = clsx(FIELD, "h-9 w-full cursor-pointer px-3");

export function EvalRunModal({
  isOpen,
  onClose,
  datasets,
  initialDataset,
  onRunCompleted,
}: EvalRunModalProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    initialDataset?.id || datasets[0]?.id || ""
  );
  const [targetType, setTargetType] = useState<EvalTargetType>("MODEL");
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [targetModel, setTargetModel] = useState("meta-llama/llama-3.3-70b-versatile");
  const [judgeModel, setJudgeModel] = useState("meta-llama/llama-3.3-70b-versatile");
  const [selectedMetrics, setSelectedMetrics] = useState<EvalMetricType[]>([
    "FAITHFULNESS",
    "ANSWER_RELEVANCE",
    "SEMANTIC_CORRECTNESS",
    "SAFETY_POLICY",
  ]);
  const [threshold] = useState(0.75);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real skills from database
  const { data: skillsData } = useQuery({
    queryKey: ["userSkillsForEval"],
    queryFn: () => skillsApi.list({}),
    enabled: isOpen,
  });

  const skills: SkillDTO[] = skillsData?.items || [];
  const activeSkills = skills.filter((s: SkillDTO) => s.status !== "ARCHIVED");
  const graphs = activeSkills.filter((s: SkillDTO) => {
    const version = s.publishedVersion ?? s.currentDraft;
    return Boolean(version?.graphDefinition && (version.graphDefinition.nodes?.length ?? 0) > 0);
  });

  if (!isOpen) return null;

  const toggleMetric = (metric: EvalMetricType) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const handleRun = async () => {
    if (selectedMetrics.length === 0) {
      setError("Please select at least one evaluation metric.");
      return;
    }

    setRunning(true);
    setError(null);

    let targetId = "default_target";
    let targetName = targetModel;

    if (targetType === "SKILL" || targetType === "GRAPH") {
      const candidates = targetType === "GRAPH" ? graphs : activeSkills;
      const found = candidates.find((s) => s.id === selectedSkillId) || candidates[0];
      if (found) {
        targetId = found.id;
        targetName = found.name;
      }
    }

    try {
      const res = await fetch("/api/evals/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId: selectedDatasetId,
          targetType,
          targetId,
          targetName,
          targetModel,
          judgeConfig: {
            judgeModel,
            metrics: selectedMetrics,
            passThreshold: threshold,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Evaluation failed.");
      }

      onRunCompleted(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run evaluation pipeline");
    } finally {
      setRunning(false);
    }
  };

  const candidates = targetType === "GRAPH" ? graphs : activeSkills;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-eval-title"
    >
      <div className="custom-scrollbar flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 id="run-eval-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
            Run an evaluation
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <label htmlFor="eval-dataset" className={LABEL}>
              Golden dataset
            </label>
            <select
              id="eval-dataset"
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              disabled={running}
              className={SELECT}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.items.length} samples)
                </option>
              ))}
            </select>
          </div>

          <Segmented
            label="What to evaluate"
            value={targetType}
            onChange={setTargetType}
            options={[
              { id: "MODEL", label: "LLM model" },
              { id: "SKILL", label: `Skill (${activeSkills.length})` },
              { id: "GRAPH", label: `Canvas graph (${graphs.length})` },
            ]}
          />

          {(targetType === "SKILL" || targetType === "GRAPH") && (
            <div className="space-y-2">
              <label htmlFor="eval-target" className={LABEL}>
                {targetType === "GRAPH" ? "Canvas graph" : "Skill"}
              </label>
              {candidates.length === 0 ? (
                <p className="font-sans text-[13px] text-[var(--text-muted)]">
                  {targetType === "GRAPH"
                    ? "No canvas graphs yet. Create one in Agent canvas to evaluate it."
                    : "No active skills yet. Create one in Studio to evaluate it."}
                </p>
              ) : (
                <select
                  id="eval-target"
                  value={selectedSkillId || candidates[0]?.id}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  disabled={running}
                  className={SELECT}
                >
                  {candidates.map((s: SkillDTO) => (
                    <option key={s.id} value={s.id}>
                      {targetType === "GRAPH" ? s.name : `${s.name} (${String(s.status).toLowerCase()})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <span className={LABEL}>Model under test</span>
              <ModelDropdown
                value={targetModel}
                onChange={(m) => setTargetModel(m)}
                disabled={running}
                showAutoRouter={false}
                showCustomOption={false}
              />
            </div>
            <div className="space-y-2">
              <span className={LABEL}>Judge model</span>
              <ModelDropdown
                value={judgeModel}
                onChange={(m) => setJudgeModel(m)}
                disabled={running}
                showAutoRouter={false}
                showCustomOption={false}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="flex w-full items-baseline justify-between gap-3">
              <span className={LABEL}>Metrics</span>
              <span className={META}>pass at {Math.round(threshold * 100)}%</span>
            </legend>
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
              {AVAILABLE_METRICS.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-[var(--text-primary)]/[0.04]">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(m.id)}
                      onChange={() => toggleMetric(m.id)}
                      disabled={running}
                      className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block font-sans text-sm text-[var(--text-primary)]">{m.label}</span>
                      <span className="block font-sans text-[13px] leading-5 text-[var(--text-muted)]">{m.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

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
            {running ? "Judging" : "Run evaluation"}
          </button>
        </div>
      </div>
    </div>
  );
}
