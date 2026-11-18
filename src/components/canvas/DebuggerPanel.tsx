"use client";

import React, { useState, useCallback } from "react";
import {
  Bug,
  Circle,
  Play,
  Pause,
  SkipForward,
  Eye,
  Edit3,
  ChevronRight,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

interface DebuggerPanelProps {
  /** Current trace node statuses. */
  nodeStatuses: Record<string, string>;
  /** Current trace details. */
  nodeDetails: Record<string, string>;
  /** Whether execution is currently running. */
  isRunning: boolean;
  /** Callback to toggle breakpoint on a node. */
  onToggleBreakpoint: (nodeId: string) => void;
  /** Callback to step to next node. */
  onStepNext?: () => void;
  /** Callback to continue execution. */
  onContinue?: () => void;
  /** Callback to pause execution. */
  onPause?: () => void;
  /** Callback to restart execution. */
  onRestart?: () => void;
}

interface VariableEntry {
  key: string;
  value: unknown;
  expanded?: boolean;
}

/**
 * Interactive Debugger & Live Stepping:
 * Breakpoints, variable inspector, step controls, and live state editing.
 */
export function DebuggerPanel({
  nodeStatuses,
  nodeDetails,
  isRunning,
  onToggleBreakpoint: _onToggleBreakpoint,
  onStepNext,
  onContinue,
  onPause,
  onRestart,
}: DebuggerPanelProps) {
  const [variables, setVariables] = useState<VariableEntry[]>([
    { key: "input", value: { query: "example input" } },
    { key: "results", value: {} },
    { key: "loopCounters", value: {} },
    { key: "state", value: { step: 0, retryCount: 0 } },
  ]);
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showVars, setShowVars] = useState(true);
  const [showBreakpoints, setShowBreakpoints] = useState(true);

  const toggleExpand = useCallback((key: string) => {
    setVariables((prev) =>
      prev.map((v) => (v.key === key ? { ...v, expanded: !v.expanded } : v))
    );
  }, []);

  const startEdit = useCallback((key: string, value: unknown) => {
    setEditingVar(key);
    setEditValue(JSON.stringify(value, null, 2));
  }, []);

  const saveEdit = useCallback(
    (key: string) => {
      try {
        const parsed = JSON.parse(editValue);
        setVariables((prev) =>
          prev.map((v) => (v.key === key ? { ...v, value: parsed } : v))
        );
        setEditingVar(null);
      } catch {
        // Invalid JSON — ignore
      }
    },
    [editValue]
  );

  // Gather breakpoint nodes
  const runningNodeIds = Object.keys(nodeStatuses).filter(
    (id) => nodeStatuses[id] === "RUNNING"
  );

  const formatValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${value.slice(0, 60)}${value.length > 60 ? "…" : ""}"`;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === "object") {
      const keys = Object.keys(value as Record<string, unknown>);
      return `{${keys.slice(0, 5).join(", ")}${keys.length > 5 ? ", …" : ""}}`;
    }
    return String(value);
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--text-secondary)]/80 font-medium flex items-center gap-1.5">
          <Bug className="h-3.5 w-3.5" /> Debugger
        </div>
        {isRunning && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--state-success)] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--state-success)]" />
            Running
          </span>
        )}
      </div>

      {/* Step Controls */}
      <div className="flex items-center gap-1">
        {isRunning ? (
          <button
            onClick={onPause}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--state-warning)]/40 bg-[var(--state-warning)]/40 text-xs font-medium text-[var(--state-warning)] hover:bg-[var(--state-warning)]/40 transition-colors cursor-pointer"
          >
            <Pause className="h-2.5 w-2.5" /> Pause
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--state-success)]/40 bg-[var(--state-success)]/40 text-xs font-medium text-[var(--state-success)] hover:bg-[var(--state-success)]/40 transition-colors cursor-pointer"
          >
            <Play className="h-2.5 w-2.5" /> Continue
          </button>
        )}
        <button
          onClick={onStepNext}
          disabled={!isRunning}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--cta-primary-hover)]/40 transition-colors cursor-pointer disabled:opacity-40"
        >
          <SkipForward className="h-2.5 w-2.5" /> Step next
        </button>
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-strong)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
        >
          <RotateCcw className="h-2.5 w-2.5" /> Restart
        </button>
      </div>

      {/* Running Nodes */}
      {runningNodeIds.length > 0 && (
        <div className="rounded border border-[var(--border-subtle)] bg-[var(--cta-primary-bg)]/30 p-2">
          <div className="text-xs text-[var(--text-secondary)] font-medium mb-1">
            Current Execution Point
          </div>
          {runningNodeIds.map((id) => (
            <div key={id} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-[var(--cta-primary-bg)]" />
              <span className="text-[var(--text-secondary)] font-medium">{id}</span>
              {nodeDetails[id] && (
                <span className="text-[var(--text-muted)] truncate text-xs">{nodeDetails[id]}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Breakpoints Section */}
      <div className="border-t border-[var(--border-subtle)] pt-2">
        <button
          onClick={() => setShowBreakpoints(!showBreakpoints)}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          {showBreakpoints ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          Breakpoints
        </button>
        {showBreakpoints && (
          <div className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
            Click the <Circle className="h-2 w-2 inline text-[var(--state-error)]" /> icon on any node&apos;s inspector to toggle a breakpoint.
            Execution pauses before that node runs.
          </div>
        )}
      </div>

      {/* Variable Inspector */}
      <div className="border-t border-[var(--border-subtle)] pt-2">
        <button
          onClick={() => setShowVars(!showVars)}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          {showVars ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          <Eye className="h-2.5 w-2.5" /> Variables
        </button>
        {showVars && (
          <div className="mt-1.5 space-y-1">
            {variables.map((v) => (
              <div key={v.key} className="rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)]/30 overflow-hidden">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-[var(--surface-raised)]/5 transition-colors"
                  onClick={() => toggleExpand(v.key)}
                >
                  {v.expanded ? (
                    <ChevronDown className="h-2.5 w-2.5 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronRight className="h-2.5 w-2.5 text-[var(--text-muted)] shrink-0" />
                  )}
                  <span className="text-[var(--text-secondary)] font-medium text-xs">{v.key}</span>
                  {!v.expanded && (
                    <>
                      <span className="text-[var(--text-secondary)]">=</span>
                      <span className="text-[var(--text-muted)] text-xs truncate">
                        {formatValue(v.value)}
                      </span>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(v.key, v.value);
                    }}
                    className="ml-auto p-0.5 rounded hover:bg-[var(--surface-raised)]/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                  </button>
                </div>
                {v.expanded && (
                  <div className="px-2 pb-1.5">
                    {editingVar === v.key ? (
                      <div className="space-y-1">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={4}
                          className="w-full rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 px-2 py-1 text-xs text-[var(--text-primary)] font-mono focus:outline-none resize-y"
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => saveEdit(v.key)}
                            className="px-1.5 py-0.5 rounded bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-medium hover:bg-[var(--cta-primary-hover)] cursor-pointer"
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditingVar(null)}
                            className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--text-muted)] text-xs font-medium hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <pre className="text-xs text-[var(--text-muted)] font-mono whitespace-pre-wrap overflow-x-auto max-h-24 overflow-y-auto">
                        {JSON.stringify(v.value, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
