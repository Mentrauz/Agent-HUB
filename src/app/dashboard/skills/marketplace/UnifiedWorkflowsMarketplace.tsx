"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Loader2,
  GitBranch,
  ExternalLink,
  LayoutGrid,
  List,
  Eye,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Workflow,
  Flame,
  Tag,
  Puzzle,
  BookOpen,
  Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/stores/toastStore";
import { Pagination } from "@/components/common/Pagination";
import { N8nOfficialLogo, DifyOfficialLogo } from "@/components/common/BrandLogos";

type WorkflowProvider = "all" | "n8n" | "dify" | "studio";

const PROVIDERS: Array<{
  id: WorkflowProvider;
  name: string;
  statsKey: "total" | "n8n" | "dify" | "studio";
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeClass: string;
  pillClass: string;
}> = [
  {
    id: "all",
    name: "All providers",
    statsKey: "total",
    icon: Layers,
    colorClass: "text-[var(--text-muted)]",
    activeClass: "bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border-strong)] ",
    pillClass: "border-[var(--border-strong)] bg-[var(--surface-elevated)]/10 text-[var(--text-muted)]",
  },
  {
    id: "n8n",
    name: "n8n workflows",
    statsKey: "n8n",
    icon: N8nOfficialLogo,
    colorClass: "text-[var(--state-error)]",
    activeClass: "bg-[var(--state-error)] text-[var(--cta-primary-text)] border-[var(--state-error)]/40",
    pillClass: "border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]",
  },
  {
    id: "dify",
    name: "Dify.ai workflows",
    statsKey: "dify",
    icon: DifyOfficialLogo,
    colorClass: "text-[var(--accent-primary)]",
    activeClass: "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] border-[var(--accent-primary)]/40",
    pillClass: "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]",
  },
  {
    id: "studio",
    name: "Studio blueprints",
    statsKey: "studio",
    icon: Zap,
    colorClass: "text-[var(--accent-primary)]",
    activeClass: "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] border-[var(--accent-primary)]/40",
    pillClass: "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]",
  },
];

