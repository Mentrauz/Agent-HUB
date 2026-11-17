"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  GitBranch,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  List,
  Eye,
  Bot,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Globe,
  Workflow,
  ShieldCheck,
  DownloadCloud,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/stores/toastStore";
import { skillsApi } from "@/lib/api/skills";
import { Pagination } from "@/components/common/Pagination";
import { N8nOfficialLogo } from "@/components/common/BrandLogos";

const N8N_CATEGORIES = [
  { id: "ALL", label: "All workflows", icon: Layers },
  { id: "AI", label: "AI & agents", icon: Bot },
  { id: "Langchain", label: "LangChain / RAG", icon: Sparkles },
  { id: "Communication", label: "Communication", icon: Globe },
  { id: "Data & Storage", label: "Data & storage", icon: Zap },
  { id: "Development", label: "Dev & code", icon: GitBranch },
  { id: "Productivity", label: "Productivity", icon: Workflow },
];

const POPULAR_TAGS = [
  "Zero-Key",
  "Free API",
  "RAG",
  "OpenAI",
  "Slack",
  "Supabase",
  "Google Sheets",
  "Discord",
  "Postgres",
  "Webhook",
  "RSS",
];

import { AgentGraphDefinition } from "@/types/graph";
import { SkillExampleDTO } from "@/types/skill";

const PAGE_SIZE = 18;

interface N8nMarketplaceWorkflow {
  id: number;
  name: string;
  description: string;
  totalViews?: number;
  views?: number;
  createdAt?: string;
  user?: {
    name?: string;
    username?: string;
    avatar?: string | null;
    verified?: boolean;
  };
  nodeCount?: number;
  nodeIcons?: Array<{ name: string; icon: string | null; type: string }>;
  nodeTypes?: string[];
  url?: string;
  convertedGraph?: {
    nodes: Array<{ id: string; label?: string; type?: string }>;
    edges: Array<{ id: string; source: string; target: string }>;
  };
  convertedTemplate?: {
    purpose?: string;
    instructions?: string;
    allowedTools?: string[];
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    examples?: SkillExampleDTO[];
    actionsRequiringApproval?: string[];
    maxExecutionSteps?: number;
  };
  rawWorkflowJson?: unknown;
}

