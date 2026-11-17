"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Play, Loader2, AlertCircle } from "lucide-react";
import { executionsApi } from "@/lib/api/executions";
import { PinnedSkillDTO } from "@/types/dashboard";
import { toast } from "@/stores/toastStore";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/surfaces";

const LABEL = "block font-sans text-[13px] text-[var(--text-secondary)]";
const FIELD =
  "border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

interface QuickRunSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: PinnedSkillDTO[];
  initialSkillId?: string;
}

export function QuickRunSkillModal({
  isOpen,
  onClose,
  skills,
  initialSkillId,
}: QuickRunSkillModalProps) {
  const router = useRouter();
  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    initialSkillId || skills[0]?.id || ""
  );
  const [inputJson, setInputJson] = useState<string>("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const currentSkill = skills.find((s) => s.id === selectedSkillId) || skills[0];

  useEffect(() => {
    if (initialSkillId) {
      setSelectedSkillId(initialSkillId);
    } else if (skills.length > 0 && !selectedSkillId) {
      setSelectedSkillId(skills[0].id);
    }
  }, [initialSkillId, skills, selectedSkillId]);

  useEffect(() => {
    if (currentSkill) {
      if (currentSkill.examples && currentSkill.examples.length > 0 && currentSkill.examples[0].input) {
        setInputJson(JSON.stringify(currentSkill.examples[0].input, null, 2));
      } else if (currentSkill.inputSchema && typeof currentSkill.inputSchema === "object") {
        const schema = currentSkill.inputSchema as { properties?: Record<string, { type?: string; default?: unknown }> };
        if (schema.properties) {
          const sample: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(schema.properties)) {
            sample[k] = v.default !== undefined ? v.default : v.type === "string" ? "sample value" : 0;
          }
          setInputJson(JSON.stringify(sample, null, 2));
        } else {
          setInputJson("{\n  \n}");
        }
      } else {
        setInputJson("{\n  \n}");
      }
      setJsonError(null);
    }
    // Keyed on the skill id, not the object: the dashboard refetches every 12s, which
    // recreates currentSkill and would otherwise wipe the user's in-progress JSON edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSkill?.id]);

  if (!isOpen) return null;

  const handleJsonChange = (val: string) => {
    setInputJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON syntax");
    }
  };

  const handleRun = async () => {
    if (!currentSkill) return;

    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(inputJson);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON syntax");
      return;
    }

    setIsRunning(true);
    try {
      const execution = await executionsApi.start(currentSkill.versionId, parsedPayload);
      toast.success("Execution started", `Run ID: ${execution.id.slice(0, 8)}…`);
      onClose();
      router.push(`/dashboard/executions/${execution.id}`);
    } catch (error) {
      toast.error("Execution failed to launch", error instanceof Error ? error.message : "Server error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-run-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 id="quick-run-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
            Quick run
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Skill */}
          <div className="space-y-2">
            <label htmlFor="quick-run-skill" className={LABEL}>
              Skill
            </label>
            {skills.length === 0 ? (
              <p className="font-sans text-sm text-[var(--text-muted)]">No active skills to run yet</p>
            ) : (
              <select
                id="quick-run-skill"
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className={`h-9 w-full rounded-[8px] px-3 font-sans text-sm ${FIELD}`}
              >
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (v{s.versionNumber})
                  </option>
                ))}
              </select>
            )}
            {currentSkill && (
              <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{currentSkill.purpose}</p>
            )}
          </div>

          {/* Tools */}
          {currentSkill && currentSkill.allowedTools.length > 0 && (
            <div className="space-y-2">
              <span className={LABEL}>Tools for this run</span>
              <div className="flex flex-wrap gap-1.5">
                {currentSkill.allowedTools.map((t) => (
                  <span
                    key={t}
                    className="rounded-[6px] border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Input JSON */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="quick-run-input" className={LABEL}>
                Input (JSON)
              </label>
              {currentSkill?.examples && currentSkill.examples.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInputJson(JSON.stringify(currentSkill.examples[0].input, null, 2));
                    setJsonError(null);
                  }}
                  className="font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Reset to example
                </button>
              )}
            </div>

            <textarea
              id="quick-run-input"
              value={inputJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={8}
              spellCheck={false}
              aria-invalid={Boolean(jsonError)}
              className={`w-full resize-y rounded-[8px] p-3 font-mono text-xs leading-relaxed ${FIELD} ${
                jsonError ? "border-[var(--state-error)]" : ""
              }`}
              placeholder="{\n  &quot;query&quot;: &quot;...&quot;\n}"
            />

            {jsonError && (
              <div className="flex items-center gap-2 font-sans text-[13px] text-[var(--state-error)]">
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{jsonError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || !currentSkill || Boolean(jsonError)}
            className={BTN_PRIMARY}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                Starting
              </>
            ) : (
              <>
                <Play className="h-4 w-4" strokeWidth={1.5} />
                Run
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
