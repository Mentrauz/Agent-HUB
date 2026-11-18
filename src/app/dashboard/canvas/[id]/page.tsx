"use client";

import React, { use, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skillsApi } from "@/lib/api/skills";
import { executionsApi } from "@/lib/api/executions";
import { AgentGraphCanvas } from "@/components/canvas/AgentGraphCanvas";
import { GraphDiffModal } from "@/components/canvas/GraphDiffModal";
import { diffGraphs } from "@/components/canvas/graphDiff";
import { StatusBadge } from "@/components/skills/StatusBadge";
import { SkeletonSkillDetail } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { toast } from "@/stores/toastStore";
import { AgentGraphDefinition } from "@/types/graph";
import { buildInitialGraphFromSkill } from "@/components/canvas/graphUtils";
import { clsx } from "clsx";
import { getPrefilledExecutionInput } from "@/lib/execution/inputHelper";
import { JsonEditorModal } from "@/components/common/JsonEditorModal";
import { BTN_PRIMARY, BTN_PRIMARY_SM, BTN_SECONDARY, BTN_SECONDARY_SM, FIELD, META, Tag } from "@/components/ui/surfaces";

const menuItemClass =
  "block w-full cursor-pointer px-3 py-2 text-left font-sans text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40";

export default function CanvasEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: skill, isLoading, isError } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => skillsApi.get(id),
  });

  const draft = skill?.currentDraft ?? skill?.publishedVersion ?? skill?.versions?.[0] ?? null;

  // Past runs of this version — powers branch coverage + replay-last-run.
  const { data: pastExecutions = [] } = useQuery({
    queryKey: ["executions", "by-version", draft?.id],
    queryFn: () => executionsApi.list({ skillVersionId: draft!.id, limit: 50 }),
    enabled: Boolean(draft),
  });
  const coveredEdges = useMemo(() => {
    const ids = new Set<string>();
    for (const exec of pastExecutions) {
      const planner = exec.plannerOutput as Record<string, unknown> | null;
      const state = planner?.graph === true ? (planner.state as { traversedEdges?: string[] } | undefined) : undefined;
      for (const id of state?.traversedEdges ?? []) ids.add(id);
    }
    return Array.from(ids);
  }, [pastExecutions]);
  const lastExecution = pastExecutions[0] ?? null;

  // Analytics: aggregate stats across this version's runs.
  const analytics = useMemo(() => {
    const terminal = pastExecutions.filter((e) => e.status === "COMPLETED" || e.status === "FAILED" || e.status === "STEP_LIMIT_EXCEEDED");
    const completed = terminal.filter((e) => e.status === "COMPLETED");
    const durations = terminal.map((e) => e.durationMs ?? 0).filter((d) => d > 0);
    const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return {
      runs: pastExecutions.length,
      successRate: terminal.length ? Math.round((completed.length / terminal.length) * 100) : null,
      avgDurationMs: avgDuration,
      failures: terminal.length - completed.length,
    };
  }, [pastExecutions]);

  const shareSnapshot = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dashboard/canvas/${id}/snapshot`);
      toast.success("Snapshot link copied", "Share it anywhere. It renders read-only.");
    } catch {
      toast.error("Copy failed", "Clipboard unavailable.");
    }
  };

  const [graph, setGraph] = useState<AgentGraphDefinition | null>(null);
  const [runInput, setRunInput] = useState("{\n  \n}");
  const [runInputError, setRunInputError] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [showInputBox, setShowInputBox] = useState(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const [editingSubgraph, setEditingSubgraph] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "unsaved">("synced");
  const [isDirty, setIsDirty] = useState(false);
  // Bumped on every edit — a save only marks the graph clean if no edit landed while it was in flight.
  const editSeqRef = useRef(0);
  // Serialises saves so an older graph can never land after a newer one.
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // Version diff: working graph vs the last published version.
  const publishedGraph = skill?.publishedVersion?.graphDefinition ?? null;
  const graphDiff = useMemo(
    () => (graph && publishedGraph ? diffGraphs(graph, publishedGraph) : null),
    [graph, publishedGraph]
  );

  // Initialize graph state and preloaded input from the draft once it loads.
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (draft && !initialized) {
      setGraph(buildInitialGraphFromSkill(draft, skill?.name));
      setInitialized(true);
    }
  }, [draft, skill?.name, initialized]);

  const handleGraphChange = useCallback((newGraph: AgentGraphDefinition) => {
    editSeqRef.current += 1;
    setGraph(newGraph);
    setIsDirty(true);
    setSyncStatus("unsaved");
  }, []);

  /** Persist a graph to the draft. Shared by auto-sync, manual save and run. Throws on failure. */
  const flushSave = useCallback(
    async (graphToSave: AgentGraphDefinition) => {
      const seq = editSeqRef.current;
      setSyncStatus("saving");
      const save = saveQueueRef.current
        .catch(() => { })
        .then(() => skillsApi.update(id, { graphDefinition: graphToSave }));
      saveQueueRef.current = save;
      try {
        await save;
      } catch (e) {
        setSyncStatus("unsaved");
        throw e;
      }
      if (editSeqRef.current === seq) {
        setIsDirty(false);
        setSyncStatus("synced");
      } else {
        setSyncStatus("unsaved");
      }
      queryClient.invalidateQueries({ queryKey: ["skill", id] });
    },
    [id, queryClient]
  );

  // Debounced Auto-Sync effect
  useEffect(() => {
    if (!isDirty || !graph || !draft) return;
    const timer = setTimeout(() => {
      flushSave(graph).catch(() => { });
    }, 1200);
    return () => clearTimeout(timer);
  }, [graph, isDirty, draft, flushSave]);

  // Don't lose pending edits: warn on tab close, and flush on in-app navigation (unmount).
  const pendingRef = useRef<AgentGraphDefinition | null>(null);
  useEffect(() => {
    pendingRef.current = isDirty ? graph : null;
  }, [isDirty, graph]);
  useEffect(() => {
    if (syncStatus === "synced") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [syncStatus]);
  useEffect(() => {
    return () => {
      if (pendingRef.current) skillsApi.update(id, { graphDefinition: pendingRef.current }).catch(() => { });
    };
  }, [id]);

  // Close the "More" menu on outside click / Escape.
  useEffect(() => {
    if (!showMore) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMore(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [showMore]);

  const hasGraph = graph !== null && graph.nodes.length > 0;

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!graph) throw new Error("Nothing to save");
      return flushSave(graph);
    },
    onSuccess: () => {
      toast.success("Graph synced", "All changes saved to draft.");
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: (e) => toast.error("Save failed", e instanceof Error ? e.message : undefined),
  });

  const runMutation = useMutation({
    mutationFn: async ({ versionId, inputData }: { versionId: string; inputData: Record<string, unknown> }) => {
      // Persist pending edits first so the run executes the graph on screen.
      if (isDirty && graph) await flushSave(graph);
      return executionsApi.start(versionId, inputData);
    },
    onSuccess: (execution) => {
      toast.success("Execution started", "Tracing the graph live…");
      setActiveExecutionId(execution.id);
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (e) => toast.error("Execution failed to start", e.message),
  });

  const replayMutation = useMutation({
    mutationFn: (executionId: string) => executionsApi.replay(executionId),
    onSuccess: (execution) => {
      toast.success("Deterministic replay started", "Replaying recorded LLM outputs — no tokens spent on the model.");
      setActiveExecutionId(execution.id);
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (e) => toast.error("Replay failed", e.message),
  });

  const previewMutation = useMutation({
    mutationFn: ({ versionId, graphDef, inputData }: { versionId: string; graphDef: AgentGraphDefinition; inputData: Record<string, unknown> }) =>
      fetch("/api/canvas/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillVersionId: versionId, graph: graphDef, inputData }),
      }).then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { previewId?: string; error?: string };
        if (!res.ok || !body.previewId) throw new Error(body.error ?? "Preview failed to start");
        return body.previewId;
      }),
    onSuccess: (previewId) => {
      toast.success("Ghost preview started", "Dry-running the graph — nothing is persisted.");
      setActivePreviewId(previewId);
    },
    onError: (e) => toast.error("Preview failed", e.message),
  });

  /** Parse the JSON input editor — shared by run + preview. Returns null on error (toasted). */
  const parseInput = (): Record<string, unknown> | null => {
    try {
      const trimmed = runInput.trim();
      const inputData = trimmed ? JSON.parse(trimmed) : {};
      if (Array.isArray(inputData) || inputData === null || typeof inputData !== "object") {
        throw new Error("Must be a JSON object");
      }
      setRunInputError(null);
      return inputData;
    } catch (err) {
      setRunInputError(err instanceof Error ? err.message : "Invalid JSON input payload");
      return null;
    }
  };

  const handleRun = () => {
    if (!draft) return;
    if (!hasGraph) {
      toast.error("Empty graph", "Add at least a START and END node before running.");
      return;
    }
    const inputData = parseInput();
    if (!inputData) return;
    runMutation.mutate({ versionId: draft.id, inputData });
  };

  const handlePreview = () => {
    if (!draft) return;
    if (!hasGraph) {
      toast.error("Empty graph", "Add at least a START and END node before previewing.");
      return;
    }
    const inputData = parseInput();
    if (!inputData) return;
    previewMutation.mutate({ versionId: draft.id, graphDef: graph!, inputData });
  };

  const tracing = Boolean(activeExecutionId) || Boolean(activePreviewId);

  if (isLoading) return <SkeletonSkillDetail />;
  if (isError || !skill || !draft) {
    return (
      <EmptyState
        title="Agent graph not found"
        description="This graph does not exist or you do not have access to it."
        action={
          <Link href="/dashboard/canvas" className={BTN_SECONDARY}>
            Back to canvas
          </Link>
        }
      />
    );
  }

  const canDiff = Boolean(publishedGraph && graphDiff && !tracing);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-col items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/dashboard/canvas"
              className="rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              Agent canvas
            </Link>
            <h1 className="truncate font-sans text-xl font-medium text-[var(--text-primary)]">{skill.name}</h1>
            <StatusBadge status={skill.status} />
            {syncStatus === "saving" && <Tag tone="warn">Saving</Tag>}
            {syncStatus === "unsaved" && <Tag tone="accent">Unsaved</Tag>}
            {syncStatus === "synced" && <Tag tone="good">Saved</Tag>}
          </div>
          <p className={clsx(META, "truncate")}>
            draft v{draft.versionNumber} · {graph?.nodes.length ?? 0} nodes · {graph?.edges.length ?? 0} edges
            {analytics.runs > 0 && (
              <>
                {" · "}
                {analytics.runs} runs · {analytics.successRate === null ? "no" : `${analytics.successRate}%`} success · avg{" "}
                {analytics.avgDurationMs >= 1000 ? `${(analytics.avgDurationMs / 1000).toFixed(1)}s` : `${Math.round(analytics.avgDurationMs)}ms`}
                {" · "}
                <span className={analytics.failures > 0 ? "text-[var(--state-error)]" : undefined}>{analytics.failures} failures</span>
              </>
            )}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:w-auto lg:justify-end">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasGraph || Boolean(activeExecutionId) || editingSubgraph}
            className={BTN_SECONDARY_SM}
          >
            {saveMutation.isPending ? "Saving" : "Save graph"}
          </button>

          {lastExecution && !tracing && (
            <button
              type="button"
              onClick={() => replayMutation.mutate(lastExecution.id)}
              disabled={replayMutation.isPending || !hasGraph || editingSubgraph}
              className={BTN_SECONDARY_SM}
              title="Re-run the last execution deterministically"
            >
              {replayMutation.isPending ? "Starting" : "Replay"}
            </button>
          )}

          <button
            type="button"
            onClick={handlePreview}
            disabled={previewMutation.isPending || !hasGraph || tracing || editingSubgraph}
            className={BTN_SECONDARY_SM}
            title="Dry-run the graph without persisting anything"
          >
            {previewMutation.isPending ? "Starting" : "Ghost preview"}
          </button>

          <button
            type="button"
            onClick={handleRun}
            disabled={runMutation.isPending || !hasGraph || tracing || editingSubgraph}
            className={BTN_PRIMARY_SM}
          >
            {runMutation.isPending ? "Starting" : "Run graph"}
          </button>

          {activeExecutionId && (
            <Link href={`/dashboard/executions/${activeExecutionId}`} className={BTN_SECONDARY_SM}>
              Full trace
            </Link>
          )}

          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              className={BTN_SECONDARY_SM}
              aria-haspopup="menu"
              aria-expanded={showMore}
            >
              More
            </button>
            {showMore && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
              >
                <Link
                  href={`/dashboard/skills/${skill.id}/edit`}
                  role="menuitem"
                  className={menuItemClass}
                  title="Open the classic form editor for this skill"
                  onClick={() => setShowMore(false)}
                >
                  Form editor
                </Link>
                {canDiff && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowDiff(true);
                      setShowMore(false);
                    }}
                    className={menuItemClass}
                    title="Visual diff against the published version"
                  >
                    Diff against published
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    shareSnapshot();
                    setShowMore(false);
                  }}
                  disabled={!hasGraph || tracing}
                  className={menuItemClass}
                  title="Copy a read-only snapshot link"
                >
                  Copy snapshot link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!tracing && (
        <div className="shrink-0 space-y-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 font-sans text-[13px] text-[var(--text-muted)]">Input</span>
            <button
              type="button"
              onClick={() => setIsJsonModalOpen(true)}
              className="min-w-0 flex-1 cursor-pointer truncate rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-1 text-left font-mono text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              title="Open the JSON editor"
            >
              {runInput.replace(/\s+/g, " ").slice(0, 120) || "{ }"}
            </button>
            <button type="button" onClick={() => setIsJsonModalOpen(true)} className={clsx(BTN_SECONDARY_SM, "shrink-0")}>
              Expand
            </button>
            <button
              type="button"
              onClick={() => setShowInputBox((p) => !p)}
              aria-expanded={showInputBox}
              className={clsx(BTN_SECONDARY_SM, "shrink-0")}
            >
              {showInputBox ? "Hide box" : "Show box"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunInput(getPrefilledExecutionInput(draft));
                if (runInputError) setRunInputError(null);
                toast.info("Input reloaded from schema sample");
              }}
              className={clsx(BTN_SECONDARY_SM, "shrink-0")}
              title="Reload input from the schema sample"
            >
              Sample
            </button>
          </div>

          {showInputBox && (
            <textarea
              value={runInput}
              onChange={(e) => {
                setRunInput(e.target.value);
                if (runInputError) setRunInputError(null);
              }}
              rows={3}
              spellCheck={false}
              aria-label="Run input JSON"
              placeholder="{ }"
              className={clsx(FIELD, "w-full resize-y p-3 font-mono text-xs", runInputError && "border-[var(--state-error)]")}
            />
          )}
          {runInputError && (
            <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
              Invalid JSON: {runInputError}
            </p>
          )}
        </div>
      )}

      <div className="min-h-[420px] flex-1">
        <AgentGraphCanvas
          graph={graph}
          onChange={handleGraphChange}
          executionId={activeExecutionId ?? activePreviewId}
          mode={activePreviewId ? "preview" : "execution"}
          coverage={coveredEdges}
          onSubgraphEdit={setEditingSubgraph}
          traceHeaderExtra={
            tracing ? (
              <button
                type="button"
                onClick={() => {
                  setActiveExecutionId(null);
                  setActivePreviewId(null);
                }}
                className={BTN_SECONDARY_SM}
              >
                Back to edit
              </button>
            ) : undefined
          }
        />
      </div>

      {showDiff && publishedGraph && graphDiff && (
        <GraphDiffModal
          diff={graphDiff}
          baseLabel={`v${skill.publishedVersion?.versionNumber ?? "?"}`}
          onClose={() => setShowDiff(false)}
        />
      )}

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
