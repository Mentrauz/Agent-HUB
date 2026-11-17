"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Globe,
  Search,
  Star,
  Sparkles,
  ExternalLink,
  Plus,
  Loader2,
  X,
  ShieldCheck,
  Zap,
  Terminal,
  Tag,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Code,
  Database,
  Monitor,
  Cpu,
  Brain,
  BookOpen,
  Wrench,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Heart,
  Activity,
  Clock,
  FileText,
  LayoutGrid,
  List,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { ItemIcon } from "@/components/common/ItemIcon";
import { Pagination } from "@/components/common/Pagination";
import {
  PublicMcpServer,
  PublicMcpSource,
  McpDirectoryResponse,
  GitHubRepoInfo,
  ServerHealthPing,
} from "@/types/mcp-directory";
import { ServerQualityScore, QualityGrade } from "@/types/agent-studio-registry";

interface McpDirectoryBrowserProps {
  onMount: (server: PublicMcpServer) => void;
  mountedServerIds?: string[];
  busyServerId?: string | null;
}

const SOURCES: { id: "ALL" | PublicMcpSource; label: string; countKey?: "glamaCount" | "mcpSoCount" | "smitheryCount" | "composioCount" | "arcadeCount" | "mcpserversOrgCount" }[] = [
  { id: "ALL", label: "All registries" },
  { id: "glama", label: "Glama directory", countKey: "glamaCount" },
  { id: "mcp.so", label: "mcp.so & curated", countKey: "mcpSoCount" },
  { id: "smithery", label: "Smithery (9k+)", countKey: "smitheryCount" },
  { id: "composio", label: "Composio (1k+)", countKey: "composioCount" },
  { id: "arcade", label: "Arcade (7.5k+)", countKey: "arcadeCount" },
  { id: "mcpservers-org", label: "mcpservers.org (9.8k+)", countKey: "mcpserversOrgCount" },
];

const CATEGORIES = [
  { id: "ALL", label: "All categories", icon: Sparkles },
  { id: "DATABASES", label: "Databases", icon: Database },
  { id: "BROWSER AUTOMATION", label: "Browser auto", icon: Monitor },
  { id: "SEARCH & DATA EXTRACTION", label: "Search & web", icon: Globe },
  { id: "DEVELOPER TOOLS", label: "Dev tools", icon: Code },
  { id: "CLOUD PLATFORMS", label: "Cloud", icon: Cpu },
  { id: "PRODUCTIVITY", label: "Productivity", icon: Zap },
  { id: "AI & REASONING", label: "AI & reasoning", icon: Brain },
  { id: "KNOWLEDGE & MEMORY", label: "Knowledge", icon: BookOpen },
  { id: "COMMUNICATION", label: "Communication", icon: Globe },
  { id: "FINANCE & FINTECH", label: "Finance", icon: Zap },
  { id: "SECURITY", label: "Security", icon: ShieldCheck },
  { id: "DEVOPS & CLOUD", label: "DevOps", icon: Cpu },
  { id: "FILE SYSTEMS", label: "Files", icon: FileText },
  { id: "MULTIMEDIA PROCESS", label: "Media", icon: Monitor },
  { id: "OS AUTOMATION", label: "OS auto", icon: Terminal },
  { id: "RESEARCH", label: "Research", icon: BookOpen },
  { id: "UTILITIES", label: "Utilities", icon: Wrench },
];

const LANGUAGES = [
  { id: "ALL", label: "All languages" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "csharp", label: "C#" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C/C++" },
  { id: "ruby", label: "Ruby" },
];

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  python: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  go: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  rust: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  csharp: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  java: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  cpp: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  ruby: "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]",
};

const TRANSPORTS = [
  { id: "ALL", label: "All transports" },
  { id: "STDIO", label: "Stdio (local)" },
  { id: "SSE", label: "SSE (remote)" },
];

