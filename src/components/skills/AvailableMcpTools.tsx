"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { McpServerDTO } from "@/types/mcp";
import { mcpToolRegistryName } from "@/modules/mcp/toolAdapter";
import { META } from "@/components/ui/surfaces";

interface AvailableMcpToolsProps {
  /** Currently selected allowedTools (registry names). */
  selected: string[];
  onAdd: (registryName: string) => void;
}

const HEAD = "font-sans text-[13px] text-[var(--text-muted)]";
const LINK = "text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--text-primary)]";

/**
 * MCP tool allow-listing picker for the skill editor. Loads the user's MCP
 * servers and lets them add discovered tools to `allowedTools` by their
 * runtime registry name (`mcp_<serverId>_<toolName>`) — the exact string the
 * permission checker validates at execution time.
 */
export function AvailableMcpTools({ selected, onAdd }: AvailableMcpToolsProps) {
  const [servers, setServers] = useState<McpServerDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mcp/servers")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.success === true) setServers(json.data ?? []);
        else setError(json?.error ?? "Failed to load MCP servers");
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load MCP servers");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="border-t border-[var(--border-subtle)] pt-4 font-sans text-[13px] text-[var(--state-error)]">
        {error}
      </p>
    );
  }

  if (servers === null) {
    return (
      <p role="status" className={clsx(HEAD, "border-t border-[var(--border-subtle)] pt-4")}>
        Loading MCP tools
      </p>
    );
  }

  const populated = servers.filter((s) => s.cachedTools.length > 0);
  if (populated.length === 0) {
    return (
      <div className="space-y-1 border-t border-[var(--border-subtle)] pt-4">
        <div className={HEAD}>MCP tools</div>
        <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
          None discovered yet. Connect servers and rediscover tools in the{" "}
          <Link href="/dashboard/tools?tab=mcp" className={LINK}>
            MCP server hub
          </Link>{" "}
          to allow-list them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
      <div className={HEAD}>MCP tools from connected servers</div>
      {populated.map((server) => (
        <div key={server.id} className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-sm text-[var(--text-primary)]">{server.name}</span>
            <span className={META}>{server.cachedTools.length} tools</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {server.cachedTools.map((tool) => {
              const registryName = mcpToolRegistryName(server.id, tool.name);
              const isSelected = selected.includes(registryName);
              return (
                <button
                  key={registryName}
                  type="button"
                  onClick={() => onAdd(registryName)}
                  disabled={isSelected}
                  title={tool.description ?? `MCP tool "${tool.name}" on ${server.name}`}
                  className={clsx(
                    "inline-flex h-7 max-w-full cursor-pointer items-center gap-2 rounded-[6px] border px-2.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                    isSelected
                      ? "cursor-default border-[var(--border-subtle)] bg-[var(--text-primary)]/10 text-[var(--text-muted)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className="truncate">
                    {isSelected ? "" : "+ "}
                    {registryName}
                  </span>
                  {tool.isWrite && (
                    <span className="flex shrink-0 items-center gap-1 font-sans text-[var(--state-warning)]" title="Needs approval">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--state-warning)]" />
                      write
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