export function N8nWorkflowsMarketplace() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<N8nMarketplaceWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalWorkflows, setTotalWorkflows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [detailWorkflow, setDetailWorkflow] = useState<N8nMarketplaceWorkflow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // In-memory page cache for instant pagination & prefetching
  const pageCacheRef = useRef<Map<number, { workflows: N8nMarketplaceWorkflow[]; totalWorkflows: number; totalPages: number }>>(new Map());

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

        const res = await fetch(`/api/workflows/n8n/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          pageCacheRef.current.set(nextPage, {
            workflows: json.workflows || [],
            totalWorkflows: json.pagination?.totalWorkflows || 0,
            totalPages: json.pagination?.totalPages || 1,
          });
        }
      } catch {
        // Non-blocking background prefetch error ignored
      }
    },
    [activeTag, search, activeCategory]
  );

  const fetchWorkflows = useCallback(
    async (page: number) => {
      // Check client-side cache for instant display
      const cached = pageCacheRef.current.get(page);
      if (cached) {
        setWorkflows(cached.workflows);
        setTotalWorkflows(cached.totalWorkflows);
        setTotalPages(cached.totalPages);
        setCurrentPage(page);
        setLoading(false);

        // Pre-fetch the subsequent page
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

        const res = await fetch(`/api/workflows/n8n/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          const fetchedWorkflows = json.workflows || [];
          const fetchedTotal = json.pagination?.totalWorkflows || 0;
          const fetchedPages = json.pagination?.totalPages || 1;

          setWorkflows(fetchedWorkflows);
          setTotalWorkflows(fetchedTotal);
          setTotalPages(fetchedPages);
          setCurrentPage(page);

          // Cache current page
          pageCacheRef.current.set(page, {
            workflows: fetchedWorkflows,
            totalWorkflows: fetchedTotal,
            totalPages: fetchedPages,
          });

          // Prefetch next page into cache
          if (page < fetchedPages) {
            prefetchNextPage(page + 1, fetchedPages);
          }
        } else {
          toast.error("Failed to load n8n workflows", json.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error fetching workflows";
        toast.error("Error fetching workflows", msg);
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

  const loadWorkflowDetails = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/workflows/n8n/${id}`);
      const json = await res.json();
      if (json.success) {
        setDetailWorkflow(json.data);
      } else {
        toast.error("Failed to load workflow details", json.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching details";
      toast.error("Error fetching details", msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleImportToStudio = async (wf: N8nMarketplaceWorkflow) => {
    setImportingId(wf.id);
    try {
      let wfData = wf;
      if (!wf.convertedTemplate) {
        const res = await fetch(`/api/workflows/n8n/${wf.id}`);
        const json = await res.json();
        if (json.success) wfData = json.data;
      }

      const template = wfData.convertedTemplate;
      const created = await skillsApi.create({
        name: wfData.name,
        purpose: template?.purpose || wfData.description || `Automated workflow imported from n8n: ${wfData.name}`,
        instructions: template?.instructions || wfData.description || `n8n workflow: ${wfData.name}`,
        allowedTools: template?.allowedTools || ["document_search", "web_search"],
        inputSchema: template?.inputSchema,
        outputSchema: template?.outputSchema,
        examples: template?.examples,
        actionsRequiringApproval: template?.actionsRequiringApproval,
        maxExecutionSteps: template?.maxExecutionSteps,
        graphDefinition: (wfData.convertedGraph as AgentGraphDefinition) || undefined,
      });

      toast.success("Workflow imported to Studio!", `Created skill: ${created.name}`);
      router.push(`/dashboard/skills/${created.id}`);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Failed to import workflow";
      if (typeof err === "object" && err !== null && "fields" in err) {
        const details = Object.entries((err as { fields: Record<string, string[]> }).fields)
          .map(([k, v]) => `${k}: ${v.join(", ")}`)
          .join(" | ");
        msg = `${msg} (${details})`;
      }
      toast.error("Import failed", msg);
    } finally {
      setImportingId(null);
    }
  };

  const handleCopyJson = (wf: N8nMarketplaceWorkflow) => {
    const jsonStr = JSON.stringify(wf.rawWorkflowJson || wf, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedId(wf.id);
    toast.success("n8n Workflow JSON copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 w-full font-sans">
      {/* Top Banner / Hero */}
      <div className="bg-[var(--surface-raised)] relative overflow-hidden rounded-xl border border-[var(--accent-primary)]/40 p-6">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[var(--state-error)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[var(--cta-primary-bg)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)] text-xs font-medium">
              <N8nOfficialLogo className="h-3.5 w-3.5" />
              N8N COMMUNITY WORKFLOW REPOSITORY{totalWorkflows > 0 ? ` · ${totalWorkflows.toLocaleString()} WORKFLOWS` : ""}
            </div>
            <div className="flex items-center gap-3">
              <N8nOfficialLogo className="h-7 w-7" />
              <h2 className="text-xl sm:text-2xl font-pixel text-[var(--text-muted)]">
                n8n workflows marketplace
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] max-w-2xl leading-relaxed">
              Browse, inspect, and 1-click import production automations and AI agent architectures
              from the global n8n community directly into Agent Hub Canvas and Workflow Studio.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://n8n.io/workflows/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-[var(--border-strong)] bg-[var(--surface-elevated)]/80 hover:bg-[var(--surface-elevated)]/80 text-[var(--text-muted)] text-xs transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-[var(--state-error)]" />
              n8n.io Library
              <ExternalLink className="h-3 w-3 ml-0.5 text-[var(--text-muted)]" />
            </a>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (activeTag) setActiveTag(null);
              }}
              placeholder={`Search ${totalWorkflows > 0 ? `${totalWorkflows.toLocaleString()}+ ` : ""}workflows by keywords, node types, tools...`}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto border border-[var(--border-subtle)] p-1 rounded-lg bg-[var(--surface-raised)]/50">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-1.5 rounded transition-colors",
                viewMode === "grid"
                  ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
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
                "p-1.5 rounded transition-colors",
                viewMode === "list"
                  ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-muted)]"
              )}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {N8N_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id && !activeTag;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveTag(null);
                }}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                  active
                    ? "bg-[var(--state-error)] text-[var(--cta-primary-text)]"
                    : "border border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:border-[var(--state-error)]/40"
                )}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Popular Tags */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[var(--text-muted)] font-medium text-xs mr-1">
            Trending
          </span>
          {POPULAR_TAGS.map((tag) => {
            const isSelected = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setActiveTag(null);
                  } else {
                    setActiveTag(tag);
                    setSearch("");
                  }
                }}
                className={clsx(
                  "px-2 py-0.5 rounded border transition-colors cursor-pointer",
                  isSelected
                    ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-sunken)]/70 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40"
                )}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--state-error)]" />
          <p className="text-xs text-[var(--text-muted)]">Loading n8n community workflows...</p>
        </div>
      )}

      {/* Workflows Grid / List */}
      {!loading && (
        <div ref={gridRef} className="space-y-6">
          {workflows.length === 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 p-12 text-center space-y-3">
              <Bot className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
              <h3 className="text-sm font-medium text-[var(--text-muted)]">No workflows found</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                Try searching for different keywords, such as &quot;RAG&quot;, &quot;Slack&quot;, &quot;Support&quot;, or &quot;OpenAI&quot;.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => {
                    setDetailWorkflow(wf);
                    loadWorkflowDetails(wf.id);
                  }}
                  className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--state-error)]/40 hover:shadow-rose-950/10 transition-colors p-4 flex flex-col justify-between space-y-4 cursor-pointer relative"
                >
                  <div className="space-y-2.5">
                    {/* Author & Views Header */}
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {wf.user?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={wf.user.avatar}
                            alt={wf.user.name}
                            className="w-4 h-4 rounded-full border border-[var(--border-strong)] object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                            {wf.user?.name?.charAt(0) || "U"}
                          </div>
                        )}
                        <span className="truncate max-w-[120px] font-medium text-[var(--text-muted)]">
                          {wf.user?.name || "Community"}
                        </span>
                        {wf.user?.verified && (
                          <ShieldCheck className="h-3 w-3 text-[var(--state-success)] shrink-0" />
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
                        <Eye className="h-3 w-3 text-[var(--text-muted)]" />
                        {Number(wf.totalViews || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--state-error)] transition-colors line-clamp-2 leading-snug">
                      {wf.name}
                    </h3>

                    {/* Description preview */}
                    <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed font-sans font-normal">
                      {wf.description
                        ?.replace(/#+\s*/g, "")
                        ?.replace(/\n+/g, " ")
                        ?.slice(0, 160) || "No description provided."}
                    </p>

                    {/* Nodes Breakdown / Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium border border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]">
                        {wf.nodeCount} NODES
                      </span>
                      {wf.nodeTypes?.slice(0, 3).map((nt: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-xs bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                        >
                          {nt.replace(/^n8n-nodes-base\./, "")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/canvas/new?n8nId=${wf.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[var(--state-error)]/40 bg-[var(--state-error)] hover:bg-[var(--state-error)] text-[var(--cta-primary-text)] transition-colors cursor-pointer"
                    >
                      <GitBranch className="h-3 w-3" />
                      Open in canvas
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailWorkflow(wf);
                        loadWorkflowDetails(wf.id);
                      }}
                      className="px-2.5 py-1.5 rounded text-xs font-medium border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
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
                  className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--state-error)]/40 transition-colors p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium border border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]">
                        {wf.nodeCount} NODES
                      </span>
                      <h3 className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--state-error)] transition-colors truncate">
                        {wf.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-1 font-sans">
                      {wf.description?.replace(/#+\s*/g, "")?.slice(0, 140)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Eye className="h-3 w-3 text-[var(--text-muted)]" />
                      {Number(wf.totalViews || 0).toLocaleString()}
                    </span>
                    <Link
                      href={`/dashboard/canvas/new?n8nId=${wf.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium border border-[var(--state-error)]/40 bg-[var(--state-error)] hover:bg-[var(--state-error)] text-[var(--cta-primary-text)]"
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

      {/* Deep Detail Modal */}
      {detailWorkflow && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDetailWorkflow(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--surface-elevated)] p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-strong)] pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium border border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]">
                    N8N TEMPLATE #{detailWorkflow.id}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Eye className="h-3 w-3 text-[var(--text-muted)]" />
                    {Number(detailWorkflow.views || detailWorkflow.totalViews || 0).toLocaleString()} views
                  </span>
                  {detailLoading && (
                    <span className="text-xs text-[var(--accent-primary)] flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading details...
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-medium text-[var(--text-muted)] leading-snug">
                  {detailWorkflow.name}
                </h2>
                {detailWorkflow.user && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>By {detailWorkflow.user.name || detailWorkflow.user.username}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailWorkflow(null)}
                className="p-1.5 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center gap-2.5 bg-[var(--surface-elevated)]/60 p-3 rounded-xl border border-[var(--border-strong)]">
              <Link
                href={`/dashboard/canvas/new?n8nId=${detailWorkflow.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--state-error)]/40 bg-[var(--state-error)] hover:bg-[var(--state-error)] text-[var(--cta-primary-text)] transition-colors cursor-pointer"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Open in agent canvas
              </Link>

              <button
                type="button"
                disabled={importingId === detailWorkflow.id}
                onClick={() => handleImportToStudio(detailWorkflow)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/20 hover:bg-[var(--cta-primary-hover)]/40 text-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                {importingId === detailWorkflow.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <DownloadCloud className="h-3.5 w-3.5" />
                )}
                Import as studio skill
              </button>

              <button
                type="button"
                onClick={() => handleCopyJson(detailWorkflow)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] text-[var(--text-muted)] transition-colors cursor-pointer"
              >
                {copiedId === detailWorkflow.id ? (
                  <Check className="h-3.5 w-3.5 text-[var(--state-success)]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copy JSON
              </button>

              <a
                href={detailWorkflow.url || `https://n8n.io/workflows/${detailWorkflow.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors"
              >
                View on n8n.io <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Converted Graph Architecture Info */}
            {detailWorkflow.convertedGraph && (
              <div className="space-y-2 p-4 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/20">
                <div className="flex items-center justify-between text-xs text-[var(--accent-primary)] font-medium">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                    Agent Hub CANVAS MAPPING
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {detailWorkflow.convertedGraph.nodes.length} Nodes · {detailWorkflow.convertedGraph.edges.length} Edges
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  This workflow has been translated into an Agent Hub visual graph definition. Opening it on the canvas will render all triggers, agent LLM steps, conditional routers, and tool connectors with wiring intact.
                </p>
              </div>
            )}

            {/* Description & Overview */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[var(--text-muted)]">
                Workflow Overview & Instructions
              </h4>
              <div className="text-xs text-[var(--text-muted)]/90 font-sans leading-relaxed whitespace-pre-wrap bg-[var(--surface-elevated)]/40 p-4 rounded-xl border border-[var(--border-strong)] max-h-80 overflow-y-auto">
                {detailWorkflow.description || "No detailed description available."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
