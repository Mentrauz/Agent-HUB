"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Check,
  X,
  Clock,
  Loader2,
  Shield,
  GitBranch,
  Repeat,
  Target,
  Wrench,
  Brain,
  Plug,
  ChevronDown,
  ChevronUp,
  Network,
  ArrowRight,
  Activity,
  PanelRightClose,
  Download,
  FileJson,
  FileText,
  Search,
} from "lucide-react";
import { clsx } from "clsx";
import type { ExecutionEvent, GraphNodeStatus } from "@/modules/graph/eventBus";
import { CANVAS_NODE_TYPE_MAP } from "./nodeTypes";
import { GraphNodeType } from "@/types/graph";

// ─── Timeline Step: one node execution lifecycle ───
interface TimelineStep {
  /** Stable per-execution id (a node can run many times, e.g. in loops). */
  key: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: GraphNodeStatus;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  detail?: string;
  error?: string;
  subEvents: SubEvent[];
}

interface SubEvent {
  at: number;
  type: string;
  label: string;
  detail?: string;
  status?: string;
  color: string;
}

// ─── Build timeline steps from ordered events ───
function buildTimeline(events: ExecutionEvent[]): TimelineStep[] {
  const stepMap = new Map<string, TimelineStep>();
  const ordered: TimelineStep[] = [];

  for (const ev of events) {
    switch (ev.type) {
      case "node:start": {
        const step: TimelineStep = {
          key: `${ev.nodeId}#${ordered.length}`,
          nodeId: ev.nodeId,
          nodeLabel: ev.nodeLabel,
          nodeType: ev.nodeType,
          status: "RUNNING",
          startedAt: ev.at,
          subEvents: [],
        };
        stepMap.set(ev.nodeId, step);
        ordered.push(step);
        break;
      }
      case "node:end": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.status = ev.status;
          step.endedAt = ev.at;
          step.durationMs = ev.durationMs;
          step.detail = ev.detail;
          step.error = ev.error;
        }
        break;
      }
      case "tool:call:start": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "tool:start",
            label: `Tool: ${ev.toolName}`,
            detail: ev.action ? `action: ${ev.action}` : undefined,
            status: "RUNNING",
            color: "text-[var(--text-secondary)]",
          });
        }
        break;
      }
      case "tool:call:end": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          const lastTool = [...step.subEvents].reverse().find((s) => s.type === "tool:start" && s.label === `Tool: ${ev.toolName}`);
          if (lastTool) {
            lastTool.status = ev.status;
            lastTool.detail = ev.durationMs ? `${ev.durationMs}ms` : ev.status;
          } else {
            step.subEvents.push({
              at: ev.at,
              type: "tool:end",
              label: `Tool: ${ev.toolName}`,
              detail: ev.durationMs ? `${ev.durationMs}ms` : ev.status,
              status: ev.status,
              color: ev.status === "SUCCESS" ? "text-[var(--state-success)]" : "text-[var(--state-error)]",
            });
          }
        }
        break;
      }
      case "llm:call:start": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "llm:start",
            label: `LLM: ${ev.model ?? "model"}`,
            detail: ev.tokenEstimate ? `~${ev.tokenEstimate} tokens` : undefined,
            status: "RUNNING",
            color: "text-[var(--text-secondary)]",
          });
        }
        break;
      }
      case "llm:call:end": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          const parts: string[] = [];
          if (ev.inputTokens) parts.push(`↑${ev.inputTokens}`);
          if (ev.outputTokens) parts.push(`↓${ev.outputTokens}`);
          if (ev.durationMs) parts.push(`${ev.durationMs}ms`);
          const lastLlm = [...step.subEvents].reverse().find((s) => s.type === "llm:start");
          if (lastLlm) {
            lastLlm.status = ev.status;
            lastLlm.detail = parts.join(" ") || ev.status;
          } else {
            step.subEvents.push({
              at: ev.at,
              type: "llm:end",
              label: `LLM: ${ev.model ?? "model"}`,
              detail: parts.join(" ") || ev.status,
              status: ev.status,
              color: ev.status === "SUCCESS" ? "text-[var(--state-success)]" : "text-[var(--state-error)]",
            });
          }
        }
        break;
      }
      case "mcp:tool:start": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "mcp:start",
            label: `MCP: ${ev.toolName}`,
            detail: `server: ${ev.serverId}`,
            status: "RUNNING",
            color: "text-[var(--text-secondary)]",
          });
        }
        break;
      }
      case "mcp:tool:end": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          const lastMcp = [...step.subEvents].reverse().find((s) => s.type === "mcp:start");
          if (lastMcp) {
            lastMcp.status = ev.status;
            lastMcp.detail = ev.durationMs ? `${ev.durationMs}ms` : ev.status;
          }
        }
        break;
      }
      case "router:decision": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "router",
            label: `→ ${ev.chosenLabel}`,
            detail: ev.mode === "ai" ? `AI: ${ev.reason ?? "model chose"}` : `condition: ${ev.reason ?? "matched"}`,
            color: "text-[var(--state-warning)]",
          });
        }
        break;
      }
      case "loop:iteration": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "loop",
            label: ev.exited ? `Exited after ${ev.iteration} iterations` : `Iteration ${ev.iteration}/${ev.maxIterations}`,
            color: ev.exited ? "text-[var(--text-muted)]" : "text-[var(--accent-primary)]",
          });
        }
        break;
      }
      case "parallel:branch": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "parallel",
            label: `${ev.status === "started" ? "Branch started" : "Branch completed"}: ${ev.branchNodeId}`,
            detail: ev.mode,
            status: ev.status === "started" ? "RUNNING" : "SUCCESS",
            color: "text-[var(--text-secondary)]",
          });
        }
        break;
      }
      case "approval:requested": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "approval:request",
            label: "Approval requested",
            detail: ev.reason,
            status: "AWAITING_APPROVAL",
            color: "text-[var(--state-warning)]",
          });
        }
        break;
      }
      case "approval:resolved": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          step.subEvents.push({
            at: ev.at,
            type: "approval:resolved",
            label: `Decision: ${ev.decision}`,
            detail: ev.resolvedBy ? `by ${ev.resolvedBy}` : undefined,
            status: ev.decision === "APPROVED" ? "SUCCESS" : "FAILED",
            color: ev.decision === "APPROVED" ? "text-[var(--state-success)]" : "text-[var(--state-error)]",
          });
        }
        break;
      }
      case "a2a:task:delegated": {
        const step = stepMap.get(ev.nodeId);
        if (step) {
          const parts: string[] = [ev.status];
          if (ev.durationMs) parts.push(`${ev.durationMs}ms`);
          if (ev.tokensUsed) parts.push(`${ev.tokensUsed} tok`);
          step.subEvents.push({
            at: ev.at,
            type: "a2a",
            label: `A2A: ${ev.capability ?? "task"}`,
            detail: parts.join(" · "),
            status: ev.status === "COMPLETED" ? "SUCCESS" : ev.status === "FAILED" ? "FAILED" : "RUNNING",
            color: "text-[var(--text-secondary)]",
          });
        }
        break;
      }
      case "edge:traverse": {
        // Skip — edge traversals are shown implicitly via node sequence
        break;
      }
      default:
        break;
    }
  }

  return ordered;
}

