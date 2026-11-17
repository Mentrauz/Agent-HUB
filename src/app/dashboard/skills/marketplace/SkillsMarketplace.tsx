"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Loader2,
  Star,
  Download,
  Clock,
  Zap,
  Code,
  Database,
  Brain,
  BookOpen,
  Globe,
  Wrench,
  MessageSquare,
  BarChart3,
  Plus,
  Check,
  ExternalLink,
  Shield,
  Sparkles,
  LayoutGrid,
  List,
  Trash2,
  Play,
} from "lucide-react";
import { clsx } from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { ItemIcon } from "@/components/common/ItemIcon";
import { Pagination } from "@/components/common/Pagination";
import { AgentSkill, SkillCategory } from "@/types/agent-studio-registry";
import { SkillDTO } from "@/types/skill";
import { toast } from "@/stores/toastStore";
import { LiveSandbox } from "@/components/mcp/LiveSandbox";

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

const CATEGORIES: { id: SkillCategory | "ALL"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "ALL", label: "All", icon: Sparkles },
  { id: "RESEARCH", label: "Research", icon: BookOpen },
  { id: "CODING", label: "Coding", icon: Code },
  { id: "DATA", label: "Data", icon: Database },
  { id: "ANALYSIS", label: "Analysis", icon: BarChart3 },
  { id: "COMMUNICATION", label: "Communication", icon: MessageSquare },
  { id: "AUTOMATION", label: "Automation", icon: Zap },
  { id: "KNOWLEDGE", label: "Knowledge", icon: Brain },
  { id: "PRODUCTIVITY", label: "Productivity", icon: Wrench },
  { id: "CREATIVE", label: "Creative", icon: Globe },
];

const DIFFICULTIES = [
  { id: "ALL", label: "All levels" },
  { id: "BEGINNER", label: "Beginner" },
  { id: "INTERMEDIATE", label: "Intermediate" },
  { id: "ADVANCED", label: "Advanced" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  INTERMEDIATE: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  ADVANCED: "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]",
};

const CATEGORY_COLORS: Record<string, string> = {
  RESEARCH: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  CODING: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  DATA: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  ANALYSIS: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  COMMUNICATION: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  AUTOMATION: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  KNOWLEDGE: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  PRODUCTIVITY: "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  CREATIVE: "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]",
};

const SOURCES = [
  { id: "ALL", label: "All sources" },
  { id: "glama", label: "Glama.ai" },
  { id: "mcp.so", label: "mcp.so" },
  { id: "smithery", label: "Smithery.ai" },
  { id: "composio", label: "Composio" },
];

