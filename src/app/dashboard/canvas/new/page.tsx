"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { clsx } from "clsx";
import { skillsApi } from "@/lib/api/skills";
import { CANVAS_TEMPLATES } from "@/components/canvas/AgentGraphTemplates";
import { createEmptyGraph, AgentGraphDefinition } from "@/types/graph";
import { toast } from "@/stores/toastStore";
import { BTN_PRIMARY, CARD, FIELD, INPUT, LABEL, META, PageHeader, Tag, plural } from "@/components/ui/surfaces";

function NewCanvasForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const n8nId = searchParams.get("n8nId");
  const difyId = searchParams.get("difyId");
  const template = CANVAS_TEMPLATES.find((t) => t.id === templateId) ?? null;

  const [name, setName] = useState(template ? `${template.name}` : "");
  const [purpose, setPurpose] = useState(template ? template.description : "");
  const [n8nGraph, setN8nGraph] = useState<AgentGraphDefinition | null>(null);
  const [difyGraph, setDifyGraph] = useState<AgentGraphDefinition | null>(null);
  const [n8nLoading, setN8nLoading] = useState(Boolean(n8nId));
  const [difyLoading, setDifyLoading] = useState(Boolean(difyId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!n8nId) return;
    setN8nLoading(true);
    fetch(`/api/workflows/n8n/${n8nId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const wf = json.data;
          setName(wf.name || `n8n Workflow #${n8nId}`);
          setPurpose(
            (wf.description || `Imported n8n workflow #${n8nId}`).slice(0, 280)
          );
          if (wf.convertedGraph) {
            setN8nGraph(wf.convertedGraph);
          }
          toast.success("Loaded n8n template", `${wf.name} ready to open on Canvas`);
        } else {
          toast.error("Failed to load n8n workflow", json.error);
        }
      })
      .catch((err) => {
        toast.error("Error loading n8n workflow", err.message);
      })
      .finally(() => {
        setN8nLoading(false);
      });
  }, [n8nId]);

  useEffect(() => {
    if (!difyId) return;
    setDifyLoading(true);
    fetch(`/api/workflows/dify/${difyId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const wf = json.data;
          setName(wf.name || `Dify Workflow`);
          setPurpose(
            (wf.description || `Imported Dify workflow template`).replace(/#+\s*/g, "").slice(0, 280)
          );
          if (wf.convertedGraph) {
            setDifyGraph(wf.convertedGraph);
          }
          toast.success("Loaded Dify template", `${wf.name} ready to open on Canvas`);
        } else {
          toast.error("Failed to load Dify template", json.error);
        }
      })
      .catch((err) => {
        toast.error("Error loading Dify template", err.message);
      })
      .finally(() => {
        setDifyLoading(false);
      });
  }, [difyId]);

  const activeGraph = difyGraph || n8nGraph || template?.graph || createEmptyGraph();

  const createMutation = useMutation({
    mutationFn: () =>
      skillsApi.create({
        name,
        purpose,
        instructions: purpose || template?.description || "Visual multi-agent graph.",
        allowedTools: ["document_search", "ai_extraction", "ai_classification", "deterministic_condition", "calculator", "final_report", "web_search"],
        actionsRequiringApproval: [],
        maxExecutionSteps: 50,
        inputSchema: { type: "object", properties: {}, required: [] },
        outputSchema: { type: "object", properties: {} },
        graphDefinition: activeGraph,
      }),
    onSuccess: (skill) => {
      toast.success("Agent graph created", `Opening canvas for "${skill.name}".`);
      router.push(`/dashboard/canvas/${skill.id}`);
    },
    onError: (e: unknown) => {
      let msg = e instanceof Error ? e.message : "Failed to create graph";
      const errWithFields = e as { fields?: Record<string, string[]> } | null;
      if (errWithFields?.fields) {
        const fieldDetails = Object.entries(errWithFields.fields)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
          .join(" | ");
        msg = `${msg} (${fieldDetails})`;
      }
      setError(msg);
      toast.error("Create failed", msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Graph name must be at least 2 characters.");
      return;
    }
    if (purpose.trim().length < 5) {
      setError("Purpose must be at least 5 characters.");
      return;
    }
    setError(null);
    createMutation.mutate();
  };

  const source = difyLoading
    ? "Fetching the Dify template and its DSL"
    : n8nLoading
    ? "Fetching the n8n workflow"
    : difyGraph
    ? `Imported from Dify: ${name}`
    : n8nGraph
    ? `Imported from n8n: ${name}`
    : template
    ? `Starting from blueprint: ${template.name}`
    : "Start from a blank canvas and drag in agents, tools, routers and gates";

  const preloaded = difyGraph
    ? { label: "Dify template loaded", graph: difyGraph, text: purpose }
    : n8nGraph
    ? { label: "n8n workflow loaded", graph: n8nGraph, text: purpose }
    : template
    ? { label: "Blueprint loaded", graph: template.graph, text: template.description }
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href="/dashboard/canvas"
        className="inline-flex rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        Agent canvas
      </Link>

      <PageHeader title="New agent graph" meta={source} />

      {(n8nLoading || difyLoading) && (
        <p role="status" className="font-sans text-[13px] text-[var(--text-muted)]">
          {n8nLoading
            ? "Translating n8n nodes and connections into canvas nodes"
            : "Translating Dify nodes, models and tools into canvas nodes"}
        </p>
      )}

      {preloaded && !n8nLoading && !difyLoading && (
        <section className={`${CARD} space-y-2 p-5`}>
          <div className="flex items-baseline justify-between gap-3">
            <Tag tone="accent">{preloaded.label}</Tag>
            <span className={META}>
              {plural(preloaded.graph.nodes.length, "node")} · {plural(preloaded.graph.edges.length, "edge")}
            </span>
          </div>
          <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{preloaded.text}</p>
        </section>
      )}

      <form onSubmit={handleSubmit} className={`${CARD} space-y-5 p-6`}>
        <div className="space-y-1.5">
          <label htmlFor="graph-name" className={LABEL}>
            Graph name
          </label>
          <input
            id="graph-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Multi-agent research crew"
            className={clsx(INPUT, "w-full")}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="graph-purpose" className={LABEL}>
            Purpose
          </label>
          <textarea
            id="graph-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            placeholder="What outcome does this graph automate?"
            className={clsx(FIELD, "w-full resize-y p-3 leading-6")}
          />
        </div>

        {error && (
          <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={createMutation.isPending} className={clsx(BTN_PRIMARY, "w-full")}>
          {createMutation.isPending ? "Creating graph" : "Create and open canvas"}
        </button>
      </form>
    </div>
  );
}

export default function NewCanvasPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-sans text-sm text-[var(--text-muted)]">Loading</div>}>
      <NewCanvasForm />
    </Suspense>
  );
}