// ─── Status Filter Config (static Tailwind classes for JIT) ───
const STATUS_FILTER_CONFIG: Array<{
  status: GraphNodeStatus;
  label: string;
  activeClasses: string;
  icon: React.ReactNode;
}> = [
  {
    status: "RUNNING",
    label: "RUNNING",
    activeClasses: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
    icon: <Loader2 className="h-2 w-2 animate-spin" />,
  },
  {
    status: "SUCCESS",
    label: "SUCCESS",
    activeClasses: "border-[var(--state-success)]/40 bg-[var(--state-success)]/10 text-[var(--state-success)]",
    icon: <Check className="h-2 w-2" />,
  },
  {
    status: "FAILED",
    label: "FAILED",
    activeClasses: "border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]",
    icon: <X className="h-2 w-2" />,
  },
  {
    status: "AWAITING_APPROVAL",
    label: "AWAITING",
    activeClasses: "border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
    icon: <Shield className="h-2 w-2" />,
  },
  {
    status: "SKIPPED",
    label: "SKIPPED",
    activeClasses: "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
    icon: <Clock className="h-2 w-2" />,
  },
];

// ─── Export Functions ───

interface TimelineExportJSON {
  exportedAt: string;
  totalSteps: number;
  totalDurationMs: number;
  steps: Array<{
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    status: string;
    startedAt: string;
    endedAt?: string;
    durationMs?: number;
    detail?: string;
    error?: string;
    subEvents: Array<{
      at: string;
      type: string;
      label: string;
      detail?: string;
      status?: string;
    }>;
  }>;
}

