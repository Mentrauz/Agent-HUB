"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  CircleDot,
  Flag,
  Bot,
  GitFork,
  Wrench,
  Split,
  ShieldCheck,
  Repeat,
  Target,
  Boxes,
  ServerCog,
  Plug,
  Puzzle,
  Globe,
  Shuffle,
  Timer,
  Layers,
  Variable,
  FileOutput,
  StickyNote,
  Frame,
  Clock,
  Radio,
  Rss,
  FileText,
  Send,
  Binary,
  Search,
  FileSpreadsheet,
  FileCheck,
  HardDrive,
  Database,
  BrainCircuit,
  Mic,
  Volume2,
  Network,
  MessagesSquare,
  Code2,
  Scale,
  ShieldAlert,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { CANVAS_NODE_TYPE_MAP } from "./nodeTypes";
import type { CanvasNodeData } from "./graphUtils";

interface NodePropsShape {
  data: CanvasNodeData;
  selected?: boolean;
}

/** Live trace status → animation class. */
function statusClasses(status: CanvasNodeData["traceStatus"]): string {
  switch (status) {
    case "RUNNING":
      return "canvas-node-running";
    case "SUCCESS":
      return "canvas-node-success";
    case "FAILED":
      return "canvas-node-failed";
    case "AWAITING_APPROVAL":
      return "canvas-node-awaiting";
    case "SKIPPED":
      return "border-[var(--border-strong)] opacity-60";
    default:
      return "";
  }
}

