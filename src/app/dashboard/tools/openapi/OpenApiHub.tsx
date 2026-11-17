"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Play,
  Layers,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Loader2,
  CircleAlert,
  Sparkles,
  Download,
  CheckCircle2,
  CloudSun,
  BadgeDollarSign,
  Globe2,
  BookOpen,
  Compass,
  ShoppingBag,
  GitFork,
  Zap,
  X,
  Check,
} from "lucide-react";
import { clsx } from "clsx";
import { OpenApiEndpointDefinition, OpenApiIntegrationDTO } from "@/types/openapi";
import { OPENAPI_PRESETS, OpenApiPreset } from "@/modules/openapi/presets";
import { OpenApiImportModal } from "./OpenApiImportModal";
import { OpenApiEndpointTesterModal } from "./OpenApiEndpointTesterModal";
import { OpenApiDirectoryBrowser } from "./OpenApiDirectoryBrowser";

const pad = (n: number) => String(n).padStart(2, "0");

const PRESET_ICONS: Record<string, typeof Globe> = {
  BadgeDollarSign,
  CloudSun,
  Globe2,
  BookOpen,
  Compass,
  ShoppingBag,
  Github: GitFork,
};

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
        setSuccessMessage(`Installed "${preset.name}" into tool matrix successfully.`);
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
    <div className="space-y-6 w-full font-sans">
      {/* Top Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-[var(--text-secondary)] px-3 py-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 font-medium">
          <Globe className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          {pad(integrations?.length ?? 0)} Apis ·{pad(totalTools)} Active tools ·{pad(hitlTools)} HITL gated
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setImportSpecUrl(undefined);
              setIsImportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Import Custom Spec
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] text-xs font-sans font-medium">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" /> {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto cursor-pointer hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] text-xs font-sans font-medium">
          <Check className="h-3.5 w-3.5 shrink-0" /> {successMessage}
          <button type="button" onClick={() => setSuccessMessage(null)} className="ml-auto cursor-pointer hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="space-y-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 p-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHubMode("CONNECTED")}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                hubMode === "CONNECTED"
                  ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]/60"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Mounted REST APIs ({integrations?.length ?? 0})
            </button>

            <button
              type="button"
              onClick={() => setHubMode("PRESETS")}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                hubMode === "PRESETS"
                  ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]/60"
              )}
            >
              <Zap className={clsx("h-3.5 w-3.5", hubMode === "PRESETS" ? "fill-[var(--text-muted)] text-[var(--state-warning)]" : "text-[var(--state-warning)]")} />
              Free tool packs ({OPENAPI_PRESETS.length})
            </button>

            <button
              type="button"
              onClick={() => setHubMode("DIRECTORY")}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer relative",
                hubMode === "DIRECTORY"
                  ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]/60"
              )}
            >
              <Globe className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              Public directory (apis.guru)
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-[var(--state-warning)] text-[var(--text-primary)] font-medium">
                2.5K+
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: MOUNTED REST APIS */}
        {hubMode === "CONNECTED" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[var(--text-muted)] text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-[var(--accent-primary)]" /> Loading mounted REST apis...
              </div>
            ) : !integrations || integrations.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[var(--border-strong)] rounded-md space-y-3 bg-[var(--surface-raised)]/40">
                <div className="w-10 h-10 rounded border border-[var(--accent-primary)]/25 flex items-center justify-center text-[var(--accent-primary)] mx-auto bg-[var(--accent-primary)]/10">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    No custom REST apis mounted
                  </p>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                    Install 1-click free tool packs (Forex, Weather, Wikipedia) or import any Swagger/OpenAPI URL to mount custom tools into your execution matrix.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setHubMode("PRESETS")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)] text-xs font-medium hover:bg-[var(--state-warning)]/10 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 fill-current" /> Browse Free Tool Packs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportSpecUrl(undefined);
                      setIsImportOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-medium hover:bg-[var(--cta-primary-hover)] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Import Custom Spec
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {integrations.map((integration) => {
                  const isExpanded = expandedId === integration.id;
                  const activeEndpoints = integration.endpoints.filter((e) => e.enabled !== false);

                  return (
                    <div
                      key={integration.id}
                      className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] overflow-hidden shadow-xs hover:border-[var(--accent-primary)]/40 transition-colors"
                    >
                      {/* Card Header */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                        className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-[var(--surface-sunken)] transition-colors border-b border-transparent data-[open=true]:border-[var(--border-subtle)] dark:data-[open=true]:border-[var(--accent-primary)]/40"
                        data-open={isExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-0.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)]">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[var(--accent-primary)]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xs font-medium text-[var(--text-primary)]">
                                {integration.name}
                              </h3>
                              <span className="px-1.5 py-0.5 text-xs font-sans rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-medium">
                                {integration.authType}
                              </span>
                              <span className="px-1.5 py-0.5 text-xs font-sans rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] font-medium">
                                {integration.status}
                              </span>
                            </div>
                            <p className="text-xs font-sans text-[var(--text-muted)] mt-0.5 truncate max-w-xl">
                              {integration.baseUrl}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <span className="text-xs font-sans font-medium text-[var(--text-secondary)] px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                            {pad(activeEndpoints.length)} TOOLS
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(integration.id, integration.name);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--state-error)] hover:bg-[var(--state-error)]/10 rounded transition-colors cursor-pointer"
                            title="Delete and unmount this integration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Endpoints Grid */}
                      {isExpanded && (
                        <div className="p-3.5 bg-[var(--surface-sunken)]/40 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {integration.endpoints.map((ep) => (
                              <div
                                key={ep.id}
                                className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] flex items-center justify-between gap-2 hover:border-[var(--accent-primary)]/40 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span
                                    className={`px-1.5 py-0.5 text-xs font-sans font-medium rounded border ${getMethodBadge(
                                      ep.method
                                    )}`}
                                  >
                                    {ep.method}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                                      {ep.summary || ep.operationId}
                                    </p>
                                    <p className="text-xs font-sans text-[var(--text-muted)] truncate">{ep.path}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {ep.requiresApproval && (
                                    <span
                                      title="Human-in-the-Loop Review Gated"
                                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--state-warning)] bg-[var(--state-warning)]/10 px-1.5 py-0.5 rounded border border-[var(--state-warning)]/25"
                                    >
                                      <ShieldAlert className="w-2.5 h-2.5" /> HITL
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setTestingEndpoint({ endpoint: ep, integration })}
                                    className="px-2 py-1 text-xs font-sans font-medium text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 hover:bg-[var(--accent-primary)]/10 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-current" /> Test
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FREE TOOL PACKS PRESETS */}
        {hubMode === "PRESETS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {OPENAPI_PRESETS.map((preset) => {
              const IconComp = PRESET_ICONS[preset.icon] || Globe;
              const installed = isPresetInstalled(preset.name);
              const isInstalling = installingPresetId === preset.id;

              return (
                <div
                  key={preset.id}
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 flex flex-col justify-between gap-3 hover:border-[var(--accent-primary)]/40 transition-colors group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 text-xs font-sans font-medium text-[var(--state-success)] bg-[var(--state-success)]/10 rounded border border-[var(--state-success)]/25">
                        {preset.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {preset.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-sans font-medium text-[var(--text-muted)] mb-1">
                        Included tools ({preset.endpoints.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {preset.endpoints.map((ep) => (
                          <span
                            key={ep.id}
                            className="px-1.5 py-0.5 text-xs font-sans rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            {ep.method} {ep.path}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-xs font-sans text-[var(--text-muted)] truncate max-w-[130px]">
                      {preset.baseUrl}
                    </span>

                    {installed ? (
                      <span className="flex items-center gap-1 text-xs font-sans font-medium text-[var(--state-success)] bg-[var(--state-success)]/10 px-2 py-1 rounded border border-[var(--state-success)]/25">
                        <CheckCircle2 className="w-3 h-3" /> Installed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInstallPreset(preset)}
                        disabled={isInstalling}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {isInstalling ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Adding...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3" /> 1-Click Mount
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: GLOBAL DIRECTORY (APIS.GURU) */}
        {hubMode === "DIRECTORY" && (
          <OpenApiDirectoryBrowser
            onSelectSpecUrl={(url) => {
              setImportSpecUrl(url);
              setIsImportOpen(true);
            }}
          />
        )}
      </div>

      {/* Modals */}
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

function getMethodBadge(method: string) {
  switch (method) {
    case "GET":
      return "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]";
    case "POST":
      return "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]";
    case "PUT":
    case "PATCH":
      return "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]";
    case "DELETE":
      return "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]";
    default:
      return "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]";
  }
}
