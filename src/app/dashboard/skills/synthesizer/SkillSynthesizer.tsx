"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Wand2,
  Loader2,
  Sparkles,
  Server,
  FileCode2,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  GitBranch,
  Zap,
  Shield,
  Bot,
  Wrench,
  RefreshCw,
  Network,
} from "lucide-react";
import { clsx } from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import type { AgentGraphDefinition, GraphNodeType } from "@/types/graph";

// ────────────── Types ──────────────

interface SynthesizedServer {
  name: string;
  searchQuery: string;
  purpose: string;
  category: string;
  directoryMatch?: {
    id: string;
    name: string;
    source: string;
    endpointUrl?: string;
    command?: string;
    transport: string;
    description: string;
    tags: string[];
    stars: number;
  };
}

interface SynthesisResult {
  analysis: {
    goal: string;
    servers: SynthesizedServer[];
    steps: string[];
  };
  graph: AgentGraphDefinition;
  skillName: string;
  skillPurpose: string;
  servers: SynthesizedServer[];
  mountedServerIds: string[];
  skillId: string | null;
  warning?: string;
}

// ────────────── Helpers ──────────────

const NODE_ICONS: Partial<Record<GraphNodeType, React.ComponentType<{ className?: string }>>> = {
  start: Zap,
  end: Zap,
  agent: Bot,
  supervisor: GitBranch,
  tool: Wrench,
  router: GitBranch,
  approval: Shield,
  mcp_tool: Server,
  mcp_server: Server,
  loop: RefreshCw,
};

const NODE_COLORS: Partial<Record<GraphNodeType, string>> = {
  start: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  end: "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]",
  agent: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  supervisor: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  tool: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  router: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  approval: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  mcp_tool: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  mcp_server: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  loop: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  parallel: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
};

const EXAMPLE_PROMPTS = [
  {
    label: "GitHub Issue Monitor",
    prompt:
      "Automate checking new GitHub issues, querying our Postgres DB for user tier, and posting high-priority alerts to Slack",
  },
  {
    label: "Customer Support Pipeline",
    prompt:
      "Build a support pipeline that classifies incoming tickets, routes billing questions to Stripe lookup, technical issues to GitHub issue creation, and sends Slack notifications with approval gates before responding",
  },
  {
    label: "Data ETL Pipeline",
    prompt:
      "Extract data from PostgreSQL, transform it with Python, load into Snowflake, and send a completion report to Slack",
  },
  {
    label: "Content Scheduler",
    prompt:
      "Pull content from Notion, generate social media posts, schedule them on Twitter/X, and track engagement metrics",
  },
  {
    label: "Incident Response",
    prompt:
      "Monitor Sentry for critical errors, create GitHub issues, alert the team on Slack, and require human approval before deploying hotfixes",
  },
];

// ────────────── Component ──────────────

