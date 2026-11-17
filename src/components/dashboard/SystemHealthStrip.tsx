"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { SystemHealthDTO } from "@/types/dashboard";
import { CARD, plural } from "@/components/ui/surfaces";

interface SystemHealthStripProps {
  health: SystemHealthDTO;
  liveCount: number;
}

const LINK = "rounded-[6px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

/** One mono readout line: runtime state, then each integration as a quiet link. */
export function SystemHealthStrip({ health, liveCount }: SystemHealthStripProps) {
  const isIdle = liveCount === 0;
  const mcpDot =
    health.mcpServersTotal === 0
      ? "var(--text-muted)"
      : health.mcpServersConnected === health.mcpServersTotal
      ? "var(--state-success)"
      : "var(--state-warning)";

  return (
    <div className={clsx(CARD, "flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 font-mono text-xs tabular-nums")}>
      <span className="flex items-center gap-2 text-[var(--text-primary)]">
        <span
          aria-hidden="true"
          className={clsx("h-1.5 w-1.5 rounded-full", !isIdle && "animate-pulse")}
          style={{ background: isIdle ? "var(--state-success)" : "var(--accent-primary)" }}
        />
        {isIdle ? "Runtime idle" : `${plural(liveCount, "run")} in flight`}
      </span>

      <Link href="/dashboard/settings" className={clsx(LINK, "flex items-center gap-2")} title="MCP servers">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: mcpDot }} />
        <span>
          <span className="text-[var(--text-secondary)]">
            {health.mcpServersConnected}/{health.mcpServersTotal}
          </span>{" "}
          MCP connected
        </span>
      </Link>
      <Link href="/dashboard/knowledge" className={LINK}>
        <span className="text-[var(--text-secondary)]">{health.ragChunksCount.toLocaleString()}</span> RAG chunks
      </Link>
      <Link href="/dashboard/a2a" className={LINK}>
        <span className="text-[var(--text-secondary)]">{health.a2aAgentsCount}</span> A2A agents
      </Link>
      <Link href="/dashboard/settings" className={LINK}>
        <span className="text-[var(--text-secondary)]">{health.vaultSecretsCount}</span> vault keys
      </Link>
      <Link href="/dashboard/tools" className={LINK}>
        <span className="text-[var(--text-secondary)]">{health.permittedToolsCount}</span> tools permitted
      </Link>
    </div>
  );
}
