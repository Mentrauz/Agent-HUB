"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Plug,
  Server,
  Plus,
  X,
  Zap,
  RefreshCw,
  Trash2,
  Unplug,
  PlugZap,
  ChevronDown,
  ChevronRight,
  Braces,
  Activity,
  ShieldCheck,
  CircleAlert,
  Loader2,
  Terminal,
  Globe,
  KeyRound,
  Download,
  Upload,
  Search,
  Sparkles,
  Code,
  Database,
  Monitor,
  BookOpen,
  Cpu,
  Wrench,
  Check,
  Brain,
  LayoutGrid,
  List,
} from "lucide-react";
import { clsx } from "clsx";
import { ItemIcon } from "@/components/common/ItemIcon";
import {
  McpHealth,
  McpPreset,
  McpProgressEvent,
  McpServerDTO,
  McpToolDefinition,
  McpToolTestResult,
  McpToolUpdate,
} from "@/types/mcp";
import { PublicMcpServer } from "@/types/mcp-directory";
import { MCP_PRESETS } from "@/modules/mcp/presets";
import { McpDirectoryBrowser } from "./McpDirectoryBrowser";
import { ToolUpdateDiffViewer } from "@/components/mcp/ToolUpdateDiffViewer";
import { ArrowUpCircle } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

const statusTheme: Record<string, { chip: string; dot: string }> = {
  CONNECTED: {
    chip: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] font-medium",
    dot: "bg-[var(--state-success)]",
  },
  DISCONNECTED: {
    chip: "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-medium",
    dot: "bg-[var(--surface-elevated)]",
  },
  ERROR: {
    chip: "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] font-medium",
    dot: "bg-[var(--state-error)]",
  },
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

const PRESET_CATEGORIES = [
  { id: "ALL", label: "All presets", icon: Sparkles },
  { id: "DEVELOPMENT", label: "Dev & code", icon: Code },
  { id: "DATABASE", label: "Databases", icon: Database },
  { id: "BROWSER", label: "Browser", icon: Monitor },
  { id: "WEB_SEARCH", label: "Web & search", icon: Globe },
  { id: "PRODUCTIVITY", label: "Productivity", icon: Zap },
  { id: "REASONING", label: "Reasoning", icon: Brain },
  { id: "DEVOPS", label: "DevOps", icon: Cpu },
  { id: "RESEARCH", label: "Research", icon: BookOpen },
  { id: "UTILITY", label: "Utilities", icon: Wrench },
];