export function SkillSynthesizer() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<number>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSynthesize = useCallback(
    async (autoMount: boolean = false) => {
      if (!prompt.trim() || isSynthesizing) return;

      setIsSynthesizing(true);
      setError(null);
      setResult(null);

      try {
        const res = await fetch("/api/skills/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), autoMount }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `Synthesis failed (${res.status})`);
        }

        const data = await res.json();
        if (data.success && data.data) {
          setResult(data.data);
          if (data.data.skillId) {
            setInstalled(true);
            queryClient.invalidateQueries({ queryKey: ["skills"] });
            toast.success(
              "Skill synthesized & installed!",
              `${data.data.skillName} is ready in your Studio`,
              {
                action: {
                  label: "Open in canvas",
                  href: `/dashboard/canvas/${data.data.skillId}`,
                },
              }
            );
          } else if (data.data.warning) {
            toast.success("Graph generated", data.data.warning);
          }
        } else {
          throw new Error(data.error ?? "Synthesis failed");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Synthesis failed");
      } finally {
        setIsSynthesizing(false);
      }
    },
    [prompt, isSynthesizing, queryClient]
  );

  const handleInstallOnly = useCallback(async () => {
    if (!result || installed) return;
    setInstalling(true);
    try {
      // Re-synthesize with autoMount=true
      setIsSynthesizing(true);
      const res = await fetch("/api/skills/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), autoMount: true }),
      });

      if (!res.ok) throw new Error("Installation failed");

      const data = await res.json();
      if (data.success && data.data?.skillId) {
        setResult(data.data);
        setInstalled(true);
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        toast.success("Installed!", `${data.data.skillName} is now in your Studio`, {
          action: {
            label: "Open in canvas",
            href: `/dashboard/canvas/${data.data.skillId}`,
          },
        });
      } else {
        throw new Error(data.data?.warning || "Installation failed");
      }
    } catch (e) {
      toast.error("Install failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setInstalling(false);
      setIsSynthesizing(false);
    }
  }, [result, installed, prompt, queryClient]);

  const toggleServer = (idx: number) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-sm font-sans font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-[var(--accent-primary)]" />
          Skill synthesizer
        </h2>
        <p className="text-xs font-sans text-[var(--text-muted)] mt-0.5">
          Describe your goal in natural language — get a multi-agent graph with MCP servers auto-discovered
        </p>
      </div>

      {/* Prompt Input */}
      <div className="rounded-xl border border-[var(--accent-primary)]/25 bg-[var(--surface-raised)] overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSynthesize(false);
                }
              }}
              placeholder="Describe your automation goal...&#10;&#10;e.g. &quot;Automate checking new GitHub issues, querying our Postgres DB for user tier, and posting high-priority alerts to Slack&quot;"
              rows={4}
              className="w-full bg-transparent text-xs font-sans text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
              disabled={isSynthesizing}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSynthesize(false)}
                disabled={!prompt.trim() || isSynthesizing}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer",
                  prompt.trim() && !isSynthesizing
                    ? "border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] hover:bg-[var(--cta-primary-hover)] active:scale-95"
                    : "border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-muted)] cursor-not-allowed"
                )}
              >
                {isSynthesizing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Synthesizing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Generate graph
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-sans font-medium text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                Examples
              </button>
            </div>
            <span className="text-xs font-sans text-[var(--text-muted)]">
              ⌘+Enter to generate
            </span>
          </div>

          {/* Examples */}
          {showExamples && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setPrompt(ex.prompt);
                    setShowExamples(false);
                    inputRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--accent-primary)]/10 border border-transparent hover:border-[var(--accent-primary)]/25 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-[var(--accent-primary)] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-sans font-medium text-[var(--accent-primary)]">
                      {ex.label}
                    </div>
                    <div className="text-xs font-sans text-[var(--text-muted)] truncate">
                      {ex.prompt}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2.5 border-t border-[var(--state-error)]/25 bg-[var(--state-error)]/10 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--state-error)] shrink-0" />
            <span className="text-xs font-sans text-[var(--state-error)]">{error}</span>
          </div>
        )}
      </div>

      {/* ──── Results ──── */}
      {result && (
        <div className="space-y-4">
          {/* Goal Summary */}
          <div className="rounded-lg border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="text-xs font-sans font-medium text-[var(--accent-primary)]">
                  Detected Goal
                </div>
                <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                  {result.analysis?.goal || prompt}
                </p>
                {result.warning && (
                  <p className="text-xs font-sans text-[var(--state-warning)] flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {result.warning}
                  </p>
                )}
              </div>
              {!installed && (
                <button
                  type="button"
                  onClick={handleInstallOnly}
                  disabled={installing}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer shrink-0",
                    "border border-[var(--state-success)]/40 bg-[var(--state-success)] text-[var(--cta-primary-text)] hover:bg-[var(--state-success)] active:scale-95"
                  )}
                >
                  {installing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Installing…
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" /> 1-Click install
                    </>
                  )}
                </button>
              )}
              {installed && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-xs font-sans font-medium text-[var(--state-success)] shrink-0">
                    <Check className="h-3 w-3" /> Installed
                  </div>
                  {result.skillId && (
                    <Link
                      href={`/dashboard/canvas/${result.skillId}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] text-xs font-sans font-medium transition-colors shrink-0"
                    >
                      <Network className="h-3 w-3" /> Open in canvas
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Discovered Servers */}
          {result.servers && result.servers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-sans font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                <Server className="h-3 w-3" />
                DISCOVERED MCP SERVERS ({result.servers.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.servers.map((server, idx) => {
                  const isExpanded = expandedServers.has(idx);
                  const isMounted = result.mountedServerIds.includes(
                    server.directoryMatch?.id || ""
                  );
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleServer(idx)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                          )}
                          <Server className="h-3 w-3 text-[var(--accent-primary)] shrink-0" />
                          <span className="text-xs font-sans font-medium text-[var(--text-primary)] truncate">
                            {server.name}
                          </span>
                          {server.directoryMatch && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--state-success)]/10 text-[var(--state-success)] border border-[var(--state-success)]/25 shrink-0">
                              Found
                            </span>
                          )}
                          {!server.directoryMatch && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--state-warning)]/10 text-[var(--state-warning)] border border-[var(--state-warning)]/25 shrink-0">
                              Manual
                            </span>
                          )}
                          {isMounted && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25 shrink-0">
                              Mounted
                            </span>
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-[var(--border-subtle)] space-y-2 mt-1">
                          <p className="text-xs font-sans text-[var(--text-muted)]">{server.purpose}</p>
                          {server.directoryMatch && (
                            <div className="space-y-1 text-xs font-sans text-[var(--text-muted)]">
                              <div>Source: {server.directoryMatch.source} · {server.directoryMatch.transport}</div>
                              <div>Stars: {server.directoryMatch.stars} · ID: {server.directoryMatch.id}</div>
                              {server.directoryMatch.description && (
                                <p className="text-[var(--text-muted)]">{server.directoryMatch.description}</p>
                              )}
                            </div>
                          )}
                          {!server.directoryMatch && (
                            <p className="text-xs font-sans text-[var(--state-warning)]">
                              No directory match found — will need manual configuration
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workflow Steps */}
          {result.analysis?.steps && result.analysis.steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-sans font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3" />
                WORKFLOW STEPS ({result.analysis.steps.length})
              </div>
              <div className="space-y-1.5">
                {result.analysis.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)]"
                  >
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-sans text-[var(--text-secondary)]">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Graph Nodes */}
          {result.graph?.nodes && result.graph.nodes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-sans font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" />
                GENERATED GRAPH ({result.graph.nodes.length} nodes, {result.graph.edges.length} edges)
              </div>
              <div className="space-y-1.5">
                {result.graph.nodes.map((node) => {
                  const isExpanded = expandedNodes.has(node.id);
                  const Icon = NODE_ICONS[node.type] || Bot;
                  const colorClass = NODE_COLORS[node.type] || "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]";

                  return (
                    <div
                      key={node.id}
                      className={clsx(
                        "rounded-lg border overflow-hidden transition-colors",
                        colorClass
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleNode(node.id)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--surface-sunken)]/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 opacity-50 shrink-0" />
                          )}
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="text-xs font-sans font-medium truncate">
                            {node.data.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--surface-raised)]/50 border border-current/20 shrink-0">
                            {node.type}
                          </span>
                        </div>
                        {node.type === "approval" && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--state-warning)]/10 text-[var(--state-warning)] border border-[var(--state-warning)]/25 shrink-0">
                            HITL
                          </span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-current/10 space-y-2">
                          {node.data.prompt && (
                            <div>
                              <div className="text-xs font-sans font-medium opacity-60 mb-1">
                                System Prompt
                              </div>
                              <p className="text-xs font-sans opacity-80 leading-relaxed whitespace-pre-wrap">
                                {node.data.prompt}
                              </p>
                            </div>
                          )}
                          {node.data.mcpToolName && (
                            <div className="text-xs font-sans opacity-80">
                              <span className="font-medium">Tool:</span> {node.data.mcpToolServer}/{node.data.mcpToolName}
                            </div>
                          )}
                          {node.data.condition && (
                            <div className="text-xs font-sans opacity-80">
                              <span className="font-medium">Condition:</span> {node.data.condition}
                            </div>
                          )}
                          {node.data.routerPrompt && (
                            <div className="text-xs font-sans opacity-80">
                              <span className="font-medium">Router:</span> {node.data.routerPrompt}
                            </div>
                          )}
                          {node.data.approvalReason && (
                            <div className="text-xs font-sans opacity-80">
                              <span className="font-medium">Approval:</span> {node.data.approvalReason}
                            </div>
                          )}
                          {node.data.maxIterations && (
                            <div className="text-xs font-sans opacity-80">
                              <span className="font-medium">Max Iterations:</span> {node.data.maxIterations}
                            </div>
                          )}
                          {/* Edges from this node */}
                          {result.graph.edges
                            .filter((e) => e.source === node.id)
                            .map((edge) => (
                              <div
                                key={edge.id}
                                className="text-xs font-sans opacity-60 flex items-center gap-1"
                              >
                                <ArrowRight className="h-2.5 w-2.5" />
                                → {edge.target}
                                {edge.label && (
                                  <span className="px-1 py-0.5 rounded bg-[var(--surface-raised)]/30 text-xs">
                                    [{edge.label}]
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skill Name */}
          {result.skillName && (
            <div className="rounded-lg border border-[var(--border-subtle)] p-3 flex items-center gap-3">
              <FileCode2 className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-sans font-medium text-[var(--text-primary)]">
                  {result.skillName}
                </div>
                <div className="text-xs font-sans text-[var(--text-muted)] truncate">
                  {result.skillPurpose}
                </div>
              </div>
              {result.skillId && (
                <a
                  href={`/dashboard/skills/${result.skillId}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-sans font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)] border border-[var(--accent-primary)]/25 hover:border-[var(--accent-primary)]/40 transition-colors"
                >
                  Open <ArrowRight className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