/** Heatmap mode: latency intensity → cool (fast) → hot (slow). */
function heatmapClasses(latency?: number, max?: number): string {
  if (latency === undefined || !max || max <= 0) return "";
  const ratio = Math.min(1, latency / max);
  if (ratio < 0.33) return "border-[var(--accent-primary)]/40 ";
  if (ratio < 0.66) return "border-[var(--state-warning)]/40 ";
  return "border-[var(--state-error)]/40 ";
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function statusDot(status: CanvasNodeData["traceStatus"]) {
  if (!status) return null;
  const color =
    status === "SUCCESS"
      ? "bg-[var(--state-success)]"
      : status === "FAILED"
        ? "bg-[var(--state-error)]"
        : status === "AWAITING_APPROVAL"
          ? "bg-[var(--state-warning)]"
          : "bg-[var(--cta-primary-bg)]";
  return (
    <span className={clsx("inline-block h-2 w-2 rounded-full", color, false)} />
  );
}

function NodeLiveTokenStream({
  stream,
}: {
  stream: { text: string; isThinking?: boolean; tokensPerSec?: number; totalTokens?: number; active: boolean };
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [stream.text]);

  const hasThinking = stream.text.includes("<think>") || stream.isThinking;
  const parts = stream.text.split(/<\/?think>/);

  return (
    <div className="mt-1.5 space-y-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-2 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1 text-[10px]">
        <span className="flex items-center gap-1.5 font-sans text-[var(--text-secondary)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
          {stream.isThinking ? "Reasoning" : "Live stream"}
        </span>
        <div className="flex items-center gap-1.5 tabular-nums text-[var(--text-muted)]">
          {stream.tokensPerSec ? <span>{stream.tokensPerSec} tok/s</span> : <span>live</span>}
          {stream.totalTokens !== undefined && stream.totalTokens > 0 && <span>{stream.totalTokens} tok</span>}
        </div>
      </div>

      <div
        ref={containerRef}
        className="custom-scrollbar max-h-28 select-text overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-[var(--text-muted)]"
      >
        {hasThinking && parts.length > 1 ? (
          <>
            <div className="mb-1 rounded-[4px] border border-[var(--border-subtle)] p-1 text-[var(--text-secondary)]">
              <span className="mb-0.5 block font-sans text-[10px] text-[var(--text-muted)]">Chain of thought</span>
              {parts[1]}
            </div>
            <span>{parts.slice(2).join("") || parts[0]}</span>
          </>
        ) : (
          <span>{stream.text}</span>
        )}
        {stream.active && <span className="ml-0.5 inline-block h-3 w-1.5 bg-[var(--text-muted)] align-middle" />}
      </div>
    </div>
  );
}

function BaseShell({
  data,
  icon,
  accentClass,
  badgeClass,
  badge,
  children,
  selected,
  showTarget = true,
  showSource: _showSource = true,
  sourceCount = 1,
}: {
  data: CanvasNodeData;
  icon: React.ReactNode;
  accentClass: string;
  badgeClass: string;
  badge: string;
  children?: React.ReactNode;
  selected?: boolean;
  showTarget?: boolean;
  showSource?: boolean;
  sourceCount?: number;
}) {
  const isHighlighted = data.isHighlighted;
  return (
    <div
      className={clsx(
        "canvas-node relative w-[230px] rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] font-mono",
        accentClass,
        statusClasses(data.traceStatus) || heatmapClasses(data.heatmapLatency, data.heatmapMax),
        selected && "ring-2 ring-[var(--accent-primary)]",
        isHighlighted && "ring-2 ring-[var(--state-warning)]"
      )}
    >
      {showTarget && <Handle type="target" position={Position.Left} className="!bg-[var(--text-muted)] !border-0 !w-2 !h-2" />}
      {Array.from({ length: Math.max(1, sourceCount) }).map((_, i) => (
        <Handle
          key={i}
          type="source"
          id={sourceCount > 1 ? `src-${i}` : undefined}
          position={Position.Right}
          style={sourceCount > 1 ? { top: `${((i + 1) * 100) / (sourceCount + 1)}%` } : undefined}
          className="!bg-[var(--text-muted)] !border-0 !w-2 !h-2"
        />
      ))}

      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[var(--text-secondary)] shrink-0">{icon}</span>
            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
              {data.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {statusDot(data.traceStatus)}
            <span className={clsx("px-1.5 py-0.5 rounded border text-xs font-medium ", badgeClass)}>
              {badge}
            </span>
          </div>
        </div>
        {children}
        {data.heatmapLatency !== undefined && data.heatmapMax !== undefined && data.heatmapMax > 0 && (
          <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] truncate">
            <Clock className="h-2.5 w-2.5 text-[var(--accent-primary)]" /> {formatMs(data.heatmapLatency)}
          </div>
        )}
        {data.traceDetail && (
          <div className="text-xs text-[var(--text-secondary)] leading-tight truncate" title={data.traceDetail}>
            {data.traceDetail}
          </div>
        )}
        {data.traceTokenStream && data.traceTokenStream.text && (
          <NodeLiveTokenStream stream={data.traceTokenStream} />
        )}
      </div>
    </div>
  );
}

function AgentNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.agent;
  const promptPreview = (data.prompt ?? "").slice(0, 80);
  const llmCall = data.traceLlmCall as { model?: string; inputTokens?: number; outputTokens?: number; durationMs?: number } | undefined;
  return (
    <BaseShell
      data={data}
      icon={<Bot className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-muted)] leading-tight line-clamp-2" title={data.prompt}>
        {promptPreview || "No prompt configured"}
      </div>
      {llmCall && (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-muted)]">
          {llmCall.model && <span className="text-[var(--text-secondary)] font-medium">{llmCall.model}</span>}
          {llmCall.inputTokens !== undefined && (
            <span>↑{llmCall.inputTokens}</span>
          )}
          {llmCall.outputTokens !== undefined && (
            <span>↓{llmCall.outputTokens}</span>
          )}
          {llmCall.durationMs !== undefined && (
            <span>{llmCall.durationMs}ms</span>
          )}
        </div>
      )}
    </BaseShell>
  );
}

function SupervisorNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.supervisor;
  const llmCall = data.traceLlmCall as { model?: string; inputTokens?: number; outputTokens?: number; durationMs?: number } | undefined;
  const decision = data.traceRouterDecision as { chosenLabel: string; mode: string; reason?: string } | undefined;
  return (
    <BaseShell
      data={data}
      icon={<GitFork className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
      sourceCount={Math.max(1, 2)}
    >
      <div className="text-xs text-[var(--text-muted)] leading-tight line-clamp-2" title={data.prompt}>
        {(data.prompt ?? "No prompt configured").slice(0, 80)}
      </div>
      {llmCall && (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-muted)]">
          {llmCall.model && <span className="text-[var(--text-secondary)] font-medium">{llmCall.model}</span>}
          {llmCall.inputTokens !== undefined && <span>↑{llmCall.inputTokens}</span>}
          {llmCall.outputTokens !== undefined && <span>↓{llmCall.outputTokens}</span>}
        </div>
      )}
      {decision && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-medium border border-[var(--border-subtle)]">
            → {decision.chosenLabel || "default"}
          </span>
        </div>
      )}
    </BaseShell>
  );
}

function ToolNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.tool;
  const toolCall = data.traceToolCall as { toolName: string; action?: string; durationMs?: number; status: string } | undefined;
  return (
    <BaseShell
      data={data}
      icon={<Wrench className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">{data.toolName ?? "no tool selected"}</div>
      <div className="text-xs text-[var(--text-muted)] truncate">action · {data.action ?? "—"}</div>
      {toolCall && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium border inline-flex items-center gap-1 ${
            toolCall.status === "SUCCESS"
              ? "bg-[var(--state-success)]/10 text-[var(--state-success)] border-[var(--state-success)]/25"
              : toolCall.status === "RUNNING"
                ? "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                : "bg-[var(--state-error)]/10 text-[var(--state-error)] border-[var(--state-error)]/25"
          }`}>
            {toolCall.status === "RUNNING" ? (
              <>
                <Loader2 className="h-2 w-2 animate-spin" /> executing
              </>
            ) : toolCall.status === "SUCCESS" ? (
              <>
                <Check className="h-2 w-2" /> {toolCall.toolName}
              </>
            ) : (
              <>
                <X className="h-2 w-2" /> failed
              </>
            )}
          </span>
          {toolCall.durationMs !== undefined && (
            <span className="text-xs text-[var(--text-muted)]">{toolCall.durationMs}ms</span>
          )}
        </div>
      )}
    </BaseShell>
  );
}

function RouterNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.router;
  const decision = data.traceRouterDecision as { chosenLabel: string; mode: string; reason?: string } | undefined;
  return (
    <BaseShell
      data={data}
      icon={<Split className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={data.routerMode === "ai" ? "ROUTER·AI" : "ROUTER·COND"}
      selected={selected}
      sourceCount={2}
    >
      <div className="text-xs text-[var(--text-muted)] leading-tight line-clamp-2" title={data.condition}>
        {data.routerMode === "ai" ? (data.routerPrompt ?? "AI router — model picks branch") : (data.condition ?? "no condition")}
      </div>
      {decision && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--state-warning)]/10 text-[var(--state-warning)] font-medium border border-[var(--state-warning)]/25">
            → {decision.chosenLabel || "default"}
          </span>
          {decision.reason && (
            <span className="text-xs text-[var(--text-muted)] truncate max-w-[80px]" title={decision.reason}>
              {decision.reason}
            </span>
          )}
        </div>
      )}
    </BaseShell>
  );
}

function ApprovalNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.approval;
  const approval = data.traceApproval as { reason?: string; action?: string; decision?: string } | undefined;
  return (
    <BaseShell
      data={data}
      icon={<ShieldCheck className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-muted)] leading-tight line-clamp-2" title={data.approvalReason}>
        {data.approvalReason ?? "No reason configured"}
      </div>
      {approval?.decision && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium border inline-flex items-center gap-1 ${
            approval.decision === "APPROVED"
              ? "bg-[var(--state-success)]/10 text-[var(--state-success)] border-[var(--state-success)]/25"
              : "bg-[var(--state-error)]/10 text-[var(--state-error)] border-[var(--state-error)]/25"
          }`}>
            {approval.decision === "APPROVED" ? (
              <>
                <Check className="h-2 w-2" /> Approved
              </>
            ) : (
              <>
                <X className="h-2 w-2" /> Denied
              </>
            )}
          </span>
        </div>
      )}
    </BaseShell>
  );
}

function LoopNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.loop;
  const loopState = data.traceLoopState as { iteration: number; maxIterations: number; exited: boolean } | undefined;
  return (
    <BaseShell
      data={data}
      icon={<Repeat className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={`LOOP · ${data.maxIterations ?? 3}×`}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-muted)]">repeats body edge, then exits</div>
      {loopState && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium border inline-flex items-center gap-1 ${
            loopState.exited
              ? "bg-[var(--surface-sunken)] text-[var(--text-muted)] border-[var(--border-subtle)]"
              : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
          }`}>
            {loopState.exited ? (
              <>
                <Check className="h-2 w-2" /> exited
              </>
            ) : (
              `${loopState.iteration}/${loopState.maxIterations}`
            )}
          </span>
        </div>
      )}
    </BaseShell>
  );
}

function ParallelNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.parallel;
  return (
    <BaseShell
      data={data}
      icon={<Target className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={data.parallelMode === "map" ? "MAP" : "Fan-out"}
      selected={selected}
      sourceCount={data.parallelMode === "map" ? 2 : 3}
    >
      <div className="text-xs text-[var(--text-muted)] truncate">
        {data.parallelMode === "map" ? `map ${data.mapField ?? "input.items"}` : "fan-out branches"}
      </div>
    </BaseShell>
  );
}

function StartNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.start;
  return (
    <BaseShell
      data={data}
      icon={<CircleDot className="h-4 w-4" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
      showTarget={false}
    >
      <div className="text-xs text-[var(--text-muted)]">entry · user input</div>
    </BaseShell>
  );
}

function SubgraphNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.subgraph;
  const inner = data.subgraph;
  const innerNodes = inner?.nodes?.length ?? 0;
  const innerEdges = inner?.edges?.length ?? 0;
  return (
    <BaseShell
      data={data}
      icon={<Boxes className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-muted)] leading-tight">
        {innerNodes > 0 ? `${innerNodes} inner nodes · ${innerEdges} edges` : "empty macro — open & build it"}
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        in {Object.keys(data.inputMapping ?? {}).length} · out {Object.keys(data.outputMapping ?? {}).length}
      </div>
    </BaseShell>
  );
}

function EndNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.end;
  return (
    <BaseShell
      data={data}
      icon={<Flag className="h-4 w-4" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
      showSource={false}
    >
      <div className="text-xs text-[var(--text-muted)]">terminal · final output</div>
    </BaseShell>
  );
}

// ─── MCP & Ecosystem Nodes ───

function McpServerNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.mcp_server;
  return (
    <BaseShell
      data={data}
      icon={<ServerCog className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">{data.mcpServerId ?? "no server"}</div>
      <div className="text-xs text-[var(--text-muted)] truncate">{data.mcpTransport ?? "SSE"} · {data.mcpEndpoint ?? "—"}</div>
    </BaseShell>
  );
}

function McpToolNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.mcp_tool;
  return (
    <BaseShell
      data={data}
      icon={<Plug className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">{data.mcpToolName ?? "no tool"}</div>
      <div className="text-xs text-[var(--text-muted)] truncate">server: {data.mcpToolServer ?? "—"}</div>
    </BaseShell>
  );
}

function SkillNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.skill;
  return (
    <BaseShell
      data={data}
      icon={<Puzzle className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">{data.skillId || "select skill"}</div>
      <div className="text-xs text-[var(--text-muted)]">marketplace skill</div>
    </BaseShell>
  );
}

function HttpNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.http;
  return (
    <BaseShell
      data={data}
      icon={<Globe className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={data.httpMethod ?? "GET"}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-muted)] truncate" title={data.httpUrl}>{data.httpUrl ?? "https://…"}</div>
    </BaseShell>
  );
}

function TransformNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.transform;
  return (
    <BaseShell
      data={data}
      icon={<Shuffle className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--state-success)] font-medium truncate">{data.transformOp ?? "map"}</div>
      <div className="text-xs text-[var(--text-muted)] truncate">{data.transformExpr ?? "—"}</div>
    </BaseShell>
  );
}

function CodeSandboxNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.code_sandbox;
  return (
    <BaseShell
      data={data}
      icon={<Code2 className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={data.codeLanguage?.toUpperCase() ?? "PYTHON"}
      selected={selected}
    >
      <div className="text-xs text-[var(--state-warning)] font-medium truncate font-mono">
        {data.codeLanguage === "javascript" ? "js/v8 sandbox" : "python microvm"}
      </div>
      <div className="text-xs text-[var(--text-muted)] font-mono truncate">
        {data.codeSnippet ? data.codeSnippet.slice(0, 30) + "..." : "return output"}
      </div>
    </BaseShell>
  );
}

function ConsensusNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.consensus;
  return (
    <BaseShell
      data={data}
      icon={<Scale className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.consensusStrategy === "judge_synthesis" ? "Judge Synthesis" : "Majority Vote"}
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        {data.consensusModels?.length ?? 3} candidate models
      </div>
    </BaseShell>
  );
}

function CriticNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.critic;
  return (
    <BaseShell
      data={data}
      icon={<ShieldAlert className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="text-xs text-[var(--state-error)] font-medium truncate">
        Pass ≥ {data.criticPassScore ?? 80}/100
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        Max {data.criticMaxTurns ?? 2} refinement turns
      </div>
    </BaseShell>
  );
}

function DelayNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.delay;
  return (
    <BaseShell
      data={data}
      icon={<Timer className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={`${(data.delayMs ?? 1000) >= 1000 ? `${(data.delayMs ?? 1000) / 1000}s` : `${data.delayMs ?? 1000}ms`}`}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-muted)]">pause execution</div>
    </BaseShell>
  );
}

function AggregateNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.aggregate;
  return (
    <BaseShell
      data={data}
      icon={<Layers className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
      sourceCount={2}
    >
      <div className="text-xs text-[var(--state-warning)] font-medium truncate">{data.aggregateMode ?? "concat"}</div>
      <div className="text-xs text-[var(--text-muted)]">combine branch results</div>
    </BaseShell>
  );
}

function VariableNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.variable;
  return (
    <BaseShell
      data={data}
      icon={<Variable className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={data.varOp === "set" ? "SET" : "GET"}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">{data.varName ?? "var"}</div>
      {data.varOp === "set" && <div className="text-xs text-[var(--text-muted)] truncate">{JSON.stringify(data.varValue).slice(0, 40)}</div>}
    </BaseShell>
  );
}

function OutputNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.output;
  return (
    <BaseShell
      data={data}
      icon={<FileOutput className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
      showSource={false}
    >
      <div className="text-xs text-[var(--text-muted)] truncate">{data.outputTemplate ?? "{{ results }}"}</div>
    </BaseShell>
  );
}

function ScheduleTriggerNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.schedule_trigger;
  return (
    <BaseShell
      data={data}
      icon={<Clock className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
      showTarget={false}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.cronExpression ?? "0 9 * * *"}
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        {data.scheduleInterval ?? "Recurrent execution"}
      </div>
    </BaseShell>
  );
}

function WebhookTriggerNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.webhook_trigger;
  return (
    <BaseShell
      data={data}
      icon={<Radio className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={data.webhookMethod ?? "POST"}
      selected={selected}
      showTarget={false}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.webhookPath ?? "/api/webhooks/incoming"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Inbound event listener
      </div>
    </BaseShell>
  );
}

function RssFeedNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.rss_feed;
  return (
    <BaseShell
      data={data}
      icon={<Rss className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={`${data.rssMaxItems ?? 10} ITEMS`}
      selected={selected}
    >
      <div className="text-xs text-[var(--state-warning)] font-medium truncate">
        {data.rssUrl ?? "RSS / Atom Stream"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Autonomous feed ingestion
      </div>
    </BaseShell>
  );
}

function WebReaderNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.web_reader;
  return (
    <BaseShell
      data={data}
      icon={<FileText className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="MARKDOWN"
      selected={selected}
    >
      <div className="text-xs text-[var(--state-success)] font-medium truncate">
        {data.readerUrl ?? "https://r.jina.ai/..."}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Jina Reader AI parser
      </div>
    </BaseShell>
  );
}

function NotificationDispatcherNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.notification_dispatcher;
  const dest = (data.dispatchDestination ?? "discord").toUpperCase();
  return (
    <BaseShell
      data={data}
      icon={<Send className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={dest}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.dispatchWebhookUrl ? "Webhook Configured" : "Outgoing Dispatcher"}
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        {data.dispatchMessage?.slice(0, 32) || "Alert delivery"}
      </div>
    </BaseShell>
  );
}

function DataMapperNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.data_mapper;
  const keyCount = data.mapperSchema ? Object.keys(data.mapperSchema).length : 0;
  return (
    <BaseShell
      data={data}
      icon={<Binary className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={`${keyCount} FIELDS`}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {keyCount > 0 ? Object.keys(data.mapperSchema ?? {}).slice(0, 3).join(", ") : "JSON Transform"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Schema mapper
      </div>
    </BaseShell>
  );
}

// ─── Open-Source Microservice & Tool Nodes ───

function SearxngNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.searxng_search;
  return (
    <BaseShell
      data={data}
      icon={<Search className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="Open search"
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.searxngQuery || "Web Query"}
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        {data.searxngHost || "https://searx.be"}
      </div>
    </BaseShell>
  );
}

function Crawl4AiNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.crawl4ai_scrape;
  return (
    <BaseShell
      data={data}
      icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="AI crawler"
      selected={selected}
    >
      <div className="text-xs text-[var(--state-success)] font-medium truncate">
        {data.crawl4aiUrl || "Target URL"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Markdown Extractor
      </div>
    </BaseShell>
  );
}

function DoclingNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.docling_pdf_parser;
  return (
    <BaseShell
      data={data}
      icon={<FileCheck className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="Docling · ibm"
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.doclingDocumentUrl ? data.doclingDocumentUrl.split("/").pop() : "Document / PDF"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Table & Text Parser
      </div>
    </BaseShell>
  );
}

function GotenbergNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.gotenberg_pdf_exporter;
  return (
    <BaseShell
      data={data}
      icon={<FileOutput className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="PDF exporter"
      selected={selected}
    >
      <div className="text-xs text-[var(--state-error)] font-medium truncate">
        {data.gotenbergPaperSize || "A4"} · {data.gotenbergLandscape ? "Landscape" : "Portrait"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Gotenberg PDF Engine
      </div>
    </BaseShell>
  );
}

function NocodbNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.nocodb_record;
  return (
    <BaseShell
      data={data}
      icon={<Database className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={(data.nocodbOperation || "CREATE").toUpperCase()}
      selected={selected}
    >
      <div className="text-xs text-[var(--state-warning)] font-medium truncate">
        {data.nocodbTableId || "Table ID"}
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        {data.nocodbHost || "NocoDB API"}
      </div>
    </BaseShell>
  );
}

function PocketbaseNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.pocketbase_store;
  return (
    <BaseShell
      data={data}
      icon={<HardDrive className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={(data.pocketbaseAction || "STORE").toUpperCase()}
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.pocketbaseCollection || "Collection"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        State & KV Persistence
      </div>
    </BaseShell>
  );
}

function QdrantNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.qdrant_vector_memory;
  return (
    <BaseShell
      data={data}
      icon={<BrainCircuit className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="Vector RAG"
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.qdrantCollection || "Collection"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Top {data.qdrantTopK ?? 3} Recall
      </div>
    </BaseShell>
  );
}

function AudioTranscriberNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.audio_transcriber;
  return (
    <BaseShell
      data={data}
      icon={<Mic className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="WHISPER"
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.audioSourceUrl ? "Audio Stream" : "Audio Input"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Lang: {data.audioLanguage || "Auto"}
      </div>
    </BaseShell>
  );
}

function PiperTtsNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.piper_tts;
  return (
    <BaseShell
      data={data}
      icon={<Volume2 className="h-3.5 w-3.5" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge="Piper TTS"
      selected={selected}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        {data.piperVoice || "Default Voice"}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Local Speech Synthesis
      </div>
    </BaseShell>
  );
}

// ─── Sticky Note (Markdown Documentation) ───

const NOTE_COLORS: Record<string, string> = {
  yellow: "bg-[var(--state-warning)]/10 border-[var(--state-warning)]/40 text-[var(--state-warning)]",
  pink: "bg-[var(--cta-primary-bg)]/10 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]",
  blue: "bg-[var(--cta-primary-bg)]/10 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]",
  green: "bg-[var(--state-success)]/10 border-[var(--state-success)]/40 text-[var(--state-success)]",
  purple: "bg-[var(--cta-primary-bg)]/10 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]",
};

function StickyNoteNode({ data, selected }: NodePropsShape) {
  const color = (data.noteColor as string) ?? "yellow";
  const content = (data.noteContent as string) ?? "# Notes\nAdd documentation here...";
  const [expanded, setExpanded] = useState(false);
  // Roughly more than the 6 clamped lines at this width.
  const isLong = content.split("\n").length > 6 || content.length > 240;
  return (
    <div
      className={clsx(
        "relative w-fit min-w-[260px] max-w-[320px] rounded-xl border font-mono p-3.5 min-h-[100px] transition-colors",
        NOTE_COLORS[color] || NOTE_COLORS.yellow,
        selected && "ring-2 ring-[var(--accent-primary)]"
      )}
    >
      <div className="flex items-center gap-1.5 mb-2 border-b border-[var(--border-subtle)]/5 pb-1.5">
        <StickyNote className="h-3.5 w-3.5 opacity-80" />
        <span className="text-xs font-medium truncate">
          {data.label || "Note"}
        </span>
      </div>
      <div className={clsx("text-xs opacity-90 whitespace-pre-wrap break-words leading-relaxed", !expanded && "line-clamp-6")}>
        {content}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
          className="nodrag mt-1.5 text-xs font-medium opacity-70 hover:opacity-100 hover:underline cursor-pointer"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

// ─── Frame (Visual Container / Swimlane) ───

function FrameNode({ data, selected }: NodePropsShape) {
  return (
    <div
      className={clsx(
        "relative w-full h-full rounded-lg border-2 border-dashed border-[var(--border-subtle)]",
        "bg-[var(--surface-sunken)]",
        selected && "ring-2 ring-[var(--accent-primary)]"
      )}
      style={{ minHeight: 200, minWidth: 300 }}
    >
      <div className="absolute -top-3 left-3 px-2 py-0.5 bg-[var(--surface-sunken)] rounded border border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5">
          <Frame className="h-3 w-3 text-[var(--text-secondary)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {(data.frameTitle as string) ?? "Phase"}
          </span>
        </div>
      </div>
      {/* Frame is a visual-only container — no handles needed */}
    </div>
  );
}

function A2ADelegateNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.a2a_delegate;
  const delegation = data.traceA2ADelegation as {
    agentUrl: string;
    capability?: string;
    status: string;
    durationMs?: number;
    tokensUsed?: number;
    error?: string;
  } | undefined;

  const urlDisplay = (data.a2aAgentUrl ?? "https://a2a.agents.google.dev").replace(/^https?:\/\//, "");

  return (
    <BaseShell
      data={data}
      icon={<Network className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
    >
      <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] font-medium truncate" title={data.a2aAgentUrl}>
        <Globe className="h-2.5 w-2.5 text-[var(--text-secondary)] shrink-0" />
        <span className="truncate">{urlDisplay}</span>
      </div>
      <div className="text-xs text-[var(--text-muted)] truncate">
        cap · <span className="font-medium text-[var(--text-secondary)]">{data.a2aCapability ?? "default_task"}</span>
      </div>

      {delegation && (
        <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)] bg-[var(--surface-sunken)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
          <span className="font-medium text-[var(--text-secondary)]">{delegation.status}</span>
          {delegation.durationMs !== undefined && <span>{delegation.durationMs}ms</span>}
        </div>
      )}
    </BaseShell>
  );
}

function A2AChannelNode({ data, selected }: NodePropsShape) {
  const meta = CANVAS_NODE_TYPE_MAP.a2a_channel;
  const messages = (data.traceA2AMessages ?? []) as Array<{ sender: string; content: string; turn: number; mode?: string }>;

  return (
    <BaseShell
      data={data}
      icon={<MessagesSquare className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
      accentClass={meta.accent}
      badgeClass={meta.badgeClass}
      badge={meta.tag}
      selected={selected}
      sourceCount={2}
    >
      <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
        Swarm Mode: <span className="text-[var(--text-secondary)]">{data.a2aChannelMode ?? "debate"}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] truncate" title={data.a2aChannelTopic}>
        <Target className="h-2.5 w-2.5 text-[var(--text-secondary)] shrink-0" />
        <span className="truncate">{data.a2aChannelTopic ?? "Consensus Discussion"}</span>
      </div>

      {messages.length > 0 && (
        <div className="mt-1 space-y-1">
          <div className="text-xs font-medium text-[var(--text-secondary)]">
            Exchanges ({messages.length} turns):
          </div>
          <div className="max-h-16 overflow-y-auto text-xs text-[var(--text-muted)] space-y-0.5 bg-[var(--surface-sunken)] p-1 rounded border border-[var(--border-subtle)]">
            {messages.slice(-3).map((m, idx) => (
              // Messages only append, so the absolute index is a stable key for the sliding window.
              <div key={Math.max(0, messages.length - 3) + idx} className="truncate">
                <span className="font-medium text-[var(--text-secondary)]">{m.sender}:</span> {m.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </BaseShell>
  );
}

export const canvasNodeTypes = {
  start: memo(StartNode),
  end: memo(EndNode),
  agent: memo(AgentNode),
  supervisor: memo(SupervisorNode),
  tool: memo(ToolNode),
  router: memo(RouterNode),
  approval: memo(ApprovalNode),
  loop: memo(LoopNode),
  parallel: memo(ParallelNode),
  subgraph: memo(SubgraphNode),
  mcp_server: memo(McpServerNode),
  mcp_tool: memo(McpToolNode),
  skill: memo(SkillNode),
  http: memo(HttpNode),
  transform: memo(TransformNode),
  code_sandbox: memo(CodeSandboxNode),
  consensus: memo(ConsensusNode),
  critic: memo(CriticNode),
  delay: memo(DelayNode),
  aggregate: memo(AggregateNode),
  variable: memo(VariableNode),
  output: memo(OutputNode),
  schedule_trigger: memo(ScheduleTriggerNode),
  webhook_trigger: memo(WebhookTriggerNode),
  rss_feed: memo(RssFeedNode),
  web_reader: memo(WebReaderNode),
  notification_dispatcher: memo(NotificationDispatcherNode),
  data_mapper: memo(DataMapperNode),
  searxng_search: memo(SearxngNode),
  crawl4ai_scrape: memo(Crawl4AiNode),
  docling_pdf_parser: memo(DoclingNode),
  gotenberg_pdf_exporter: memo(GotenbergNode),
  nocodb_record: memo(NocodbNode),
  pocketbase_store: memo(PocketbaseNode),
  qdrant_vector_memory: memo(QdrantNode),
  audio_transcriber: memo(AudioTranscriberNode),
  piper_tts: memo(PiperTtsNode),
  a2a_delegate: memo(A2ADelegateNode),
  a2a_channel: memo(A2AChannelNode),
  sticky_note: memo(StickyNoteNode),
  frame: memo(FrameNode),
};