const SORT_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "stars", label: "Most popular" },
  { id: "name", label: "A-Z" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["id"];

const PAGE_SIZE = 36;

// ────────────── Favorites Hook (localStorage) ──────────────

function useDirectoryFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("mcp-dir-favorites") || "[]");
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((serverId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId];
      try {
        localStorage.setItem("mcp-dir-favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isFavorite = useCallback((serverId: string) => favorites.includes(serverId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}

// ────────────── Main Component ──────────────

export function McpDirectoryBrowser({ onMount, mountedServerIds = [], busyServerId }: McpDirectoryBrowserProps) {
  const [servers, setServers] = useState<PublicMcpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"ALL" | PublicMcpSource>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [transport, setTransport] = useState<string>("ALL");
  const [language, setLanguage] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [counts, setCounts] = useState<{ glamaCount: number; mcpSoCount: number; smitheryCount: number; composioCount: number; arcadeCount: number; mcpserversOrgCount: number }>({ glamaCount: 0, mcpSoCount: 0, smitheryCount: 0, composioCount: 0, arcadeCount: 0, mcpserversOrgCount: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailServer, setDetailServer] = useState<PublicMcpServer | null>(null);
  const [qualityScores, setQualityScores] = useState<Map<string, ServerQualityScore>>(new Map());
  const [_qualityLoading, setQualityLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [dirViewMode, setDirViewMode] = useState<"grid" | "row">("grid");

  const { favorites, toggleFavorite, isFavorite } = useDirectoryFavorites();

  const mountedSet = useMemo(
    () => new Set(mountedServerIds.map((id) => id.toLowerCase())),
    [mountedServerIds]
  );

  const isServerMounted = useCallback(
    (server: PublicMcpServer) => {
      const normId = server.id.toLowerCase();
      const normName = server.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const plainName = server.name.toLowerCase();
      return (
        mountedSet.has(normId) ||
        mountedSet.has(normName) ||
        mountedSet.has(plainName) ||
        mountedSet.has(normId.replace(/^pub-/, ""))
      );
    },
    [mountedSet]
  );

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (source !== "ALL") params.set("source", source);
      if (category !== "ALL") params.set("category", category);
      if (transport !== "ALL") params.set("transport", transport);
      if (language !== "ALL") params.set("language", language);

      const res = await fetch(`/api/mcp/directory?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json: McpDirectoryResponse = await res.json();
      if (json.success) {
        setServers(json.data);
        if (json.sources) setCounts({
          glamaCount: json.sources.glamaCount || 0,
          mcpSoCount: json.sources.mcpSoCount || 0,
          smitheryCount: json.sources.smitheryCount || 0,
          composioCount: json.sources.composioCount || 0,
          arcadeCount: json.sources.arcadeCount || 0,
          mcpserversOrgCount: json.sources.mcpserversOrgCount || 0,
        });
        setCurrentPage(1);
      } else {
        throw new Error("Failed to load directory");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to directory");
    } finally {
      setLoading(false);
    }
  }, [search, source, category, transport, language]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDirectory();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDirectory]);

  // Fetch quality scores for visible servers
  useEffect(() => {
    if (servers.length === 0) return;
    setQualityLoading(true);
    fetch("/api/mcp/quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servers: servers.slice(0, 20).map((s) => ({
          id: s.id,
          name: s.name,
          transport: s.transport,
          endpointUrl: s.endpointUrl,
          repoUrl: s.repoUrl,
          description: s.description,
          stars: s.stars,
          isVerified: s.isVerified,
        })),
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const map = new Map<string, ServerQualityScore>();
          for (const score of json.data) {
            map.set(score.serverId, score);
          }
          setQualityScores(map);
        }
      })
      .catch(() => {})
      .finally(() => setQualityLoading(false));
  }, [servers]);

  const copyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Apply sorting + favorites filter
  const processedServers = useMemo(() => {
    let list = [...servers];

    // Favorites filter
    if (showFavoritesOnly) {
      list = list.filter((s) => favorites.includes(s.id));
    }

    // Installed filter
    if (showInstalledOnly) {
      list = list.filter((s) => mountedSet.has(s.id));
    }

    // Sorting
    if (sortBy === "stars") {
      list.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    // "default" keeps API order (verified first, then stars)

    return list;
  }, [servers, sortBy, showFavoritesOnly, favorites, mountedSet, showInstalledOnly]);

  const totalPages = Math.max(1, Math.ceil(processedServers.length / PAGE_SIZE));

  // Scroll to top of grid on page change
  useEffect(() => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  // Clamp current page when totalPages shrinks (e.g. favorites filter, search)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const visibleServers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return processedServers.slice(start, start + PAGE_SIZE);
  }, [processedServers, currentPage]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="space-y-3 bg-[var(--surface-sunken)]/50 p-3.5 rounded-lg border border-[var(--border-subtle)] shadow-xs">
        {/* Top Row: Search Bar + Refresh + Transport Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Bar with Quick Refresh */}
          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 100K+ servers (e.g. Supabase, Notion, Obsidian, Postgres, GitHub, Playwright)..."
                className="w-full pl-9 pr-8 py-2 text-xs font-sans rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40 focus:ring-1 focus:ring-[var(--accent-primary)]/40 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => void fetchDirectory()}
              disabled={loading}
              title="Refresh servers"
              className={clsx(
                "p-2 rounded-md border text-xs font-sans transition-colors cursor-pointer shrink-0 flex items-center justify-center",
                loading
                  ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/40"
              )}
            >
              <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin text-[var(--accent-primary)]")} />
            </button>
          </div>

          {/* Transport Pills */}
          <div className="flex items-center gap-1 bg-[var(--surface-sunken)] p-1 rounded-md border border-[var(--border-subtle)] shrink-0 self-start sm:self-auto">
            {TRANSPORTS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTransport(t.id)}
                className={clsx(
                  "px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                  transport === t.id
                    ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] shadow-xs font-medium"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Row: Source Registries */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--border-subtle)] scrollbar-none">
          <span className="text-xs font-sans text-[var(--text-muted)] font-medium shrink-0 flex items-center gap-1 mr-1">
            <Globe className="h-3 w-3 text-[var(--accent-primary)]" /> Registry
          </span>
          {SOURCES.map((s) => {
            const active = source === s.id;
            const badgeCount =
              s.id === "ALL"
                ? counts.glamaCount + counts.mcpSoCount + counts.smitheryCount + counts.composioCount + counts.arcadeCount + counts.mcpserversOrgCount
                : s.countKey
                ? counts[s.countKey]
                : 0;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSource(s.id)}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium border transition-colors cursor-pointer shrink-0 whitespace-nowrap",
                  active
                    ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]"
                )}
              >
                <Globe className="h-3 w-3" />
                {s.label}
                {badgeCount > 0 && <span className="opacity-80 font-normal">({badgeCount})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Filter */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 scrollbar-none">
        <span className="text-xs font-sans text-[var(--text-muted)] font-medium shrink-0 flex items-center gap-1 mr-1">
          <Code className="h-3 w-3 text-[var(--accent-primary)]" /> Lang
        </span>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            type="button"
            onClick={() => setLanguage(lang.id)}
            className={clsx(
              "px-2 py-0.5 rounded text-xs font-sans font-medium border transition-colors cursor-pointer shrink-0",
              language === lang.id
                ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40"
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Category Pills + Sort + Favorites */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={clsx(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
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

        {/* Sort + Favorites Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Installed toggle */}
          <button
            type="button"
            onClick={() => setShowInstalledOnly((prev) => !prev)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
              showInstalledOnly
                ? "border-[var(--state-success)]/40 bg-[var(--state-success)]/10 text-[var(--state-success)] "
                : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-[var(--state-success)]/25 hover:text-[var(--state-success)]"
            )}
          >
            <Check className="h-3 w-3" />
            Installed
            {mountedSet.size > 0 && <span>({mountedSet.size})</span>}
          </button>

          {/* Favorites toggle */}
          <button
            type="button"
            onClick={() => setShowFavoritesOnly((prev) => !prev)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
              showFavoritesOnly
                ? "border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)] "
                : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-[var(--state-error)]/25 hover:text-[var(--state-error)]"
            )}
          >
            <Heart className={clsx("h-3 w-3", showFavoritesOnly && "fill-[var(--text-muted)]")} />
            {favorites.length > 0 && <span>({favorites.length})</span>}
          </button>

          {/* Sort dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1 bg-[var(--surface-sunken)] p-1 rounded border border-[var(--border-subtle)]">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={clsx(
                    "px-2 py-1 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                    sortBy === opt.id
                      ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Count & Status */}
      <div className="flex items-center justify-between text-xs font-sans text-[var(--text-muted)] px-1">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--state-warning)]" />
          {loading ? "Fetching 500+ servers from glama & mcp.so…" : `DISPLAYING ${visibleServers.length} OF ${processedServers.length} COMPATIBLE MCP SERVERS`}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block">GLAMA.AI • MCP.SO • SMITHERY</span>
          {!loading && processedServers.length > 0 && (
            <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-0.5">
              <button
                type="button"
                onClick={() => setDirViewMode("grid")}
                className={clsx(
                  "p-1.5 rounded text-xs font-sans transition-colors cursor-pointer",
                  dirViewMode === "grid"
                    ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] "
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                title="Card Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDirViewMode("row")}
                className={clsx(
                  "p-1.5 rounded text-xs font-sans transition-colors cursor-pointer",
                  dirViewMode === "row"
                    ? "bg-[var(--surface-raised)] text-[var(--accent-primary)] "
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                title="Row List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 p-3 text-xs font-sans text-[var(--state-error)]">
          {error}
        </div>
      )}

      {/* Grid of Servers */}
      {loading && servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
          <p className="text-xs font-sans text-[var(--text-muted)]">Querying Glama Directory &amp; mcp.so...</p>
        </div>
      ) : processedServers.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--border-strong)] p-12 text-center space-y-2">
          <Globe className="h-8 w-8 text-[var(--accent-primary)] mx-auto" />
          <p className="text-sm font-sans font-medium text-[var(--text-primary)]">No directory servers found</p>
          <p className="text-xs font-sans text-[var(--text-muted)]">
            {showFavoritesOnly
              ? "No favorite servers yet. Star servers to add them here."
              : `No public MCP servers matched "${search}". Try adjusting your search query or category filter.`}
          </p>
        </div>
      ) : (
        <>
          {dirViewMode === "grid" ? (
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visibleServers.map((server) => {
              const isSse = server.transport === "SSE";
              const targetCmd = isSse ? server.endpointUrl ?? "" : server.command ?? "";
              const isMounted = mountedSet.has(server.id);
              const isFav = isFavorite(server.id);

              return (
                <div
                  key={server.id}
                  onClick={() => setDetailServer(server)}
                  className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 transition-colors p-4 flex flex-col justify-between space-y-3 cursor-pointer"
                >
                  {/* Card Top */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemIcon
                          name={server.name}
                          category={server.category}
                          tags={server.tags}
                          owner={server.owner}
                          repoUrl={server.repoUrl}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-sans font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                              {server.name}
                            </h4>
                            {server.isVerified && (
                              <span title="Verified Server">
                                <ShieldCheck className="h-3.5 w-3.5 text-[var(--state-success)] shrink-0" />
                              </span>
                            )}
                            {isMounted && (
                              <span title="Already mounted" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                                <Check className="h-2.5 w-2.5" /> Mounted
                              </span>
                            )}
                            {(() => {
                              const score = qualityScores.get(server.id);
                              if (!score) return null;
                              return (
                                <QualityBadge grade={score.overall} score={score.overallScore} />
                              );
                            })()}
                          </div>
                          <p className="text-xs font-sans text-[var(--text-muted)] truncate">
                            by <span className="font-medium text-[var(--text-secondary)]">{server.owner || "community"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Favorite button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(server.id);
                          }}
                          title={isFav ? "Remove from favorites" : "Add to favorites"}
                          className="cursor-pointer p-0.5 transition-colors"
                        >
                          <Heart
                            className={clsx(
                              "h-3.5 w-3.5 transition-colors",
                              isFav ? "text-[var(--state-error)] fill-[var(--text-muted)]" : "text-[var(--text-muted)] hover:text-[var(--state-error)]"
                            )}
                          />
                        </button>

                        {/* Transport Tag */}
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded text-xs font-sans font-medium border ",
                            isSse
                              ? "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                              : "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
                          )}
                        >
                          {server.transport}
                        </span>

                        {/* Source Tag */}
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-xs font-sans font-medium border",
                          server.source === "smithery"
                            ? "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                            : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                        )}>
                          {server.source === "smithery" ? "SMITHERY" : server.source}
                        </span>

                        {/* Language Tag */}
                        {server.language && server.language !== "unknown" && (
                          <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", LANGUAGE_COLORS[server.language] || "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]")}>
                            {server.language}
                          </span>
                        )}

                        {/* License Tag */}
                        {server.license && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                            {server.license}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs font-sans text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {server.description}
                    </p>

                    {/* Tags */}
                    {server.tags && server.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {server.tags.slice(0, 4).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-xs font-sans bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Command/Endpoint Snippet */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="relative rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2.5 py-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-sans text-[var(--text-secondary)] truncate">
                        {targetCmd}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCommand(server.id, targetCmd);
                        }}
                        title="Copy command"
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer shrink-0"
                      >
                        {copiedId === server.id ? <Check className="h-3 w-3 text-[var(--state-success)]" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)]">
                        {server.stars !== undefined && server.stars > 0 && (
                          <span className="flex items-center gap-0.5 text-[var(--state-warning)] font-medium">
                            <Star className="h-3 w-3 fill-[var(--text-muted)]" /> {server.stars}
                          </span>
                        )}
                        {server.repoUrl && (
                          <a
                            href={server.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 hover:text-[var(--accent-primary)]"
                          >
                            Repo <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>

                      {isServerMounted(server) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] text-xs font-sans font-medium">
                          <Check className="h-3 w-3" /> Connected
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyServerId === server.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMount(server);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] disabled:opacity-60 text-[var(--cta-primary-text)] text-xs font-sans font-medium active:scale-95 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          {busyServerId === server.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Mounting…
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" /> 1-Click mount
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
          /* ────────────── Row / List View ────────────── */
          <div ref={gridRef} className="space-y-2.5">
            {visibleServers.map((server) => {
              const isSse = server.transport === "SSE";
              const targetCmd = isSse ? server.endpointUrl ?? "" : server.command ?? "";
              const isMounted = mountedSet.has(server.id);
              const isFav = isFavorite(server.id);

              return (
                <div
                  key={server.id}
                  onClick={() => setDetailServer(server)}
                  className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 transition-colors p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 cursor-pointer"
                >
                  {/* Left: Info, Badges */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <ItemIcon
                        name={server.name}
                        category={server.category}
                        tags={server.tags}
                        owner={server.owner}
                        repoUrl={server.repoUrl}
                        size="xs"
                      />
                      <h3 className="text-xs font-sans font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {server.name}
                      </h3>
                      {server.isVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-[var(--state-success)] shrink-0" />
                      )}
                      {isMounted && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25 shrink-0">
                          <Check className="h-2.5 w-2.5" /> Mounted
                        </span>
                      )}
                      {(() => {
                        const score = qualityScores.get(server.id);
                        if (!score) return null;
                        return <QualityBadge grade={score.overall} score={score.overallScore} />;
                      })()}
                      <span className="text-xs font-sans text-[var(--text-muted)]">
                        by <span className="font-medium text-[var(--text-secondary)]">{server.owner || "community"}</span>
                      </span>
                      <span
                        className={clsx(
                          "px-1.5 py-0.5 rounded text-xs font-sans font-medium border ",
                          isSse
                            ? "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                            : "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
                        )}
                      >
                        {server.transport}
                      </span>
                      <span className={clsx(
                        "px-1.5 py-0.5 rounded text-xs font-sans font-medium border",
                        server.source === "smithery"
                          ? "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                      )}>
                        {server.source === "smithery" ? "SMITHERY" : server.source}
                      </span>
                      {server.language && server.language !== "unknown" && (
                        <span className={clsx("px-1.5 py-0.5 rounded text-xs font-sans font-medium border", LANGUAGE_COLORS[server.language] || "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]")}>
                          {server.language}
                        </span>
                      )}
                      {server.license && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-sans font-medium border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                          {server.license}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-sans text-[var(--text-secondary)] line-clamp-1 leading-relaxed">
                      {server.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans text-[var(--text-muted)]">
                      {server.tags && server.tags.slice(0, 3).map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                          #{t}
                        </span>
                      ))}
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{targetCmd}</span>
                    </div>
                  </div>

                  {/* Right: Stats & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)]">
                      {server.stars !== undefined && server.stars > 0 && (
                        <span className="flex items-center gap-0.5 text-[var(--state-warning)] font-medium">
                          <Star className="h-3 w-3 fill-[var(--text-muted)]" /> {server.stars}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(server.id);
                        }}
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                        className="cursor-pointer p-0.5 transition-colors"
                      >
                        <Heart className={clsx("h-3.5 w-3.5 transition-colors", isFav ? "text-[var(--state-error)] fill-[var(--text-muted)]" : "text-[var(--text-muted)] hover:text-[var(--state-error)]")} />
                      </button>
                    </div>

                    {isServerMounted(server) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] text-xs font-sans font-medium shrink-0 min-w-[90px] justify-center">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busyServerId === server.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMount(server);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] disabled:opacity-60 text-[var(--cta-primary-text)] text-xs font-sans font-medium active:scale-95 transition-colors cursor-pointer shrink-0 min-w-[90px] disabled:cursor-not-allowed"
                      >
                        {busyServerId === server.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Mounting…
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" /> Mount
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Server Detail Modal */}
      {detailServer && createPortal(
        <ServerDetailModal
          server={detailServer}
          qualityScore={qualityScores.get(detailServer.id) || null}
          onClose={() => setDetailServer(null)}
          onMount={() => {
            onMount(detailServer);
            setDetailServer(null);
          }}
          isFavorite={isFavorite(detailServer.id)}
          onToggleFavorite={() => toggleFavorite(detailServer.id)}
          isMounted={isServerMounted(detailServer)}
          isBusy={busyServerId === detailServer.id}
        />,
        document.body
      )}
    </div>
  );
}

/* ────────────── Server Detail Modal ────────────── */

function ServerDetailModal({
  server,
  qualityScore,
  onClose,
  onMount,
  isFavorite,
  onToggleFavorite,
  isMounted,
  isBusy,
}: {
  server: PublicMcpServer;
  qualityScore: ServerQualityScore | null;
  onClose: () => void;
  onMount: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isMounted: boolean;
  isBusy?: boolean;
}) {
  const isSse = server.transport === "SSE";
  const targetCmd = isSse ? server.endpointUrl ?? "" : server.command ?? "";
  const requiresAuth = Boolean(server.requiresAuthToken);
  const hasEnvVars = Boolean(server.envVarsRequired && server.envVarsRequired.length > 0);

  // GitHub info state
  const [githubInfo, setGithubInfo] = useState<GitHubRepoInfo | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubTab, setGithubTab] = useState<"readme" | "changelog">("readme");
  const [readmeExpanded, setReadmeExpanded] = useState(false);

  // Health ping state
  const [health, setHealth] = useState<ServerHealthPing | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Fetch GitHub info on mount
  useEffect(() => {
    if (!server.repoUrl) return;
    setGithubLoading(true);
    fetch(`/api/mcp/directory/github?repo=${encodeURIComponent(server.repoUrl)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setGithubInfo(json.data);
      })
      .catch(() => {})
      .finally(() => setGithubLoading(false));
  }, [server.repoUrl]);

  // Ping health for SSE servers
  useEffect(() => {
    if (!isSse || !server.endpointUrl) return;
    setHealthLoading(true);
    fetch("/api/mcp/directory/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpointUrl: server.endpointUrl }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setHealth(json.data);
      })
      .catch(() => {})
      .finally(() => setHealthLoading(false));
  }, [isSse, server.endpointUrl]);

  // Format markdown readme to plain text (simplified)
  const formatReadme = (md: string): string => {
    return md
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "[image]")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <ItemIcon
              name={server.name}
              category={server.category}
              tags={server.tags}
              owner={server.owner}
              repoUrl={server.repoUrl}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-sans font-medium text-[var(--text-primary)] truncate">
                  {server.name}
                </h3>
                {isMounted && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                    <Check className="h-2.5 w-2.5" /> Already mounted
                  </span>
                )}
              </div>
              <p className="text-xs font-sans text-[var(--text-muted)]">
                by <span className="font-medium text-[var(--text-secondary)]">{server.owner || "community"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleFavorite}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
            >
              <Heart className={clsx("h-4 w-4", isFavorite ? "text-[var(--state-error)] fill-[var(--text-muted)]" : "text-[var(--text-muted)] hover:text-[var(--state-error)]")} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Description */}
          <div className="space-y-1.5">
            <div className="text-xs font-sans text-[var(--text-muted)] font-medium">Description</div>
            <p className="text-[12px] font-sans text-[var(--text-secondary)] leading-relaxed">
              {server.description}
            </p>
          </div>

          {/* Tags */}
          {server.tags && server.tags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> TAGS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {server.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-xs font-sans bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25 font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-3">
            {server.stars !== undefined && server.stars > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)] text-xs font-sans font-medium">
                <Star className="h-3 w-3 fill-[var(--text-muted)]" /> {server.stars} STARS
              </span>
            )}
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-sans font-medium ",
                isSse
                  ? "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
              )}
            >
              {isSse ? <Globe className="h-3 w-3" /> : <Terminal className="h-3 w-3" />} {server.transport}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-xs font-sans font-medium">
              {server.source === "glama" ? "Glama Directory" : server.source === "mcp.so" ? "mcp.so" : "Curated"}
            </span>
            {server.isVerified && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)] text-xs font-sans font-medium">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            )}
            {(() => {
              const score = qualityScore;
              if (!score) return null;
              return (
                <span className="inline-flex items-center gap-1.5">
                  <QualityBadge grade={score.overall} score={score.overallScore} />
                  <span className="text-xs font-sans text-[var(--text-muted)]">{score.overallScore}/100</span>
                </span>
              );
            })()}
            {server.language && server.language !== "unknown" && (
              <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-sans font-medium ", LANGUAGE_COLORS[server.language] || "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]")}>
                <Code className="h-3 w-3" /> {server.language}
              </span>
            )}
            {server.license && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-sans font-medium">
                LICENSE: {server.license}
              </span>
            )}
          </div>

          {/* Health Ping (SSE only) */}
          {isSse && (
            <div className="space-y-1.5">
              <div className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                <Activity className="h-3 w-3" /> Endpoint health
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 p-3">
                {healthLoading ? (
                  <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Pinging endpoint...
                  </div>
                ) : health ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "h-2 w-2 rounded-full",
                          health.status === "healthy" ? "bg-[var(--state-success)]" : health.status === "degraded" ? "bg-[var(--state-warning)]" : "bg-[var(--state-error)]"
                        )}
                      />
                      <span className="text-xs font-sans font-medium">
                        {health.status === "healthy" ? "Live & responsive" : health.status === "degraded" ? "Slow response" : "Unreachable"}
                      </span>
                    </div>
                    {health.latencyMs > 0 && (
                      <span className="text-xs font-sans text-[var(--text-muted)]">{health.latencyMs}ms</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-sans text-[var(--text-muted)]">Health check unavailable</span>
                )}
              </div>
            </div>
          )}

          {/* Quality Score Breakdown */}
          {(() => {
            const score = qualityScore;
            if (!score) return null;
            return (
              <div className="space-y-2">
                <div className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                  <Star className="h-3 w-3" /> Quality score
                  <QualityBadge grade={score.overall} score={score.overallScore} />
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 p-3.5 space-y-2">
                  {Object.entries(score.dimensions as Record<string, { score: number; grade: QualityGrade }>).map(([key, dim]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs font-sans text-[var(--text-secondary)] capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full",
                              dim.score >= 80 ? "bg-[var(--state-success)]" : dim.score >= 60 ? "bg-[var(--state-warning)]" : "bg-[var(--state-error)]"
                            )}
                            style={{ width: `${dim.score}%` }}
                          />
                        </div>
                        <QualityBadge grade={dim.grade} score={dim.score} />
                      </div>
                    </div>
                  ))}
                  {score.badges.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                      {score.badges.map((badge) => (
                        <span key={badge.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                          {badge.icon} {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Auth & Permissions Section */}
          <div className="space-y-2">
            <div className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" /> Auth & permissions
            </div>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 p-3.5 space-y-2.5">
              {/* Auth Required */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans text-[var(--text-secondary)]">Requires Auth Token</span>
                <span className={clsx(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium ",
                  requiresAuth
                    ? "border border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]"
                    : "border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
                )}>
                  {requiresAuth ? <><AlertTriangle className="h-2.5 w-2.5" /> YES</> : <><CheckCircle2 className="h-2.5 w-2.5" /> NO</>}
                </span>
              </div>

              {/* Env Vars Required */}
              {hasEnvVars && (
                <div className="space-y-1.5">
                  <div className="text-xs font-sans text-[var(--text-muted)] font-medium">Required Environment Variables</div>
                  <div className="flex flex-wrap gap-1.5">
                    {server.envVarsRequired!.map((env, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs font-sans font-medium bg-[var(--state-warning)]/10 text-[var(--state-warning)] border border-[var(--state-warning)]/25"
                      >
                        {env}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Compatibility Status */}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-sans text-[var(--text-secondary)]">Compatibility</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]">
                  <CheckCircle2 className="h-2.5 w-2.5" /> COMPATIBLE — {isSse ? "Remote SSE Endpoint" : "Local stdio Process"}
                </span>
              </div>

              {/* Allowed from Provider */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans text-[var(--text-secondary)]">Allowed from Provider</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]">
                  <CheckCircle2 className="h-2.5 w-2.5" /> YES
                </span>
              </div>
            </div>
          </div>

          {/* Command / Endpoint */}
          <div className="space-y-1.5">
            <div className="text-xs font-sans text-[var(--text-muted)] font-medium">
              {isSse ? "Endpoint URL" : "Install command"}
            </div>
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs font-sans text-[var(--text-secondary)] break-all">
                {targetCmd}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(targetCmd);
                }}
                title="Copy"
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Repo Link */}
          {server.repoUrl && (
            <a
              href={server.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-sans text-[var(--accent-primary)] hover:underline font-medium"
            >
              <ExternalLink className="h-3 w-3" /> View Source Repository
            </a>
          )}

          {/* GitHub Info Section (Release + README) */}
          {server.repoUrl && (
            <div className="space-y-2">
              <div className="text-xs font-sans text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Repository info
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] pb-0">
                <button
                  type="button"
                  onClick={() => setGithubTab("readme")}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-sans font-medium border border-b-0 transition-colors cursor-pointer",
                    githubTab === "readme"
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                  )}
                >
                  <FileText className="h-3 w-3" /> Readme
                </button>
                <button
                  type="button"
                  onClick={() => setGithubTab("changelog")}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-sans font-medium border border-b-0 transition-colors cursor-pointer",
                    githubTab === "changelog"
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                  )}
                >
                  <Clock className="h-3 w-3" /> Changelog
                </button>
              </div>

              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 p-3.5 min-h-[80px]">
                {githubLoading ? (
                  <div className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Fetching from GitHub...
                  </div>
                ) : githubTab === "readme" ? (
                  githubInfo?.readme ? (
                    <div className="space-y-2">
                      <pre className={clsx(
                        "text-xs font-sans text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed overflow-hidden",
                        !readmeExpanded && "max-h-32"
                      )}>
                        {formatReadme(githubInfo.readme)}
                      </pre>
                      {githubInfo.readme.length > 500 && (
                        <button
                          type="button"
                          onClick={() => setReadmeExpanded((prev) => !prev)}
                          className="text-xs font-sans text-[var(--accent-primary)] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {readmeExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read full README</>}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-sans text-[var(--text-muted)]">No README available</p>
                  )
                ) : (
                  githubInfo?.release ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-sans font-medium text-[var(--text-primary)]">
                          {githubInfo.release.name || githubInfo.release.version}
                        </span>
                        <span className="text-xs font-sans text-[var(--text-muted)]">
                          {new Date(githubInfo.release.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                        {githubInfo.release.version}
                      </span>
                      {githubInfo.release.body && (
                        <pre className="text-xs font-sans text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                          {formatReadme(githubInfo.release.body)}
                        </pre>
                      )}
                      <a
                        href={githubInfo.release.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-sans text-[var(--accent-primary)] hover:underline"
                      >
                        View on GitHub <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs font-sans text-[var(--text-muted)]">No releases found</p>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border-subtle)] bg-black/60 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-[var(--border-strong)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onMount}
            disabled={isMounted || isBusy}
            className={clsx(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded border text-xs font-sans font-medium transition-colors cursor-pointer",
              isMounted
                ? "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-muted)] cursor-not-allowed"
                : isBusy
                ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] opacity-60 text-[var(--cta-primary-text)] cursor-not-allowed"
                : "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] active:scale-95"
            )}
          >
            {isMounted ? (
              <>
                <Check className="h-3 w-3" /> Already mounted
              </>
            ) : isBusy ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Mounting…
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> 1-Click mount
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────── Quality Badge ────────────── */

const GRADE_COLORS: Record<QualityGrade, string> = {
  "A+": "border-[var(--state-success)]/40 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  "A": "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  "B+": "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  "B": "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  "C+": "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  "C": "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  "D": "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  "F": "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]",
};

function QualityBadge({ grade, score }: { grade: QualityGrade; score: number }) {
  const colorClass = GRADE_COLORS[grade] || GRADE_COLORS.B;
  return (
    <span
      title={`Quality: ${grade} (${score}/100)`}
      className={clsx(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium border shrink-0",
        colorClass
      )}
    >
      {grade}
    </span>
  );
}