/** Formats a live-fetched count for the provider tab pills (e.g. 11950 -> "12.0K+"). */
function formatProviderCount(n: number): string {
  if (n <= 0) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K+`;
  return `${n}+`;
}

const UNIFIED_CATEGORIES = [
  { id: "ALL", label: "All categories" },
  { id: "zero-key", label: "Zero-key / free apis" },
  { id: "ai", label: "AI & agents" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales & crm" },
  { id: "support", label: "Support" },
  { id: "operations", label: "Operations" },
  { id: "it", label: "IT & devops" },
  { id: "knowledge", label: "Knowledge & RAG" },
  { id: "finance", label: "Finance & legal" },
];

const POPULAR_INTEGRATION_TAGS = [
  "Zero-Key",
  "Free API",
  "Jina Reader",
  "Hacker News",
  "ArXiv",
  "Open-Meteo",
  "CoinGecko",
  "Reddit",
  "OpenAI",
  "Anthropic",
  "Google",
  "Slack",
  "GitHub",
  "Notion",
  "PostgreSQL",
  "Discord",
  "Webhook",
];

const PAGE_SIZE = 18;

interface UnifiedMarketplaceWorkflow {
  id: string | number;
  provider: "n8n" | "dify" | "studio";
  providerName: string;
  name: string;
  description: string;
  readme?: string;
  author?: string;
  authorUrl?: string;
  icon?: string;
  iconBackground?: string;
  categories?: string[];
  primaryCategory?: string;
  tags?: string[];
  pluginTags?: string[];
  nodeCount?: number;
  usageCount?: number;
  viewsCount?: number;
  version?: string;
  badges?: string[];
  sourceUrl?: string;
  canvasUrl?: string;
  createdAt?: string;
  rawDsl?: string;
  rawWorkflowJson?: unknown;
  convertedGraph?: {
    nodes?: Array<{ id: string; label?: string; data?: { label?: string }; type?: string }>;
    edges?: Array<{ id: string; source: string; target: string }>;
  };
  convertedTemplate?: unknown;
}

export function UnifiedWorkflowsMarketplace() {
  const [activeProvider, setActiveProvider] = useState<WorkflowProvider>("all");
  const [workflows, setWorkflows] = useState<UnifiedMarketplaceWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalWorkflows, setTotalWorkflows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [detailWorkflow, setDetailWorkflow] = useState<UnifiedMarketplaceWorkflow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, n8n: 0, dify: 0, studio: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  // In-memory page cache for instant pagination & prefetching
  const pageCacheRef = useRef<Map<number, { workflows: UnifiedMarketplaceWorkflow[]; totalWorkflows: number; totalPages: number }>>(new Map());

  const prefetchNextPage = useCallback(
    async (nextPage: number, maxPages: number) => {
      if (nextPage > maxPages || pageCacheRef.current.has(nextPage)) return;
      try {
        const params = new URLSearchParams();
        params.set("provider", activeProvider);
        params.set("page", String(nextPage));
        params.set("perPage", String(PAGE_SIZE));

        if (search.trim()) params.set("q", search.trim());
        if (activeCategory !== "ALL") params.set("category", activeCategory);
        if (activeTag) params.set("tag", activeTag);

        const res = await fetch(`/api/workflows/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          pageCacheRef.current.set(nextPage, {
            workflows: json.workflows || [],
            totalWorkflows: json.pagination?.totalWorkflows || 0,
            totalPages: json.pagination?.totalPages || 1,
          });
        }
      } catch {
        // Ignored in background
      }
    },
    [activeProvider, search, activeCategory, activeTag]
  );

  const fetchWorkflows = useCallback(
    async (page: number) => {
      const cached = pageCacheRef.current.get(page);
      if (cached) {
        setWorkflows(cached.workflows);
        setTotalWorkflows(cached.totalWorkflows);
        setTotalPages(cached.totalPages);
        setCurrentPage(page);
        setLoading(false);

        if (page < cached.totalPages) {
          prefetchNextPage(page + 1, cached.totalPages);
        }
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("provider", activeProvider);
        params.set("page", String(page));
        params.set("perPage", String(PAGE_SIZE));

        if (search.trim()) params.set("q", search.trim());
        if (activeCategory !== "ALL") params.set("category", activeCategory);
        if (activeTag) params.set("tag", activeTag);

        const res = await fetch(`/api/workflows/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          const fetchedWorkflows = json.workflows || [];
          const fetchedTotal = json.pagination?.totalWorkflows || 0;
          const fetchedPages = json.pagination?.totalPages || 1;

          setWorkflows(fetchedWorkflows);
          setTotalWorkflows(fetchedTotal);
          setTotalPages(fetchedPages);
          setCurrentPage(page);

          if (json.stats) {
            setStats(json.stats);
          }

          pageCacheRef.current.set(page, {
            workflows: fetchedWorkflows,
            totalWorkflows: fetchedTotal,
            totalPages: fetchedPages,
          });

          if (page < fetchedPages) {
            prefetchNextPage(page + 1, fetchedPages);
          }
        } else {
          toast.error("Failed to load workflows", json.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error loading workflows";
        toast.error("Error loading workflows", msg);
      } finally {
        setLoading(false);
      }
    },
    [activeProvider, search, activeCategory, activeTag, prefetchNextPage]
  );

  useEffect(() => {
    pageCacheRef.current.clear();
    const timer = setTimeout(() => {
      fetchWorkflows(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [activeProvider, search, activeCategory, activeTag, fetchWorkflows]);

  const loadWorkflowDetails = async (wf: UnifiedMarketplaceWorkflow) => {
    setDetailWorkflow(wf);
    if (wf.provider === "studio") return;

    setDetailLoading(true);
    try {
      const endpoint =
        wf.provider === "dify" ? `/api/workflows/dify/${wf.id}` : `/api/workflows/n8n/${wf.id}`;
      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.success && json.data) {
        setDetailWorkflow({
          ...wf,
          ...json.data,
        });
      }
    } catch {
      // Ignored
    } finally {
      setDetailLoading(false);
    }
  };

  const copyDslOrJson = (content: unknown, id: string) => {
    if (!content) return;
    const textToCopy = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    toast.success("Workflow copied!", "Workflow definition copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Provider Breakdown */}
      <div className="bg-[var(--surface-raised)] relative overflow-hidden rounded-xl border border-[var(--accent-primary)]/40 p-5 sm:p-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-[var(--cta-primary-bg)]/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans font-medium bg-[var(--cta-primary-bg)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/40">
                <Workflow className="h-3 w-3 text-[var(--accent-primary)]" />
                Unified workflow ecosystem
              </span>
              <span className="text-xs font-sans text-[var(--text-muted)]">
                {stats.total.toLocaleString()}+ Community &amp; Enterprise Workflows
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              Workflows &amp; AI Automations Marketplace
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
              Discover, search, and import verified automation workflows from <strong>n8n</strong>, <strong>Dify.ai</strong>, and <strong>Agent Hub</strong>. 1-click import converts any workflow into an interactive visual canvas graph.
            </p>
          </div>

          {/* Quick Stats Counter Chips */}
          <div className="grid grid-cols-3 gap-2 shrink-0 self-stretch sm:self-auto font-sans">
            <div className="p-2.5 rounded-lg border border-[var(--state-error)]/40 bg-[var(--state-error)]/20 text-center">
              <div className="text-xs text-[var(--state-error)] font-medium">n8n</div>
              <div className="text-xs font-medium text-[var(--state-error)]">{stats.n8n.toLocaleString()}+</div>
            </div>
            <div className="p-2.5 rounded-lg border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/20 text-center">
              <div className="text-xs text-[var(--accent-primary)] font-medium">Dify.ai</div>
              <div className="text-xs font-medium text-[var(--accent-primary)]">{stats.dify.toLocaleString()}+</div>
            </div>
            <div className="p-2.5 rounded-lg border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/20 text-center">
              <div className="text-xs text-[var(--accent-primary)] font-medium">Studio</div>
              <div className="text-xs font-medium text-[var(--accent-primary)]">{stats.studio}+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Tabs Selector */}
      <div className="flex flex-wrap items-center gap-2 font-sans">
        <span className="text-xs font-medium text-[var(--text-muted)] mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3 text-[var(--accent-primary)]" /> Source:
        </span>
        {PROVIDERS.map((p) => {
          const isActive = activeProvider === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveProvider(p.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ",
                isActive
                  ? p.activeClass
                  : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className={clsx("h-3.5 w-3.5", isActive ? "text-[var(--text-primary)]" : p.colorClass)} />
              <span>{p.name}</span>
              <span
                className={clsx(
                  "ml-1 px-1.5 py-0.2 rounded-full text-xs font-medium",
                  isActive
                    ? "bg-[var(--surface-raised)]/20 text-[var(--text-primary)]"
                    : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                )}
              >
                {formatProviderCount(stats[p.statsKey])}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, View Mode, Categories & Integration Filters */}
      <div className="space-y-3 font-sans">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={`Search ${activeProvider === "all" ? `${formatProviderCount(stats.total)} workflows` : activeProvider.toUpperCase()} (e.g. RAG, Slack, OpenAI, Stripe, Scraper)...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded border border-[var(--border-strong)] bg-[var(--surface-raised)]/90 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40 focus:ring-1 focus:ring-[var(--accent-primary)]/40 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-muted)] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Mode & Count */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            <span className="text-xs text-[var(--text-muted)]">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-primary)]" /> Loading...
                </span>
              ) : (
                <>
                  <strong className="text-[var(--text-muted)] font-medium">{totalWorkflows.toLocaleString()}</strong> workflows found
                </>
              )}
            </span>

            <div className="flex items-center border border-[var(--border-strong)] rounded bg-[var(--surface-raised)]/70 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={clsx(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                    : "text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={clsx(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  viewMode === "list"
                    ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                    : "text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                )}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {UNIFIED_CATEGORIES.map((cat) => {
            const isActive = activeCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveTag(null);
                }}
                className={clsx(
                  "px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer",
                  isActive
                    ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/60 text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Integration & Provider Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
          <span className="text-[var(--text-muted)] font-medium text-xs mr-1 flex items-center gap-1">
            <Tag className="h-2.5 w-2.5" /> Integrations:
          </span>
          {POPULAR_INTEGRATION_TAGS.map((tag) => {
            const isTagActive = activeTag?.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setActiveTag(isTagActive ? null : tag);
                  if (!isTagActive) setSearch("");
                }}
                className={clsx(
                  "px-2 py-0.5 rounded text-xs border transition-colors cursor-pointer",
                  isTagActive
                    ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/20 text-[var(--accent-primary)] font-medium"
                    : "border-[var(--border-subtle)] bg-[var(--surface-sunken)]/70 text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                )}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid / List Views */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 font-sans">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
          <span className="text-xs text-[var(--text-muted)]">Fetching unified workflow ecosystem...</span>
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 font-sans space-y-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)]/50">
          <Workflow className="h-8 w-8 text-[var(--accent-primary)] mx-auto opacity-70" />
          <p className="text-sm font-medium text-[var(--text-muted)]">No workflows found</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Try adjusting your search query, provider selection, or category filter to discover more workflows.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveCategory("ALL");
              setActiveTag(null);
              setActiveProvider("all");
            }}
            className="px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 hover:bg-[var(--cta-primary-hover)]/20 text-[var(--accent-primary)] text-xs font-medium transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6 font-sans">
          {viewMode === "grid" ? (
            /* Unified Grid View (18 items) */
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => {
                const isN8n = wf.provider === "n8n";
                const isDify = wf.provider === "dify";

                return (
                  <div
                    key={`${wf.provider}-${wf.id}`}
                    onClick={() => loadWorkflowDetails(wf)}
                    className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 hover:shadow-indigo-500/5 transition-colors p-4 flex flex-col justify-between space-y-3 cursor-pointer relative overflow-hidden"
                  >
                    {/* Top Row: Author, Version & Provider Pill */}
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-[var(--text-muted)] block truncate">
                            by <span className="font-medium text-[var(--text-secondary)]">@{wf.author}</span>
                          </span>
                          <span className="text-xs text-[var(--text-muted)] block font-sans">
                            v{wf.version || "1.0.0"}
                          </span>
                        </div>

                        {/* Provider Brand Pill */}
                        <div className="flex items-center gap-1 shrink-0">
                          {wf.badges?.includes("zero-key") && (
                            <span className="px-1.5 py-0.5 rounded-full text-[7.5px] font-medium border border-[var(--state-success)]/40 bg-[var(--state-success)]/10 text-[var(--state-success)] inline-flex items-center gap-0.5">
                              <Zap className="h-2 w-2" /> No API key
                            </span>
                          )}
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1",
                              isN8n
                                ? "border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]"
                                : isDify
                                ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]"
                                : "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]"
                            )}
                          >
                            {isN8n && <N8nOfficialLogo className="h-2.5 w-2.5 shrink-0" />}
                            {isDify && <DifyOfficialLogo className="h-2.5 w-2.5 shrink-0" />}
                            {wf.providerName}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors line-clamp-1">
                        {wf.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-sans">
                        {wf.description?.replace(/#+\s*/g, "")?.slice(0, 160) || "Workflow ready for 1-click import."}
                      </p>

                      {/* Plugins & Category Tags */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {wf.pluginTags?.slice(0, 3).map((p: string, i: number) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-xs bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            +{p}
                          </span>
                        ))}
                        {wf.categories?.slice(0, 2).map((c: string, i: number) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-xs bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25"
                          >
                            #{c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
                        {Boolean(wf.usageCount && wf.usageCount > 0) ? (
                          <span className="flex items-center gap-1 text-[var(--state-warning)] font-medium">
                            <Flame className="h-3 w-3 fill-[var(--text-muted)]" />
                            {Number(wf.usageCount).toLocaleString()} uses
                          </span>
                        ) : Boolean(wf.viewsCount && wf.viewsCount > 0) ? (
                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                            <Eye className="h-3 w-3 text-[var(--text-muted)]" />
                            {Number(wf.viewsCount).toLocaleString()}
                          </span>
                        ) : Boolean(wf.nodeCount && wf.nodeCount > 0) ? (
                          <span>{wf.nodeCount} nodes</span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={wf.canvasUrl || "/dashboard/canvas/new"}
                          onClick={(e) => e.stopPropagation()}
                          className={clsx(
                            "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border text-[var(--text-primary)] transition-colors cursor-pointer",
                            isN8n
                              ? "border-[var(--state-error)]/40 bg-[var(--state-error)] hover:bg-[var(--state-error)]"
                              : isDify
                              ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)]"
                              : "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)]"
                          )}
                        >
                          <GitBranch className="h-3 w-3" />
                          Canvas
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadWorkflowDetails(wf);
                          }}
                          className="px-2.5 py-1.5 rounded text-xs font-medium border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Unified List View */
            <div className="space-y-2.5">
              {workflows.map((wf) => {
                const isN8n = wf.provider === "n8n";
                const isDify = wf.provider === "dify";
                return (
                  <div
                    key={`${wf.provider}-${wf.id}`}
                    onClick={() => loadWorkflowDetails(wf)}
                    className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--accent-primary)]/40 transition-colors p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
                          {wf.name}
                        </h3>
                        {wf.badges?.includes("zero-key") && (
                          <span className="px-1.5 py-0.2 rounded text-[7.5px] font-medium border border-[var(--state-success)]/40 bg-[var(--state-success)]/10 text-[var(--state-success)] shrink-0 inline-flex items-center gap-0.5">
                            <Zap className="h-2 w-2" /> No API key
                          </span>
                        )}
                        <span
                          className={clsx(
                            "px-1.5 py-0.2 rounded text-xs font-medium border shrink-0",
                            isN8n
                              ? "border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]"
                              : isDify
                              ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]"
                              : "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]"
                          )}
                        >
                          {wf.providerName}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          by @{wf.author}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 font-sans">
                        {wf.description?.replace(/#+\s*/g, "")?.slice(0, 140)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      {Boolean(wf.usageCount && wf.usageCount > 0) && (
                        <span className="flex items-center gap-1 text-xs text-[var(--state-warning)] font-medium">
                          <Flame className="h-3 w-3 fill-[var(--text-muted)]" />
                          {Number(wf.usageCount).toLocaleString()}
                        </span>
                      )}
                      <Link
                        href={wf.canvasUrl || "/dashboard/canvas/new"}
                        onClick={(e) => e.stopPropagation()}
                        className={clsx(
                          "inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium text-[var(--text-primary)]",
                          isN8n
                            ? "bg-[var(--state-error)] hover:bg-[var(--state-error)]"
                            : isDify
                            ? "bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)]"
                            : "bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)]"
                        )}
                      >
                        <GitBranch className="h-3 w-3" /> Canvas
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unified Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => {
              fetchWorkflows(p);
              gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            loading={loading}
            totalCount={totalWorkflows}
          />
        </div>
      )}

      {/* Unified Workflow Detail Modal */}
      {detailWorkflow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
          onClick={() => setDetailWorkflow(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--surface-raised)] font-sans text-xs flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/95">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={clsx(
                    "h-10 w-10 rounded-lg border flex items-center justify-center text-xl shrink-0",
                    detailWorkflow.provider === "n8n"
                      ? "border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]"
                      : detailWorkflow.provider === "dify"
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]"
                      : "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)]"
                  )}
                >
                  {detailWorkflow.provider === "n8n" ? (
                    <N8nOfficialLogo className="h-5 w-5" />
                  ) : detailWorkflow.provider === "dify" ? (
                    <DifyOfficialLogo className="h-5 w-5" />
                  ) : (
                    <Layers className="h-5 w-5 text-[var(--accent-primary)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {detailWorkflow.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--accent-primary)]">{detailWorkflow.providerName}</span>
                    <span>•</span>
                    <span>by @{detailWorkflow.author}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailWorkflow(null)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
              {detailLoading && (
                <div className="flex items-center gap-2 text-[var(--accent-primary)] p-2 bg-[var(--cta-primary-bg)]/10 rounded border border-[var(--accent-primary)]/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading full workflow graph and setup guide...</span>
                </div>
              )}

              {/* Overview */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-[var(--text-muted)]">Overview</h4>
                <p className="text-[var(--text-secondary)] leading-relaxed font-sans text-xs bg-[var(--surface-sunken)] p-3 rounded border border-[var(--border-subtle)]">
                  {detailWorkflow.description || "No overview provided for this workflow."}
                </p>
              </div>

              {/* Categories & Included Integrations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                    <Tag className="h-3 w-3 text-[var(--accent-primary)]" /> Categories
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {(detailWorkflow.categories || []).map((c: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--cta-primary-bg)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/40">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                    <Puzzle className="h-3 w-3 text-[var(--accent-primary)]" /> Integrations &amp; Tools
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const tagsList = detailWorkflow.pluginTags || detailWorkflow.tags || [];
                      return tagsList.length > 0 ? (
                        tagsList.map((p: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-xs bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-strong)]">
                            +{p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">None specified</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Setup Guide (Readme) */}
              {detailWorkflow.readme && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-[var(--state-warning)]" />
                    Setup Instructions
                  </h4>
                  <div className="p-3.5 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-sans whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                    {detailWorkflow.readme}
                  </div>
                </div>
              )}

              {/* Converted Canvas Nodes Preview */}
              {detailWorkflow.convertedGraph && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                    Canvas Graph Architecture ({detailWorkflow.convertedGraph.nodes?.length || 0} nodes · {detailWorkflow.convertedGraph.edges?.length || 0} edges)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(detailWorkflow.convertedGraph.nodes || []).map((n, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded text-xs bg-[var(--surface-sunken)] border border-[var(--border-strong)] text-[var(--text-muted)]"
                      >
                        {n.data?.label || n.label || n.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/90 rounded-b-xl">
              {detailWorkflow.sourceUrl && (
                <a
                  href={detailWorkflow.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> View on {detailWorkflow.providerName}
                </a>
              )}

              <div className="flex items-center gap-2">
                {Boolean(detailWorkflow.rawDsl || detailWorkflow.rawWorkflowJson) && (
                  <button
                    type="button"
                    onClick={() =>
                      copyDslOrJson(
                        detailWorkflow.rawDsl || detailWorkflow.rawWorkflowJson,
                        String(detailWorkflow.id)
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer text-xs font-medium"
                  >
                    {copiedId === String(detailWorkflow.id) ? (
                      <>
                        <Check className="h-3 w-3 text-[var(--state-success)]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy workflow
                      </>
                    )}
                  </button>
                )}

                <Link
                  href={detailWorkflow.canvasUrl || "/dashboard/canvas/new"}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-4 py-1.5 rounded border text-[var(--text-primary)] font-medium text-xs transition-colors cursor-pointer",
                    detailWorkflow.provider === "n8n"
                      ? "border-[var(--state-error)]/40 bg-[var(--state-error)] hover:bg-[var(--state-error)]"
                      : detailWorkflow.provider === "dify"
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)]"
                      : "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)]"
                  )}
                >
                  <GitBranch className="h-3.5 w-3.5" /> Open in canvas
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
