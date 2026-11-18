"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { OPENAPI_PRESETS, OpenApiPreset } from "@/modules/openapi/presets";
import { BUILT_IN_TOOL_CATALOG } from "@/modules/tools";
import { openApiToolRegistryName } from "@/modules/openapi/dynamicTool";
import { toast } from "@/stores/toastStore";
import { BTN_SECONDARY, BTN_SECONDARY_SM, FIELD, META, Segmented } from "@/components/ui/surfaces";

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
        "Tool pack connected",
        `Added ${addedCount || preset.endpoints.length} endpoints from "${preset.name}" to your skill.`
      );
    } catch {
      toast.error("Failed to connect preset", "Could not register endpoints");
    } finally {
      setInstallingPresetId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-connect-title"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="space-y-1">
            <h3 id="quick-connect-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
              Connect tools and public APIs
            </h3>
            <p className="font-sans text-[13px] text-[var(--text-muted)]">
              Your form is kept while you add tools here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 shrink-0 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            label="Source"
            hideLabel
            value={tab}
            onChange={(v) => {
              setTab(v);
              setCategoryFilter("ALL");
            }}
            options={[
              { id: "PUBLIC_PRESETS", label: `Free public APIs ${OPENAPI_PRESETS.length}` },
              { id: "BUILTIN", label: `Built-in tools ${BUILT_IN_TOOL_CATALOG.length}` },
            ]}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search APIs and tools"
            placeholder="Search"
            className={clsx(FIELD, "h-9 w-full px-3 sm:max-w-xs")}
          />
        </div>

        <ul className="flex-1 divide-y divide-[var(--border-subtle)] overflow-y-auto">
          {tab === "PUBLIC_PRESETS"
            ? filteredPresets.map((preset) => {
                const isInstalling = installingPresetId === preset.id;
                return (
                  <li key={preset.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h4 className="font-sans text-sm font-medium text-[var(--text-primary)]">{preset.name}</h4>
                        <span className={META}>{String(preset.category).toLowerCase()}</span>
                        <span className={META}>{preset.badge}</span>
                      </div>
                      <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{preset.description}</p>
                      <p className={META}>
                        {preset.endpoints.length} endpoints · {preset.baseUrl.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isInstalling}
                      onClick={() => handleInstallAndAddPreset(preset)}
                      className={clsx(BTN_SECONDARY_SM, "shrink-0")}
                    >
                      {isInstalling ? "Connecting" : "Add to skill"}
                    </button>
                  </li>
                );
              })
            : filteredBuiltins.map((tool) => {
                const isSelected = selectedTools.includes(tool.name);
                return (
                  <li key={tool.name} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h4 className="font-mono text-sm text-[var(--text-primary)]">{tool.name}</h4>
                        <span className={META}>{tool.type === "WRITE" ? "write" : "read"}</span>
                        <span className={META}>{String(tool.category).toLowerCase()}</span>
                      </div>
                      <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{tool.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSelected) {
                          onAddTool(tool.name);
                          toast.success("Tool added", `"${tool.name}" added to allowed tools.`);
                        }
                      }}
                      disabled={isSelected}
                      className={clsx(BTN_SECONDARY_SM, "shrink-0")}
                    >
                      {isSelected ? "Added" : "Add tool"}
                    </button>
                  </li>
                );
              })}
          {(tab === "PUBLIC_PRESETS" ? filteredPresets : filteredBuiltins).length === 0 && (
            <li className="px-5 py-10 text-center font-sans text-sm text-[var(--text-muted)]">Nothing matches your search</li>
          )}
        </ul>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border-subtle)] px-5 py-4">
          <span className="font-sans text-[13px] text-[var(--text-muted)]">
            Need a custom Swagger or OpenAPI URL? Import it from the Tool registry.
          </span>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