export function McpServerHub() {
  const [servers, setServers] = useState<McpServerDTO[] | null>(null);
  const [presets, setPresets] = useState<McpPreset[]>(MCP_PRESETS);
  const [hubCatalogMode, setHubCatalogMode] = useState<"PRESETS" | "DIRECTORY">("PRESETS");
  const [presetCategory, setPresetCategory] = useState<string>("ALL");
  const [presetSearch, setPresetSearch] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectPreset, setConnectPreset] = useState<McpPreset | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, McpHealth>>({});
  const [serverViewMode, setServerViewMode] = useState<"list" | "grid">("list");
  const [pendingUpdates, setPendingUpdates] = useState<(McpToolUpdate & { affectedSkillNames: string[] })[]>([]);
  const [diffViewerUpdate, setDiffViewerUpdate] = useState<(McpToolUpdate & { affectedSkillNames: string[] }) | null>(null);

  const probe = useCallback(async (serverId: string) => {
    try {
      const h = await api<McpHealth>(`/api/mcp/servers/${serverId}/health`);
      setHealth((prev) => ({ ...prev, [serverId]: h }));
    } catch {
      // Health probes are best-effort.
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setServers(await api<McpServerDTO[]>("/api/mcp/servers"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load MCP servers");
    }
  }, []);

  useEffect(() => {
    void load();
    api<McpPreset[]>("/api/mcp/presets")
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setPresets(list);
      })
      .catch(() => { });
    // Fetch pending tool updates
    api<(McpToolUpdate & { affectedSkillNames: string[] })[]>("/api/mcp/updates")
      .then((updates) => {
        if (Array.isArray(updates)) setPendingUpdates(updates);
      })
      .catch(() => { });
  }, [load]);

  const handleMountFromDirectory = useCallback(async (server: PublicMcpServer) => {
    // ── Deep integration: Composio toolkit ──
    if (server.source === "composio") {
      try {
        setBusy(server.id);
        // Correctly extract toolkit slug even for individual tool IDs (e.g. composio-tool-gmail_send_mail)
        let toolkitSlug = server.id.replace("composio-", "");
        if (server.id.startsWith("composio-tool-")) {
          toolkitSlug = server.tags?.[1] || server.id.replace("composio-tool-", "").split("_")[0];
        }

        const res = await api<{ sessionId: string; mcpUrl: string; mcpHeaders: Record<string, string> }>(
          "/api/mcp/composio",
          { method: "POST", body: JSON.stringify({ toolkits: [toolkitSlug] }) }
        );
        // Create the MCP server entry pointing to Composio's hosted MCP endpoint
        const created = await api<McpServerDTO>("/api/mcp/servers", {
          method: "POST",
          body: JSON.stringify({
            name: `${server.name} [Composio]`,
            transport: "SSE",
            endpointUrl: res.mcpUrl,
            headers: res.mcpHeaders,
            connectOnCreate: true,
          }),
        });
        setServers((prev) => [created, ...(prev ?? []).filter((s) => s.id !== created.id)]);
        if (created.status === "CONNECTED") {
          await probe(created.id);
          setSuccessMessage(`Mounted ${server.name} [Composio] successfully (${created.cachedTools?.length ?? 0} tools discovered)`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else if (created.lastError) {
          setError(`Server created but connect failed: ${created.lastError}`);
        }
        setBusy(null);
      } catch (e) {
        setBusy(null);
        setError(e instanceof Error ? e.message : "Failed to connect Composio toolkit. Please check COMPOSIO_API_KEY.");
      }
      return;
    }

    // ── Deep integration: Arcade integration ──
    if (server.source === "arcade") {
      try {
        setBusy(server.id);
        const slug = server.id.replace("arcade-", "");
        const res = await api<{ mcpUrl: string; mcpHeaders: Record<string, string>; verified: boolean }>(
          "/api/mcp/arcade",
          { method: "POST", body: JSON.stringify({ integration: slug }) }
        );
        const created = await api<McpServerDTO>("/api/mcp/servers", {
          method: "POST",
          body: JSON.stringify({
            name: `${server.name} [Arcade]`,
            transport: "SSE",
            endpointUrl: res.mcpUrl,
            headers: res.mcpHeaders,
            connectOnCreate: true,
          }),
        });
        setServers((prev) => [created, ...(prev ?? []).filter((s) => s.id !== created.id)]);
        if (created.status === "CONNECTED") {
          await probe(created.id);
          setSuccessMessage(`Mounted ${server.name} [Arcade] successfully (${created.cachedTools?.length ?? 0} tools discovered)`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else if (created.lastError) {
          setError(`Server created but connect failed: ${created.lastError}`);
        }
        setBusy(null);
      } catch (e) {
        setBusy(null);
        setError(e instanceof Error ? e.message : "Failed to connect Arcade integration. Please check ARCADE_API_KEY.");
      }
      return;
    }

    // ── Standard MCP server mount ──
    const hasPlaceholders = Boolean(server.command && /<[A-Z0-9_]+>/i.test(server.command));
    const requiresAuth = Boolean(
      hasPlaceholders ||
      server.requiresAuthToken ||
      (server.envVarsRequired && server.envVarsRequired.length > 0)
    );

    // Direct 1-Click Mount ONLY for zero-auth public servers with ready commands (no placeholders) or SSE endpoints
    if (!requiresAuth && !hasPlaceholders && (server.endpointUrl || server.command)) {
      try {
        setBusy(server.id);
        const body = {
          name: server.name,
          transport: server.transport,
          ...(server.transport === "SSE" ? { endpointUrl: server.endpointUrl } : { command: server.command }),
          connectOnCreate: true,
        };
        const created = await api<McpServerDTO>("/api/mcp/servers", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setServers((prev) => [created, ...(prev ?? []).filter((s) => s.id !== created.id)]);
        if (created.status === "CONNECTED") {
          await probe(created.id);
          setSuccessMessage(`Connected ${server.name} successfully (${created.cachedTools?.length ?? 0} tools discovered)`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else if (created.lastError) {
          setError(`Server created but connect failed: ${created.lastError}`);
        }
        setBusy(null);
        return;
      } catch (e) {
        setBusy(null);
        // Fall back to opening the modal if direct mount threw an error
        setError(e instanceof Error ? e.message : "Direct mount failed; opening configuration modal.");
      }
    }

    // If authentication is required or direct mount requires manual parameters / placeholder filling
    const mappedPreset: McpPreset = {
      id: server.id,
      name: server.name,
      transport: server.transport,
      endpointUrl: server.endpointUrl,
      command: server.command,
      description: server.description,
      requiresAuthToken: requiresAuth,
      category: (server.category as McpPreset["category"]) || "UTILITY",
    };
    setConnectPreset(mappedPreset);
    setConnectOpen(true);
  }, [probe]);

  const refresh = useCallback(
    async (serverId: string) => {
      setBusy(serverId);
      try {
        const updated = await api<McpServerDTO>(`/api/mcp/servers/${serverId}/connect`, {
          method: "POST",
          body: "{}",
        });
        setServers((prev) => (prev ?? []).map((s) => (s.id === serverId ? updated : s)));
        await probe(serverId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connect failed");
        await load();
      } finally {
        setBusy(null);
      }
    },
    [load, probe]
  );

  const disconnect = useCallback(
    async (serverId: string) => {
      setBusy(serverId);
      try {
        const updated = await api<McpServerDTO>(`/api/mcp/servers/${serverId}/disconnect`, {
          method: "POST",
          body: "{}",
        });
        setServers((prev) => (prev ?? []).map((s) => (s.id === serverId ? updated : s)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Disconnect failed");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const rediscover = useCallback(
    async (serverId: string) => {
      setBusy(serverId);
      try {
        const updated = await api<McpServerDTO>(`/api/mcp/servers/${serverId}/discover`, {
          method: "POST",
          body: "{}",
        });
        setServers((prev) => (prev ?? []).map((s) => (s.id === serverId ? updated : s)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Rediscovery failed");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const handleBatchHealth = useCallback(async () => {
    if (!servers || servers.length === 0) return;
    setBatchBusy("health");
    try {
      const res = await api<McpHealth[]>("/api/mcp/servers/batch", {
        method: "POST",
        body: JSON.stringify({ action: "health" }),
      });
      const map: Record<string, McpHealth> = {};
      for (const h of res) {
        if (h.serverId) map[h.serverId] = h;
      }
      setHealth((prev) => ({ ...prev, ...map }));
      setSuccessMessage("Health probe completed for all servers");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch health check failed");
    } finally {
      setBatchBusy(null);
    }
  }, [servers]);

  const handleExport = useCallback(() => {
    window.open("/api/mcp/servers/export", "_blank");
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<McpServerDTO | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const confirmRemove = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    setBusy(deleteTarget.id);
    try {
      await api<unknown>(`/api/mcp/servers/${deleteTarget.id}`, { method: "DELETE" });
      setServers((prev) => (prev ?? []).filter((s) => s.id !== deleteTarget.id));
      setExpanded((prev) => (prev === deleteTarget.id ? null : prev));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletePending(false);
      setBusy(null);
    }
  }, [deleteTarget]);

  const created = useCallback(async (server: McpServerDTO) => {
    setConnectOpen(false);
    setServers((prev) => [server, ...(prev ?? [])]);
    if (server.status === "CONNECTED") await probe(server.id);
  }, [probe]);

  const connectedCount = (servers ?? []).filter((s) => s.status === "CONNECTED").length;
  const totalTools = (servers ?? []).reduce((sum, s) => sum + (s.cachedTools?.length ?? 0), 0);

  const filteredPresets = presets.filter((p) => {
    const matchesCategory = presetCategory === "ALL" || p.category === presetCategory;
    const matchesSearch =
      !presetSearch ||
      p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
      (p.description?.toLowerCase().includes(presetSearch.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Stats + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-[var(--text-secondary)] px-3 py-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 font-medium">
          <Server className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          {pad(servers?.length ?? 0)} Servers ·{pad(connectedCount)} Connected ·{pad(totalTools)} TOOLS
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {servers && servers.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleBatchHealth}
                disabled={Boolean(batchBusy)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-xs font-sans font-medium hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors cursor-pointer disabled:opacity-50"
                title="Run live latency probes across all connected servers"
              >
                {batchBusy === "health" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                Probe all
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-xs font-sans font-medium hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                title="Export all server configs as a portable JSON bundle"
              >
                <Download className="h-3 w-3" /> Export
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHubCatalogMode("DIRECTORY");
              const el = document.getElementById("mcp-catalog-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-sans font-medium hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/10 transition-colors cursor-pointer shadow-xs"
            title="Browse 120K+ MCP servers from Glama, mcp.so & Smithery"
          >
            <Globe className="h-3 w-3 text-[var(--accent-primary)]" /> Browse registry
          </button>

          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-xs font-sans font-medium hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
            title="Import MCP server configurations from JSON"
          >
            <Upload className="h-3 w-3" /> Import
          </button>

          <button
            type="button"
            onClick={() => {
              setConnectPreset(null);
              setConnectOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Connect MCP Server
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] text-xs font-sans font-medium">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" /> {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto cursor-pointer hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] text-xs font-sans font-medium animate-fadeIn">
          <Check className="h-3.5 w-3.5 shrink-0" /> {successMessage}
          <button type="button" onClick={() => setSuccessMessage(null)} className="ml-auto cursor-pointer hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Presets & Directory Discovery Section */}
      <div id="mcp-catalog-section" className="space-y-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 p-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHubCatalogMode("PRESETS")}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                hubCatalogMode === "PRESETS"
                  ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]/60"
              )}
            >
              <Zap className={clsx("h-3.5 w-3.5", hubCatalogMode === "PRESETS" ? "fill-[var(--text-muted)] text-[var(--state-warning)]" : "text-[var(--state-warning)]")} />
              Presets ({presets.length})
            </button>

            <button
              type="button"
              onClick={() => setHubCatalogMode("DIRECTORY")}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer relative",
                hubCatalogMode === "DIRECTORY"
                  ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]/60"
              )}
            >
              <Globe className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              Public registry (glama & mcp.so)
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-[var(--state-warning)] text-[var(--text-primary)] font-medium">
                120K+
              </span>
            </button>
          </div>            <div className="text-xs font-sans text-[var(--text-muted)] hidden sm:block">
            {hubCatalogMode === "PRESETS"
              ? "Curated zero-config reference presets"
              : "Live discovery from glama.ai, mcp.so & smithery"}
          </div>
        </div>

        {hubCatalogMode === "DIRECTORY" ? (
          <McpDirectoryBrowser
            onMount={handleMountFromDirectory}
            busyServerId={busy}
            mountedServerIds={[
              ...(servers ?? []).map((s) => s.id),
              ...(servers ?? []).map((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "-")),
              ...(servers ?? []).map((s) => s.name.toLowerCase()),
            ]}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-sans text-[var(--accent-primary)] font-medium">
                Select a local or cloud template to prefill connection
              </div>

              {/* Search box for presets */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="Search 22+ presets..."
                  className="w-full pl-8 pr-3 py-1 text-xs font-sans rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40"
                />
                {presetSearch && (
                  <button
                    type="button"
                    onClick={() => setPresetSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 overflow-x-auto pb-1">
              {PRESET_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count =
                  cat.id === "ALL"
                    ? presets.length
                    : presets.filter((p) => p.category === cat.id).length;
                if (count === 0 && cat.id !== "ALL") return null;
                const active = presetCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPresetCategory(cat.id)}
                    className={clsx(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
                      active
                        ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                        : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {cat.label} <span className="opacity-75 font-normal">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2.5 pt-1">
              {filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onUse={() => {
                    setConnectPreset(preset);
                    setConnectOpen(true);
                  }}
                />
              ))}
              {filteredPresets.length === 0 && (
                <div className="col-span-full text-center py-6 text-xs font-sans text-[var(--text-muted)]">
                  No presets matching &quot;{presetSearch}&quot; in this category.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Server list */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-sans text-[var(--text-secondary)] font-medium flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Server className="h-4 w-4 text-[var(--accent-primary)]" />
            Configured MCP servers
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-normal text-[var(--text-muted)] hidden sm:block">
              Discovered tools are auto-registered in workflow runtimes
            </span>
            {servers && servers.length > 0 && (
              <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-0.5">
                <button
                  type="button"
                  onClick={() => setServerViewMode("list")}
                  className={clsx(
                    "p-1.5 rounded text-xs font-sans transition-colors cursor-pointer",
                    serverViewMode === "list"
                      ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] "
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                  title="List View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setServerViewMode("grid")}
                  className={clsx(
                    "p-1.5 rounded text-xs font-sans transition-colors cursor-pointer",
                    serverViewMode === "grid"
                      ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] "
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {servers === null ? (
          <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)] px-3 py-6">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" /> Loading MCP servers…
          </div>
        ) : servers.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--border-strong)] p-8 text-center space-y-2">
            <Plug className="h-6 w-6 text-[var(--accent-primary)] mx-auto" />
            <p className="text-sm font-sans font-medium text-[var(--text-primary)]">No MCP servers configured</p>
            <p className="text-xs font-sans text-[var(--text-muted)]">
              Select one of the 22+ 1-click presets above or connect a custom SSE endpoint or local stdio command.
            </p>
          </div>
        ) : (
          serverViewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {servers.map((server) => (
                <ServerGridCard
                  key={server.id}
                  server={server}
                  health={health[server.id]}
                  busy={busy === server.id}
                  expanded={expanded === server.id}
                  hasUpdate={pendingUpdates.some((u) => u.serverId === server.id)}
                  pendingUpdate={pendingUpdates.find((u) => u.serverId === server.id) || undefined}
                  onConnect={() => refresh(server.id)}
                  onDisconnect={() => disconnect(server.id)}
                  onDelete={() => setDeleteTarget(server)}
                  onHealth={() => probe(server.id)}
                  onInspect={() => setExpanded((prev) => (prev === server.id ? null : server.id))}
                  onViewUpdate={() => {
                    const update = pendingUpdates.find((u) => u.serverId === server.id);
                    if (update) setDiffViewerUpdate(update);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => (<ServerCard
                key={server.id}
                server={server}
                health={health[server.id]}
                busy={busy === server.id}
                expanded={expanded === server.id}
                hasUpdate={pendingUpdates.some((u) => u.serverId === server.id)}
                pendingUpdate={pendingUpdates.find((u) => u.serverId === server.id) || undefined}
                onToggle={() => setExpanded((prev) => (prev === server.id ? null : server.id))}
                onConnect={() => refresh(server.id)}
                onDisconnect={() => disconnect(server.id)}
                onRediscover={() => rediscover(server.id)}
                onDelete={() => setDeleteTarget(server)}
                onHealth={() => probe(server.id)}
                onViewUpdate={() => {
                  const update = pendingUpdates.find((u) => u.serverId === server.id);
                  if (update) setDiffViewerUpdate(update);
                }}
              />
              ))}
            </div>
          )
        )}
      </div>

      {connectOpen && (
        <ConnectModal
          initialPreset={connectPreset}
          presets={presets}
          onClose={() => setConnectOpen(false)}
          onCreated={created}
        />
      )}

      {importOpen && (
        <ImportMcpModal
          onClose={() => setImportOpen(false)}
          onImported={async () => {
            setImportOpen(false);
            await load();
            setSuccessMessage("MCP servers imported successfully");
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteMcpServerModal
          server={deleteTarget}
          isPending={deletePending}
          onClose={() => {
            if (!deletePending) setDeleteTarget(null);
          }}
          onConfirm={confirmRemove}
        />
      )}

      {diffViewerUpdate && (
        <ToolUpdateDiffViewer
          update={diffViewerUpdate}
          affectedSkillNames={diffViewerUpdate.affectedSkillNames}
          isOpen={true}
          onClose={() => setDiffViewerUpdate(null)}
          onApply={async (updateId, toolNames) => {
            const result = await api<{ changesApplied: number; skillsUpdated: number; errors: string[] }>(
              "/api/mcp/updates/apply",
              {
                method: "POST",
                body: JSON.stringify({ updateId, toolNames }),
              }
            );
            // Remove the applied update from state
            setPendingUpdates((prev) => prev.filter((u) => u.id !== updateId));
            setSuccessMessage(`Applied ${result.changesApplied} tool updates to ${result.skillsUpdated} skill(s)`);
            setTimeout(() => setSuccessMessage(null), 4000);
            // Refresh servers to reflect new tool cache
            await load();
          }}
        />
      )}
    </div>
  );
}

function ServerGridCard(props: {
  server: McpServerDTO;
  health?: McpHealth;
  busy: boolean;
  expanded?: boolean;
  hasUpdate: boolean;
  pendingUpdate?: McpToolUpdate;
  onConnect: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
  onHealth: () => void;
  onInspect: () => void;
  onViewUpdate?: () => void;
}) {
  const { server, health, busy, expanded } = props;
  const theme = statusTheme[server.status] ?? statusTheme.DISCONNECTED;
  const isConnected = server.status === "CONNECTED";
  const toolCount = server.cachedTools?.length ?? 0;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 transition-colors flex flex-col justify-between overflow-hidden">
      <div className="p-4 flex flex-col justify-between space-y-3 flex-1">
        {/* Top */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ItemIcon
                name={server.name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-sans font-medium text-[var(--text-primary)] truncate">
                  {server.name}
                </h3>
                <p className="text-xs font-sans text-[var(--text-muted)] truncate">
                  {server.transport === "SSE" ? server.endpointUrl : server.command}
                </p>
              </div>
            </div>
            <span className={clsx(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-sans font-medium border shrink-0",
              theme.chip
            )}>
              <span className={clsx("h-1.5 w-1.5 rounded-full", theme.dot)} />
              {server.status}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              {server.transport}
            </span>
            <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              {toolCount} TOOLS
            </span>
            {props.hasUpdate && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]">
                <ArrowUpCircle className="h-2.5 w-2.5" /> Update
              </span>
            )}
            {health && (
              <span className={clsx(
                "px-1.5 py-0.5 rounded text-xs font-sans font-medium border",
                health.status === "healthy" ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]" :
                  health.status === "degraded" ? "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]" :
                    "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]"
              )}>
                {health.status} · {health.latencyMs}ms
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
          {isConnected ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); props.onDisconnect(); }}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Unplug className="h-2.5 w-2.5" /> Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); props.onConnect(); }}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <PlugZap className="h-2.5 w-2.5" /> Connect
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); props.onHealth(); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
          >
            <Activity className="h-2.5 w-2.5" /> Probe
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); props.onInspect(); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
          >
            <Braces className="h-2.5 w-2.5" /> {expanded ? "COLLAPSE" : "INSPECT"}
          </button>
          {props.hasUpdate && props.onViewUpdate && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); props.onViewUpdate?.(); }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-xs font-sans font-medium text-[var(--state-warning)] hover:bg-[var(--state-warning)]/10 transition-colors cursor-pointer"
            >
              <ArrowUpCircle className="h-2.5 w-2.5" /> Update
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); props.onDelete(); }}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--state-error)]/25 text-xs font-sans font-medium text-[var(--state-error)] hover:border-[var(--state-error)]/40 hover:bg-[var(--state-error)]/10 transition-colors cursor-pointer disabled:opacity-50 ml-auto"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <ToolInspector
          server={server}
          pendingUpdate={props.pendingUpdate}
          onViewUpdate={props.onViewUpdate}
        />
      )}
    </div>
  );
}

function PresetCard({ preset, onUse }: { preset: McpPreset; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      title={preset.description}
      className="text-left rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 p-3 space-y-1.5 hover:border-[var(--accent-primary)]/40 transition-colors cursor-pointer group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ItemIcon
            name={preset.name}
            category={preset.category}
            size="xs"
          />
          <span className="text-xs font-sans font-medium text-[var(--text-primary)] truncate">{preset.name}</span>
        </div>
        {preset.requiresAuthToken ? (
          <KeyRound className="h-3 w-3 text-[var(--state-warning)] shrink-0" />
        ) : (
          <Globe className="h-3 w-3 text-[var(--accent-primary)] shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-sans">
        <span
          className={clsx(
            "px-1.5 py-0.5 rounded border font-medium",
            preset.transport === "SSE"
              ? "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              : "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
          )}
        >
          {preset.transport}
        </span>
        <span className="text-[var(--text-muted)]">{preset.transport === "SSE" ? "REMOTE" : "LOCAL"}</span>
      </div>
      <p className="text-xs font-sans text-[var(--text-muted)] leading-relaxed line-clamp-2">{preset.description}</p>
    </button>
  );
}

function ServerCard(props: {
  server: McpServerDTO;
  health?: McpHealth;
  busy: boolean;
  expanded: boolean;
  hasUpdate: boolean;
  pendingUpdate?: McpToolUpdate;
  onToggle: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRediscover: () => void;
  onDelete: () => void;
  onHealth: () => void;
  onViewUpdate: () => void;
}) {
  const { server, health, busy, expanded } = props;
  const theme = statusTheme[server.status] ?? statusTheme.DISCONNECTED;
  const isConnected = server.status === "CONNECTED";
  const toolCount = server.cachedTools?.length ?? 0;

  return (
    <div className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 transition-colors overflow-hidden flex flex-col">
      {/* Header Row */}
      <div className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        {/* Left: Info, Badges */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ItemIcon
              name={server.name}
              size="xs"
            />
            <h3 className="text-xs font-sans font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              {server.name}
            </h3>
            <span className={clsx(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-sans font-medium border",
              theme.chip
            )}>
              <span className={clsx("h-1.5 w-1.5 rounded-full", theme.dot)} />
              {server.status}
            </span>
            <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              {server.transport}
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              <Braces className="h-2.5 w-2.5" /> {toolCount} TOOLS
            </span>
            {props.hasUpdate && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]">
                <ArrowUpCircle className="h-2.5 w-2.5" /> Update available
              </span>
            )}
            {health && (
              <span className={clsx(
                "px-1.5 py-0.5 rounded text-xs font-sans font-medium border",
                health.status === "healthy" ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]" :
                  health.status === "degraded" ? "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]" :
                    "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]"
              )}>
                {health.status} · {health.latencyMs}ms
              </span>
            )}
          </div>

          <p className="text-xs font-sans text-[var(--text-muted)] truncate">
            {server.transport === "SSE" ? server.endpointUrl : server.command}
          </p>

          {server.lastError && server.status === "ERROR" && (
            <p className="flex items-center gap-1 text-xs font-sans text-[var(--state-error)] font-medium break-all">
              <CircleAlert className="h-3 w-3 shrink-0" />
              <span>{server.lastError}</span>
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <ActionButton icon={Unplug} label="Disconnect" onClick={props.onDisconnect} disabled={busy} tone="neutral" />
          ) : (
            <ActionButton icon={PlugZap} label="Connect" onClick={props.onConnect} disabled={busy} tone="primary" />
          )}
          <ActionButton icon={RefreshCw} label="Rediscover" onClick={props.onRediscover} disabled={busy} tone="neutral" />
          {props.hasUpdate && (
            <button
              type="button"
              onClick={props.onViewUpdate}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-xs font-sans font-medium text-[var(--state-warning)] hover:bg-[var(--state-warning)]/10 transition-colors cursor-pointer"
            >
              <ArrowUpCircle className="h-3 w-3" /> View update
            </button>
          )}
          <ActionButton icon={Trash2} label="Delete" onClick={props.onDelete} disabled={busy} tone="danger" />
          <button
            type="button"
            onClick={props.onToggle}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 transition-colors cursor-pointer"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Inspect
          </button>
        </div>
      </div>

      {expanded && <ToolInspector server={server} pendingUpdate={props.pendingUpdate} onViewUpdate={props.onViewUpdate} />}
    </div>
  );
}

function ActionButton(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "primary" | "neutral" | "danger";
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-sans font-medium transition-colors cursor-pointer disabled:opacity-50",
        props.tone === "primary" &&
        "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] hover:bg-[var(--cta-primary-hover)]",
        props.tone === "neutral" &&
        "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]",
        props.tone === "danger" &&
        "border-[var(--state-error)]/25 text-[var(--state-error)] hover:border-[var(--state-error)]/40 hover:bg-[var(--state-error)]/10"
      )}
    >
      <Icon className="h-3 w-3" /> {props.label}
    </button>
  );
}

interface PropertySchema {
  default?: unknown;
  enum?: unknown[];
  type?: string;
  example?: unknown;
  description?: string;
}

function generateSamplePayload(schema: Record<string, unknown> | undefined): string {
  if (!schema || typeof schema !== "object") return "{}";
  const properties = (schema.properties as Record<string, PropertySchema>) || {};
  const sample: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(properties)) {
    if (!prop || typeof prop !== "object") continue;
    if (prop.default !== undefined) {
      sample[key] = prop.default;
    } else if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0) {
      sample[key] = prop.enum[0];
    } else if (prop.type === "string") {
      sample[key] = prop.example || (prop.description ? `<${prop.description.slice(0, 24)}>` : "sample_value");
    } else if (prop.type === "number" || prop.type === "integer") {
      sample[key] = prop.example ?? 1;
    } else if (prop.type === "boolean") {
      sample[key] = prop.example ?? true;
    } else if (prop.type === "array") {
      sample[key] = prop.example ?? [];
    } else if (prop.type === "object") {
      sample[key] = prop.example ?? {};
    } else {
      sample[key] = "";
    }
  }

  return Object.keys(sample).length > 0 ? JSON.stringify(sample, null, 2) : "{}";
}

type InspectorTab = "tools" | "resources" | "prompts" | "sampling" | "progress";

const INSPECTOR_TABS: { id: InspectorTab; label: string; icon: typeof Braces; count?: (s: McpServerDTO) => number }[] = [
  { id: "tools", label: "Tools", icon: Braces, count: (s) => s.cachedTools?.length ?? 0 },
  { id: "resources", label: "Resources", icon: Database },
  { id: "prompts", label: "Prompts", icon: BookOpen },
  { id: "sampling", label: "Sampling", icon: Brain },
  { id: "progress", label: "Progress", icon: Activity },
];

function ToolInspector({ server, pendingUpdate, onViewUpdate }: { server: McpServerDTO; pendingUpdate?: McpToolUpdate; onViewUpdate?: () => void }) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("tools");
  const [activeTestTool, setActiveTestTool] = useState<string | null>(null);
  const [schemaOpen, setSchemaOpen] = useState<string | null>(null);

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-[var(--border-subtle)]">
        {INSPECTOR_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.count?.(server);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-sans font-medium border border-b-0 transition-colors cursor-pointer",
                isActive
                  ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--border-strong)]"
              )}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
              {count !== undefined && (
                <span className={clsx("ml-0.5 text-xs font-normal", isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === "tools" && (
          <ToolsTab server={server} activeTestTool={activeTestTool} setActiveTestTool={setActiveTestTool} schemaOpen={schemaOpen} setSchemaOpen={setSchemaOpen} pendingUpdate={pendingUpdate} onViewUpdate={onViewUpdate} />
        )}
        {activeTab === "resources" && <ResourcesTab server={server} />}
        {activeTab === "prompts" && <PromptsTab server={server} />}
        {activeTab === "sampling" && <SamplingTab server={server} />}
        {activeTab === "progress" && <ProgressTab server={server} />}
      </div>
    </div>
  );
}

/* ────────────── Tools Tab ────────────── */

function ToolsTab({ server, activeTestTool, setActiveTestTool, schemaOpen, setSchemaOpen, pendingUpdate, onViewUpdate }: {
  server: McpServerDTO;
  activeTestTool: string | null;
  setActiveTestTool: React.Dispatch<React.SetStateAction<string | null>>;
  schemaOpen: string | null;
  setSchemaOpen: React.Dispatch<React.SetStateAction<string | null>>;
  pendingUpdate?: McpToolUpdate;
  onViewUpdate?: () => void;
}) {
  const tools = server.cachedTools ?? [];
  return (
    <div className="space-y-3">
      {pendingUpdate && (
        <div className="flex items-center justify-between rounded border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-[var(--state-warning)]" />
            <span className="text-xs font-sans font-medium text-[var(--state-warning)]">
              {pendingUpdate.changes.length} tool update(s) available
            </span>
          </div>
          {onViewUpdate && (
            <button
              type="button"
              onClick={onViewUpdate}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-xs font-sans font-medium text-[var(--state-warning)] hover:bg-[var(--state-warning)]/10 transition-colors cursor-pointer"
            >
              <ArrowUpCircle className="h-3 w-3" /> View & upgrade
            </button>
          )}
        </div>
      )}
      <div className="text-xs font-sans text-[var(--accent-primary)] font-medium flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Braces className="h-3.5 w-3.5" /> DISCOVERED TOOLS ({tools.length})
        </span>
        <span className="text-xs text-[var(--text-muted)] font-normal">
          Click TEST on any tool for live schema execution
        </span>
      </div>

      {tools.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--border-strong)] p-6 text-center space-y-1">
          <p className="text-xs font-sans font-medium text-[var(--text-secondary)]">
            No tools cached yet.
          </p>
          <p className="text-xs font-sans text-[var(--text-muted)]">
            Connect the server and run Rediscover to query the remote tools/list.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tools.map((tool) => {
            const isTesting = activeTestTool === tool.name;
            const isSchemaOpen = schemaOpen === tool.name;

            return (
              <li
                key={tool.name}
                className={clsx(
                  "rounded border bg-[var(--surface-raised)]/80 p-3 space-y-2 transition-colors ",
                  isTesting
                    ? "border-[var(--accent-primary)]/40 ring-1 ring-[var(--accent-primary)]/40"
                    : "border-[var(--border-subtle)]"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSchemaOpen((prev) => (prev === tool.name ? null : tool.name))}
                    className="inline-flex items-center gap-1 text-xs font-sans font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)] cursor-pointer min-w-0"
                  >
                    {isSchemaOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{tool.name}</span>
                  </button>

                  <span
                    className={clsx(
                      "px-1.5 py-0.5 rounded border text-xs font-sans font-medium",
                      tool.isWrite
                        ? "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]"
                        : "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    )}
                  >
                    {tool.isWrite ? "WRITE" : "READ"}
                  </span>

                  {tool.requiresApproval && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)] font-medium text-xs font-sans">
                      <ShieldCheck className="h-2.5 w-2.5" /> HITL
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTestTool((prev) => (prev === tool.name ? null : tool.name))}
                    className={clsx(
                      "ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-sans font-medium transition-colors cursor-pointer",
                      isTesting
                        ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                        : "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] hover:bg-[var(--cta-primary-hover)]"
                    )}
                  >
                    <Terminal className="h-3 w-3" />
                    {isTesting ? "Close test" : "Test tool"}
                  </button>
                </div>

                {tool.description && (
                  <p className="text-xs font-sans text-[var(--text-secondary)]">{tool.description}</p>
                )}

                {isSchemaOpen && (
                  <pre className="rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 p-2.5 text-xs text-[var(--text-secondary)] font-sans overflow-x-auto max-h-56 overflow-y-auto whitespace-pre">
                    {JSON.stringify(tool.inputSchema, null, 2)}
                  </pre>
                )}

                {isTesting && <ToolTestConsole server={server} tool={tool} onClose={() => setActiveTestTool(null)} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ToolTestConsole({
  server,
  tool,
  onClose,
}: {
  server: McpServerDTO;
  tool: McpToolDefinition;
  onClose: () => void;
}) {
  const defaultPayload = React.useMemo(() => generateSamplePayload(tool.inputSchema), [tool.inputSchema]);
  const [args, setArgs] = useState(defaultPayload);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<McpToolTestResult | null>(null);

  // Sync default args if tool changes
  useEffect(() => {
    setArgs(generateSamplePayload(tool.inputSchema));
    setResult(null);
  }, [tool]);

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(args);
      setArgs(JSON.stringify(parsed, null, 2));
    } catch { }
  };

  const handleReset = () => {
    setArgs(generateSamplePayload(tool.inputSchema));
    setResult(null);
  };

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(args || "{}");
      } catch {
        setResult({
          ok: false,
          toolName: tool.name,
          serverId: server.id,
          durationMs: 0,
          error: "Arguments must be valid JSON",
        });
        return;
      }
      const res = await api<McpToolTestResult>(`/api/mcp/servers/${server.id}/test`, {
        method: "POST",
        body: JSON.stringify({ toolName: tool.name, arguments: parsed }),
      });
      setResult(res);
    } catch (e) {
      setResult({
        ok: false,
        toolName: tool.name,
        serverId: server.id,
        durationMs: 0,
        error: e instanceof Error ? e.message : "Test failed",
      });
    } finally {
      setRunning(false);
    }
  };

  const properties = (tool.inputSchema?.properties as Record<string, PropertySchema>) || {};
  const propKeys = Object.keys(properties);

  return (
    <div className="rounded border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 p-3.5 space-y-3 mt-2 animate-fadeInUp">
      <div className="flex items-center justify-between border-b border-[var(--accent-primary)]/25 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="text-xs font-sans font-medium text-[var(--accent-primary)]">
            INTERACTIVE RUNTIME TEST // {tool.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrettify}
            className="text-xs font-sans text-[var(--accent-primary)] hover:underline cursor-pointer"
          >
            Format JSON
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-sans text-[var(--accent-primary)] hover:underline cursor-pointer"
          >
            Reset sample
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--state-error)] cursor-pointer ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Schema parameter pills */}
      {propKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans">
          <span className="text-[var(--text-muted)] font-medium">Expected params</span>
          {propKeys.map((k) => {
            const p = properties[k];
            if (!p) return null;
            const isReq = Array.isArray(tool.inputSchema?.required) && tool.inputSchema.required.includes(k);
            return (
              <span
                key={k}
                title={p.description}
                className={clsx(
                  "px-1.5 py-0.5 rounded border",
                  isReq
                    ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium"
                    : "border-[var(--border-strong)] bg-[var(--surface-raised)]/70 text-[var(--text-secondary)]"
                )}
              >
                {k}: <span className="opacity-75">{p.type || "any"}</span>
                {isReq && <span className="text-[var(--state-error)] ml-0.5">*</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* JSON Payload Editor */}
      <div className="space-y-1">
        <label className="text-xs font-sans text-[var(--text-secondary)] font-medium flex items-center justify-between">
          <span>Call arguments (JSON payload)</span>
          <span className="text-xs text-[var(--accent-primary)]">Passed directly to MCP calltool</span>
        </label>
        <textarea
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          spellCheck={false}
          rows={Math.min(8, Math.max(3, args.split("\n").length))}
          className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2.5 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 focus:ring-1 focus:ring-[var(--accent-primary)]/40 outline-none resize-y"
          placeholder='{"param": "value"}'
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer active:scale-95 transition-colors"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
          {running ? "Calling MCP tool…" : "Execute MCP call"}
        </button>

        {result && (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-sans font-medium",
              result.ok
                ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] "
                : "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] "
            )}
          >
            {result.ok ? "Status: success (200 OK)" : "Status: execution error"} · <Zap className="h-3 w-3 inline" /> {result.durationMs}ms
          </span>
        )}
      </div>

      {/* Result Display Console */}
      {result && (
        <div className="space-y-1 pt-1">
          <div className="text-xs font-sans text-[var(--text-secondary)] font-medium flex items-center justify-between">
            <span>Response stream output</span>
            <span className={result.ok ? "text-[var(--state-success)]" : "text-[var(--state-error)]"}>
              {result.ok ? "RAW_RESULT_OBJ" : "EXCEPTION_TRACE"}
            </span>
          </div>
          <pre className="rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-muted)] p-3 text-xs font-sans overflow-x-auto max-h-72 overflow-y-auto whitespace-pre">
            {JSON.stringify(result.output ?? result.error ?? result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ────────────── Resources Tab ────────────── */

interface McpResourceItem {
  uri: string;
  name?: string;
  mimeType?: string;
  description?: string;
}

interface McpResourceContent {
  text?: string;
  error?: string;
  [key: string]: unknown;
}

function ResourcesTab({ server }: { server: McpServerDTO }) {
  const [resources, setResources] = useState<McpResourceItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [resourceContent, setResourceContent] = useState<McpResourceContent | string | null>(null);
  const [readingUri, setReadingUri] = useState<string | null>(null);

  const loadResources = useCallback(async () => {
    if (server.status !== "CONNECTED") return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<McpResourceItem[]>(`/api/mcp/servers/${server.id}/resources`);
      setResources(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to list resources");
    } finally {
      setLoading(false);
    }
  }, [server.id, server.status]);

  useEffect(() => {
    if (server.status === "CONNECTED") void loadResources();
  }, [server.status, loadResources]);

  const readResource = useCallback(async (uri: string) => {
    setReadingUri(uri);
    setSelectedUri(uri);
    try {
      const data = await api<McpResourceContent>(`/api/mcp/servers/${server.id}/resources/read`, {
        method: "POST",
        body: JSON.stringify({ uri }),
      });
      setResourceContent(data);
    } catch (e) {
      setResourceContent({ error: e instanceof Error ? e.message : "Failed to read resource" });
    } finally {
      setReadingUri(null);
    }
  }, [server.id]);

  if (server.status !== "CONNECTED") {
    return (
      <div className="text-center py-8 space-y-2">
        <Database className="h-6 w-6 text-[var(--text-muted)] mx-auto" />
        <p className="text-xs font-sans text-[var(--text-muted)]">Connect the server to browse resources.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-sans text-[var(--accent-primary)] font-medium flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" /> MCP resources
        </span>
        <button type="button" onClick={loadResources} disabled={loading} className="inline-flex items-center gap-1 hover:text-[var(--accent-primary)] cursor-pointer">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} REFRESH
        </button>
      </div>

      {error && (
        <div className="text-xs font-sans text-[var(--state-error)] px-2 py-1 rounded bg-[var(--state-error)]/10 border border-[var(--state-error)]/25">{error}</div>
      )}

      {resources === null || (loading && resources.length === 0) ? (
        <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)] py-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" /> Loading resources...
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-6 space-y-1">
          <p className="text-xs font-sans text-[var(--text-secondary)]">No resources exposed by this server.</p>
          <p className="text-xs font-sans text-[var(--text-muted)]">Resources are URI-addressable data exposed via MCP resources/list.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-sans text-[var(--text-muted)]">{resources.length} resource(s) available — click to read content</div>
          {resources.map((res) => (
            <div key={res.uri} className="rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-sans font-medium text-[var(--accent-primary)] truncate">{res.name ?? res.uri}</div>
                  <div className="text-xs font-sans text-[var(--text-muted)] truncate" title={res.uri}>{res.uri}</div>
                </div>
                <div className="flex items-center gap-2">
                  {res.mimeType && (
                    <span className="px-1.5 py-0.5 rounded border border-[var(--border-strong)] text-xs font-sans text-[var(--text-muted)]">{res.mimeType}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => readResource(res.uri)}
                    disabled={readingUri === res.uri}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer"
                  >
                    {readingUri === res.uri ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Download className="h-2.5 w-2.5" />} READ
                  </button>
                </div>
              </div>
              {res.description && <p className="text-xs font-sans text-[var(--text-secondary)]">{res.description}</p>}

              {selectedUri === res.uri && resourceContent && (
                <div className="mt-2 rounded border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 p-3 animate-fadeInUp">
                  <div className="text-xs font-sans text-[var(--accent-primary)] font-medium mb-2">Resource content</div>
                  <pre className="rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-muted)] p-3 text-xs font-sans overflow-x-auto max-h-72 overflow-y-auto whitespace-pre">
                    {typeof resourceContent === "string"
                      ? resourceContent
                      : ((resourceContent as Record<string, unknown>)?.contents as Array<{ text?: string }>)?.[0]?.text ??
                      ((resourceContent as Record<string, unknown>)?.text as string) ??
                      JSON.stringify(resourceContent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────── Prompts Tab ────────────── */

interface McpPromptArg {
  name: string;
  required?: boolean;
  description?: string;
}

interface McpPromptItem {
  name: string;
  description?: string;
  arguments?: McpPromptArg[];
}

interface McpPromptMessage {
  role: string;
  content: { type?: string; text?: string } | string;
}

interface McpPromptResult {
  messages?: McpPromptMessage[];
  error?: string;
}

function PromptsTab({ server }: { server: McpServerDTO }) {
  const [prompts, setPrompts] = useState<McpPromptItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [promptResult, setPromptResult] = useState<McpPromptResult | null>(null);
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>({});
  const [fetchingPrompt, setFetchingPrompt] = useState(false);

  const loadPrompts = useCallback(async () => {
    if (server.status !== "CONNECTED") return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<McpPromptItem[]>(`/api/mcp/servers/${server.id}/prompts`);
      setPrompts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to list prompts");
    } finally {
      setLoading(false);
    }
  }, [server.id, server.status]);

  useEffect(() => {
    if (server.status === "CONNECTED") void loadPrompts();
  }, [server.status, loadPrompts]);

  const getPrompt = useCallback(async (name: string) => {
    setFetchingPrompt(true);
    setSelectedPrompt(name);
    try {
      const data = await api<McpPromptResult>(`/api/mcp/servers/${server.id}/prompts`, {
        method: "POST",
        body: JSON.stringify({ name, arguments: promptArgs }),
      });
      setPromptResult(data);
    } catch (e) {
      setPromptResult({ error: e instanceof Error ? e.message : "Failed to get prompt" });
    } finally {
      setFetchingPrompt(false);
    }
  }, [server.id, promptArgs]);

  if (server.status !== "CONNECTED") {
    return (
      <div className="text-center py-8 space-y-2">
        <BookOpen className="h-6 w-6 text-[var(--text-muted)] mx-auto" />
        <p className="text-xs font-sans text-[var(--text-muted)]">Connect the server to browse prompt templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-sans text-[var(--accent-primary)] font-medium flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> MCP prompt templates
        </span>
        <button type="button" onClick={loadPrompts} disabled={loading} className="inline-flex items-center gap-1 hover:text-[var(--accent-primary)] cursor-pointer">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} REFRESH
        </button>
      </div>

      {error && (
        <div className="text-xs font-sans text-[var(--state-error)] px-2 py-1 rounded bg-[var(--state-error)]/10 border border-[var(--state-error)]/25">{error}</div>
      )}

      {prompts === null || (loading && prompts.length === 0) ? (
        <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)] py-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" /> Loading prompts...
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-6 space-y-1">
          <p className="text-xs font-sans text-[var(--text-secondary)]">No prompt templates exposed by this server.</p>
          <p className="text-xs font-sans text-[var(--text-muted)]">Prompts are curated system prompt templates exposed via MCP prompts/list.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-sans text-[var(--text-muted)]">{prompts.length} prompt template(s) available</div>
          {prompts.map((prompt) => (
            <div key={prompt.name} className="rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-sans font-medium text-[var(--accent-primary)]">{prompt.name}</div>
                  {prompt.description && <div className="text-xs font-sans text-[var(--text-muted)] truncate">{prompt.description}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => getPrompt(prompt.name)}
                  disabled={fetchingPrompt && selectedPrompt === prompt.name}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer"
                >
                  {fetchingPrompt && selectedPrompt === prompt.name ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />} GET
                </button>
              </div>

              {/* Prompt arguments */}
              {prompt.arguments && prompt.arguments.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-sans text-[var(--text-muted)] font-medium">Arguments</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {prompt.arguments.map((arg) => (
                      <div key={arg.name} className="flex items-center gap-2">
                        <label className="text-xs font-sans text-[var(--text-secondary)] shrink-0">
                          {arg.name}{arg.required && <span className="text-[var(--state-error)] ml-0.5">*</span>}:
                        </label>
                        <input
                          type="text"
                          value={promptArgs[arg.name] ?? ""}
                          onChange={(e) => setPromptArgs((prev) => ({ ...prev, [arg.name]: e.target.value }))}
                          placeholder={arg.description ?? arg.name}
                          className="flex-1 rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt result */}
              {selectedPrompt === prompt.name && promptResult && (
                <div className="mt-2 rounded border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 p-3 animate-fadeInUp">
                  <div className="text-xs font-sans text-[var(--accent-primary)] font-medium mb-2">Prompt result</div>
                  {promptResult.messages ? (
                    <div className="space-y-2">
                      {promptResult.messages.map((msg, i: number) => (
                        <div key={i} className="rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 p-2">
                          <span className={clsx(
                            "text-xs font-sans font-medium px-1.5 py-0.5 rounded mr-2",
                            msg.role === "user"
                              ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                              : "bg-[var(--state-success)]/10 text-[var(--state-success)]"
                          )}>{msg.role}</span>
                          <span className="text-xs font-sans text-[var(--text-primary)]">
                            {typeof msg.content === "string" ? msg.content : msg.content?.text ?? JSON.stringify(msg.content)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-muted)] p-3 text-xs font-sans overflow-x-auto whitespace-pre">
                      {JSON.stringify(promptResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────── Sampling Tab ────────────── */

interface SamplingResult {
  model?: string;
  stopReason?: string;
  content?: { text?: string };
  [key: string]: unknown;
}

function SamplingTab({ server }: { server: McpServerDTO }) {
  const [messages, setMessages] = useState(
    JSON.stringify(
      [{ role: "user", content: { type: "text", text: "Hello, can you help me?" } }],
      null,
      2
    )
  );
  const [systemPrompt, setSystemPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [temperature, setTemperature] = useState("0.7");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SamplingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (server.status !== "CONNECTED") {
    return (
      <div className="text-center py-8 space-y-2">
        <Brain className="h-6 w-6 text-[var(--text-muted)] mx-auto" />
        <p className="text-xs font-sans text-[var(--text-muted)]">Connect the server to test sampling.</p>
      </div>
    );
  }

  const handleSample = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      let parsedMessages: unknown;
      try {
        parsedMessages = JSON.parse(messages);
      } catch {
        setError("Messages must be valid JSON");
        return;
      }
      if (!Array.isArray(parsedMessages)) {
        setError("Messages must be a valid JSON array (e.g. [{ role: 'user', content: { ... } }])");
        return;
      }
      const res = await api<SamplingResult>(`/api/mcp/servers/${server.id}/sampling`, {
        method: "POST",
        body: JSON.stringify({
          messages: parsedMessages,
          systemPrompt: systemPrompt || undefined,
          maxTokens: parseInt(maxTokens, 10) || 4096,
          temperature: parseFloat(temperature) || 0.7,
        }),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sampling request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-sans text-[var(--accent-primary)] font-medium flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5" /> MCP SAMPLING (sampling/createMessage)
      </div>

      <p className="text-xs font-sans text-[var(--text-muted)]">
        Send LLM sampling requests from connected MCP servers. Agent Hub acts as a sampling client,
        allowing nested agentic behavior where tools call Studio models without needing their own API keys.
      </p>

      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-xs font-sans text-[var(--text-secondary)] font-medium">Messages (JSON array)</label>
          <textarea
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            spellCheck={false}
            rows={5}
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2.5 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 focus:ring-1 focus:ring-[var(--accent-primary)]/40 outline-none resize-y"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-sans text-[var(--text-secondary)] font-medium">System prompt</label>
            <input
              type="text"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Optional system prompt"
              className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-1 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-sans text-[var(--text-secondary)] font-medium">Max tokens</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-1 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-sans text-[var(--text-secondary)] font-medium">Temperature</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-1 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSample}
          disabled={running}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer active:scale-95 transition-colors"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          {running ? "Sampling…" : "Send sampling request"}
        </button>
      </div>

      {error && (
        <div className="text-xs font-sans text-[var(--state-error)] px-2 py-1 rounded bg-[var(--state-error)]/10 border border-[var(--state-error)]/25">{error}</div>
      )}

      {result && (
        <div className="rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 p-3 animate-fadeInUp">
          <div className="text-xs font-sans text-[var(--state-success)] font-medium mb-2">Sampling result</div>
          <div className="space-y-1">
            <div className="text-xs font-sans text-[var(--text-muted)]">Model: <span className="text-[var(--state-success)] font-medium">{result.model}</span></div>
            {result.stopReason && <div className="text-xs font-sans text-[var(--text-muted)]">Stop: <span className="text-[var(--state-success)] font-medium">{result.stopReason}</span></div>}
          </div>
          <pre className="mt-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-muted)] p-3 text-xs font-sans overflow-x-auto max-h-60 overflow-y-auto whitespace-pre">
            {result.content?.text ?? JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ────────────── Progress Tab ────────────── */

function ProgressTab({ server }: { server: McpServerDTO }) {
  const [events, setEvents] = useState<McpProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startListening = useCallback(() => {
    if (server.status !== "CONNECTED") return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setListening(true);
    setEvents([]);

    const es = new EventSource(`/api/mcp/servers/${server.id}/progress`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          setConnected(true);
        } else if (data.type !== "heartbeat") {
          setEvents((prev) => [data, ...prev].slice(0, 100));
        }
      } catch {
        // Ignore parse errors from heartbeats
      }
    };

    es.onerror = () => {
      setConnected(false);
      setListening(false);
      es.close();
      eventSourceRef.current = null;
    };
  }, [server.id, server.status]);

  const stopListening = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setListening(false);
    setConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [server.id]);

  if (server.status !== "CONNECTED") {
    return (
      <div className="text-center py-8 space-y-2">
        <Activity className="h-6 w-6 text-[var(--text-muted)] mx-auto" />
        <p className="text-xs font-sans text-[var(--text-muted)]">Connect the server to view progress events.</p>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    started: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
    progress: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
    completed: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
    failed: "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]",
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-sans text-[var(--accent-primary)] font-medium flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Progress notifications (SSE)
        </span>
        <div className="flex items-center gap-2">
          <span className={clsx(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-sans",
            connected
              ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
              : "border-[var(--border-strong)] text-[var(--text-muted)]"
          )}>
            <span className={clsx("h-1.5 w-1.5 rounded-full", connected ? "bg-[var(--state-success)]" : "bg-[var(--surface-elevated)]")} />
            {connected ? "Stream active" : "DISCONNECTED"}
          </span>
          {listening ? (
            <button type="button" onClick={stopListening} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--state-error)]/25 text-[var(--state-error)] text-xs font-sans font-medium cursor-pointer hover:bg-[var(--state-error)]/10">
              <X className="h-2.5 w-2.5" /> STOP
            </button>
          ) : (
            <button type="button" onClick={startListening} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium cursor-pointer hover:bg-[var(--cta-primary-hover)]">
              <Activity className="h-2.5 w-2.5" /> Start listening
            </button>
          )}
        </div>
      </div>

      <p className="text-xs font-sans text-[var(--text-muted)]">
        Real-time progress events streamed via Server-Sent Events during MCP tool/resource/prompt calls.
        Start listening, then execute a tool from the Tools tab to see progress events here.
      </p>

      <div className="text-xs font-sans text-[var(--text-muted)]">
        {events.length} event(s) received
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6 space-y-1">
          <p className="text-xs font-sans text-[var(--text-secondary)]">No progress events yet.</p>
          <p className="text-xs font-sans text-[var(--text-muted)]">Click START LISTENING, then run a tool to see progress events stream in real-time.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {events.map((event, i) => (
            <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80">
              <span className={clsx(
                "px-1.5 py-0.5 rounded border text-xs font-sans font-medium shrink-0",
                typeColors[event.type] ?? typeColors.started
              )}>{event.type}</span>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-sans text-[var(--text-secondary)] font-medium">{event.operation}</span>
                {event.detail && <span className="text-xs font-sans text-[var(--text-muted)] ml-1">// {event.detail}</span>}
                {event.message && <div className="text-xs font-sans text-[var(--text-muted)] mt-0.5">{event.message}</div>}
                {event.error && <div className="text-xs font-sans text-[var(--state-error)] mt-0.5">{event.error}</div>}
                {event.progress !== undefined && (
                  <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--cta-primary-bg)] transition-colors" style={{ width: `${event.progress}%` }} />
                  </div>
                )}
              </div>
              <span className="text-xs font-sans text-[var(--text-muted)] shrink-0">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────── Connect Modal ────────────── */

/**
 * Builds the exact header/env entry a server needs from the raw token the user typed.
 *
 * STDIO presets encode which single env var the underlying package expects in their
 * header template, e.g. `{ Authorization: "Bearer ${NOTION_API_KEY}" }` means "set
 * NOTION_API_KEY". We key the outgoing header by that variable name directly (STDIO
 * headers are injected as process env vars — see connection.ts) instead of always
 * sending "Authorization", which previously forced the backend to guess the real
 * target by fanning one token out into half a dozen unrelated provider env vars.
 * SSE/HTTP presets keep the real wire header name/format since those are genuine
 * HTTP headers, not env vars.
 */
function buildAuthHeaders(
  rawToken: string,
  transport: "SSE" | "STDIO",
  preset: McpPreset | null
): Record<string, string> | undefined {
  if (!rawToken) return undefined;

  const templateEntry = preset?.headers ? Object.entries(preset.headers)[0] : undefined;
  if (!templateEntry) {
    // No preset metadata (custom/manual server) — send a conventional Authorization
    // header. connection.ts maps this to a small set of generic env var names only,
    // never to a specific third-party provider's secret name.
    return { Authorization: rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}` };
  }

  const [headerKey, template] = templateEntry;
  const varMatch = template.match(/\$\{([A-Z0-9_]+)\}/);

  if (transport === "STDIO") {
    const varName = varMatch?.[1] ?? headerKey;
    return { [varName]: rawToken };
  }

  // SSE/HTTP: reproduce the template's literal header format (e.g. "Bearer <token>"
  // vs a bare API key) under the preset's real header name.
  if (varMatch) {
    return { [headerKey]: template.replace(varMatch[0], rawToken) };
  }
  return { [headerKey]: rawToken };
}

function ConnectModal({
  initialPreset,
  presets,
  onClose,
  onCreated,
}: {
  initialPreset: McpPreset | null;
  presets: McpPreset[];
  onClose: () => void;
  onCreated: (server: McpServerDTO) => void;
}) {
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"SSE" | "STDIO">("SSE");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [command, setCommand] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<McpPreset | null>(initialPreset);

  const applyPreset = (preset: McpPreset) => {
    setActivePreset(preset);
    setName(preset.name);
    setTransport(preset.transport);
    setEndpointUrl(preset.endpointUrl ?? "");
    setCommand(preset.command ?? "");
    // Auth placeholders are never filled automatically — the user supplies the
    // real token (the preset header template would leak a literal ${TOKEN}).
    setAuthToken("");
  };

  // 1-click presets opened from the hub pre-fill the form on mount.
  useEffect(() => {
    if (initialPreset) applyPreset(initialPreset);

  }, [initialPreset]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const headers = buildAuthHeaders(authToken.trim(), transport, activePreset);
      const body =
        transport === "SSE"
          ? { name: name.trim(), transport, endpointUrl: endpointUrl.trim(), headers, connectOnCreate: true }
          : { name: name.trim(), transport, command: command.trim(), headers, connectOnCreate: true };
      const server = await api<McpServerDTO>("/api/mcp/servers", { method: "POST", body: JSON.stringify(body) });
      if (server.status === "ERROR") {
        setError(server.lastError || "Connection failed. Please check the command/endpoint or auth credentials.");
        onCreated(server);
        return;
      }
      onCreated(server);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] font-sans max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Plug className="h-4 w-4 text-[var(--accent-primary)]" /> Connect MCP Server
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--state-error)] cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Presets */}
          <div className="space-y-1.5">
            <div className="text-xs font-sans text-[var(--accent-primary)] font-medium flex items-center gap-1">
              <Zap className="h-3 w-3" /> 1-Click presets
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="text-left px-2 py-1.5 rounded border border-[var(--border-subtle)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 transition-colors cursor-pointer truncate"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-sans text-[var(--text-muted)] font-medium">Server Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub MCP"
              className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-sans text-[var(--text-muted)] font-medium">Transport</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["SSE", "STDIO"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTransport(t)}
                  className={clsx(
                    "px-3 py-2 rounded border text-xs font-sans font-medium transition-colors cursor-pointer",
                    transport === t
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                      : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                  )}
                >
                  {t === "SSE" ? "SSE / HTTP" : "STDIO"}
                </button>
              ))}
            </div>
            <p className="text-xs font-sans text-[var(--text-muted)]">
              {transport === "SSE"
                ? "Remote server — Streamable HTTP with legacy SSE fallback."
                : "Local process — e.g. npx -y @modelcontextprotocol/server-postgres <DATABASE_URL>"}
            </p>
          </div>

          {transport === "SSE" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-sans text-[var(--text-muted)] font-medium">Endpoint URL</label>
              <input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://mcp.example.com/sse"
                className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-sans text-[var(--text-muted)] font-medium">Command</label>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx -y @modelcontextprotocol/server-filesystem ./data"
                className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
              />
              {command.includes("<") && command.includes(">") && (
                <p className="text-xs font-sans text-[var(--state-warning)] flex items-center gap-1">
                  💡 Replace placeholder tokens like &lt;PATH_TO_VAULT&gt; with your actual file path or connection string.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center justify-between">
              <span className="flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-[var(--state-warning)]" />
                Auth Token {activePreset?.requiresAuthToken ? "(required for this service)" : "(optional)"}
              </span>
              {activePreset?.requiresAuthToken && (
                <span className="text-xs text-[var(--state-warning)] font-medium">Auth Required</span>
              )}
            </label>
            <input
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              type="password"
              placeholder={
                activePreset?.id === "github"
                  ? "ghp_xxxxxxxxxxxxxxxxxxxx (GitHub Personal Access Token)"
                  : activePreset?.id === "brave"
                    ? "BSA_xxxxxxxxxxxxxxxxxxxx (Brave Search API Key)"
                    : "Bearer token sent as an Authorization header"
              }
              className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-xs font-sans text-[var(--text-primary)] focus:border-[var(--accent-primary)]/40 outline-none"
            />
          </div>

          {error && (
            <p className="text-xs font-sans text-[var(--state-error)] font-medium flex items-center gap-1">
              <CircleAlert className="h-3 w-3 shrink-0" /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting || !name.trim() || (transport === "SSE" ? !endpointUrl.trim() : !command.trim())}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
              {submitting ? "Connecting…" : "Connect & Discover"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteMcpServerModal({
  server,
  isPending,
  onClose,
  onConfirm,
}: {
  server: McpServerDTO;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded border border-[var(--state-error)]/25 bg-[var(--surface-raised)] p-5 font-sans space-y-4 animate-fadeInUp text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm MCP Server Deletion"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--state-error)]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded border border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--state-error)]">
                Delete MCP server
              </h3>
              <div className="text-xs text-[var(--text-muted)]">
                [SYS::SEVER_MCP_INTEGRATION]
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Explanation */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Are you sure you want to delete this Model Context Protocol server configuration?
          All discovered tools will immediately be unmounted from the LangGraph execution runtime.
        </p>

        {/* Server Details Spec Box */}
        <div className="rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/80 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)] font-medium">Server name</span>
            <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              {server.name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)] font-medium">Transport</span>
            <span className="px-1.5 py-0.5 rounded text-xs font-medium border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--accent-primary)]">
              {server.transport} ({server.transport === "SSE" ? "REMOTE" : "LOCAL"})
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-xs text-[var(--text-muted)] font-medium">
              {server.transport === "SSE" ? "Endpoint" : "Command"}
            </span>
            <span className="font-sans text-xs text-[var(--accent-primary)] max-w-[260px] truncate">
              {server.transport === "SSE" ? server.endpointUrl : server.command}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-muted)] font-medium">Cached tools</span>
            <span className="font-medium text-[var(--state-error)] flex items-center gap-1">
              <Braces className="h-3 w-3" />
              {server.cachedTools?.length ?? 0} Tools will be unmounted
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-sunken)] cursor-pointer disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--state-error)]/40 bg-[var(--state-error)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--state-error)] disabled:opacity-50 cursor-pointer transition-colors active:scale-95"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {isPending ? "Unmounting…" : "DELETE server"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportMcpModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(String(event.target?.result ?? ""));
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setError("Please provide a valid JSON bundle");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error("Invalid JSON format");
      }

      const res = await api<{ importedCount: number; errorCount: number; errors?: { name: string; error: string }[] }>(
        "/api/mcp/servers/import",
        {
          method: "POST",
          body: JSON.stringify(parsed),
        }
      );

      if (res.errorCount > 0 && res.importedCount === 0) {
        throw new Error(res.errors?.[0]?.error ?? "Import failed");
      }

      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 font-sans space-y-4 animate-fadeInUp text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Import MCP Server Configurations"
      >
        <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Import MCP servers
              </h3>
              <div className="text-xs text-[var(--text-muted)]">
                [PORTABLE_BUNDLE::JSON_IMPORT]
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[var(--text-muted)] font-medium">
              Paste JSON or upload .JSON bundle
            </label>
            <label className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline cursor-pointer">
              <Upload className="h-3 w-3" />
              <span>Choose file</span>
              <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder={`{\n  "version": "1.0",\n  "servers": [\n    {\n      "name": "Playwright MCP",\n      "transport": "STDIO",\n      "command": "npx -y @playwright/mcp@latest"\n    }\n  ]\n}`}
            rows={8}
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)]/50 p-3 text-xs font-sans text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-sunken)] cursor-pointer disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={isPending || !jsonText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer transition-colors active:scale-95"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {isPending ? "Importing…" : "Import servers"}
          </button>
        </div>
      </div>
    </div>
  );
}


