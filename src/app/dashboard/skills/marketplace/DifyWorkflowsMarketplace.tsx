"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Loader2,
  ExternalLink,
  Layers,
  ArrowRight,
  GitBranch,
  Copy,
  Check,
  LayoutGrid,
  List,
  Sparkles,
  BookOpen,
  Puzzle,
  Flame,
  Globe,
  Tag,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/stores/toastStore";
import { Pagination } from "@/components/common/Pagination";
import { DifyOfficialLogo } from "@/components/common/BrandLogos";

const DIFY_CATEGORIES = [
  { id: "ALL", label: "All categories" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "support", label: "Support" },
  { id: "operations", label: "Operations" },
  { id: "it", label: "IT & dev" },
  { id: "knowledge", label: "Knowledge" },
  { id: "design", label: "Design" },
  { id: "others", label: "Others" },
];

const POPULAR_PLUGIN_TAGS = [
  "Zero-Key",
  "Jina",
  "OpenAI",
  "DeepSeek",
  "Tavily",
  "Google",
  "Qdrant",
  "Gemini",
  "Slack",
  "Groq",
];

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  sales: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  support: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  operations: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  it: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  knowledge: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  design: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  others: "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
};

const PAGE_SIZE = 18;

interface DifyMarketplaceWorkflow {
  id: string | number;
  name: string;
  description: string;
  readme?: string;
  categories?: string[];
  depsPlugins?: string[];
  pluginTags?: string[];
  preferredLanguages?: string[];
  icon?: string | null;
  iconBackground?: string;
  iconFileKey?: string | null;
  author?: string;
  publisherType?: string;
  usageCount?: number;
  version?: string;
  badges?: string[];
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  url?: string;
  rawDsl?: string;
  nodeCount?: number;
  convertedGraph?: {
    nodes?: Array<{ id: string; label?: string; type?: string }>;
    edges?: Array<{ id: string; source: string; target: string }>;
  };
  convertedTemplate?: unknown;
}

