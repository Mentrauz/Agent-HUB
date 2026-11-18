"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import type { AgentGraphDefinition } from "@/types/graph";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  FIELD,
  META,
  ROW_HOVER,
  SECTION_TITLE,
  Tag,
  plural,
} from "@/components/ui/surfaces";

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
              "Skill synthesized and installed",
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
        toast.success("Installed", `${data.data.skillName} is now in your Studio`, {
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
    <div className="space-y-6">
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <div className="space-y-1">
            <h2 className={CARD_TITLE}>Skill synthesizer</h2>
            <p className="font-sans text-[13px] text-[var(--text-muted)]">
              Describe a goal in plain language and get a multi-agent graph with MCP servers found for you
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="synth-prompt" className="sr-only">
              Automation goal
            </label>
            <textarea
              id="synth-prompt"
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
              placeholder={'Describe your automation goal, for example "Check new GitHub issues, look up the user tier in Postgres and post high-priority alerts to Slack"'}
              rows={4}
              className={clsx(FIELD, "w-full resize-none p-3 leading-6")}
              disabled={isSynthesizing}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSynthesize(false)}
                disabled={!prompt.trim() || isSynthesizing}
                className={BTN_PRIMARY}
              >
                {isSynthesizing ? "Synthesizing" : "Generate graph"}
              </button>
              <button type="button" onClick={() => setShowExamples(!showExamples)} aria-expanded={showExamples} className={BTN_SECONDARY}>
                Examples
              </button>
            </div>
            <span className={META}>⌘ or Ctrl + Enter to generate</span>
          </div>

          {showExamples && (
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[10px] border border-[var(--border-subtle)]">
              {EXAMPLE_PROMPTS.map((ex) => (
                <li key={ex.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(ex.prompt);
                      setShowExamples(false);
                      inputRef.current?.focus();
                    }}
                    className={clsx(
                      ROW_HOVER,
                      "w-full cursor-pointer space-y-0.5 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                    )}
                  >
                    <div className="font-sans text-sm text-[var(--text-primary)]">{ex.label}</div>
                    <div className="truncate font-sans text-[13px] text-[var(--text-muted)]">{ex.prompt}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
              {error}
            </p>
          )}
        </div>
      </section>

      {result && (
        <div className="space-y-6">
          {/* Goal and install */}
          <section className={clsx(CARD, "flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start")}>
            <div className="min-w-0 space-y-2">
              <div className="font-sans text-[13px] text-[var(--text-muted)]">Detected goal</div>
              <p className="font-sans text-sm leading-6 text-[var(--text-primary)]">{result.analysis?.goal || prompt}</p>
              {result.warning && <p className="font-sans text-[13px] text-[var(--state-warning)]">{result.warning}</p>}
            </div>
            {!installed ? (
              <button type="button" onClick={handleInstallOnly} disabled={installing} className={clsx(BTN_PRIMARY, "shrink-0")}>
                {installing ? "Installing" : "Install in one click"}
              </button>
            ) : (
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Tag tone="good">Installed</Tag>
                {result.skillId && (
                  <Link href={`/dashboard/canvas/${result.skillId}`} className={BTN_SECONDARY}>
                    Open in canvas
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Servers */}
          {result.servers && result.servers.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className={SECTION_TITLE}>MCP servers</h3>
                <span className={META}>{result.servers.length}</span>
              </div>
              <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
                {result.servers.map((server, idx) => {
                  const isExpanded = expandedServers.has(idx);
                  const isMounted = result.mountedServerIds.includes(server.directoryMatch?.id || "");
                  return (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => toggleServer(idx)}
                        aria-expanded={isExpanded}
                        className={clsx(
                          ROW_HOVER,
                          "flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                        )}
                      >
                        <span className="truncate font-sans text-sm text-[var(--text-primary)]">{server.name}</span>
                        <span className="flex shrink-0 items-center gap-4">
                          <Tag tone={server.directoryMatch ? "good" : "warn"}>{server.directoryMatch ? "Found" : "Manual setup"}</Tag>
                          {isMounted && <Tag tone="accent">Mounted</Tag>}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="space-y-2 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-5 py-4">
                          <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{server.purpose}</p>
                          {server.directoryMatch ? (
                            <div className="space-y-1">
                              <p className={META}>
                                {server.directoryMatch.source} · {server.directoryMatch.transport} · {server.directoryMatch.stars} stars
                              </p>
                              <p className={META}>{server.directoryMatch.id}</p>
                              {server.directoryMatch.description && (
                                <p className="font-sans text-[13px] leading-5 text-[var(--text-muted)]">{server.directoryMatch.description}</p>
                              )}
                            </div>
                          ) : (
                            <p className="font-sans text-[13px] text-[var(--state-warning)]">
                              No directory match. This server needs manual configuration.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Steps */}
          {result.analysis?.steps && result.analysis.steps.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className={SECTION_TITLE}>Workflow steps</h3>
                <span className={META}>{result.analysis.steps.length}</span>
              </div>
              <ol className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
                {result.analysis.steps.map((step, idx) => (
                  <li key={idx} className="flex items-baseline gap-4 px-5 py-3">
                    <span className={clsx(META, "w-5 shrink-0")}>{idx + 1}</span>
                    <span className="font-sans text-sm text-[var(--text-secondary)]">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Generated graph */}
          {result.graph?.nodes && result.graph.nodes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className={SECTION_TITLE}>Generated graph</h3>
                <span className={META}>
                  {plural(result.graph.nodes.length, "node")} · {plural(result.graph.edges.length, "edge")}
                </span>
              </div>
              <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
                {result.graph.nodes.map((node) => {
                  const isExpanded = expandedNodes.has(node.id);
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => toggleNode(node.id)}
                        aria-expanded={isExpanded}
                        className={clsx(
                          ROW_HOVER,
                          "flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                        )}
                      >
                        <span className="flex min-w-0 items-baseline gap-4">
                          <span className="truncate font-sans text-sm text-[var(--text-primary)]">{node.data.label}</span>
                          <span className={META}>{node.type}</span>
                        </span>
                        {node.type === "approval" && <Tag tone="warn">Needs approval</Tag>}
                      </button>
                      {isExpanded && (
                        <div className="space-y-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-5 py-4">
                          {node.data.prompt && (
                            <div className="space-y-1">
                              <div className="font-sans text-[13px] text-[var(--text-muted)]">System prompt</div>
                              <p className="whitespace-pre-wrap font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{node.data.prompt}</p>
                            </div>
                          )}
                          {[
                            node.data.mcpToolName && { k: "Tool", v: `${node.data.mcpToolServer}/${node.data.mcpToolName}` },
                            node.data.condition && { k: "Condition", v: node.data.condition },
                            node.data.routerPrompt && { k: "Router", v: node.data.routerPrompt },
                            node.data.approvalReason && { k: "Approval", v: node.data.approvalReason },
                            node.data.maxIterations && { k: "Max iterations", v: String(node.data.maxIterations) },
                          ]
                            .filter((row): row is { k: string; v: string } => Boolean(row))
                            .map((row) => (
                              <div key={row.k} className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                                <span className="text-[var(--text-muted)]">{row.k}: </span>
                                {row.v}
                              </div>
                            ))}
                          {result.graph.edges
                            .filter((e) => e.source === node.id)
                            .map((edge) => (
                              <div key={edge.id} className={META}>
                                → {edge.target}
                                {edge.label && <> ({edge.label})</>}
                              </div>
                            ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Skill name */}
          {result.skillName && (
            <section className={clsx(CARD, "flex items-center justify-between gap-4 px-5 py-4")}>
              <div className="min-w-0 space-y-0.5">
                <div className="font-sans text-sm font-medium text-[var(--text-primary)]">{result.skillName}</div>
                <div className="truncate font-sans text-[13px] text-[var(--text-muted)]">{result.skillPurpose}</div>
              </div>
              {result.skillId && (
                <Link href={`/dashboard/skills/${result.skillId}`} className={BTN_SECONDARY_SM}>
                  Open
                </Link>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
