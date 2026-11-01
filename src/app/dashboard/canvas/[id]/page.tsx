"use client";

import React, { use, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Play,
  Loader2,
  ExternalLink,
  Pencil,
  RefreshCw,
  Network,
  Ghost,
  History,
  Share2,
  GitBranch,
  Check,
  MoreHorizontal,
} from "lucide-react";
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
import { Maximize2, ChevronDown, ChevronUp } from "lucide-react";

const menuItemClass =
  "w-full inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left";

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
      toast.success("Snapshot link copied", "Share it anywhere — it renders read-only.");
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
          <Link
            href="/dashboard/canvas"
            className="px-4 py-2 rounded border border-indigo-400 bg-indigo-600 text-white text-xs font-mono font-semibold hover:bg-indigo-500 transition-all cursor-pointer"
          >
            [ BACK TO CANVAS ]
          </Link>
        }
      />
    );
  }

  const canDiff = Boolean(publishedGraph && graphDiff && !tracing);

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 border-b border-slate-200 dark:border-indigo-950/80 pb-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/canvas"
            className="p-2 rounded border border-slate-200 dark:border-indigo-900/50 hover:border-indigo-400 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
            title="Back to canvas gallery"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-pixel text-pixel-glow uppercase tracking-wide truncate">
                {skill.name}
              </h1>
              <StatusBadge status={skill.status} />
              {syncStatus === "saving" && (
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 inline-flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> SAVING…
                </span>
              )}
              {syncStatus === "unsaved" && (
                <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> UNSAVED
                </span>
              )}
              {syncStatus === "synced" && (
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 inline-flex items-center gap-1">
                  <Check className="h-2.5 w-2.5 text-emerald-500" /> AUTO-SYNCED
                </span>
              )}
              {hasGraph && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold border border-violet-200 dark:border-violet-500/40 inline-flex items-center gap-1">
                  <Network className="h-3 w-3" /> GRAPH
                </span>
              )}
            </div>
            {/* Subtitle: graph shape + run analytics for this version */}
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 truncate font-mono">
              draft v{draft.versionNumber} · {graph?.nodes.length ?? 0} nodes · {graph?.edges.length ?? 0} edges
              {analytics.runs > 0 && (
                <>
                  {" · "}runs <b className="text-slate-900 dark:text-slate-100">{analytics.runs}</b>
                  {" · "}success{" "}
                  <b className={clsx(analytics.successRate !== null && analytics.successRate >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {analytics.successRate === null ? "—" : `${analytics.successRate}%`}
                  </b>
                  {" · "}avg{" "}
                  <b className="text-slate-900 dark:text-slate-100">
                    {analytics.avgDurationMs >= 1000 ? `${(analytics.avgDurationMs / 1000).toFixed(1)}s` : `${Math.round(analytics.avgDurationMs)}ms`}
                  </b>
                  {" · "}failures{" "}
                  <b className={analytics.failures > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}>{analytics.failures}</b>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono w-full lg:w-auto justify-start lg:justify-end">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasGraph || Boolean(activeExecutionId) || editingSubgraph}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded border border-cyan-400 bg-cyan-600 text-white text-[11px] font-bold hover:bg-cyan-500 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
          >
            {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save Graph
          </button>

          {lastExecution && !tracing && (
            <button
              type="button"
              onClick={() => replayMutation.mutate(lastExecution.id)}
              disabled={replayMutation.isPending || !hasGraph || editingSubgraph}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded border border-emerald-400 bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-500 shadow-sm transition-all cursor-pointer disabled:opacity-40"
              title="Re-run the last execution deterministically"
            >
              {replayMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <History className="h-3 w-3" />}
              Replay
            </button>
          )}

          <button
            type="button"
            onClick={handlePreview}
            disabled={previewMutation.isPending || !hasGraph || tracing || editingSubgraph}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded border border-violet-400 bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-500 shadow-sm transition-all cursor-pointer disabled:opacity-40"
            title="Dry-run the graph without persisting anything"
          >
            {previewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ghost className="h-3 w-3" />}
            Ghost Preview
          </button>

          <button
            type="button"
            onClick={handleRun}
            disabled={runMutation.isPending || !hasGraph || tracing || editingSubgraph}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded border border-indigo-400 bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-500 shadow-md shadow-indigo-500/30 transition-all cursor-pointer disabled:opacity-40"
          >
            {runMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run Graph
          </button>

          {activeExecutionId && (
            <Link
              href={`/dashboard/executions/${activeExecutionId}`}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded border border-emerald-400 bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-500 transition-all shadow-sm"
            >
              <ExternalLink className="h-3 w-3" /> Full Trace
            </Link>
          )}

          {/* Secondary actions */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              className="inline-flex items-center justify-center px-2 py-1.5 rounded border border-slate-300 dark:border-indigo-900/50 bg-slate-50 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700 transition-all cursor-pointer"
              title="More actions"
              aria-haspopup="menu"
              aria-expanded={showMore}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showMore && (
              <div role="menu" className="absolute right-0 top-9 z-50 w-48 py-1 rounded-lg border border-slate-200 dark:border-indigo-900/60 bg-white dark:bg-[#0c0d18] shadow-xl">
                <Link
                  href={`/dashboard/skills/${skill.id}/edit`}
                  role="menuitem"
                  className={menuItemClass}
                  title="Open the classic form editor for this skill"
                  onClick={() => setShowMore(false)}
                >
                  <Pencil className="h-3 w-3" /> Form Editor
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
                    <GitBranch className="h-3 w-3" /> Diff vs published
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
                  <Share2 className="h-3 w-3" /> Copy snapshot link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution input bar */}
      {!tracing && (
        <div className="shrink-0 rounded-lg border border-slate-200 dark:border-indigo-900/40 bg-white/95 dark:bg-[#0c0d16]/90 px-2.5 py-1.5 space-y-1.5 shadow-xs backdrop-blur-xs font-mono">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 shrink-0">
              <Play className="h-3 w-3 text-emerald-500 fill-emerald-500/20" /> INPUT:
            </span>
            <div
              onClick={() => setIsJsonModalOpen(true)}
              className="flex-1 min-w-0 px-3 py-1 rounded bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-indigo-950/60 text-[11px] text-slate-700 dark:text-slate-300 truncate cursor-pointer hover:border-indigo-400 transition-colors"
              title="Click to expand full JSON editor"
            >
              {runInput.replace(/\s+/g, " ").slice(0, 120) || "{ }"}
            </div>
            <button
              type="button"
              onClick={() => setIsJsonModalOpen(true)}
              className="shrink-0 p-1.5 rounded border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all cursor-pointer"
              title="Expand fullscreen JSON editor"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowInputBox((p) => !p)}
              className="shrink-0 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title={showInputBox ? "Hide raw text box" : "Show inline raw text box"}
            >
              {showInputBox ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunInput(getPrefilledExecutionInput(draft));
                if (runInputError) setRunInputError(null);
                toast.info("Input reloaded from schema sample");
              }}
              className="shrink-0 px-1.5 py-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              title="Reload input from the schema sample"
            >
              ↻ Sample
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
              placeholder="{ }"
              className={`w-full rounded border bg-white dark:bg-black/60 px-3 py-2 text-[11px] text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none transition-colors resize-y shadow-inner ${runInputError ? "border-red-500" : "border-slate-300 dark:border-indigo-900/50 focus:border-indigo-500"
                }`}
            />
          )}
          {runInputError && (
            <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold">[ JSON ERROR ] {runInputError}</p>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 min-h-[420px]">
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
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-500/50 text-[9px] text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> BACK TO EDIT
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
