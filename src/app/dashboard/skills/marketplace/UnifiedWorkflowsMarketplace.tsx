"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { toast } from "@/stores/toastStore";
import { Pagination } from "@/components/common/Pagination";
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
  plural,
} from "@/components/ui/surfaces";

type WorkflowProvider = "all" | "n8n" | "dify" | "studio";

const PROVIDERS: Array<{
  id: WorkflowProvider;
  name: string;
  statsKey: "total" | "n8n" | "dify" | "studio";
}> = [
  { id: "all", name: "All providers", statsKey: "total" },
  { id: "n8n", name: "n8n", statsKey: "n8n" },
  { id: "dify", name: "Dify.ai", statsKey: "dify" },
  { id: "studio", name: "Studio blueprints", statsKey: "studio" },
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
    toast.success("Workflow copied", "Workflow definition copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetFilters = () => {
    setSearch("");
    setActiveCategory("ALL");
    setActiveTag(null);
    setActiveProvider("all");
  };

  const summary = (wf: UnifiedMarketplaceWorkflow) =>
    wf.description?.replace(/#+\s*/g, "")?.slice(0, 160) || "Workflow ready for one-click import.";

  const usage = (wf: UnifiedMarketplaceWorkflow) =>
    wf.usageCount && wf.usageCount > 0
      ? `${Number(wf.usageCount).toLocaleString()} uses`
      : wf.viewsCount && wf.viewsCount > 0
      ? `${Number(wf.viewsCount).toLocaleString()} views`
      : wf.nodeCount && wf.nodeCount > 0
      ? `${wf.nodeCount} nodes`
      : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h2 className={SECTION_TITLE}>Workflows marketplace</h2>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">
            Search and import automation workflows from n8n, Dify.ai and Agent Hub. Each import becomes a canvas graph.
          </p>
        </div>
        <span className={META}>
          n8n {stats.n8n.toLocaleString()} · dify {stats.dify.toLocaleString()} · studio {stats.studio.toLocaleString()}
        </span>
      </div>

      <div className="space-y-4">
        <Segmented
          label="Source"
          value={activeProvider}
          onChange={(v) => setActiveProvider(v)}
          options={PROVIDERS.map((p) => ({ id: p.id, label: `${p.name} ${formatProviderCount(stats[p.statsKey])}` }))}
        />

        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full max-w-lg items-center gap-2">
            <input
              type="text"
              aria-label="Search workflows"
              placeholder="Search workflows, for example RAG, Slack or Stripe"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={clsx(FIELD, "h-9 w-full px-3")}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className={BTN_SECONDARY_SM}>
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className={META}>{loading ? "Loading" : `${totalWorkflows.toLocaleString()} found`}</span>
            <Segmented
              label="View"
              hideLabel
              value={viewMode}
              onChange={(v) => setViewMode(v)}
              options={[
                { id: "grid", label: "Grid" },
                { id: "list", label: "List" },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm">
          {UNIFIED_CATEGORIES.map((cat) => {
            const isActive = activeCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveTag(null);
                }}
                className={clsx(
                  "cursor-pointer rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                  isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {POPULAR_INTEGRATION_TAGS.map((tag) => {
            const isTagActive = activeTag?.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={isTagActive}
                onClick={() => {
                  setActiveTag(isTagActive ? null : tag);
                  if (!isTagActive) setSearch("");
                }}
                className={clsx(
                  "h-7 cursor-pointer rounded-[6px] border px-2.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                  isTagActive
                    ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center font-sans text-sm text-[var(--text-muted)]">Loading workflows</p>
      ) : workflows.length === 0 ? (
        <div className="space-y-3 py-16 text-center">
          <p className="font-sans text-sm text-[var(--text-primary)]">No workflows found</p>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">Try a different search, source or category.</p>
          <button type="button" onClick={resetFilters} className={BTN_SECONDARY_SM}>
            Reset filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {viewMode === "grid" ? (
            <div ref={gridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflows.map((wf) => (
                <div key={`${wf.provider}-${wf.id}`} className={clsx(CARD, "flex flex-col gap-4 p-5")}>
                  <button
                    type="button"
                    onClick={() => loadWorkflowDetails(wf)}
                    className="flex-1 cursor-pointer space-y-2 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="line-clamp-1 font-sans text-sm font-medium text-[var(--text-primary)]">{wf.name}</h3>
                      <span className={clsx(META, "shrink-0")}>{wf.providerName}</span>
                    </div>
                    <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{summary(wf)}</p>
                    <p className={META}>
                      @{wf.author} · v{wf.version || "1.0.0"}
                    </p>
                    {(wf.pluginTags?.length || wf.categories?.length || wf.badges?.includes("zero-key")) && (
                      <p className="font-mono text-xs leading-5 text-[var(--text-muted)]">
                        {[
                          wf.badges?.includes("zero-key") ? "no api key" : null,
                          ...(wf.pluginTags?.slice(0, 3) ?? []),
                          ...(wf.categories?.slice(0, 2) ?? []),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </button>
                  <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                    <span className={META}>{usage(wf)}</span>
                    <Link href={wf.canvasUrl || "/dashboard/canvas/new"} className={BTN_SECONDARY_SM}>
                      Open in canvas
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
              {workflows.map((wf) => (
                <li key={`${wf.provider}-${wf.id}`} className={clsx(ROW_HOVER, "flex flex-col justify-between gap-3 px-5 py-3 sm:flex-row sm:items-center")}>
                  <button
                    type="button"
                    onClick={() => loadWorkflowDetails(wf)}
                    className="min-w-0 flex-1 cursor-pointer space-y-0.5 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{wf.name}</h3>
                      <span className={META}>{wf.providerName}</span>
                      <span className={META}>@{wf.author}</span>
                    </div>
                    <p className="line-clamp-1 font-sans text-[13px] text-[var(--text-muted)]">{summary(wf)}</p>
                  </button>
                  <div className="flex shrink-0 items-center gap-4 self-end sm:self-auto">
                    <span className={META}>{usage(wf)}</span>
                    <Link href={wf.canvasUrl || "/dashboard/canvas/new"} className={BTN_SECONDARY_SM}>
                      Open in canvas
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

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

      {detailWorkflow && (
        <div
          className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
          onClick={() => setDetailWorkflow(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="workflow-modal-title"
        >
          <div
            className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
              <div className="min-w-0 space-y-1">
                <h3 id="workflow-modal-title" className="truncate font-sans text-base font-medium text-[var(--text-primary)]">
                  {detailWorkflow.name}
                </h3>
                <p className={META}>
                  {detailWorkflow.providerName} · @{detailWorkflow.author}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailWorkflow(null)}
                className="h-8 shrink-0 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {detailLoading && <p className="font-sans text-[13px] text-[var(--text-muted)]">Loading the full graph and setup guide</p>}

              <section className="space-y-1.5">
                <h4 className="font-sans text-[13px] text-[var(--text-muted)]">Overview</h4>
                <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">
                  {detailWorkflow.description || "No overview provided for this workflow."}
                </p>
              </section>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <section className="space-y-1.5">
                  <h4 className="font-sans text-[13px] text-[var(--text-muted)]">Categories</h4>
                  <p className="font-mono text-xs leading-5 text-[var(--text-secondary)]">
                    {(detailWorkflow.categories || []).join(" · ") || "None specified"}
                  </p>
                </section>
                <section className="space-y-1.5">
                  <h4 className="font-sans text-[13px] text-[var(--text-muted)]">Integrations</h4>
                  <p className="font-mono text-xs leading-5 text-[var(--text-secondary)]">
                    {(detailWorkflow.pluginTags || detailWorkflow.tags || []).join(" · ") || "None specified"}
                  </p>
                </section>
              </div>

              {detailWorkflow.readme && (
                <section className="space-y-1.5">
                  <h4 className="font-sans text-[13px] text-[var(--text-muted)]">Setup instructions</h4>
                  <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                    {detailWorkflow.readme}
                  </div>
                </section>
              )}

              {detailWorkflow.convertedGraph && (
                <section className="space-y-1.5">
                  <h4 className="font-sans text-[13px] text-[var(--text-muted)]">
                    Canvas graph · {plural(detailWorkflow.convertedGraph.nodes?.length || 0, "node")} ·{" "}
                    {plural(detailWorkflow.convertedGraph.edges?.length || 0, "edge")}
                  </h4>
                  <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                    {(detailWorkflow.convertedGraph.nodes || []).map((n) => n.data?.label || n.label || n.id).join(", ")}
                  </p>
                </section>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4">
              {detailWorkflow.sourceUrl ? (
                <a
                  href={detailWorkflow.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  View on {detailWorkflow.providerName}
                </a>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                {Boolean(detailWorkflow.rawDsl || detailWorkflow.rawWorkflowJson) && (
                  <button
                    type="button"
                    onClick={() => copyDslOrJson(detailWorkflow.rawDsl || detailWorkflow.rawWorkflowJson, String(detailWorkflow.id))}
                    className={BTN_SECONDARY}
                  >
                    {copiedId === String(detailWorkflow.id) ? "Copied" : "Copy workflow"}
                  </button>
                )}
                <Link href={detailWorkflow.canvasUrl || "/dashboard/canvas/new"} className={BTN_PRIMARY}>
                  Open in canvas
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
