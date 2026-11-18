"use client";

import React, { useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import { OpenApiEndpointDefinition, OpenApiIntegrationDTO } from "@/types/openapi";
import { OPENAPI_PRESETS, OpenApiPreset } from "@/modules/openapi/presets";
import { OpenApiImportModal } from "./OpenApiImportModal";
import { OpenApiEndpointTesterModal } from "./OpenApiEndpointTesterModal";
import { OpenApiDirectoryBrowser } from "./OpenApiDirectoryBrowser";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_SECONDARY_SM, CARD, META, ROW_HOVER, Segmented, Tag, plural } from "@/components/ui/surfaces";

export function OpenApiHub() {
  const [hubMode, setHubMode] = useState<"CONNECTED" | "PRESETS" | "DIRECTORY">("CONNECTED");
  const [integrations, setIntegrations] = useState<OpenApiIntegrationDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [installingPresetId, setInstallingPresetId] = useState<string | null>(null);

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSpecUrl, setImportSpecUrl] = useState<string | undefined>(undefined);
  const [testingEndpoint, setTestingEndpoint] = useState<{
    endpoint: OpenApiEndpointDefinition;
    integration: OpenApiIntegrationDTO;
  } | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/openapi/integrations");
      const json = await res.json();
      if (!res.ok || json.success === false) {
        setError(json.error || "Failed to load integrations");
      } else {
        setIntegrations(json.data);
        setExpandedId((prev) => prev ?? (json.data.length > 0 ? json.data[0].id : null));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleInstallPreset = async (preset: OpenApiPreset) => {
    setInstallingPresetId(preset.id);
    try {
      const res = await fetch("/api/openapi/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
          baseUrl: preset.baseUrl,
          authType: "NONE",
          endpoints: preset.endpoints,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        await fetchIntegrations();
        setSuccessMessage(`Installed "${preset.name}" and mounted its tools.`);
        setHubMode("CONNECTED");
        setExpandedId(json.data.id);
      } else {
        setError(json.error || "Failed to install preset");
      }
    } catch {
      setError("Error installing preset pack");
    } finally {
      setInstallingPresetId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" and unmount all its generated tools?`)) return;

    try {
      const res = await fetch(`/api/openapi/integrations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setIntegrations((prev) => (prev ? prev.filter((i) => i.id !== id) : []));
        setSuccessMessage(`Deleted integration "${name}".`);
      }
    } catch {
      setError("Failed to delete integration");
    }
  };

  const totalTools =
    integrations?.reduce(
      (sum, i) => sum + i.endpoints.filter((ep) => ep.enabled !== false).length,
      0
    ) ?? 0;

  const hitlTools =
    integrations?.reduce(
      (sum, i) =>
        sum + i.endpoints.filter((ep) => ep.enabled !== false && ep.requiresApproval).length,
      0
    ) ?? 0;

  const isPresetInstalled = (presetName: string) => {
    return integrations?.some((i) => i.name === presetName);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className={META}>
          {plural(integrations?.length ?? 0, "API")} · {plural(totalTools, "active tool")} · {hitlTools} approval gated
        </p>
        <button
          type="button"
          onClick={() => {
            setImportSpecUrl(undefined);
            setIsImportOpen(true);
          }}
          className={BTN_PRIMARY}
        >
          Import custom spec
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 font-sans text-[13px] text-[var(--state-error)]">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className={BTN_SECONDARY_SM}>
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div role="status" className="flex items-center justify-between gap-3 font-sans text-[13px] text-[var(--state-success)]">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className={BTN_SECONDARY_SM}>
            Dismiss
          </button>
        </div>
      )}

      <Segmented
        label="View"
        hideLabel
        value={hubMode}
        onChange={setHubMode}
        options={[
          { id: "CONNECTED", label: `Mounted REST APIs ${integrations?.length ?? 0}` },
          { id: "PRESETS", label: `Free tool packs ${OPENAPI_PRESETS.length}` },
          { id: "DIRECTORY", label: "Public directory (apis.guru)" },
        ]}
      />

      {hubMode === "CONNECTED" && (
        <div className="space-y-3">
          {loading ? (
            <p className="py-16 text-center font-sans text-sm text-[var(--text-muted)]">Loading mounted REST APIs</p>
          ) : !integrations || integrations.length === 0 ? (
            <div className="space-y-3 py-14 text-center">
              <p className="font-sans text-sm text-[var(--text-primary)]">No REST APIs mounted</p>
              <p className="mx-auto max-w-md font-sans text-[13px] text-[var(--text-muted)]">
                Install a free tool pack such as forex, weather or Wikipedia, or import any Swagger or OpenAPI URL to mount its endpoints as tools.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button type="button" onClick={() => setHubMode("PRESETS")} className={BTN_SECONDARY}>
                  Browse free tool packs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportSpecUrl(undefined);
                    setIsImportOpen(true);
                  }}
                  className={BTN_PRIMARY}
                >
                  Import custom spec
                </button>
              </div>
            </div>
          ) : (
            <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
              {integrations.map((integration) => {
                const isExpanded = expandedId === integration.id;
                const activeEndpoints = integration.endpoints.filter((e) => e.enabled !== false);

                return (
                  <li key={integration.id}>
                    <div className={clsx(ROW_HOVER, "flex flex-col justify-between gap-3 px-5 py-3 md:flex-row md:items-center")}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                        aria-expanded={isExpanded}
                        className="min-w-0 flex-1 cursor-pointer space-y-0.5 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                          <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">{integration.name}</h3>
                          <span className={META}>{String(integration.authType).toLowerCase()}</span>
                          <Tag tone={String(integration.status).toUpperCase() === "ACTIVE" ? "good" : "neutral"}>
                            {String(integration.status).toLowerCase()}
                          </Tag>
                        </div>
                        <p className="truncate font-mono text-xs text-[var(--text-muted)]">{integration.baseUrl}</p>
                      </button>

                      <div className="flex shrink-0 items-center gap-4 self-end md:self-auto">
                        <span className={META}>{plural(activeEndpoints.length, "tool")}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(integration.id, integration.name)}
                          className={clsx(BTN_SECONDARY_SM, "text-[var(--state-error)]")}
                          title="Delete and unmount this integration"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                        {integration.endpoints.map((ep) => (
                          <li key={ep.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                            <div className="flex min-w-0 flex-1 items-baseline gap-3">
                              <span className="w-12 shrink-0 font-mono text-xs text-[var(--text-secondary)]">{ep.method}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-sans text-[13px] text-[var(--text-primary)]">{ep.summary || ep.operationId}</p>
                                <p className="truncate font-mono text-xs text-[var(--text-muted)]">{ep.path}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              {ep.requiresApproval && (
                                <span title="Needs human approval before it runs">
                                  <Tag tone="warn">Approval</Tag>
                                </span>
                              )}
                              <button type="button" onClick={() => setTestingEndpoint({ endpoint: ep, integration })} className={BTN_SECONDARY_SM}>
                                Test
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {hubMode === "PRESETS" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {OPENAPI_PRESETS.map((preset) => {
            const installed = isPresetInstalled(preset.name);
            const isInstalling = installingPresetId === preset.id;

            return (
              <div key={preset.id} className={clsx(CARD, "flex flex-col justify-between gap-4 p-5")}>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">{preset.name}</h3>
                    <span className={clsx(META, "shrink-0")}>{preset.badge}</span>
                  </div>
                  <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{preset.description}</p>
                  <div className="space-y-1">
                    <p className="font-sans text-[13px] text-[var(--text-muted)]">Included tools ({preset.endpoints.length})</p>
                    <p className="font-mono text-xs leading-5 text-[var(--text-secondary)]">
                      {preset.endpoints.map((ep) => `${ep.method} ${ep.path}`).join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                  <span className="max-w-[140px] truncate font-mono text-xs text-[var(--text-muted)]">{preset.baseUrl}</span>
                  {installed ? (
                    <Tag tone="good">Installed</Tag>
                  ) : (
                    <button type="button" onClick={() => handleInstallPreset(preset)} disabled={isInstalling} className={BTN_SECONDARY_SM}>
                      {isInstalling ? "Adding" : "Mount"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hubMode === "DIRECTORY" && (
        <OpenApiDirectoryBrowser
          onSelectSpecUrl={(url) => {
            setImportSpecUrl(url);
            setIsImportOpen(true);
          }}
        />
      )}

      <OpenApiImportModal
        isOpen={isImportOpen}
        initialSpecUrl={importSpecUrl}
        onClose={() => {
          setIsImportOpen(false);
          setImportSpecUrl(undefined);
        }}
        onSuccess={fetchIntegrations}
      />

      {testingEndpoint && (
        <OpenApiEndpointTesterModal
          endpoint={testingEndpoint.endpoint}
          integrationId={testingEndpoint.integration.id}
          baseUrl={testingEndpoint.integration.baseUrl}
          authType={testingEndpoint.integration.authType}
          authConfig={testingEndpoint.integration.authConfig}
          onClose={() => setTestingEndpoint(null)}
        />
      )}
    </div>
  );
}
