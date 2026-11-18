"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { clsx } from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { ItemIcon } from "@/components/common/ItemIcon";
import { Pagination } from "@/components/common/Pagination";
import { AgentSkill, SkillCategory } from "@/types/agent-studio-registry";
import { SkillDTO } from "@/types/skill";
import { toast } from "@/stores/toastStore";
import { LiveSandbox } from "@/components/mcp/LiveSandbox";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  FIELD,
  META,
  ROW_HOVER,
  SECTION_TITLE,
  Segmented,
  Tag,
} from "@/components/ui/surfaces";

/** Persistent map of marketplace skill IDs → database Skill IDs */
const INSTALLED_MAP_KEY = "skill-installed-map";

function loadInstalledMap(): Map<string, string> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(INSTALLED_MAP_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

function saveInstalledMap(map: Map<string, string>) {
  try {
    localStorage.setItem(INSTALLED_MAP_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {}
}

/**
 * Build human-readable step-by-step instructions from the marketplace skill's steps.
 */
function buildInstructions(skill: AgentSkill): string {
  const lines = [
    `Skill: ${skill.name}`,
    `Source: ${skill.source}`,
    `Category: ${skill.category} | Difficulty: ${skill.difficulty}`,
    "",
    "## Instructions",
    skill.description,
    "",
    "## Workflow Steps",
  ];
  const dummyTools = new Set(["smithery-cli", "execute_command", "connect", "composio_connect", "composio_auth"]);
  for (const step of skill.steps) {
    const hasValidTool = step.requiredTool && !dummyTools.has(step.requiredTool.trim().toLowerCase());
    lines.push(`${step.order}. ${step.description}${hasValidTool ? ` (tool: ${step.requiredTool})` : ""}`);
  }
  return lines.join("\n");
}

/**
 * Build the allowedTools list. We combine:
 *  - requiredTools from the marketplace skill metadata (excluding dummy placeholders)
 *  - mcp_<serverId>_* wildcard-style entries for each mounted server
 * The permission checker will match these at execution time.
 */
function buildAllowedTools(skill: AgentSkill, mountedServerIds: string[]): string[] {
  const tools = new Set<string>();
  const dummyTools = new Set(["smithery-cli", "execute_command", "connect", "composio_connect", "composio_auth"]);

  // Add explicitly required tools from the skill definition
  if (skill.requiredTools?.length) {
    for (const t of skill.requiredTools) {
      if (t && t.trim() && !dummyTools.has(t.trim().toLowerCase())) {
        tools.add(t.trim());
      }
    }
  }

  // Add MCP tool entries for each mounted server
  for (const serverId of mountedServerIds) {
    // Generic MCP tool entries — the agent will discover actual tools at runtime
    tools.add(`mcp_${serverId}_*`);
  }

  // Also add wildcard "*" so skill runtime can invoke any mounted tool for this skill
  tools.add("*");

  // Fallback: if we still have no tools, add standard built-ins
  if (tools.size === 0) {
    tools.add("code_execution");
  }

  return Array.from(tools).slice(0, 20);
}

const CATEGORIES: { id: SkillCategory | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "RESEARCH", label: "Research" },
  { id: "CODING", label: "Coding" },
  { id: "DATA", label: "Data" },
  { id: "ANALYSIS", label: "Analysis" },
  { id: "COMMUNICATION", label: "Communication" },
  { id: "AUTOMATION", label: "Automation" },
  { id: "KNOWLEDGE", label: "Knowledge" },
  { id: "PRODUCTIVITY", label: "Productivity" },
  { id: "CREATIVE", label: "Creative" },
];

const DIFFICULTIES = [
  { id: "ALL", label: "All levels" },
  { id: "BEGINNER", label: "Beginner" },
  { id: "INTERMEDIATE", label: "Intermediate" },
  { id: "ADVANCED", label: "Advanced" },
];

const SOURCES = [
  { id: "ALL", label: "All sources" },
  { id: "glama", label: "Glama.ai" },
  { id: "mcp.so", label: "mcp.so" },
  { id: "smithery", label: "Smithery.ai" },
  { id: "composio", label: "Composio" },
];

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm" role="group" aria-label={label}>
    <span className="font-sans text-[13px] text-[var(--text-muted)]">{label}</span>
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        aria-pressed={value === o.id}
        onClick={() => onChange(o.id)}
        className={clsx(
          "cursor-pointer rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
          value === o.id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);
}

export function SkillsMarketplace() {
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [installedDbSkills, setInstalledDbSkills] = useState<SkillDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string>("ALL");
  const [category, setCategory] = useState<SkillCategory | "ALL">("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [detailSkill, setDetailSkill] = useState<AgentSkill | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    try {
      return (localStorage.getItem("skill-view-mode") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });

  const handleToggleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("skill-view-mode", mode);
    } catch {}
  };

  // Map of marketplaceSkillId → databaseSkillId
  const [installedMap, setInstalledMap] = useState<Map<string, string>>(loadInstalledMap);

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Scroll to top of grid on page change
  useEffect(() => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  const fetchPage = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("pageSize", String(PAGE_SIZE));
      if (source !== "ALL") params.set("source", source);
      if (search.trim()) params.set("q", search.trim());
      if (category !== "ALL") params.set("category", category);
      if (difficulty !== "ALL") params.set("difficulty", difficulty);

      const res = await fetch(`/api/mcp/skills-feed?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setSkills(json.data);
        setTotalCount(json.pagination?.totalCount || json.total || json.data.length);
        setCurrentPage(targetPage);
      } else {
        throw new Error("Failed to load skills");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading skills");
    } finally {
      setLoading(false);
    }
  }, [category, difficulty, search, source]);

  // Fetch page 1 on filter changes
  useEffect(() => {
    const timer = setTimeout(() => fetchPage(1), 300);
    return () => clearTimeout(timer);
  }, [fetchPage]);

  // Check if a skill is installed across ID, name, notes, and DB records
  const isSkillInstalled = useCallback(
    (skill: AgentSkill) => {
      const cleanId = skill.id ? skill.id.replace(/[.,;:]$/, "") : "";
      const cleanName = skill.name?.toLowerCase().trim() || "";
      if (
        installedMap.has(skill.id) ||
        (cleanId && installedMap.has(cleanId)) ||
        (cleanName && installedMap.has(cleanName))
      ) {
        return true;
      }
      return installedDbSkills.some(
        (db) =>
          db.status !== "ARCHIVED" &&
          (db.id === skill.id ||
            db.id === cleanId ||
            (cleanName && db.name.toLowerCase().trim() === cleanName) ||
            (cleanId && (db.currentDraft?.notes || db.publishedVersion?.notes || "").includes(`ID: ${cleanId}`)) ||
            (skill.id && (db.currentDraft?.notes || db.publishedVersion?.notes || "").includes(`ID: ${skill.id}`)))
      );
    },
    [installedMap, installedDbSkills]
  );

  // Client-side installed filter with global database hydration
  const filteredSkills = useMemo(() => {
    if (!showInstalledOnly) return skills;

    const installedList: AgentSkill[] = [];
    const seenIds = new Set<string>();

    for (const s of skills) {
      if (isSkillInstalled(s)) {
        installedList.push(s);
        seenIds.add(s.id);
        if (s.name) seenIds.add(s.name.toLowerCase().trim());
        const dbId =
          installedMap.get(s.id) ||
          (s.id ? installedMap.get(s.id.replace(/[.,;:]$/, "")) : undefined) ||
          (s.name ? installedMap.get(s.name.toLowerCase().trim()) : undefined);
        if (dbId) seenIds.add(dbId);
      }
    }

    for (const dbSkill of installedDbSkills) {
      if (dbSkill.status === "ARCHIVED") continue;
      const draft = dbSkill.currentDraft || dbSkill.publishedVersion;
      const notes = draft?.notes || "";
      const match = notes.match(/ID:\s*([^\s\n\r]+)/);
      const rawMarketplaceId = match ? match[1].replace(/[.,;:]$/, "") : dbSkill.id;
      const marketplaceId = rawMarketplaceId || dbSkill.id;
      const cleanDbName = dbSkill.name ? dbSkill.name.toLowerCase().trim() : "";

      if (
        seenIds.has(marketplaceId) ||
        seenIds.has(dbSkill.id) ||
        (cleanDbName && seenIds.has(cleanDbName))
      ) {
        continue;
      }
      seenIds.add(marketplaceId);
      seenIds.add(dbSkill.id);
      if (cleanDbName) seenIds.add(cleanDbName);

      const sourceMatch = notes.match(/Installed from ([^\s]+) marketplace/);
      const source = (sourceMatch ? sourceMatch[1] : "community") as AgentSkill["source"];

      installedList.push({
        id: marketplaceId,
        name: dbSkill.name,
        description: dbSkill.purpose || draft?.instructions?.slice(0, 150) || "Installed agent skill",
        category: "PRODUCTIVITY",
        author: "You",
        source,
        stars: 1,
        installs: 1,
        rating: 5.0,
        difficulty: "BEGINNER",
        estimatedTime: "2 min",
        steps: [
          { order: 1, action: "execute", description: dbSkill.purpose || "Execute skill workflow" },
        ],
        tags: ["installed", source],
        requiredServers: [],
        requiredTools: draft?.allowedTools || ["*"],
      });
    }

    return installedList.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesQuery =
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (source !== "ALL" && s.source !== source) return false;
      if (category !== "ALL" && s.category !== category) return false;
      if (difficulty !== "ALL" && s.difficulty !== difficulty) return false;
      return true;
    });
  }, [skills, showInstalledOnly, isSkillInstalled, installedMap, installedDbSkills, search, source, category, difficulty]);

  const [installing, setInstalling] = useState<string | null>(null);
  // Set when an install mounted a STDIO server that requires explicit
  // connect (never auto-executes marketplace commands).
  const needsManualConnect = useRef(false);

  /**
   * Mount required MCP servers and return the IDs of servers that were
   * mounted or already connected.
   */
  const mountRequiredServers = useCallback(async (skill: AgentSkill): Promise<string[]> => {
    const mountedServerIds: string[] = [];
    needsManualConnect.current = false;
    if (!skill.requiredServers || skill.requiredServers.length === 0) return mountedServerIds;

    // Fetch existing servers once
    const existingRes = await fetch("/api/mcp/servers").then((r) => r.json());
    const existingServers = existingRes.data || [];

    const serverNamesToMount =
      skill.requiredServers && skill.requiredServers.length > 0
        ? skill.requiredServers
        : [
            skill.name.replace(/ (Automation|Toolkit|Skill)$/i, ""),
            ...(skill.tags || []).slice(0, 2),
          ].filter(Boolean);

    for (const serverName of serverNamesToMount) {
      // Check if a matching server is already connected
      const cleanServerName = serverName.toLowerCase().replace(/ \((composio|arcade)\)/gi, "");
      const alreadyConnected = existingServers.find((s: { name: string; status: string; id: string }) =>
        s.name.toLowerCase().includes(cleanServerName) &&
        (s.status === "CONNECTED" || s.status === "READY")
      );

      if (alreadyConnected) {
        mountedServerIds.push(alreadyConnected.id);
        continue;
      }

      // ── Composio auto-mount ──
      if (skill.source === "composio") {
        const slug = cleanServerName.replace(/ /g, "-");
        try {
          const sessionRes = await fetch("/api/mcp/composio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toolkits: [slug] }),
          }).then((r) => r.json());

          if (sessionRes.success && sessionRes.data?.mcpUrl) {
            const serverRes = await fetch("/api/mcp/servers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `${serverName} [Composio]`,
                transport: "SSE",
                endpointUrl: sessionRes.data.mcpUrl,
                headers: sessionRes.data.mcpHeaders || {},
                connectOnCreate: true,
              }),
            }).then((r) => r.json());

            if (serverRes.success && serverRes.data?.id) {
              mountedServerIds.push(serverRes.data.id);
            }
          }
        } catch (err) {
          console.warn("Marketplace: Failed to auto-mount Composio server", err);
        }
      } else if (skill.source === "arcade") {
        // ── Arcade auto-mount ──
        const slug = cleanServerName.replace(/ /g, "-");
        try {
          const sessionRes = await fetch("/api/mcp/arcade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ integration: slug }),
          }).then((r) => r.json());

          if (sessionRes.success && sessionRes.data?.mcpUrl) {
            const serverRes = await fetch("/api/mcp/servers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `${serverName} [Arcade]`,
                transport: "SSE",
                endpointUrl: sessionRes.data.mcpUrl,
                headers: sessionRes.data.mcpHeaders || {},
                connectOnCreate: true,
              }),
            }).then((r) => r.json());

            if (serverRes.success && serverRes.data?.id) {
              mountedServerIds.push(serverRes.data.id);
            }
          }
        } catch (err) {
          console.warn("Marketplace: Failed to auto-mount Arcade server", err);
        }
      } else {
        // ── Smithery, Glama, MCP.SO, Awesome-MCP: search directory for a matching server ──
        try {
          const dirRes = await fetch(`/api/mcp/directory?q=${encodeURIComponent(cleanServerName)}&source=ALL`).then((r) => r.json());
          const match = ((dirRes.data || []) as Array<{ name: string; id: string; endpointUrl?: string; command?: string }>).find((s) =>
            s.name.toLowerCase().includes(cleanServerName) ||
            cleanServerName.includes(s.name.toLowerCase().replace(/ mcp$/i, ""))
          );

          if (match) {
            const transport = match.endpointUrl ? "SSE" : "STDIO";
            const command = match.command || (transport === "STDIO" ? `npx -y ${match.id.replace(/^pub-/, "")}` : undefined);
            const body: Record<string, unknown> = {
              name: match.name,
              transport,
              // SECURITY: a STDIO server means Agent Hub will SPAWN the
              // configured command. Auto-running `npx -y <package>` from
              // marketplace metadata executed unreviewed third-party code at
              // install time. Remote (SSE) servers still auto-connect; STDIO
              // entries are created disconnected for explicit user consent.
              connectOnCreate: transport === "SSE",
            };
            if (transport === "SSE" && match.endpointUrl) body.endpointUrl = match.endpointUrl;
            if (transport === "STDIO" && command) body.command = command;

            const serverRes = await fetch("/api/mcp/servers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }).then((r) => r.json());

            if (serverRes.success && serverRes.data?.id) {
              mountedServerIds.push(serverRes.data.id);
              if (transport === "STDIO") {
                needsManualConnect.current = true;
              }
            }
          }
        } catch (err) {
          console.warn("Marketplace: Failed to auto-mount server", err);
        }
      }
    }

    return mountedServerIds;
  }, []);

  /**
   * Full install: mount MCP servers → create Skill in DB → update state.
   */
  const refreshInstalledSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.items)) {
        const items = (json.data.items as SkillDTO[]).filter((item) => item.status !== "ARCHIVED");
        setInstalledDbSkills(items);
        const map = new Map<string, string>();
        for (const item of items) {
          const notes = item.currentDraft?.notes || item.publishedVersion?.notes || "";
          const match = notes.match(/ID:\s*([^\s\n\r]+)/);
          if (match) {
            const rawId = match[1];
            const cleanId = rawId.replace(/[.,;:]$/, "");
            map.set(rawId, item.id);
            map.set(cleanId, item.id);
          }
          if (item.name) {
            map.set(item.name.toLowerCase().trim(), item.id);
          }
          map.set(item.id, item.id);
        }
        setInstalledMap(map);
        saveInstalledMap(map);
      }
    } catch {}
  }, []);

  // Sync installedMap and installedDbSkills from DB on mount
  useEffect(() => {
    refreshInstalledSkills();
  }, [refreshInstalledSkills]);

  const handleInstall = useCallback(async (skill: AgentSkill) => {
    const marketplaceId = skill.id;

    // Already installed — do nothing (uninstall is a separate action)
    if (installedMap.has(marketplaceId)) return;

    try {
      setInstalling(marketplaceId);

      // 1. Mount required MCP servers
      const mountedServerIds = await mountRequiredServers(skill);

      // 2. Create a real Skill record in the database via POST /api/skills
      const allowedTools = buildAllowedTools(skill, mountedServerIds);
      const safeName = (skill.name?.trim() || "Marketplace Skill").slice(0, 100);
      const validName = safeName.length >= 2 ? safeName : `${safeName} Tool`;
      const rawPurpose = skill.description?.trim() || `Marketplace skill: ${validName}`;
      const safePurpose = (rawPurpose.length >= 5 ? rawPurpose : `Marketplace skill: ${validName}`).slice(0, 1000);
      const safeInstructions = buildInstructions(skill).slice(0, 20000);

      const createRes = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: validName,
          purpose: safePurpose,
          instructions: safeInstructions,
          allowedTools,
          maxExecutionSteps: Math.max(10, (skill.steps?.length || 1) * 3),
          // Structured linkage: marketplaceId drives installed-state
          // reconciliation; MountedServers lets uninstall clean up the MCP
          // servers auto-mounted for this skill (previously orphaned rows +
          // live connections were left behind).
          notes: `Installed from ${skill.source} marketplace. ID: ${marketplaceId}${
            mountedServerIds.length > 0 ? `. MountedServers: ${mountedServerIds.join(",")}` : ""
          }`,
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to create skill (HTTP ${createRes.status})`);
      }

      const createJson = await createRes.json();
      if (!createJson.success || !createJson.data?.id) {
        throw new Error("Failed to create skill record");
      }

      const dbSkillId = createJson.data.id as string;

      // 3. Persist the marketplace→DB mapping
      setInstalledMap((prev) => {
        const next = new Map(prev);
        next.set(marketplaceId, dbSkillId);
        saveInstalledMap(next);
        return next;
      });

      // 4. Invalidate skills query and re-sync installed skills
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      await refreshInstalledSkills();

      if (needsManualConnect.current) {
        toast.info(
          "Action needed: connect local server",
          "A local (STDIO) MCP server was added but NOT started — review its command in the MCP Hub and click Connect."
        );
      } else {
        toast.success("Skill installed", `${validName} is now available in Skills Studio`);
      }
    } catch (err) {
      console.error("Marketplace install failed:", err);
      toast.error("Install failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setInstalling(null);
    }
  }, [installedMap, mountRequiredServers, queryClient, refreshInstalledSkills]);

  /**
   * Uninstall: delete/archive the Skill from DB, clean up the MCP servers that were
   * auto-mounted for it, and remove from installed map.
   */
  const handleUninstall = useCallback(async (skill: AgentSkill) => {
    const marketplaceId = skill.id;
    const cleanId = marketplaceId ? marketplaceId.replace(/[.,;:]$/, "") : "";
    const cleanName = skill.name?.toLowerCase().trim() || "";

    // 1. Resolve the database skill ID
    let dbSkillId =
      installedMap.get(marketplaceId) ||
      (cleanId ? installedMap.get(cleanId) : undefined) ||
      (cleanName ? installedMap.get(cleanName) : undefined);

    if (!dbSkillId) {
      const match = installedDbSkills.find(
        (s) =>
          s.id === marketplaceId ||
          s.id === cleanId ||
          (cleanName && s.name.toLowerCase().trim() === cleanName) ||
          (cleanId && (s.currentDraft?.notes || s.publishedVersion?.notes || "").includes(`ID: ${cleanId}`)) ||
          (marketplaceId && (s.currentDraft?.notes || s.publishedVersion?.notes || "").includes(`ID: ${marketplaceId}`))
      );
      if (match) {
        dbSkillId = match.id;
      }
    }

    try {
      setInstalling(marketplaceId);

      if (dbSkillId) {
        // Resolve the DB skill row to find mounted server IDs
        const skillRes = await fetch(`/api/skills/${dbSkillId}`).then((r) => (r.ok ? r.json() : null));
        const notes: string = skillRes?.data?.currentDraft?.notes || skillRes?.data?.publishedVersion?.notes || "";
        const mountedMatch = notes.match(/MountedServers:\s*([^\s\n\r]+)/);
        const mountedIds = mountedMatch
          ? mountedMatch[1]
              .split(",")
              .map((s) => s.trim().replace(/[.,;:]$/, ""))
              .filter(Boolean)
          : [];

        // 1. Clean up auto-mounted MCP servers (404-tolerant)
        for (const serverId of mountedIds) {
          await fetch(`/api/mcp/servers/${serverId}`, { method: "DELETE" }).catch(() => {});
        }

        // 2. Delete the skill from the database; if published or restricted, archive it
        const delRes = await fetch(`/api/skills/${dbSkillId}`, { method: "DELETE" });
        if (!delRes.ok && delRes.status !== 404) {
          const archiveRes = await fetch(`/api/skills/${dbSkillId}/archive`, { method: "POST" });
          if (!archiveRes.ok && archiveRes.status !== 404) {
            const errBody = await delRes.json().catch(() => ({}));
            throw new Error(errBody.error || `Failed to uninstall skill (HTTP ${delRes.status})`);
          }
        }
      }

      // 3. Remove from installedMap and localStorage
      setInstalledMap((prev) => {
        const next = new Map(prev);
        next.delete(marketplaceId);
        if (cleanId) next.delete(cleanId);
        if (cleanName) next.delete(cleanName);
        if (dbSkillId) next.delete(dbSkillId);
        saveInstalledMap(next);
        return next;
      });

      // 4. Invalidate skills queries & refresh installed skills list
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      await refreshInstalledSkills();

      toast.success(
        "Skill uninstalled",
        `${skill.name} has been removed from your workspace`
      );
    } catch (err) {
      console.error("Marketplace uninstall failed:", err);
      toast.error("Uninstall failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setInstalling(null);
    }
  }, [installedMap, installedDbSkills, queryClient, refreshInstalledSkills]);

  const sourceLabel = (s: string) => SOURCES.find((x) => x.id === s)?.label ?? s;

  const actionButton = (skill: AgentSkill, isInstalled: boolean) => {
    const busy = installing === skill.id;
    return isInstalled ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleUninstall(skill);
        }}
        disabled={busy}
        className={clsx(BTN_SECONDARY_SM, "shrink-0 text-[var(--state-error)]")}
      >
        {busy ? "Removing" : "Uninstall"}
      </button>
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleInstall(skill);
        }}
        disabled={busy}
        className={clsx(BTN_SECONDARY_SM, "shrink-0")}
      >
        {busy ? "Installing" : "Install skill"}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h2 className={SECTION_TITLE}>Skills marketplace</h2>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">
            Install preconfigured agent skills from Glama, mcp.so, Smithery and Composio
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className={META}>
            {skills.length} of {totalCount > 0 ? totalCount.toLocaleString() : skills.length} loaded
          </span>
          <Segmented
            label="View"
            hideLabel
            value={viewMode}
            onChange={(v) => handleToggleViewMode(v)}
            options={[
              { id: "grid", label: "Grid" },
              { id: "list", label: "List" },
            ]}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex w-full max-w-lg items-center gap-2">
          <input
            type="text"
            aria-label="Search skills"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills, for example research, database or slack"
            className={clsx(FIELD, "h-9 w-full px-3")}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className={BTN_SECONDARY_SM}>
              Clear
            </button>
          )}
        </div>

        <FilterRow label="Source" value={source} onChange={setSource} options={SOURCES} />
        <FilterRow
          label="Category"
          value={category}
          onChange={(v) => setCategory(v as SkillCategory | "ALL")}
          options={CATEGORIES}
        />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <FilterRow label="Level" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
          <button
            type="button"
            aria-pressed={showInstalledOnly}
            onClick={() => setShowInstalledOnly((p) => !p)}
            className={clsx(
              "cursor-pointer rounded-[6px] font-sans text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
              showInstalledOnly ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Installed only{installedMap.size > 0 ? ` (${installedMap.size})` : ""}
          </button>
        </div>
      </div>

      {loading && <p className="py-12 text-center font-sans text-sm text-[var(--text-muted)]">Loading skills</p>}

      {error && (
        <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {viewMode === "grid" ? (
            <div ref={gridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSkills.map((skill) => {
                const isInstalled = isSkillInstalled(skill);
                return (
                  <div key={skill.id} className={clsx(CARD, "flex flex-col gap-4 p-5")}>
                    <button
                      type="button"
                      onClick={() => setDetailSkill(skill)}
                      className="flex-1 cursor-pointer space-y-3 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                    >
                      <div className="flex items-start gap-3">
                        <ItemIcon name={skill.name} category={skill.category} tags={skill.tags} owner={skill.author} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{skill.name}</h3>
                            {isInstalled && <Tag tone="good">Installed</Tag>}
                          </div>
                          <p className="font-sans text-[13px] text-[var(--text-muted)]">by {skill.author}</p>
                        </div>
                      </div>
                      <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{skill.description}</p>
                      <p className="font-mono text-xs leading-5 text-[var(--text-muted)]">
                        {[sourceLabel(skill.source), skill.category.toLowerCase(), skill.difficulty.toLowerCase(), ...skill.tags.slice(0, 2)].join(" · ")}
                      </p>
                    </button>
                    <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                      <span className={clsx(META, "flex items-center gap-3")}>
                        {typeof skill.rating === "number" && <span>{skill.rating} rating</span>}
                        {typeof skill.installs === "number" && <span>{skill.installs.toLocaleString()} installs</span>}
                        <span>{skill.steps.length} steps</span>
                      </span>
                      {actionButton(skill, isInstalled)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul ref={gridRef as unknown as React.RefObject<HTMLUListElement>} className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
              {filteredSkills.map((skill) => {
                const isInstalled = isSkillInstalled(skill);
                return (
                  <li key={skill.id} className={clsx(ROW_HOVER, "flex flex-col justify-between gap-3 px-5 py-3 md:flex-row md:items-center")}>
                    <button
                      type="button"
                      onClick={() => setDetailSkill(skill)}
                      className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                    >
                      <ItemIcon name={skill.name} category={skill.category} tags={skill.tags} owner={skill.author} size="xs" />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                          <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">{skill.name}</h3>
                          <span className={META}>
                            {sourceLabel(skill.source)} · {skill.category.toLowerCase()} · {skill.difficulty.toLowerCase()}
                          </span>
                          {isInstalled && <Tag tone="good">Installed</Tag>}
                        </div>
                        <p className="line-clamp-1 font-sans text-[13px] text-[var(--text-muted)]">{skill.description}</p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
                      <span className={clsx(META, "flex items-center gap-3")}>
                        {typeof skill.rating === "number" && <span>{skill.rating} rating</span>}
                        {typeof skill.installs === "number" && <span>{skill.installs.toLocaleString()} installs</span>}
                        <span>{skill.estimatedTime}</span>
                      </span>
                      {actionButton(skill, isInstalled)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!showInstalledOnly && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => {
                setCurrentPage(p);
                fetchPage(p);
              }}
              loading={loading}
            />
          )}
        </>
      )}

      {!loading && !error && filteredSkills.length === 0 && (
        <div className="space-y-1 py-12 text-center">
          <p className="font-sans text-sm text-[var(--text-primary)]">No skills found</p>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">
            {showInstalledOnly ? "No installed skills match these filters." : search ? `Nothing matches "${search}" with these filters.` : "Nothing matches these filters."}
          </p>
        </div>
      )}

      {detailSkill && (
        <SkillDetailModal
          skill={detailSkill}
          isInstalled={isSkillInstalled(detailSkill)}
          onInstall={() => (isSkillInstalled(detailSkill) ? handleUninstall(detailSkill) : handleInstall(detailSkill))}
          onClose={() => setDetailSkill(null)}
        />
      )}
    </div>
  );
}

/* ────────────── Skill Detail Modal ────────────── */

function SkillDetailModal({
  skill,
  isInstalled,
  onInstall,
  onClose,
}: {
  skill: AgentSkill;
  isInstalled: boolean;
  onInstall: () => void;
  onClose: () => void;
}) {
  const [sandboxOpen, setSandboxOpen] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-modal-title"
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ItemIcon name={skill.name} category={skill.category} tags={skill.tags} owner={skill.author} size="lg" />
            <div className="min-w-0 space-y-0.5">
              <h3 id="skill-modal-title" className="truncate font-sans text-base font-medium text-[var(--text-primary)]">
                {skill.name}
              </h3>
              <p className="font-sans text-[13px] text-[var(--text-muted)]">by {skill.author}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 shrink-0 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">{skill.description}</p>

          <p className={clsx(META, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
            <span>{skill.source}</span>
            <span>{skill.category.toLowerCase()}</span>
            <span>{skill.difficulty.toLowerCase()}</span>
            {typeof skill.rating === "number" && <span>{skill.rating} rating</span>}
            {typeof skill.installs === "number" && <span>{skill.installs.toLocaleString()} installs</span>}
            <span>{skill.estimatedTime}</span>
          </p>

          {skill.requiredServers.length > 0 && (
            <section className="space-y-1.5">
              <h4 className="font-sans text-[13px] text-[var(--text-muted)]">Required MCP servers</h4>
              <p className="font-mono text-xs leading-5 text-[var(--text-secondary)]">{skill.requiredServers.join(" · ")}</p>
            </section>
          )}

          <section className="space-y-2">
            <h4 className="font-sans text-[13px] text-[var(--text-muted)]">Steps ({skill.steps.length})</h4>
            <ol className="divide-y divide-[var(--border-subtle)] rounded-[10px] border border-[var(--border-subtle)]">
              {skill.steps.map((step) => (
                <li key={step.order} className="flex items-baseline gap-3 px-3 py-2.5">
                  <span className={clsx(META, "w-4 shrink-0")}>{step.order}</span>
                  <div className="min-w-0">
                    <p className="font-sans text-[13px] leading-5 text-[var(--text-primary)]">{step.description}</p>
                    {step.requiredTool && <p className={META}>tool: {step.requiredTool}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {skill.sourceUrl && (
            <a
              href={skill.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              View on {skill.source}
            </a>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button type="button" onClick={() => setSandboxOpen(true)} className={BTN_SECONDARY}>
            Test run
          </button>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Close
          </button>
          {isInstalled ? (
            <button type="button" onClick={onInstall} className={clsx(BTN_SECONDARY, "text-[var(--state-error)]")}>
              Uninstall
            </button>
          ) : (
            <button type="button" onClick={onInstall} className={BTN_PRIMARY}>
              Install skill
            </button>
          )}
        </div>
      </div>

      <LiveSandbox
        skillName={skill.name}
        skillDescription={skill.description}
        steps={skill.steps}
        requiredServers={skill.requiredServers}
        isOpen={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
      />
    </div>
  );
}