function exportTimelineAsJSON(steps: TimelineStep[]): void {
  const totalDuration = steps.length > 0 && steps[0].startedAt
    ? (steps[steps.length - 1].endedAt ?? Date.now()) - steps[0].startedAt
    : 0;

  const exportData: TimelineExportJSON = {
    exportedAt: new Date().toISOString(),
    totalSteps: steps.length,
    totalDurationMs: totalDuration,
    steps: steps.map((s) => ({
      nodeId: s.nodeId,
      nodeLabel: s.nodeLabel,
      nodeType: s.nodeType,
      status: s.status,
      startedAt: new Date(s.startedAt).toISOString(),
      endedAt: s.endedAt ? new Date(s.endedAt).toISOString() : undefined,
      durationMs: s.durationMs,
      detail: s.detail,
      error: s.error,
      subEvents: s.subEvents.map((e) => ({
        at: new Date(e.at).toISOString(),
        type: e.type,
        label: e.label,
        detail: e.detail,
        status: e.status,
      })),
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `execution-timeline-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTimelineAsMarkdown(steps: TimelineStep[]): void {
  const totalDuration = steps.length > 0 && steps[0].startedAt
    ? (steps[steps.length - 1].endedAt ?? Date.now()) - steps[0].startedAt
    : 0;

  const succeeded = steps.filter((s) => s.status === "SUCCESS").length;
  const failed = steps.filter((s) => s.status === "FAILED").length;
  const lines: string[] = [];

  lines.push("# Execution Timeline Report");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Total Steps:** ${steps.length}`);
  lines.push(`**Duration:** ${formatDuration(totalDuration)}`);
  lines.push(`**Result:** ${succeeded} succeeded, ${failed} failed`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Steps");
  lines.push("");

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const statusEmoji = step.status === "SUCCESS" ? "✅" : step.status === "FAILED" ? "❌" : step.status === "RUNNING" ? "🔄" : step.status === "AWAITING_APPROVAL" ? "⏳" : "⏭️";

    lines.push(`### ${i + 1}. ${statusEmoji} ${step.nodeLabel}`);
    lines.push("");
    lines.push(`- **Node ID:** \`${step.nodeId}\``);
    lines.push(`- **Type:** ${step.nodeType}`);
    lines.push(`- **Status:** ${step.status}`);
    lines.push(`- **Started:** ${new Date(step.startedAt).toISOString()}`);
    if (step.endedAt) lines.push(`- **Ended:** ${new Date(step.endedAt).toISOString()}`);
    if (step.durationMs !== undefined) lines.push(`- **Duration:** ${formatDuration(step.durationMs)}`);
    if (step.detail) lines.push(`- **Detail:** ${step.detail}`);
    if (step.error) lines.push(`- **Error:** ${step.error}`);

    if (step.subEvents.length > 0) {
      lines.push("");
      lines.push("#### Sub-Events");
      lines.push("");
      lines.push("| Time | Event | Detail | Status |");
      lines.push("|------|-------|--------|--------|");

      for (const sub of step.subEvents) {
        const time = new Date(sub.at).toISOString().slice(11, 19);
        lines.push(`| ${time} | ${sub.label} | ${sub.detail || "—"} | ${sub.status || "—"} |`);
      }
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `execution-timeline-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ───
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function statusIcon(status: GraphNodeStatus, _isRunning?: boolean) {
  switch (status) {
    case "RUNNING":
      return <Loader2 className="h-3 w-3 animate-spin text-[var(--text-secondary)]" />;
    case "SUCCESS":
      return <Check className="h-3 w-3 text-[var(--state-success)]" />;
    case "FAILED":
      return <X className="h-3 w-3 text-[var(--state-error)]" />;
    case "AWAITING_APPROVAL":
      return <Shield className="h-3 w-3 text-[var(--state-warning)]" />;
    case "SKIPPED":
      return <Clock className="h-3 w-3 text-[var(--text-muted)]" />;
    default:
      return <Clock className="h-3 w-3 text-[var(--text-muted)]" />;
  }
}

function statusColor(status: GraphNodeStatus): string {
  switch (status) {
    case "RUNNING":
      return "border-[var(--border-subtle)] bg-[var(--cta-primary-bg)]/5";
    case "SUCCESS":
      return "border-[var(--state-success)]/40 bg-[var(--state-success)]/5";
    case "FAILED":
      return "border-[var(--state-error)]/40 bg-[var(--state-error)]/5";
    case "AWAITING_APPROVAL":
      return "border-[var(--state-warning)]/40 bg-[var(--state-warning)]/5";
    case "SKIPPED":
      return "border-[var(--border-strong)] bg-[var(--surface-elevated)]/5";
    default:
      return "border-[var(--border-strong)]";
  }
}

function statusDotColor(status: GraphNodeStatus): string {
  switch (status) {
    case "RUNNING":
      return "bg-[var(--cta-primary-bg)]";
    case "SUCCESS":
      return "bg-[var(--state-success)]";
    case "FAILED":
      return "bg-[var(--state-error)]";
    case "AWAITING_APPROVAL":
      return "bg-[var(--state-warning)]";
    default:
      return "bg-[var(--surface-elevated)]";
  }
}

// ─── SubEvent Icon ───
function subEventIcon(type: string) {
  switch (type) {
    case "tool:start":
    case "tool:end":
      return <Wrench className="h-2.5 w-2.5" />;
    case "llm:start":
    case "llm:end":
      return <Brain className="h-2.5 w-2.5" />;
    case "mcp:start":
      return <Plug className="h-2.5 w-2.5" />;
    case "router":
      return <GitBranch className="h-2.5 w-2.5" />;
    case "loop":
      return <Repeat className="h-2.5 w-2.5" />;
    case "parallel":
      return <Target className="h-2.5 w-2.5" />;
    case "approval:request":
    case "approval:resolved":
      return <Shield className="h-2.5 w-2.5" />;
    case "a2a":
      return <Network className="h-2.5 w-2.5" />;
    default:
      return <Activity className="h-2.5 w-2.5" />;
  }
}

// ─── Props ───
interface ExecutionTimelineProps {
  /** Full ordered event log from the trace. */
  events: ExecutionEvent[];
  /** Per-node statuses. */
  nodeStatuses: Record<string, GraphNodeStatus>;
  /** Whether the execution is still running. */
  isRunning: boolean;
  /** Called to focus a node on the canvas. */
  onNodeClick?: (nodeId: string) => void;
  /** Hide the timeline panel. */
  onClose?: () => void;
}

export function ExecutionTimeline({
  events,
  nodeStatuses: _nodeStatuses,
  isRunning,
  onNodeClick,
  onClose,
}: ExecutionTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => buildTimeline(events), [events]);

  // ─── Search & Filter State ───
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<GraphNodeStatus>>(new Set());
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  // Collect unique node types from steps
  const availableTypes = useMemo(() => {
    const types = new Map<string, number>();
    for (const s of steps) {
      types.set(s.nodeType, (types.get(s.nodeType) || 0) + 1);
    }
    return Array.from(types.entries()).sort((a, b) => b[1] - a[1]);
  }, [steps]);

  // Filter steps
  const filteredSteps = useMemo(() => {
    return steps.filter((step) => {
      // Status filter
      if (statusFilters.size > 0 && !statusFilters.has(step.status)) return false;

      // Type filter
      if (typeFilters.size > 0 && !typeFilters.has(step.nodeType)) return false;

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          step.nodeLabel,
          step.nodeId,
          step.nodeType,
          step.detail || "",
          step.error || "",
          ...step.subEvents.map((e) => `${e.label} ${e.detail || ""}`),
        ].join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [steps, searchQuery, statusFilters, typeFilters]);

  const toggleStatusFilter = (status: GraphNodeStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilters(new Set());
    setTypeFilters(new Set());
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilters.size > 0 || typeFilters.size > 0;

  // Close type menu on outside click
  useEffect(() => {
    if (!showTypeFilter) return;
    const handleClick = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTypeFilter]);

  // Auto-expand running steps
  useEffect(() => {
    if (!isRunning) return;
    const runningIds = steps.filter((s) => s.status === "RUNNING").map((s) => s.key);
    if (runningIds.length > 0) {
      setExpandedSteps((prev) => {
        const next = new Set(prev);
        for (const id of runningIds) next.add(id);
        return next;
      });
    }
  }, [steps, isRunning]);

  // Auto-scroll to the latest step (only when not filtering)
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    if (hasActiveFilters) return; // Don't auto-scroll when user is filtering
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [steps, autoScroll, hasActiveFilters]);

  const toggleExpand = (stepKey: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) next.delete(stepKey);
      else next.add(stepKey);
      return next;
    });
  };

  const expandAll = () => setExpandedSteps(new Set(filteredSteps.map((s) => s.key)));
  const collapseAll = () => setExpandedSteps(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showExportMenu]);

  const completedSteps = steps.filter((s) => s.status === "SUCCESS" || s.status === "FAILED" || s.status === "SKIPPED");
  const filteredCompleted = filteredSteps.filter((s) => s.status === "SUCCESS" || s.status === "FAILED" || s.status === "SKIPPED");
  const totalDuration = steps.length > 0 && steps[0].startedAt
    ? (steps[steps.length - 1].endedAt ?? Date.now()) - steps[0].startedAt
    : 0;

  return (
    <div className="h-full flex flex-col font-mono">
      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Timeline
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-0.5 rounded hover:bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              <PanelRightClose className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes, types, events…"
            className="w-full pl-6 pr-6 py-1 text-xs rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-1 mb-1.5">
          {STATUS_FILTER_CONFIG.map(({ status, label, activeClasses, icon }) => {
            const count = steps.filter((s) => s.status === status).length;
            const active = statusFilters.has(status);
            if (count === 0 && !active) return null;
            return (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={clsx(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                  active
                    ? activeClasses
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                )}
              >
                {icon}
                {label}
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}

          {/* Node type filter */}
          {availableTypes.length > 0 && (
            <div className="relative" ref={typeMenuRef}>
              <button
                onClick={() => setShowTypeFilter((p) => !p)}
                className={clsx(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                  typeFilters.size > 0
                    ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                )}
              >
                TYPE
                {typeFilters.size > 0 && <span>{typeFilters.size}</span>}
                <ChevronDown className="h-2 w-2" />
              </button>
              {showTypeFilter && (
                <div className="absolute left-0 top-5 z-50 w-44 max-h-40 overflow-y-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                  {typeFilters.size > 0 && (
                    <button
                      onClick={() => setTypeFilters(new Set())}
                      className="w-full text-left px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] cursor-pointer"
                    >
                      Clear all types
                    </button>
                  )}
                  {availableTypes.map(([type, count]) => (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={clsx(
                        "w-full flex items-center justify-between px-2 py-1.5 text-left transition-colors cursor-pointer",
                        typeFilters.has(type)
                          ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "hover:bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                      )}
                    >
                      <span className="text-xs font-medium truncate">{type}</span>
                      <span className="text-xs opacity-50">{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border border-[var(--state-error)]/25 text-[var(--state-error)] hover:bg-[var(--state-error)]/10 transition-colors cursor-pointer"
            >
              <X className="h-2 w-2" /> Clear
            </button>
          )}
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[var(--text-muted)]">
            {hasActiveFilters ? (
              <>{filteredCompleted.length}/{filteredSteps.length} of {steps.length} steps</>
            ) : (
              <>{completedSteps.length}/{steps.length} steps</>
            )}
          </span>
          {totalDuration > 0 && (
            <span className="text-[var(--text-muted)]">
              {formatDuration(totalDuration)}
            </span>
          )}
          {isRunning && (
            <span className="flex items-center gap-1 text-[var(--text-secondary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--cta-primary-bg)]" />
              LIVE
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 mt-1.5">
          <button
            onClick={expandAll}
            className="px-1.5 py-0.5 text-xs font-medium rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="px-1.5 py-0.5 text-xs font-medium rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            Collapse
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setAutoScroll((p) => !p)}
            className={clsx(
              "px-1.5 py-0.5 text-xs font-medium rounded border transition-colors cursor-pointer",
              autoScroll
                ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-muted)]"
            )}
          >
            {autoScroll ? "Auto-scroll" : "Scroll off"}
          </button>
          {/* Export dropdown */}
          {steps.length > 0 && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu((p) => !p)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--state-success)]/40 hover:text-[var(--state-success)] transition-colors cursor-pointer"
                title="Export timeline"
              >
                <Download className="h-2.5 w-2.5" /> Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-6 z-50 w-40 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] overflow-hidden">
                  <button
                    onClick={() => { exportTimelineAsJSON(steps); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                  >
                    <FileJson className="h-3 w-3 text-[var(--text-secondary)]" />
                    <div>
                      <div className="text-xs font-medium text-[var(--text-secondary)]">JSON Trace</div>
                      <div className="text-xs text-[var(--text-muted)]">Structured data with timestamps</div>
                    </div>
                  </button>
                  <div className="h-px bg-[var(--surface-sunken)]" />
                  <button
                    onClick={() => { exportTimelineAsMarkdown(steps); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                  >
                    <FileText className="h-3 w-3 text-[var(--state-success)]" />
                    <div>
                      <div className="text-xs font-medium text-[var(--text-secondary)]">Markdown report</div>
                      <div className="text-xs text-[var(--text-muted)]">Formatted with tables &amp; headers</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timeline Steps */}          <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-0 scrollbar-thin">
        {filteredSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Activity className="h-6 w-6 text-[var(--text-secondary)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">
              {steps.length === 0 ? "Waiting for execution events…" : "No steps match the current filters"}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--surface-sunken)]" />

            {filteredSteps.map((step) => {
              const isExpanded = expandedSteps.has(step.key);
              const meta = CANVAS_NODE_TYPE_MAP[step.nodeType as GraphNodeType];
              const NodeIcon = meta?.icon;
              const isCurrentlyRunning = step.status === "RUNNING";

              return (
                <div key={step.key} className="relative pl-5 pb-1">
                  {/* Status dot on the timeline */}
                  <div className={clsx(
                    "absolute left-0 top-2.5 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center z-10",
                    isCurrentlyRunning ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/80" : "border-[var(--surface-raised)]",
                    isCurrentlyRunning ? "" : statusDotColor(step.status) + "/20"
                  )}>
                    <span className={clsx("block h-1.5 w-1.5 rounded-full", statusDotColor(step.status))} />
                  </div>

                  {/* Step Card */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(step.key)}
                    className={clsx(
                      "w-full text-left rounded-[8px] border px-2.5 py-2 transition-colors cursor-pointer",
                      statusColor(step.status),
                      isCurrentlyRunning && "",
                      "hover:brightness-110"
                    )}
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-1.5">
                      {NodeIcon && (
                        <NodeIcon className={clsx("h-3 w-3 shrink-0", meta?.accent?.split(" ")[1] ?? "text-[var(--text-muted)]")} />
                      )}
                      <span className="text-xs font-medium text-[var(--text-muted)] truncate flex-1">
                        {step.nodeLabel}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {statusIcon(step.status, isCurrentlyRunning)}
                        {step.subEvents.length > 0 && (
                          <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-elevated)]/40 px-1 rounded">
                            {step.subEvents.length}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-2.5 w-2.5 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronDown className="h-2.5 w-2.5 text-[var(--text-muted)]" />
                        )}
                      </span>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-muted)] font-mono">{formatTime(step.startedAt)}</span>
                      {step.durationMs !== undefined && (
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          {formatDuration(step.durationMs)}
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-secondary)]">
                        {step.nodeType}
                      </span>
                    </div>

                    {/* Detail preview when collapsed */}
                    {!isExpanded && step.detail && (
                      <div className="mt-1 text-xs text-[var(--text-muted)] truncate">
                        {step.detail}
                      </div>
                    )}
                  </button>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="mt-1 ml-1 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 p-2 space-y-1.5">
                      {/* Detail & Error */}
                      {step.detail && (
                        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                          <span className="text-[var(--text-muted)] font-medium">Output: </span>
                          {step.detail}
                        </div>
                      )}
                      {step.error && (
                        <div className="text-xs text-[var(--state-error)] leading-relaxed bg-[var(--state-error)]/5 rounded px-1.5 py-1">
                          <span className="font-medium">Error: </span>
                          {step.error}
                        </div>
                      )}

                      {/* Timing */}
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>Start: {formatTime(step.startedAt)}</span>
                        {step.endedAt && <span>End: {formatTime(step.endedAt)}</span>}
                        {step.durationMs !== undefined && (
                          <span className="text-[var(--text-muted)] font-medium">Duration: {formatDuration(step.durationMs)}</span>
                        )}
                      </div>

                      {/* Sub-events */}
                      {step.subEvents.length > 0 && (
                        <div className="space-y-0.5 pt-1 border-t border-[var(--border-subtle)]">
                          <div className="text-xs text-[var(--text-muted)] font-medium mb-1">
                            Sub-events
                          </div>
                          {step.subEvents.map((sub, si) => (
                            <div
                              key={si}
                              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs"
                            >
                              <span className={clsx("shrink-0", sub.color)}>
                                {subEventIcon(sub.type)}
                              </span>
                              <span className="text-[var(--text-muted)] font-medium truncate">
                                {sub.label}
                              </span>
                              {sub.detail && (
                                <span className="text-[var(--text-muted)] truncate text-xs">
                                  {sub.detail}
                                </span>
                              )}
                              <span className="ml-auto shrink-0 text-[10px] text-[var(--text-secondary)]">
                                {formatTime(sub.at)}
                              </span>
                              {sub.status && sub.status !== "RUNNING" && (
                                <span className={clsx(
                                  "shrink-0 w-1.5 h-1.5 rounded-full",
                                  sub.status === "SUCCESS" ? "bg-[var(--state-success)]" :
                                  sub.status === "FAILED" ? "bg-[var(--state-error)]" :
                                  sub.status === "AWAITING_APPROVAL" ? "bg-[var(--state-warning)]" :
                                  "bg-[var(--surface-elevated)]"
                                )} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Click to focus */}
                      {onNodeClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNodeClick(step.nodeId);
                          }}
                          className="w-full flex items-center justify-center gap-1 py-1 rounded border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
                        >
                          <ArrowRight className="h-2 w-2" /> Focus on canvas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