export function DifyWorkflowsMarketplace() {
  const [workflows, setWorkflows] = useState<DifyMarketplaceWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalWorkflows, setTotalWorkflows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [detailWorkflow, setDetailWorkflow] = useState<DifyMarketplaceWorkflow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // In-memory page cache for instant pagination & prefetching
  const pageCacheRef = useRef<Map<number, { workflows: DifyMarketplaceWorkflow[]; totalWorkflows: number; totalPages: number }>>(new Map());

  const prefetchNextPage = useCallback(
    async (nextPage: number, maxPages: number) => {
      if (nextPage > maxPages || pageCacheRef.current.has(nextPage)) return;
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("perPage", String(PAGE_SIZE));

        const queryTerm = activeTag || search.trim();
        if (queryTerm) params.set("q", queryTerm);
        if (activeCategory !== "ALL") params.set("category", activeCategory);

        const res = await fetch(`/api/workflows/dify/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          pageCacheRef.current.set(nextPage, {
            workflows: json.workflows || [],
            totalWorkflows: json.pagination?.totalWorkflows || 0,
            totalPages: json.pagination?.totalPages || 1,
          });
        }
      } catch {
        // Background prefetch error ignored
      }
    },
    [activeTag, search, activeCategory]
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
        params.set("page", String(page));
        params.set("perPage", String(PAGE_SIZE));

        const queryTerm = activeTag || search.trim();
        if (queryTerm) params.set("q", queryTerm);
        if (activeCategory !== "ALL") params.set("category", activeCategory);

        const res = await fetch(`/api/workflows/dify/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          const fetchedWorkflows = json.workflows || [];
          const fetchedTotal = json.pagination?.totalWorkflows || 0;
          const fetchedPages = json.pagination?.totalPages || 1;

          setWorkflows(fetchedWorkflows);
          setTotalWorkflows(fetchedTotal);
          setTotalPages(fetchedPages);
          setCurrentPage(page);

          pageCacheRef.current.set(page, {
            workflows: fetchedWorkflows,
            totalWorkflows: fetchedTotal,
            totalPages: fetchedPages,
          });

          if (page < fetchedPages) {
            prefetchNextPage(page + 1, fetchedPages);
          }
        } else {
          toast.error("Failed to load Dify templates", json.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error fetching Dify templates";
        toast.error("Error fetching Dify templates", msg);
      } finally {
        setLoading(false);
      }
    },
    [activeTag, search, activeCategory, prefetchNextPage]
  );

  useEffect(() => {
    pageCacheRef.current.clear();
    const timer = setTimeout(() => {
      fetchWorkflows(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search, activeCategory, activeTag, fetchWorkflows]);

  const loadWorkflowDetails = async (id: string | number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/workflows/dify/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDetailWorkflow(json.data);
      }
    } catch {
      // Ignored
    } finally {
      setDetailLoading(false);
    }
  };

  const copyDslToClipboard = (dsl: string, id: string | number) => {
    if (!dsl) return;
    navigator.clipboard.writeText(dsl);
    setCopiedId(String(id));
    toast.success("DSL copied!", "Dify workflow YAML copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--surface-raised)] relative overflow-hidden rounded-[12px] border border-[var(--border-subtle)] p-5 sm:p-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-[var(--surface-sunken)] blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-xs font-sans font-medium">
                <DifyOfficialLogo className="h-3.5 w-3.5" />
                Dify.ai workflow template registry
              </span>
              <span className="text-xs font-sans text-[var(--text-muted)] flex items-center gap-1">
                <Globe className="h-3 w-3" /> marketplace.dify.ai
              </span>
            </div>
            <div className="flex items-center gap-3">
              <DifyOfficialLogo className="h-7 w-7" />
              <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                Dify AI Workflow Templates
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Explore {totalWorkflows > 0 ? `${totalWorkflows.toLocaleString()}+ ` : ""}production-grade AI workflows, RAG agents, chatflows, and multi-model pipelines created by the Dify community. Import and run directly on Agent Hub Canvas with zero friction.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto">
            <a
              href="https://marketplace.dify.ai/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-sans font-medium border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:bg-[var(--cta-primary-hover)]/20 text-[var(--text-secondary)] transition-colors cursor-pointer w-full sm:w-auto"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visit dify marketplace
            </a>
          </div>
        </div>
      </div>

      {/* Controls: Search, View Mode & Filters */}
      <div className="space-y-3 font-sans">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search Dify workflows (e.g. RAG, Customer Support, OpenAI, Scraping)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveTag(null);
              }}
              className="w-full pl-9 pr-8 py-2 rounded border border-[var(--border-strong)] bg-[var(--surface-raised)]/90 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-primary)]/40 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-muted)]"
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
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--text-secondary)]" /> Loading...
                </span>
              ) : (
                <>
                  <strong className="text-[var(--text-muted)] font-medium">{totalWorkflows.toLocaleString()}</strong> templates
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
                title="Grid view"
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
                title="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {DIFY_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id && !activeTag;
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
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/60 text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:text-[var(--text-secondary)]"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Popular Plugin Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
          <span className="text-[var(--text-muted)] font-medium text-xs mr-1 flex items-center gap-1">
            <Tag className="h-2.5 w-2.5" /> Plugins:
          </span>
          {POPULAR_PLUGIN_TAGS.map((tag) => {
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
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
          <span className="text-xs text-[var(--text-muted)]">Fetching Dify workflow templates...</span>
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 font-sans space-y-3 rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)]/50">
          <Sparkles className="h-8 w-8 text-[var(--text-secondary)] mx-auto opacity-70" />
          <p className="text-sm font-medium text-[var(--text-muted)]">No Dify workflows found</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Try adjusting your search query or category filter to discover more templates.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveCategory("ALL");
              setActiveTag(null);
            }}
            className="px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:bg-[var(--cta-primary-hover)]/20 text-[var(--text-secondary)] text-xs font-medium transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6 font-sans">
          {viewMode === "grid" ? (
            /* Grid View (18 cards) */
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => {
                const primaryCat = (wf.categories?.[0] || "operations").toLowerCase();
                const catColor = CATEGORY_COLORS[primaryCat] || CATEGORY_COLORS.operations;

                return (
                  <div
                    key={wf.id}
                    onClick={() => {
                      setDetailWorkflow(wf);
                      loadWorkflowDetails(wf.id);
                    }}
                    className="group rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--border-subtle)] hover:shadow-blue-500/5 transition-colors p-4 flex flex-col justify-between space-y-3 cursor-pointer relative overflow-hidden"
                  >
                    {/* Top Row: Author & Badges */}
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-[var(--text-muted)] block truncate">
                            by <span className="font-medium text-[var(--text-secondary)]">@{wf.author}</span>
                          </span>
                          <span className="text-xs text-[var(--text-muted)] block font-sans">
                            v{wf.version}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {wf.badges?.includes("partner") && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                              Partner
                            </span>
                          )}
                          <span className={clsx("px-1.5 py-0.5 rounded text-xs font-medium border", catColor)}>
                            {primaryCat}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors line-clamp-1">
                        {wf.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-sans">
                        {wf.description?.replace(/#+\s*/g, "")?.slice(0, 160) || "Dify workflow template ready to deploy."}
                      </p>

                      {/* Plugin & Category Tags */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {wf.pluginTags?.slice(0, 3).map((p: string, i: number) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-xs bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            +{p}
                          </span>
                        ))}
                        {wf.categories?.slice(1, 3).map((c: string, i: number) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-xs bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                          >
                            #{c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
                        {Boolean(wf.usageCount && wf.usageCount > 0) && (
                          <span className="flex items-center gap-1 text-[var(--state-warning)] font-medium">
                            <Flame className="h-3 w-3 fill-[var(--text-muted)]" />
                            {Number(wf.usageCount).toLocaleString()} uses
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/canvas/new?difyId=${wf.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] transition-colors cursor-pointer"
                        >
                          <GitBranch className="h-3 w-3" />
                          Canvas
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailWorkflow(wf);
                            loadWorkflowDetails(wf.id);
                          }}
                          className="px-2.5 py-1.5 rounded text-xs font-medium border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                          title="View details"
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
            /* List View */
            <div className="space-y-2.5">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => {
                    setDetailWorkflow(wf);
                    loadWorkflowDetails(wf.id);
                  }}
                  className="group rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--border-subtle)] transition-colors p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors truncate">
                        {wf.name}
                      </h3>
                      <span className="px-1.5 py-0.2 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] shrink-0">
                        @{wf.author}
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
                      href={`/dashboard/canvas/new?difyId=${wf.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)]"
                    >
                      <GitBranch className="h-3 w-3" /> Canvas
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
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

      {/* Workflow Detail Modal */}
      {detailWorkflow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
          onClick={() => setDetailWorkflow(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] font-sans text-xs flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/95">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-10 w-10 rounded-[8px] border border-[var(--border-subtle)] flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: detailWorkflow.iconBackground || "#EFF1F5" }}
                >
                  <DifyOfficialLogo className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {detailWorkflow.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>by @{detailWorkflow.author}</span>
                    <span>•</span>
                    <span>v{detailWorkflow.version || "1.0.0"}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailWorkflow(null)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
              {detailLoading && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)] p-2 bg-[var(--surface-sunken)] rounded border border-[var(--border-subtle)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading full workflow graph and setup instructions...</span>
                </div>
              )}

              {/* Overview */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-[var(--text-muted)]">Overview</h4>
                <p className="text-[var(--text-secondary)] leading-relaxed font-sans text-xs bg-[var(--surface-sunken)] p-3 rounded border border-[var(--border-subtle)]">
                  {detailWorkflow.description || "No overview provided for this workflow."}
                </p>
              </div>

              {/* Categories & Dependent Plugins */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                    <Tag className="h-3 w-3 text-[var(--text-secondary)]" /> Categories
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {(detailWorkflow.categories || []).map((c: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                    <Puzzle className="h-3 w-3 text-[var(--text-secondary)]" /> Dependencies &amp; Tools
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {detailWorkflow.depsPlugins && detailWorkflow.depsPlugins.length > 0 ? (
                      detailWorkflow.depsPlugins.map((p: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-xs bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">None required</span>
                    )}
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

              {/* Converted Canvas Graph Info */}
              {detailWorkflow.convertedGraph && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    Canvas Graph Nodes ({detailWorkflow.nodeCount || detailWorkflow.convertedGraph.nodes?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(detailWorkflow.convertedGraph.nodes || []).map((n, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded text-xs bg-[var(--surface-sunken)] border border-[var(--border-strong)] text-[var(--text-muted)]"
                      >
                        {n.label || n.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/90 rounded-b-xl">
              <a
                href={detailWorkflow.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> View on Dify
              </a>

              <div className="flex items-center gap-2">
                {detailWorkflow.rawDsl && (
                  <button
                    type="button"
                    onClick={() => copyDslToClipboard(detailWorkflow.rawDsl!, detailWorkflow.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer text-xs font-medium"
                  >
                    {copiedId === detailWorkflow.id ? (
                      <>
                        <Check className="h-3 w-3 text-[var(--state-success)]" /> Copied DSL
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy DSL
                      </>
                    )}
                  </button>
                )}

                <Link
                  href={`/dashboard/canvas/new?difyId=${detailWorkflow.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] font-medium text-xs transition-colors cursor-pointer"
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
