"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { OpenApiIntegrationDTO } from "@/types/openapi";
import { openApiToolRegistryName } from "@/modules/openapi/dynamicTool";
import { META } from "@/components/ui/surfaces";

interface AvailableOpenApiToolsProps {
  /** Currently selected allowedTools (registry names). */
  selected: string[];
  onAdd: (registryName: string) => void;
}

const HEAD = "font-sans text-[13px] text-[var(--text-muted)]";
const LINK = "text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--text-primary)]";

/**
 * OpenAPI tool allow-listing picker for the skill and workflow editor.
 * Loads the user's connected OpenAPI integrations and lets them 1-click add
 * active endpoints to `allowedTools` using their runtime registry name (`openapi_<id>_<opId>`).
 */
export function AvailableOpenApiTools({ selected, onAdd }: AvailableOpenApiToolsProps) {
  const [integrations, setIntegrations] = useState<OpenApiIntegrationDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/openapi/integrations")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.success === true) setIntegrations(json.data ?? []);
        else setError(json?.error ?? "Failed to load OpenAPI integrations");
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load OpenAPI integrations");
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

  if (integrations === null) {
    return (
      <p role="status" className={clsx(HEAD, "border-t border-[var(--border-subtle)] pt-4")}>
        Loading OpenAPI tools
      </p>
    );
  }

  const activeIntegrations = integrations.filter(
    (i) => i.status === "CONNECTED" && i.endpoints && i.endpoints.length > 0
  );

  if (activeIntegrations.length === 0) {
    return (
      <div className="space-y-1 border-t border-[var(--border-subtle)] pt-4">
        <div className={HEAD}>OpenAPI and REST tools</div>
        <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
          None connected yet. Enable presets in the{" "}
          <Link href="/dashboard/tools?tab=openapi" className={LINK}>
            OpenAPI hub
          </Link>{" "}
          to pick them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
      <div className={HEAD}>OpenAPI and REST tools</div>
      {activeIntegrations.map((integration) => {
        const validEndpoints = integration.endpoints.filter((e) => e.enabled !== false);
        if (validEndpoints.length === 0) return null;

        return (
          <div key={integration.id} className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-sm text-[var(--text-primary)]">{integration.name}</span>
              <span className={META}>{validEndpoints.length} endpoints</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {validEndpoints.map((endpoint) => {
                const registryName = openApiToolRegistryName(integration.id, endpoint.operationId);
                const isSelected = selected.includes(registryName);
                const isWrite = endpoint.isWrite || endpoint.method !== "GET";

                return (
                  <button
                    key={registryName}
                    type="button"
                    onClick={() => onAdd(registryName)}
                    disabled={isSelected}
                    title={endpoint.description || `${endpoint.method} ${endpoint.path}`}
                    className={clsx(
                      "inline-flex h-7 max-w-full cursor-pointer items-center gap-2 rounded-[6px] border px-2.5 font-sans text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                      isSelected
                        ? "cursor-default border-[var(--border-subtle)] bg-[var(--text-primary)]/10 text-[var(--text-muted)]"
                        : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="shrink-0 font-mono text-[var(--text-muted)]">{endpoint.method}</span>
                    <span className="truncate">{endpoint.summary || endpoint.operationId}</span>
                    {isWrite && (
                      <span className="flex shrink-0 items-center gap-1 text-[var(--state-warning)]" title="Needs approval">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--state-warning)]" />
                        write
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
