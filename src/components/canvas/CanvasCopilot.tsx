"use client";

import React, { useState, useCallback } from "react";
import { clsx } from "clsx";
import type { AgentGraphDefinition } from "@/types/graph";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/components/ui/surfaces";

interface CanvasCopilotProps {
  /** Called with the generated graph when the user submits a prompt. */
  onGraphGenerated: (graph: AgentGraphDefinition) => void;
  /** Whether the canvas is in trace mode (disables the copilot). */
  disabled?: boolean;
  /** Position of the copilot bar: top (default) or bottom. */
  position?: "top" | "bottom";
}

interface CopilotExample {
  label: string;
  prompt: string;
}

const EXAMPLES: CopilotExample[] = [
  {
    label: "Customer support pipeline",
    prompt:
      "Build a multi-agent customer support pipeline with an intent classifier, support agent, billing agent, and HITL gate for refunds > $500",
  },
  {
    label: "Research assistant",
    prompt:
      "Create a research pipeline that searches the web, extracts key findings, summarizes them, and outputs a structured report",
  },
  {
    label: "Code review loop",
    prompt:
      "Design a code review loop: a coder agent writes code, a critic agent reviews it, and they iterate until approved or max 3 rounds",
  },
  {
    label: "RAG pipeline",
    prompt:
      "Build a RAG pipeline with document retrieval, chunk embedding, a vector search step, and an LLM answer generation agent",
  },
];

/**
 * Canvas Copilot: Natural Language Graph Generator
 *
 * A prompt bar at the top of the canvas that takes a natural language description
 * and generates a full agent graph definition with nodes, prompts, and layouts.
 */
export function CanvasCopilot({ onGraphGenerated, disabled = false, position = "bottom" }: CanvasCopilotProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/canvas/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? `Generation failed (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.graph) {
        onGraphGenerated(data.graph);
        setPrompt("");
        setExpanded(false);
      } else {
        throw new Error(data.error ?? "No graph was generated");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, onGraphGenerated]);

  const applyExample = useCallback((example: CopilotExample) => {
    setPrompt(example.prompt);
    setExpanded(false);
  }, []);

  if (disabled) return null;

  const isBottom = position === "bottom";

  const examples = (
    <div
      className={clsx(
        "max-h-52 space-y-0.5 overflow-y-auto px-2 py-2",
        isBottom ? "border-b border-[var(--border-subtle)]" : "border-t border-[var(--border-subtle)]"
      )}
    >
      <div className="px-2 pb-1 font-sans text-xs text-[var(--text-muted)]">Example prompts</div>
      {EXAMPLES.map((ex) => (
        <button
          key={ex.label}
          type="button"
          onClick={() => applyExample(ex)}
          className="w-full cursor-pointer rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--text-primary)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        >
          <div className="font-sans text-[13px] text-[var(--text-primary)]">{ex.label}</div>
          <div className="truncate font-sans text-xs text-[var(--text-muted)]">{ex.prompt}</div>
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={clsx(
        "absolute left-1/2 z-40 w-[600px] max-w-[calc(100%-3rem)] -translate-x-1/2",
        isBottom ? "bottom-5" : "top-3"
      )}
    >
      <div className="flex flex-col overflow-hidden rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        {expanded && isBottom && examples}

        {error && (
          <p role="alert" className="border-b border-[var(--border-subtle)] px-3.5 py-2 font-sans text-[13px] text-[var(--state-error)]">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 px-3 py-2.5">
          <input
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            aria-label="Describe the graph to generate"
            placeholder="Describe a graph, for example a support pipeline with intent classification and approval"
            className="h-8 flex-1 bg-transparent px-1 font-sans text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            disabled={isGenerating}
          />
          <button type="button" onClick={handleSubmit} disabled={!prompt.trim() || isGenerating} className={BTN_PRIMARY_SM}>
            {isGenerating ? "Generating" : "Generate"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className={BTN_SECONDARY_SM}
          >
            Examples
          </button>
        </div>

        {expanded && !isBottom && examples}
      </div>
    </div>
  );
}