const SOURCE_COLORS: Record<string, string> = {
  glama: "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  "mcp.so": "border-[var(--state-success)]/40 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  smithery: "border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  composio: "border-[var(--state-success)]/40 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  "awesome-mcp": "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  community: "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
};

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-sans font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--state-warning)]" />
            Skills marketplace
          </h2>
          <p className="text-xs font-sans text-[var(--text-muted)] mt-0.5">
            Discover and install pre-configured agent skills from Glama, MCP.SO &amp; Smithery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-sans text-[var(--text-muted)] px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
            {skills.length} OF {totalCount > 0 ? totalCount.toLocaleString() : skills.length} Skills loaded
          </span>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-0.5">
            <button
              type="button"
              onClick={() => handleToggleViewMode("grid")}
              className={clsx(
                "p-1.5 rounded text-xs font-sans transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] "
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode("list")}
              className={clsx(
                "p-1.5 rounded text-xs font-sans transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] "
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
              title="Row List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills (e.g. research, database, github, slack)..."
            className="w-full pl-9 pr-8 py-2 text-xs font-sans rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Source Pills + Installed Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-sans text-[var(--text-muted)] font-medium">Source</span>
          {SOURCES.map((src) => {
            const active = source === src.id;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => setSource(src.id)}
                className={clsx(
                  "px-2 py-0.5 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
                  active
                    ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40"
                )}
              >
                {src.label}
              </button>              )
            ;
          })}
          <div className="w-px h-4 bg-[var(--surface-sunken)] mx-0.5" />
          <button
            type="button"
            onClick={() => setShowInstalledOnly((p) => !p)}
            className={clsx(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
              showInstalledOnly
                ? "border-[var(--state-success)]/40 bg-[var(--state-success)] text-[var(--cta-primary-text)] "
                : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-[var(--state-success)]/40"
            )}
          >
            <Check className="h-3 w-3" />
            INSTALLED
            {installedMap.size > 0 && (
              <span className="opacity-75 font-normal">({installedMap.size})</span>
            )}
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={clsx(
                  "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
                  active
                    ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                )}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-sans text-[var(--text-muted)] font-medium">Level</span>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDifficulty(d.id)}
              className={clsx(
                "px-2 py-0.5 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
                difficulty === d.id
                  ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                  : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
          <span className="ml-2 text-xs font-sans text-[var(--text-muted)]">Loading skills...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 p-3 text-xs font-sans text-[var(--state-error)]">
          {error}
        </div>
      )}

      {/* Skills Grid / Row List */}
      {!loading && !error && (
        <>
          {viewMode === "grid" ? (
            /* ────────────── Grid / Card View ────────────── */
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill) => {
                const isInstalled = isSkillInstalled(skill);
                const catColor = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.PRODUCTIVITY;
                const diffColor = DIFFICULTY_COLORS[skill.difficulty] || DIFFICULTY_COLORS.BEGINNER;
                const srcColor = SOURCE_COLORS[skill.source] || SOURCE_COLORS.glama;

                return (
                  <div
                    key={skill.id}
                    onClick={() => setDetailSkill(skill)}
                    className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 transition-colors p-4 flex flex-col justify-between space-y-3 cursor-pointer"
                  >
                    {/* Top */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <ItemIcon
                            name={skill.name}
                            category={skill.category}
                            tags={skill.tags}
                            owner={skill.author}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs font-sans font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                              {skill.name}
                            </h3>
                            <p className="text-xs font-sans text-[var(--text-muted)]">
                              by <span className="font-medium text-[var(--text-secondary)]">{skill.author}</span>
                            </p>
                          </div>
                        </div>
                        {isInstalled && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--state-success)]/10 text-[var(--state-success)] border border-[var(--state-success)]/25 shrink-0">
                            <Check className="h-2.5 w-2.5" /> Installed
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs font-sans text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {skill.description}
                      </p>

                      {/* Tags & Source */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", srcColor)}>
                          {skill.source === "smithery" ? "SMITHERY" : skill.source === "glama" ? "GLAMA" : skill.source === "mcp.so" ? "mcp.so" : skill.source}
                        </span>
                        <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", catColor)}>
                          {skill.category}
                        </span>
                        <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", diffColor)}>
                          {skill.difficulty}
                        </span>
                        {skill.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-xs font-sans bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs font-sans text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-[var(--state-warning)] font-medium">
                          {typeof skill.rating === "number" && (<><Star className="h-3 w-3 fill-[var(--text-muted)]" /> {skill.rating}</>)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          {typeof skill.installs === "number" && (<><Download className="h-3 w-3" /> {skill.installs.toLocaleString()}</>)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {skill.estimatedTime}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">{skill.steps.length} steps</span>
                    </div>

                    {/* Install / Uninstall Buttons */}
                    {isInstalled ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUninstall(skill);
                        }}
                        disabled={installing === skill.id}
                        className={clsx(
                          "w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                          installing === skill.id ? "opacity-60 cursor-wait" : "",
                          "border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] hover:bg-[var(--state-error)]/10"
                        )}
                      >
                        {installing === skill.id ? <><Loader2 className="h-3 w-3 animate-spin" /> Removing...</> : <><Trash2 className="h-3 w-3" /> Uninstall</>}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstall(skill);
                        }}
                        disabled={installing === skill.id}
                        className={clsx(
                          "w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                          installing === skill.id ? "opacity-60 cursor-wait" : "",
                          "border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] active:scale-95"
                        )}
                      >
                        {installing === skill.id ? <><Loader2 className="h-3 w-3 animate-spin" /> Installing...</> : <><Plus className="h-3 w-3" /> Install skill</>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ────────────── Row / List View ────────────── */
            <div ref={gridRef} className="space-y-2.5">
              {filteredSkills.map((skill) => {
                const isInstalled = isSkillInstalled(skill);
                const catColor = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.PRODUCTIVITY;
                const diffColor = DIFFICULTY_COLORS[skill.difficulty] || DIFFICULTY_COLORS.BEGINNER;
                const srcColor = SOURCE_COLORS[skill.source] || SOURCE_COLORS.glama;

                return (
                  <div
                    key={skill.id}
                    onClick={() => setDetailSkill(skill)}
                    className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 transition-colors p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 cursor-pointer"
                  >
                    {/* Left: Info, Badges, Description */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemIcon
                          name={skill.name}
                          category={skill.category}
                          tags={skill.tags}
                          owner={skill.author}
                          size="xs"
                        />
                        <h3 className="text-xs font-sans font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                          {skill.name}
                        </h3>
                        <span className="text-xs font-sans text-[var(--text-muted)]">
                          by <span className="font-medium text-[var(--text-secondary)]">{skill.author}</span>
                        </span>
                        <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", srcColor)}>
                          {skill.source === "smithery" ? "SMITHERY" : skill.source === "glama" ? "GLAMA" : skill.source === "mcp.so" ? "mcp.so" : skill.source}
                        </span>
                        <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", catColor)}>
                          {skill.category}
                        </span>
                        <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", diffColor)}>
                          {skill.difficulty}
                        </span>
                        {isInstalled && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--state-success)]/10 text-[var(--state-success)] border border-[var(--state-success)]/25 shrink-0">
                            <Check className="h-2.5 w-2.5" /> Installed
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-sans text-[var(--text-secondary)] line-clamp-1 leading-relaxed">
                        {skill.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans text-[var(--text-muted)]">
                        {skill.tags.slice(0, 3).map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            #{t}
                          </span>
                        ))}
                        <span>•</span>
                        <span>{skill.steps.length} workflow steps</span>
                      </div>
                    </div>

                    {/* Right: Stats & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-3.5 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
                      <div className="flex items-center gap-3 text-xs font-sans text-[var(--text-muted)]">
                        <span className="flex items-center gap-0.5 text-[var(--state-warning)] font-medium">
                          {typeof skill.rating === "number" && (<><Star className="h-3 w-3 fill-[var(--text-muted)]" /> {skill.rating}</>)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          {typeof skill.installs === "number" && (<><Download className="h-3 w-3" /> {skill.installs.toLocaleString()}</>)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {skill.estimatedTime}
                        </span>
                      </div>

                      {isInstalled ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUninstall(skill);
                          }}
                          disabled={installing === skill.id}
                          className={clsx(
                            "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer shrink-0 min-w-[90px]",
                            installing === skill.id ? "opacity-60 cursor-wait" : "",
                            "border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] hover:bg-[var(--state-error)]/10"
                          )}
                        >
                          {installing === skill.id ? <><Loader2 className="h-3 w-3 animate-spin" /> ...</> : <><Trash2 className="h-3 w-3" /> Remove</>}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstall(skill);
                          }}
                          disabled={installing === skill.id}
                          className={clsx(
                            "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-sans font-medium transition-colors cursor-pointer shrink-0 min-w-[90px]",
                            installing === skill.id ? "opacity-60 cursor-wait" : "",
                            "border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] active:scale-95"
                          )}
                        >
                          {installing === skill.id ? <><Loader2 className="h-3 w-3 animate-spin" /> ...</> : <><Plus className="h-3 w-3" /> Install</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
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

      {/* Empty State */}
      {!loading && !error && filteredSkills.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-8 w-8 text-[var(--accent-primary)] mx-auto" />
          <p className="text-xs font-sans font-medium text-[var(--text-primary)] mt-3">No skills found</p>
          <p className="text-xs font-sans text-[var(--text-muted)] mt-1">
            {showInstalledOnly ? "No installed skills match this filter." : `No skills matching "${search}" in this category.`}
          </p>
        </div>
      )}

      {/* Skill Detail Modal */}
      {detailSkill && (
        <SkillDetailModal
          skill={detailSkill}
          isInstalled={isSkillInstalled(detailSkill)}
          onInstall={() => isSkillInstalled(detailSkill) ? handleUninstall(detailSkill) : handleInstall(detailSkill)}
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
  const catColor = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.PRODUCTIVITY;
  const diffColor = DIFFICULTY_COLORS[skill.difficulty] || DIFFICULTY_COLORS.BEGINNER;
  const [sandboxOpen, setSandboxOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <ItemIcon
              name={skill.name}
              category={skill.category}
              tags={skill.tags}
              owner={skill.author}
              size="lg"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-sans font-medium text-[var(--text-primary)] truncate">
                {skill.name}
              </h3>
              <p className="text-xs font-sans text-[var(--text-muted)]">
                by <span className="font-medium text-[var(--text-secondary)]">{skill.author}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Description */}
          <div className="space-y-1.5">
            <div className="text-xs font-sans text-[var(--text-muted)] font-medium">Description</div>
            <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
              {skill.description}
            </p>
          </div>

          {/* Tags & Stats */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx("px-2 py-0.5 rounded text-xs font-sans font-medium border", SOURCE_COLORS[skill.source] || SOURCE_COLORS.glama)}>
              {skill.source === "smithery" ? "Smithery.ai" : skill.source === "glama" ? "Glama.ai" : skill.source === "mcp.so" ? "mcp.so" : skill.source}
            </span>
            <span className={clsx("px-2 py-0.5 rounded text-xs font-sans font-medium border", catColor)}>
              {skill.category}
            </span>
            <span className={clsx("px-2 py-0.5 rounded text-xs font-sans font-medium border", diffColor)}>
              {skill.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]">
              {typeof skill.rating === "number" && (<><Star className="h-3 w-3 fill-[var(--text-muted)]" /> {skill.rating}</>)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
              {typeof skill.installs === "number" && (<><Download className="h-3 w-3" /> {skill.installs.toLocaleString()} installs</>)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
              <Clock className="h-3 w-3" /> {skill.estimatedTime}
            </span>
          </div>

          {/* Required Servers */}
          {skill.requiredServers.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> Required MCP servers
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skill.requiredServers.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-xs font-sans font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2">
            <div className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> SKILL STEPS ({skill.steps.length})
            </div>
            <div className="space-y-2">
              {skill.steps.map((step) => (
                <div
                  key={step.order}
                  className="flex items-start gap-3 p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-sans font-medium shrink-0">
                    {step.order}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-sans font-medium text-[var(--text-primary)]">
                      {step.description}
                    </p>
                    {step.requiredTool && (
                      <p className="text-xs font-sans text-[var(--text-muted)] mt-0.5">
                        Tool: <span className="font-medium text-[var(--accent-primary)]">{step.requiredTool}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)]">
            <span className="">Source:</span>
            <span className="font-medium text-[var(--text-secondary)]">{skill.source}</span>
            {skill.sourceUrl && (
              <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-0.5">
                View <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border-subtle)] bg-black/60 rounded-b-xl">
          <button
            type="button"
            onClick={() => setSandboxOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border text-xs font-sans font-medium transition-colors cursor-pointer border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-[var(--state-warning)] hover:bg-[var(--state-warning)]/10"
          >
            <Play className="h-3 w-3" /> Test run
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            Close
          </button>
          {isInstalled ? (
            <button
              type="button"
              onClick={onInstall}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded border text-xs font-sans font-medium transition-colors cursor-pointer border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] hover:bg-[var(--state-error)]/10"
            >
              <Trash2 className="h-3 w-3" /> Uninstall
            </button>
          ) : (
            <button
              type="button"
              onClick={onInstall}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded border text-xs font-sans font-medium transition-colors cursor-pointer border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] active:scale-95"
            >
              <Plus className="h-3 w-3" /> Install skill
            </button>
          )}
        </div>
      </div>

      {/* Live Sandbox Drawer */}
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
