"use client";

import React, { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { skillsApi } from "@/lib/api/skills";
import { executionsApi } from "@/lib/api/executions";
import { AgentGraphCanvas } from "@/components/canvas/AgentGraphCanvas";
import { SkeletonSkillDetail } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BTN_PRIMARY, BTN_SECONDARY, META } from "@/components/ui/surfaces";

/**
 * Read-only snapshot of a graph + its most recent execution trace. Safe to
 * share — the canvas renders without the editor chrome (no palette, no
 * inspector editing, no validation strips).
 */
export default function CanvasSnapshotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: skill, isLoading, isError } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => skillsApi.get(id),
  });

  const draft = skill?.publishedVersion ?? skill?.currentDraft ?? skill?.versions?.[0] ?? null;

  const { data: pastExecutions = [] } = useQuery({
    queryKey: ["executions", "by-version", draft?.id],
    queryFn: () => executionsApi.list({ skillVersionId: draft!.id, limit: 5 }),
    enabled: Boolean(draft),
  });
  const lastExecution = pastExecutions[0] ?? null;
  const graph = draft?.graphDefinition ?? null;

  const coveredEdges = useMemo(() => {
    const ids = new Set<string>();
    for (const exec of pastExecutions) {
      const planner = exec.plannerOutput as Record<string, unknown> | null;
      const state = planner?.graph === true ? (planner.state as { traversedEdges?: string[] } | undefined) : undefined;
      for (const edgeId of state?.traversedEdges ?? []) ids.add(edgeId);
    }
    return Array.from(ids);
  }, [pastExecutions]);

  if (isLoading) return <SkeletonSkillDetail />;
  if (isError || !skill || !draft || !graph) {
    return (
      <EmptyState
        title="Snapshot not found"
        description="This graph snapshot does not exist or you do not have access to it."
        action={
          <Link href="/dashboard/canvas" className={BTN_SECONDARY}>
            Back to canvas
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex shrink-0 flex-col items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate font-sans text-xl font-medium text-[var(--text-primary)]">{skill.name}</h1>
          <p className={META}>
            read-only snapshot · v{draft.versionNumber} · {graph.nodes.length} nodes · {graph.edges.length} edges
            {lastExecution ? ` · last run ${lastExecution.status.toLowerCase()}` : " · no runs yet"}
          </p>
        </div>
        <Link href={`/dashboard/canvas/${skill.id}`} className={BTN_PRIMARY}>
          Open in editor
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        <AgentGraphCanvas graph={graph} onChange={() => {}} readOnly executionId={lastExecution?.id ?? null} coverage={coveredEdges} />
      </div>
    </div>
  );
}
