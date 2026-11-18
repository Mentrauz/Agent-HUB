"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { skillsApi } from "@/lib/api/skills";
import { CANVAS_TEMPLATES } from "@/components/canvas/AgentGraphTemplates";
import { SkeletonGrid } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BTN_PRIMARY, BTN_SECONDARY_SM, CARD, META, PageHeader, SECTION_TITLE, plural } from "@/components/ui/surfaces";

export default function CanvasGalleryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillsApi.list({}),
  });

  const allSkills = data?.items ?? [];
  const graphSkills = allSkills.filter((s) => {
    const version = s.publishedVersion ?? s.currentDraft;
    return Boolean(version?.graphDefinition && version.graphDefinition.nodes.length > 0);
  });

  return (
    <div className="w-full space-y-10">
      <PageHeader
        title="Agent canvas"
        meta="Design multi-agent graphs with supervisors, routers, approval gates, loops and parallel branches"
        action={
          <Link href="/dashboard/canvas/new" className={BTN_PRIMARY}>
            New agent graph
          </Link>
        }
      />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={SECTION_TITLE}>Blueprints</h2>
          <span className={META}>{CANVAS_TEMPLATES.length} starters</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CANVAS_TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} className={`${CARD} flex flex-col justify-between gap-4 p-5`}>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-sans text-sm font-medium leading-snug text-[var(--text-primary)]">{tmpl.name}</h3>
                  <span className={`${META} shrink-0`}>{String(tmpl.category).toLowerCase()}</span>
                </div>
                <p className="line-clamp-3 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{tmpl.description}</p>
                <p className={META}>
                  {plural(tmpl.graph.nodes.length, "node")} · {plural(tmpl.graph.edges.length, "edge")}
                </p>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <Link href={`/dashboard/canvas/new?template=${tmpl.id}`} className={BTN_SECONDARY_SM}>
                  Use blueprint
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={SECTION_TITLE}>My graphs</h2>
          <span className={META}>{graphSkills.length}</span>
        </div>

        {isLoading ? (
          <SkeletonGrid cards={3} />
        ) : isError ? (
          <EmptyState title="Couldn't load graphs" description="There was an error fetching your agent graphs." />
        ) : graphSkills.length === 0 ? (
          <EmptyState
            title="No agent graphs yet"
            description="Start from a blueprint above, or design your own on a blank canvas."
            action={
              <Link href="/dashboard/canvas/new" className={BTN_PRIMARY}>
                Create graph
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {graphSkills.map((skill) => {
              const version = skill.publishedVersion ?? skill.currentDraft;
              const graph = version?.graphDefinition;
              const nodeTypes = Array.from(new Set(graph?.nodes.map((n) => n.type) ?? []));
              return (
                <div key={skill.id} className={`${CARD} flex flex-col justify-between gap-4 p-5`}>
                  <div className="space-y-2">
                    <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{skill.name}</h3>
                    <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{skill.purpose}</p>
                    <p className="font-mono text-xs leading-5 text-[var(--text-muted)]">{nodeTypes.join(" · ")}</p>
                    <p className={META}>
                      {plural(graph?.nodes.length ?? 0, "node")} · {plural(graph?.edges.length ?? 0, "edge")} · v{version?.versionNumber ?? 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
                    <Link href={`/dashboard/canvas/${skill.id}`} className={BTN_PRIMARY}>
                      Open canvas
                    </Link>
                    <Link href={`/dashboard/skills/${skill.id}`} className={BTN_SECONDARY_SM}>
                      Skill editor
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
