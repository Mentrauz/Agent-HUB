"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Search,
  Globe,
  Download,
  Loader2,
  ExternalLink,
  ArrowRight,
  X,
  FileCode,
  Mail,
  Play,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { ItemIcon } from "@/components/common/ItemIcon";
import { Pagination } from "@/components/common/Pagination";
import { OpenApiParsedSpecDTO } from "@/types/openapi";

interface DirectoryApiItem {
  id: string;
  provider: string;
  name: string;
  description: string;
  fullDescription?: string;
  specUrl: string;
  specYamlUrl?: string;
  openapiVer: string;
  categories: string[];
  logoUrl?: string;
  version: string;
  updatedAt?: string;
  externalDocsUrl?: string;
  license?: string;
  contactEmail?: string;
  contactUrl?: string;
  originUrl?: string;
}

interface DirectoryMetrics {
  numAPIs: number;
  numEndpoints: number;
  numSpecs: number;
}

interface OpenApiDirectoryBrowserProps {
  onSelectSpecUrl: (url: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const TOP_PROVIDER_SHORTCUTS = [
  { id: "all", label: "All providers" },
  { id: "googleapis.com", label: "Google" },
  { id: "azure.com", label: "Azure" },
  { id: "amazonaws.com", label: "Aws" },
  { id: "github.com", label: "Github" },
  { id: "stripe.com", label: "Stripe" },
  { id: "twilio.com", label: "Twilio" },
  { id: "cloudflare.com", label: "Cloudflare" },
  { id: "spotify.com", label: "Spotify" },
  { id: "slack.com", label: "Slack" },
];

export function OpenApiDirectoryBrowser({ onSelectSpecUrl }: OpenApiDirectoryBrowserProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [provider, setProvider] = useState("all");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<DirectoryApiItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<DirectoryMetrics | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [installedSpecUrls, setInstalledSpecUrls] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem("openapi-installed") || "[]"));
    } catch {
      return new Set();
    }
  });

  // Detail Modal
  const [detailItem, setDetailItem] = useState<DirectoryApiItem | null>(null);

  // Container Ref for scrolling to top when page changes
  const containerRef = useRef<HTMLDivElement>(null);

  const _toggleInstalled = useCallback((specUrl: string) => {
    setInstalledSpecUrls((prev) => {
      const next = new Set(prev);
      if (next.has(specUrl)) {
        next.delete(specUrl);
      } else {
        next.add(specUrl);
      }
      try {
        localStorage.setItem("openapi-installed", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  const fetchDirectory = useCallback(
    async (
      searchQuery: string,
      categoryFilter: string,
      providerFilter: string,
      pageNum: number
    ) => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("q", searchQuery);
        if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
        if (providerFilter && providerFilter !== "all") params.set("provider", providerFilter);
        params.set("page", String(pageNum));
        params.set("limit", "24");

        const res = await fetch(`/api/openapi/directory?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json.success) {
          const newItems: DirectoryApiItem[] = json.data.items;
          setItems(newItems);
          setTotalCount(json.data.total);
          if (json.data.metrics) setMetrics(json.data.metrics);
          if (json.data.categories && categories.length === 0) {
            setCategories(json.data.categories);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    },
    [categories.length]
  );

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      fetchDirectory(search, category, provider, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, provider, fetchDirectory]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchDirectory(search, category, provider, newPage);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const totalPages = useMemo(() => Math.ceil(totalCount / 24), [totalCount]);

  // Client-side installed filter
  const filteredItems = useMemo(() => {
    if (!showInstalledOnly) return items;
    return items.filter((item) => installedSpecUrls.has(item.specUrl));
  }, [items, showInstalledOnly, installedSpecUrls]);

  return (
    <div ref={containerRef} className="space-y-4 w-full font-sans">
      {/* Directory Metrics Top Box */}
      {metrics && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-xs">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              APIs.guru Registry Index
            </span>
            <span className="px-1.5 py-0.2 rounded text-xs bg-[var(--state-success)]/10 text-[var(--state-success)] font-medium border border-[var(--state-success)]/25">
              Live
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-medium">
            <span>{pad(metrics.numAPIs)} APIS</span>
            <span>·</span>
            <span>{pad(metrics.numEndpoints)} OPERATIONS</span>
            <span>·</span>
            <span>{pad(metrics.numSpecs)} SPECS</span>
          </div>
        </div>
      )}

      {/* Provider Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TOP_PROVIDER_SHORTCUTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProvider(p.id)}
            className={clsx(
              "px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer",
              provider === p.id
                ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                : "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)]"
            )}
          >
            {p.label}
          </button>
        ))}
        <div className="w-px h-5 bg-[var(--surface-sunken)] mx-1" />
        <button
          type="button"
          onClick={() => setShowInstalledOnly((p) => !p)}
          className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer",
            showInstalledOnly
              ? "border-[var(--state-success)]/40 bg-[var(--state-success)] text-[var(--cta-primary-text)] shadow-xs"
              : "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:border-[var(--state-success)]/40"
          )}
        >
          <Check className="h-3 w-3" />
          Installed
          {installedSpecUrls.size > 0 && <span className="opacity-75">({installedSpecUrls.size})</span>}
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search 2,500+ APIs (e.g. Spotify, Stripe, NASA, Google, Weather)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)] font-sans"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)] font-sans"
          >
            <option value="all">All Categories ({totalCount})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.toUpperCase()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2 text-[var(--text-secondary)]" /> Searching apis.guru index...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-[var(--border-strong)] rounded-md space-y-1 bg-[var(--surface-raised)]/40">
          <p className="text-xs font-medium text-[var(--text-primary)]">No apis found</p>
          <p className="text-xs text-[var(--text-muted)]">{showInstalledOnly ? "No installed APIs match this filter." : "Try searching for a different keyword or provider name."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isInstalled = installedSpecUrls.has(item.specUrl);
              return (
              <div
                key={item.id}
                onClick={() => setDetailItem(item)}
                className="p-3.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] flex flex-col justify-between gap-3 hover:border-[var(--border-subtle)] transition-colors group shadow-xs cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ItemIcon
                        name={item.name}
                        logoUrl={item.logoUrl}
                        category={item.categories[0]}
                        tags={item.categories}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs font-sans text-[var(--text-secondary)] truncate">
                          {item.provider} · v{item.version}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isInstalled && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-sans font-medium bg-[var(--state-success)]/10 text-[var(--state-success)] border border-[var(--state-success)]/25">
                          <Check className="h-2.5 w-2.5" /> Installed
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 text-xs font-sans font-medium rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        OAS {item.openapiVer}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {item.description || "No description provided."}
                  </p>

                  {item.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.categories.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.2 text-xs font-medium rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs font-sans text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1">
                    Inspect Details <ArrowRight className="w-2.5 h-2.5" />
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSpecUrl(item.specUrl);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border-subtle)] bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] active:scale-95 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Import spec
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          {/* Proper Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* Detail Dialog Modal */}
      {detailItem && (
        <DirectoryApiDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onImport={() => {
            const url = detailItem.specUrl;
            setDetailItem(null);
            onSelectSpecUrl(url);
          }}
        />
      )}
    </div>
  );
}

/* ────────────── Detail Modal Component ────────────── */

function DirectoryApiDetailModal({
  item,
  onClose,
  onImport,
}: {
  item: DirectoryApiItem;
  onClose: () => void;
  onImport: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "ENDPOINTS" | "SPEC">("OVERVIEW");
  const [specData, setSpecData] = useState<OpenApiParsedSpecDTO | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const [endpointSearch, setEndpointSearch] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-introspect spec when Endpoints tab is opened
  useEffect(() => {
    if (activeTab === "ENDPOINTS" && !specData && !specLoading && !specError) {
      setSpecLoading(true);
      fetch("/api/openapi/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specUrl: item.specUrl }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setSpecData(json.data);
          } else {
            setSpecError(json.error || "Failed to introspect endpoints");
          }
        })
        .catch((err) => {
          setSpecError(err instanceof Error ? err.message : "Network error");
        })
        .finally(() => {
          setSpecLoading(false);
        });
    }
  }, [activeTab, item.specUrl, specData, specLoading, specError]);

  const copySpecUrl = () => {
    navigator.clipboard.writeText(item.specUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredEndpoints = specData?.endpoints.filter((ep) => {
    const q = endpointSearch.toLowerCase();
    return (
      ep.summary.toLowerCase().includes(q) ||
      ep.path.toLowerCase().includes(q) ||
      ep.operationId.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-sunken)]/70 font-sans duration-100"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)] flex flex-col overflow-hidden text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <div className="flex items-center gap-3 min-w-0">
            <ItemIcon
              name={item.name}
              logoUrl={item.logoUrl}
              category={item.categories[0]}
              tags={item.categories}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs text-[var(--text-secondary)] truncate">
                  {item.name}
                </h3>
                <span className="px-1.5 py-0.2 rounded text-xs font-sans font-medium bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                  OAS {item.openapiVer}
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--text-muted)] truncate">
                Provider: <span className="font-medium text-[var(--text-secondary)]">{item.provider}</span> · v{item.version}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-muted)] rounded hover:bg-[var(--surface-sunken)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2 bg-[var(--surface-sunken)]/50 border-b border-[var(--border-subtle)] text-xs font-sans font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={clsx(
              "px-3 py-1 rounded transition-colors cursor-pointer",
              activeTab === "OVERVIEW"
                ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Overview & Specs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ENDPOINTS")}
            className={clsx(
              "px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1",
              activeTab === "ENDPOINTS"
                ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Play className="w-2.5 h-2.5" /> Endpoints Introspection
            {specData && <span className="text-xs opacity-80">({specData.endpoints.length})</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SPEC")}
            className={clsx(
              "px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1",
              activeTab === "SPEC"
                ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <FileCode className="w-2.5 h-2.5" /> Spec URL & Links
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-4">
              {/* Full Description */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Description
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-sunken)]/50 p-3 rounded border border-[var(--border-subtle)]">
                  {item.fullDescription || item.description || "No description provided."}
                </p>
              </div>

              {/* Micro Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 space-y-1">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Provider / host</span>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">{item.provider}</p>
                </div>

                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 space-y-1">
                  <span className="text-xs text-[var(--text-muted)] font-medium">OpenAPI spec version</span>
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    OpenAPI {item.openapiVer} (API v{item.version})
                  </p>
                </div>

                {item.license && (
                  <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 space-y-1">
                    <span className="text-xs text-[var(--text-muted)] font-medium">License</span>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">{item.license}</p>
                  </div>
                )}

                {item.updatedAt && (
                  <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 space-y-1">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Last updated in index</span>
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Categories */}
              {item.categories.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    Categories & tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-strong)]"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENDPOINTS INTROSPECTION */}
          {activeTab === "ENDPOINTS" && (
            <div className="space-y-3">
              {specLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" />
                  <p className="text-xs text-[var(--text-muted)]">Introspecting OpenAPI specification endpoints...</p>
                </div>
              ) : specError ? (
                <div className="p-3 rounded border border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)] text-xs">
                  {specError}
                </div>
              ) : specData ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Filter endpoints by path or operation..."
                      value={endpointSearch}
                      onChange={(e) => setEndpointSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)]"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {filteredEndpoints && filteredEndpoints.length > 0 ? (
                      filteredEndpoints.map((ep) => (
                        <div
                          key={ep.id}
                          className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`px-1.5 py-0.5 text-xs font-sans font-medium rounded border ${getMethodBadge(
                                ep.method
                              )}`}
                            >
                              {ep.method}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                                {ep.summary || ep.operationId}
                              </p>
                              <p className="text-xs font-sans text-[var(--text-muted)] truncate">{ep.path}</p>
                            </div>
                          </div>

                          <span className="text-xs font-sans text-[var(--text-muted)] shrink-0">
                            {ep.parameters.length} params
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-xs text-[var(--text-muted)]">No matching endpoints.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: SPEC & LINKS */}
          {activeTab === "SPEC" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--text-muted)] font-medium">Raw specification URL</span>
                <div className="flex items-center gap-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                  <input
                    type="text"
                    readOnly
                    value={item.specUrl}
                    className="flex-1 bg-transparent text-xs font-sans text-[var(--text-secondary)] focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={copySpecUrl}
                    className="px-2 py-1 rounded bg-[var(--surface-sunken)] text-xs font-medium hover:bg-[var(--cta-primary-hover)] hover:text-[var(--cta-primary-text)] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-2.5 h-2.5 text-[var(--state-success)]" /> : <Copy className="w-2.5 h-2.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {item.externalDocsUrl && (
                  <a
                    href={item.externalDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 hover:border-[var(--border-subtle)] flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> View Documentation
                    </span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </a>
                )}

                {item.specYamlUrl && (
                  <a
                    href={item.specYamlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 hover:border-[var(--border-subtle)] flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-[var(--state-warning)]" /> View YAML Spec
                    </span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </a>
                )}

                {item.originUrl && (
                  <a
                    href={item.originUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 hover:border-[var(--border-subtle)] flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[var(--state-success)]" /> Original Source Spec
                    </span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </a>
                )}

                {item.contactEmail && (
                  <a
                    href={`mailto:${item.contactEmail}`}
                    className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 hover:border-[var(--border-subtle)] flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> Contact Developer
                    </span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <span className="text-xs text-[var(--text-muted)]">APIs.guru Registry Specification</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--border-subtle)] bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> 1-Click Import Specification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getMethodBadge(method: string) {
  switch (method) {
    case "GET":
      return "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]";
    case "POST":
      return "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]";
    case "PUT":
    case "PATCH":
      return "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]";
    case "DELETE":
      return "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]";
    default:
      return "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]";
  }
}
