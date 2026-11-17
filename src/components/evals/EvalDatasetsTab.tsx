"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { EvalDataset } from "@/types/evals";
import { toast } from "@/stores/toastStore";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  FIELD,
  INPUT,
  LABEL,
  META,
  SECTION_TITLE,
} from "@/components/ui/surfaces";

interface EvalDatasetsTabProps {
  datasets: EvalDataset[];
  onRunDataset: (dataset: EvalDataset) => void;
  onRefresh: () => void;
}

const SAMPLE_LABEL = "font-sans text-[13px] text-[var(--text-muted)]";

export function EvalDatasetsTab({ datasets, onRunDataset, onRefresh }: EvalDatasetsTabProps) {
  const [expandedDatasetId, setExpandedDatasetId] = useState<string | null>(datasets[0]?.id || null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("CUSTOM_TESTS");
  const [rawItemsJson, setRawItemsJson] = useState(
    JSON.stringify(
      [
        {
          id: "custom_01",
          input: { query: "How does our cancellation policy work?" },
          context: "Customers may cancel within 30 days for a full refund.",
          groundTruth: "Customers are eligible for a 100% refund within 30 days of purchase.",
          tags: ["support", "refunds"],
        },
      ],
      null,
      2
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDataset = async () => {
    if (!name.trim()) {
      setError("Dataset name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const parsedItems = JSON.parse(rawItemsJson);
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        throw new Error("Items must be a non-empty JSON array.");
      }

      const res = await fetch("/api/evals/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || "User Created Golden Dataset",
          category: category.toUpperCase().trim(),
          targetType: "MODEL",
          items: parsedItems,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create dataset.");
      }

      toast.success("Dataset Created", `Successfully added ${name}`);
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON format");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className={SECTION_TITLE}>Golden datasets</h2>
          <span className={META}>{datasets.length}</span>
        </div>
        <button type="button" onClick={() => setCreateModalOpen(true)} className={BTN_SECONDARY}>
          New dataset
        </button>
      </div>

      <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
        {datasets.map((ds) => {
          const isExpanded = expandedDatasetId === ds.id;
          return (
            <li key={ds.id}>
              <div className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-baseline gap-3">
                    <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{ds.name}</h3>
                    <span className={META}>{String(ds.category).toLowerCase().replace(/_/g, " ")}</span>
                  </div>
                  <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{ds.description}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={clsx(META, "mr-2")}>{ds.items.length} samples</span>
                  <button type="button" onClick={() => onRunDataset(ds)} className={BTN_SECONDARY_SM}>
                    Evaluate
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedDatasetId(isExpanded ? null : ds.id)}
                    aria-expanded={isExpanded}
                    className={BTN_SECONDARY_SM}
                  >
                    {isExpanded ? "Hide samples" : "Show samples"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                  {ds.items.map((item, idx) => (
                    <li key={item.id} className="space-y-3 px-5 py-4">
                      <div className={clsx(META, "flex flex-wrap items-center justify-between gap-2")}>
                        <span>
                          {idx + 1} · {item.id}
                        </span>
                        {item.tags && <span>{item.tags.join(", ")}</span>}
                      </div>

                      <div className="space-y-1">
                        <div className={SAMPLE_LABEL}>Input</div>
                        <div className="font-sans text-sm text-[var(--text-primary)]">
                          {typeof item.input === "string" ? item.input : JSON.stringify(item.input)}
                        </div>
                      </div>

                      {item.context && (
                        <div className="space-y-1">
                          <div className={SAMPLE_LABEL}>Context given to the model</div>
                          <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                            {Array.isArray(item.context) ? item.context.join(" ") : item.context}
                          </p>
                        </div>
                      )}

                      {item.groundTruth && (
                        <div className="space-y-1">
                          <div className={SAMPLE_LABEL}>Reference answer</div>
                          <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{item.groundTruth}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* New dataset modal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-dataset-title"
        >
          <div className="custom-scrollbar flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <h2 id="new-dataset-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
                New golden dataset
              </h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="space-y-2">
                <label htmlFor="ds-name" className={LABEL}>
                  Name
                </label>
                <input
                  id="ds-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Healthcare QA verification set"
                  className={clsx(INPUT, "w-full")}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="ds-category" className={LABEL}>
                    Category
                  </label>
                  <input
                    id="ds-category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="HEALTHCARE_RAG"
                    className={clsx(INPUT, "w-full font-mono text-xs")}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ds-desc" className={LABEL}>
                    Description
                  </label>
                  <input
                    id="ds-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this set checks"
                    className={clsx(INPUT, "w-full")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="ds-items" className={LABEL}>
                    Samples (JSON array)
                  </label>
                  <span className={META}>{"{ id, input, context?, groundTruth? }"}</span>
                </div>
                <textarea
                  id="ds-items"
                  value={rawItemsJson}
                  onChange={(e) => setRawItemsJson(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className={clsx(FIELD, "w-full p-3 font-mono text-xs leading-5")}
                />
              </div>

              {error && (
                <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
              <button type="button" onClick={() => setCreateModalOpen(false)} className={BTN_SECONDARY}>
                Cancel
              </button>
              <button type="button" onClick={handleCreateDataset} disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving" : "Save dataset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
