"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plug, Loader2, Server, ShieldCheck, CircleAlert, Check } from "lucide-react";
import { clsx } from "clsx";
import { McpServerDTO } from "@/types/mcp";
import { mcpToolRegistryName } from "@/modules/mcp/toolAdapter";

interface AvailableMcpToolsProps {
  /** Currently selected allowedTools (registry names). */
  selected: string[];
  onAdd: (registryName: string) => void;
}

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
      <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)] text-xs font-sans text-[var(--state-error)]">
        <CircleAlert className="h-3 w-3 shrink-0" /> {error}
      </div>
    );
  }

  if (servers === null) {
    return (
      <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)] text-xs font-sans text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-primary)]" /> Loading MCP tools…
      </div>
    );
  }

  const populated = servers.filter((s) => s.cachedTools.length > 0);
  if (populated.length === 0) {
    return (
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
        <div className="text-xs font-sans text-[var(--text-secondary)] font-medium">
          MCP tools
        </div>
        <p className="text-xs font-sans text-[var(--text-muted)]">
          No MCP tools discovered yet. Connect servers and rediscover tools in the{" "}
          <Link
            href="/dashboard/tools?tab=mcp"
            className="text-[var(--accent-primary)] underline decoration-dotted hover:text-[var(--accent-primary)]"
          >
            MCP Server Hub
          </Link>{" "}
          to allow-list them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
      <div className="text-xs font-sans text-[var(--text-secondary)] font-medium flex items-center gap-1">
        <Plug className="h-3 w-3 text-[var(--accent-primary)]" /> MCP tools from connected servers
      </div>
      {populated.map((server) => (
        <div key={server.id} className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-sans text-[var(--accent-primary)] font-medium">
            <Server className="h-3 w-3" />
            {server.name}
            <span className="text-[var(--text-muted)] normal-case tracking-normal font-medium">
              · {server.cachedTools.length} tools
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-sans transition-colors cursor-pointer font-medium max-w-full",
                    isSelected
                      ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] opacity-80"
                      : "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)] hover:border-[var(--state-warning)]/40"
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-[var(--state-success)]" />}
                  <span className="truncate">{registryName}</span>
                  {tool.isWrite && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium px-1 rounded bg-[var(--state-warning)]/10">
                      <ShieldCheck className="h-2 w-2" /> HITL
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
