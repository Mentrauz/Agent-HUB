"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Loader2, CircleAlert, Check, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { OpenApiIntegrationDTO } from "@/types/openapi";
import { openApiToolRegistryName } from "@/modules/openapi/dynamicTool";

interface AvailableOpenApiToolsProps {
  /** Currently selected allowedTools (registry names). */
  selected: string[];
  onAdd: (registryName: string) => void;
}

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
      <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)] text-xs font-sans text-[var(--state-error)]">
        <CircleAlert className="h-3 w-3 shrink-0" /> {error}
      </div>
    );
  }

  if (integrations === null) {
    return (
      <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)] text-xs font-sans text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-primary)]" /> Loading OpenAPI tools…
      </div>
    );
  }

  const activeIntegrations = integrations.filter(
    (i) => i.status === "CONNECTED" && i.endpoints && i.endpoints.length > 0
  );

  if (activeIntegrations.length === 0) {
    return (
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
        <div className="text-xs font-sans text-[var(--text-secondary)] font-medium">
          OpenAPI & REST tools
        </div>
        <p className="text-xs font-sans text-[var(--text-muted)]">
          No OpenAPI integrations connected yet. Enable presets in the{" "}
          <Link
            href="/dashboard/tools?tab=openapi"
            className="text-[var(--accent-primary)] underline decoration-dotted hover:text-[var(--accent-primary)]"
          >
            OpenAPI Hub
          </Link>{" "}
          to pick them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
      <div className="text-xs font-sans text-[var(--text-secondary)] font-medium flex items-center gap-1">
        <Globe className="h-3 w-3 text-[var(--accent-primary)]" /> OpenAPI REST tools
      </div>
      {activeIntegrations.map((integration) => {
        const validEndpoints = integration.endpoints.filter((e) => e.enabled !== false);
        if (validEndpoints.length === 0) return null;

        return (
          <div key={integration.id} className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-sans text-[var(--accent-primary)] font-medium">
              <Globe className="h-3 w-3" />
              {integration.name}
              <span className="text-[var(--text-muted)] normal-case tracking-normal font-medium">
                · {validEndpoints.length} endpoints
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
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
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-sans transition-colors cursor-pointer font-medium max-w-full",
                      isSelected
                        ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] opacity-80"
                        : "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/40"
                    )}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 text-[var(--state-success)]" />}
                    <span className="font-medium text-xs px-1 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
                      {endpoint.method}
                    </span>
                    <span className="truncate">{endpoint.summary || endpoint.operationId}</span>
                    {isWrite && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-medium px-1 rounded bg-[var(--state-warning)]/10 text-[var(--state-warning)]">
                        <ShieldCheck className="h-2 w-2" /> HITL
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
