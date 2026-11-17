"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { skillsApi } from "@/lib/api/skills";
import { executionsApi } from "@/lib/api/executions";
import { StatusBadge } from "@/components/skills/StatusBadge";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { SkeletonSkillDetail } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { toast } from "@/stores/toastStore";
import { getPrefilledExecutionInput, safeParseExecutionInput } from "@/lib/execution/inputHelper";
import { JsonEditorModal } from "@/components/common/JsonEditorModal";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  FIELD,
  META,
  PageHeader,
  plural,
} from "@/components/ui/surfaces";

const TEXT_ACTION =
  "inline-flex h-8 cursor-pointer items-center rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50";
const FIELD_LABEL = "font-sans text-[13px] text-[var(--text-muted)]";

function JsonPreview({ title, value }: { title: string; value?: Record<string, unknown> | null }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>{title}</h2>
      </div>
      <div className="p-5">
        <pre className="max-h-48 overflow-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 font-mono text-xs leading-5 text-[var(--text-secondary)]">
          {JSON.stringify(value ?? {}, null, 2)}
        </pre>
      </div>
    </section>
  );
}

export default function SkillDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id;

  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [runInput, setRunInput] = useState("{\n  \n}");
  const [runInputError, setRunInputError] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  const { data: skill, isLoading, isError } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => skillsApi.get(id),
  });

  const draft = skill?.currentDraft ?? null;
  const activeVersion = skill?.currentDraft ?? skill?.publishedVersion ?? skill?.versions?.[0] ?? null;

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (activeVersion && !initialized) {
      setRunInput(getPrefilledExecutionInput(activeVersion));
      setInitialized(true);
    }
  }, [activeVersion, initialized]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["skill", id] });
    queryClient.invalidateQueries({ queryKey: ["skills"] });
  };

  const publishMutation = useMutation({
    mutationFn: () => skillsApi.publish(id, skill!.currentDraft!.id),
    onSuccess: (v) => {
      toast.success("Version published", `Draft published as v${v.versionNumber}`, {
        action: {
          label: "Open in canvas",
          href: `/dashboard/canvas/${id}`,
        },
      });
      invalidate();
    },
    onError: (e) => toast.error("Publish failed", e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => skillsApi.duplicate(id),
    onSuccess: (d) => {
      toast.success("Skill duplicated", `Created "${d.name}"`);
      invalidate();
    },
    onError: (e) => toast.error("Duplicate failed", e.message),
  });

  const restoreMutation = useMutation({
    mutationFn: () => skillsApi.restore(id),
    onSuccess: (d) => {
      toast.success("Skill restored successfully", `Status is now ${d.status}`);
      invalidate();
    },
    onError: (e) => toast.error("Restore failed", e.message),
  });

  const runMutation = useMutation({
    mutationFn: ({ versionId, inputData }: { versionId: string; inputData: Record<string, unknown> }) =>
      executionsApi.start(versionId, inputData),
    onSuccess: (execution) => {
      toast.success("Execution started", "Running the graph…");
      router.push(`/dashboard/executions/${execution.id}`);
    },
    onError: (e) => toast.error("Execution failed to start", e.message),
  });

  const runSkill = () => {
    if (!activeVersion) return;
    try {
      const inputData = safeParseExecutionInput(runInput);
      setRunInputError(null);
      runMutation.mutate({ versionId: activeVersion.id, inputData });
    } catch (err) {
      setRunInputError(err instanceof Error ? err.message : "Invalid JSON input payload");
    }
  };

  const runConfirm = async () => {
    if (!confirm || !skill) return;
    setIsPending(true);
    try {
      if (confirm === "archive") {
        await skillsApi.archive(skill.id);
        toast.success("Skill archived");
        invalidate();
      } else {
        await skillsApi.delete(skill.id);
        toast.success("Skill deleted");
        router.push("/dashboard/skills");
      }
      setConfirm(null);
    } catch (e) {
      toast.error(confirm === "archive" ? "Archive failed" : "Delete failed", e instanceof Error ? e.message : undefined);
    } finally {
      setIsPending(false);
    }
  };

  if (isLoading) return <SkeletonSkillDetail />;
  if (isError || !skill) {
    return (
      <EmptyState
        title="Skill not found"
        description="This skill does not exist or you do not have access to it."
        action={
          <Link href="/dashboard/skills" className={BTN_SECONDARY_SM}>
            Back to Studio
          </Link>
        }
      />
    );
  }

  const isArchived = skill.status === "ARCHIVED";

  return (
    <div className="w-full space-y-6">
      <Link
        href="/dashboard/skills"
        className="inline-flex rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        Studio
      </Link>

      <PageHeader
        title={skill.name}
        meta={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <StatusBadge status={skill.status} />
            <span className={META}>{plural(skill.versions?.length ?? 0, "version")}</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isArchived && (
              <button type="button" onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending} className={BTN_PRIMARY}>
                {restoreMutation.isPending ? "Restoring" : "Restore skill"}
              </button>
            )}
            {activeVersion && !isArchived && (
              <button
                type="button"
                onClick={runSkill}
                disabled={runMutation.isPending}
                title="Execute through the agent runtime"
                className={BTN_PRIMARY}
              >
                {runMutation.isPending
                  ? "Starting"
                  : draft
                  ? `Run draft v${draft.versionNumber}`
                  : `Run v${activeVersion.versionNumber}`}
              </button>
            )}
            {draft && !isArchived && (
              <button type="button" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className={BTN_SECONDARY}>
                {publishMutation.isPending ? "Publishing" : `Publish v${draft.versionNumber}`}
              </button>
            )}
            <Link href={`/dashboard/canvas/${skill.id}`} className={BTN_SECONDARY} title="Open and edit this workflow on the Agent canvas">
              Open in canvas
            </Link>
          </div>
        }
      />

      <p className="max-w-2xl font-sans text-sm leading-6 text-[var(--text-secondary)]">{skill.purpose}</p>

      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] pb-3">
        {!isArchived && (
          <Link href={`/dashboard/skills/${skill.id}/edit`} className={TEXT_ACTION}>
            Edit draft
          </Link>
        )}
        <Link href={`/dashboard/skills/${skill.id}/versions`} className={TEXT_ACTION}>
          Versions
        </Link>
        <button type="button" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending} className={TEXT_ACTION}>
          Duplicate
        </button>
        {!isArchived && (
          <button type="button" onClick={() => setConfirm("archive")} className={TEXT_ACTION}>
            Archive
          </button>
        )}
        {skill.status !== "PUBLISHED" && !isArchived && (
          <button type="button" onClick={() => setConfirm("delete")} className={clsx(TEXT_ACTION, "hover:!text-[var(--state-error)]")}>
            Delete
          </button>
        )}
      </div>

      {isArchived && (
        <div className={clsx(CARD, "relative flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center")}>
          <span aria-hidden="true" className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-[var(--state-warning)]" />
          <div className="space-y-1">
            <div className="font-sans text-sm font-medium text-[var(--text-primary)]">This skill is archived</div>
            <p className="font-sans text-[13px] text-[var(--text-secondary)]">
              It is hidden from the active workspace. Past executions are kept.
            </p>
          </div>
          <button type="button" onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending} className={BTN_SECONDARY}>
            {restoreMutation.isPending ? "Restoring" : "Restore skill"}
          </button>
        </div>
      )}

      {skill.publishedVersion && !isArchived && (
        <div className={clsx(CARD, "flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center")}>
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-sans text-sm font-medium text-[var(--text-primary)]">
                Published v{skill.publishedVersion.versionNumber} is live
              </span>
              {skill.publishedVersion.graphDefinition && (
                <span className={META}>{plural(skill.publishedVersion.graphDefinition.nodes.length, "node")}</span>
              )}
            </div>
            <p className="font-sans text-[13px] text-[var(--text-secondary)]">
              Ready for production runs and external MCP use.
            </p>
          </div>
          <Link href={`/dashboard/canvas/${skill.id}`} className={BTN_SECONDARY}>
            Open in canvas
          </Link>
        </div>
      )}

      {/* Run input */}
      {activeVersion && !isArchived && (
        <section className={CARD}>
          <div className={CARD_HEAD}>
            <div className="space-y-1">
              <h2 className={CARD_TITLE}>Run input</h2>
              <p className="font-sans text-[13px] text-[var(--text-muted)]">JSON sent to the skill as user input</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setIsJsonModalOpen(true)} className={TEXT_ACTION} title="Open a larger JSON editor">
                Expand
              </button>
              <button
                type="button"
                onClick={() => {
                  setRunInput(getPrefilledExecutionInput(activeVersion));
                  if (runInputError) setRunInputError(null);
                  toast.info("Input reloaded from schema sample");
                }}
                className={TEXT_ACTION}
              >
                Load sample
              </button>
            </div>
          </div>
          <div className="space-y-2 p-5">
            <label htmlFor="run-input" className="sr-only">
              Run input (JSON)
            </label>
            <textarea
              id="run-input"
              value={runInput}
              onChange={(e) => {
                setRunInput(e.target.value);
                if (runInputError) setRunInputError(null);
              }}
              rows={4}
              spellCheck={false}
              placeholder="{ }"
              aria-invalid={Boolean(runInputError)}
              className={clsx(FIELD, "w-full resize-y p-3 font-mono text-xs leading-5", runInputError && "border-[var(--state-error)]")}
            />
            {runInputError && (
              <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
                {runInputError}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Draft */}
      {draft ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className={CARD}>
            <div className={CARD_HEAD}>
              <h2 className={CARD_TITLE}>Draft v{draft.versionNumber}</h2>
              <StatusBadge status={draft.status} />
            </div>

            <div className="space-y-5 p-5">
              <div className="space-y-1">
                <div className={FIELD_LABEL}>Instructions</div>
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-6 text-[var(--text-primary)]">
                  {draft.instructions || "No instructions provided."}
                </p>
              </div>

              <dl className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
                {[
                  { k: "Allowed tools", v: draft.allowedTools.join(", ") || "none" },
                  { k: "Needs approval", v: draft.actionsRequiringApproval.join(", ") || "none" },
                  { k: "Max steps", v: String(draft.maxExecutionSteps) },
                ].map((row) => (
                  <div key={row.k} className="flex items-baseline justify-between gap-4 px-3 py-2">
                    <dt className="font-sans text-[13px] text-[var(--text-muted)]">{row.k}</dt>
                    <dd className="truncate font-mono text-xs text-[var(--text-primary)]">{row.v}</dd>
                  </div>
                ))}
              </dl>

              {draft.notes && (
                <div className="space-y-1">
                  <div className={FIELD_LABEL}>Notes</div>
                  <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">{draft.notes}</p>
                </div>
              )}

              {draft.examples.length > 0 && (
                <div className="space-y-1">
                  <div className={FIELD_LABEL}>Examples ({draft.examples.length})</div>
                  <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">
                    {draft.examples.map((ex, i) => ex.description || `Example ${i + 1}`).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <JsonPreview title="Input schema" value={draft.inputSchema} />
            <JsonPreview title="Output schema" value={draft.outputSchema} />
          </div>
        </div>
      ) : (
        <EmptyState
          title="No draft version"
          description="This skill has no editable draft. Use the editor to create a new draft version."
          action={
            <Link href={`/dashboard/skills/${skill.id}/edit`} className={BTN_SECONDARY_SM}>
              Create a draft
            </Link>
          }
        />
      )}

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm === "archive" ? "Archive skill" : "Delete skill"}
        description={
          confirm === "archive"
            ? `Archive "${skill.name}"? It will be hidden from active lists but preserved.`
            : `Delete "${skill.name}"? This permanently removes the skill and cannot be undone.`
        }
        confirmLabel={confirm === "archive" ? "Archive" : "Delete"}
        variant={confirm === "archive" ? "warning" : "danger"}
        isPending={isPending}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />

      <JsonEditorModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        value={runInput}
        onApply={(updated) => {
          setRunInput(updated);
          if (runInputError) setRunInputError(null);
        }}
        onResetSample={() => {
          const sample = getPrefilledExecutionInput(draft);
          setRunInput(sample);
        }}
      />
    </div>
  );
}
