"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { AgentGraphCardDTO, CanvasBlueprintDTO } from "@/types/dashboard";
import { BTN_SECONDARY_SM, CARD, HEAD_LINK, META, ROW_HOVER, SECTION_TITLE, plural } from "@/components/ui/surfaces";

interface MultiAgentCanvasShowcaseProps {
  agentGraphs: AgentGraphCardDTO[];
  blueprints: CanvasBlueprintDTO[];
}

// Template categories are stored uppercase ("ORCHESTRATION"); show them in sentence case
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function MultiAgentCanvasShowcase({ agentGraphs, blueprints }: MultiAgentCanvasShowcaseProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={SECTION_TITLE}>Canvas graphs</h2>
        <Link href="/dashboard/canvas" className={HEAD_LINK}>
          All graphs ({agentGraphs.length})
        </Link>
      </div>

      {/* Starter templates */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {blueprints.map((bp) => (
          <div key={bp.id} className={clsx(CARD, "flex flex-col gap-4 p-5")}>
            <div className="flex-1 space-y-2">
              <div className={META}>
                Template · {sentence(bp.category)}
              </div>
              <h3 className="font-sans text-sm font-medium leading-snug text-[var(--text-primary)]">{bp.name}</h3>
              <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                {bp.description}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={META}>{plural(bp.nodeCount, "node")}</span>
              <Link href={`/dashboard/canvas/new?template=${bp.id}`} className={BTN_SECONDARY_SM}>
                Open template
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* The user's own graphs */}
      {agentGraphs.length > 0 && (
        <div className={CARD}>
          <div className="border-b border-[var(--border-subtle)] px-5 py-3 font-sans text-[13px] text-[var(--text-muted)]">
            Your graphs
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {agentGraphs.slice(0, 3).map((graph) => (
              <li key={graph.id} className={clsx(ROW_HOVER, "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6")}>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{graph.name}</span>
                    <span className={META}>v{graph.versionNumber}</span>
                  </div>
                  <p className="line-clamp-1 font-sans text-[13px] text-[var(--text-secondary)]">{graph.purpose}</p>
                </div>
                <span className={clsx(META, "shrink-0")}>
                  {plural(graph.nodeCount, "node")} · {plural(graph.edgeCount, "edge")}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/dashboard/canvas/${graph.id}`} className={BTN_SECONDARY_SM}>
                    Open canvas
                  </Link>
                  <Link href={`/dashboard/skills/${graph.id}`} className={clsx(HEAD_LINK, "px-2 text-[13px]")}>
                    Config
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
