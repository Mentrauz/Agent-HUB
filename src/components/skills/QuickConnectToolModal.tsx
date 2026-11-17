"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  Globe,
  Plus,
  Check,
  Loader2,
  Wrench,
  Info,
} from "lucide-react";
import { clsx } from "clsx";
import { OPENAPI_PRESETS, OpenApiPreset } from "@/modules/openapi/presets";
import { BUILT_IN_TOOL_CATALOG } from "@/modules/tools";
import { openApiToolRegistryName } from "@/modules/openapi/dynamicTool";
import { toast } from "@/stores/toastStore";

interface QuickConnectToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTools: string[];
  onAddTool: (toolName: string) => void;
}

export function QuickConnectToolModal({
  isOpen,
  onClose,
  selectedTools,
  onAddTool,
}: QuickConnectToolModalProps) {
  const [tab, setTab] = useState<"PUBLIC_PRESETS" | "BUILTIN">("PUBLIC_PRESETS");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [installingPresetId, setInstallingPresetId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter Public Presets
  const filteredPresets = OPENAPI_PRESETS.filter((preset) => {
    const matchesCat = categoryFilter === "ALL" || preset.category === categoryFilter;
    const matchesSearch =
      !search ||
      preset.name.toLowerCase().includes(search.toLowerCase()) ||
      preset.description.toLowerCase().includes(search.toLowerCase()) ||
      preset.endpoints.some((ep) => ep.summary.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Filter Built-in Tools
  const filteredBuiltins = BUILT_IN_TOOL_CATALOG.filter((tool) => {
    const matchesCat = categoryFilter === "ALL" || tool.category === categoryFilter;
    const matchesSearch =
      !search ||
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleInstallAndAddPreset = async (preset: OpenApiPreset) => {
    setInstallingPresetId(preset.id);
    try {
      // 1. Post to API to save integration if not already saved
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
      const integrationId = json?.data?.id || preset.id;

      // 2. Add first endpoint or all endpoints to selectedTools in form
      let addedCount = 0;
      for (const ep of preset.endpoints) {
        const regName = openApiToolRegistryName(integrationId, ep.operationId);
        if (!selectedTools.includes(regName)) {
          onAddTool(regName);
          addedCount++;
        }
      }

      toast.success(
        "Tool Pack Connected!",
        `Added ${addedCount || preset.endpoints.length} endpoints from "${preset.name}" directly to your skill.`
      );
    } catch {
      toast.error("Failed to connect preset", "Could not register endpoints");
    } finally {
      setInstallingPresetId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-xl border border-[var(--accent-primary)]/25 bg-[var(--surface-raised)] overflow-hidden font-sans flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="bg-[var(--surface-raised)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-2">
                Quick-Connect Tools & Public APIs
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--state-success)]/10 text-[var(--state-success)] font-medium">
                  Zero Form Loss
                </span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-serif">
                Connect external public APIs and built-in execution engines without leaving this page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-3 border-b border-[var(--border-subtle)] space-y-2 bg-[var(--surface-sunken)]/60">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-sunken)]/70 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTab("PUBLIC_PRESETS");
                  setCategoryFilter("ALL");
                }}
                className={clsx(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  tab === "PUBLIC_PRESETS"
                    ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] dark:text-[var(--cta-primary-text)] "
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Free Public APIs ({OPENAPI_PRESETS.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("BUILTIN");
                  setCategoryFilter("ALL");
                }}
                className={clsx(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  tab === "BUILTIN"
                    ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] dark:text-[var(--cta-primary-text)] "
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Built-In Engines ({BUILT_IN_TOOL_CATALOG.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search APIs, endpoints, tools…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40"
              />
            </div>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === "PUBLIC_PRESETS" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPresets.map((preset) => {
                const isInstalling = installingPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 hover:border-[var(--accent-primary)]/40 transition-colors flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-medium text-[var(--text-primary)]">
                            {preset.name}
                          </h4>
                          <span className="text-xs font-sans text-[var(--state-success)] font-medium">
                            {preset.badge}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-xs font-medium text-[var(--text-secondary)]">
                          {preset.category}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-serif line-clamp-2 mt-1 leading-snug">
                        {preset.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <div className="text-xs text-[var(--text-muted)] font-sans">
                        {preset.endpoints.length} endpoints · {preset.baseUrl.replace(/^https?:\/\//, "")}
                      </div>

                      <button
                        type="button"
                        disabled={isInstalling}
                        onClick={() => handleInstallAndAddPreset(preset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-medium hover:bg-[var(--cta-primary-hover)] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isInstalling ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        {isInstalling ? "Connecting…" : "Add to skill"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBuiltins.map((tool) => {
                const isSelected = selectedTools.includes(tool.name);
                return (
                  <div
                    key={tool.name}
                    className={clsx(
                      "p-3.5 rounded-lg border transition-colors flex flex-col justify-between space-y-2.5",
                      isSelected
                        ? "border-[var(--state-success)]/40 bg-[var(--state-success)]/10"
                        : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/90"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                          <Wrench className="h-3 w-3 text-[var(--accent-primary)]" />
                          {tool.name}
                        </h4>
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded text-xs font-medium ",
                            tool.type === "WRITE"
                              ? "bg-[var(--state-warning)]/10 text-[var(--state-warning)]"
                              : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          )}
                        >
                          {tool.type}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-serif line-clamp-2 mt-1 leading-snug">
                        {tool.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--text-muted)] font-sans">
                        Category: {tool.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isSelected) {
                            onAddTool(tool.name);
                            toast.success("Tool Added", `"${tool.name}" added to allowed tools.`);
                          }
                        }}
                        disabled={isSelected}
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0",
                          isSelected
                            ? "bg-[var(--state-success)] text-[var(--cta-primary-text)] cursor-default"
                            : "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] hover:bg-[var(--cta-primary-hover)] cursor-pointer"
                        )}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {isSelected ? "Already added" : "Add tool"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] flex items-center justify-between text-xs">
          <span className="text-xs text-[var(--text-muted)] font-serif flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0" />
            <span>Need full custom Swagger/OpenAPI URLs? Import them anytime via the <strong>Tool Registry</strong>.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--surface-raised)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
