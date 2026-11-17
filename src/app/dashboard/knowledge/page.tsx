"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { clsx } from "clsx";
import {
  BTN_PRIMARY,
  BTN_SECONDARY_SM,
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  FIELD,
  INPUT,
  LABEL,
  META,
  PageHeader,
  ROW_HOVER,
  Segmented,
  SECTION_TITLE,
  Tag,
} from "@/components/ui/surfaces";
import { previewChunks } from "@/modules/rag/chunkingService";
import { ClusterMapData } from "@/modules/rag/clusterVisualizer";
import { RAGTriadEvaluationReport } from "@/modules/rag/evaluation";

const SAMPLE_DOCUMENTS = [
  {
    title: "AI Engineer Architecture: Production RAG with pgvector",
    collection: "engineering",
    content: `# Production RAG Architecture with pgvector

## Overview
Retrieval-Augmented Generation (RAG) combines dense semantic retrieval with Large Language Models (LLMs) to ground responses in verified, proprietary knowledge. By using PostgreSQL with the \`pgvector\` extension, applications eliminate external vector database overhead and maintain transactional consistency within their primary relational database.

## Ingestion & Chunking Pipeline
1. **Document Loading**: Multi-format document ingestion from Markdown, PDF, text files, and web scrapers.
2. **Hierarchical Recursive Chunking**: Splitting documents across logical boundaries (\`\\n\\n\`, \`\\n\`, sentences, words) while maintaining 150-character contextual overlap.
3. **Context Injection**: Prepending section headings (e.g. H1 > H2) to each chunk so isolated text retains full contextual awareness during vector embedding.

## Dense Vector Embeddings
- Models: OpenAI \`text-embedding-3-small\` (1536 dimensions) or open-source high-dimensional semantic representations.
- Normalization: L2 unit-norm sphere projection ensures that Cosine Distance (\`<=>\`) equals 1 - Inner Product (\`<#>\`), accelerating indexing.

## Semantic Search & Cosine Distance
Queries are converted into dense embeddings and matched against chunk vectors using pgvector's HNSW (Hierarchical Navigable Small World) index:
\`\`\`sql
SELECT id, document_id, content, 1 - (embedding <=> query_vector) AS relevance
FROM document_chunks
WHERE collection = 'engineering'
ORDER BY embedding <=> query_vector ASC
LIMIT 5;
\`\`\`

## Prompt Augmentation & Grounding
Retrieved top-K chunks are injected into the prompt with structured citations, ensuring 0% hallucination and full source provenance.`,
  },
  {
    title: "Google Agent-to-Agent (A2A) Protocol Specification",
    collection: "protocols",
    content: `# Google Agent-to-Agent (A2A) Protocol

## Architecture & Specification
The Google Agent-to-Agent (A2A) Protocol provides a standardized communication layer enabling autonomous AI agents to discover, negotiate, and collaborate across heterogeneous frameworks.

## Key Subsystems
1. **Agent Manifest Discovery (\`/.well-known/agent.json\`)**: Exposes an agent's identity, capabilities, input/output JSON schemas, and authentication schemes.
2. **Task Delegation (\`/api/a2a/tasks\`)**: Allows client agents to submit structured multi-step tasks with Server-Sent Events (SSE) token streaming.
3. **Multi-Agent Channels (\`/api/a2a/messages\`)**: Facilitates round-robin, debate, and consensus deliberations between specialized agents (e.g. Proposer vs Critic).
4. **Resilience & Fallbacks**: Built-in circuit breakers, timeout budgets, and autonomous synthesis fallback modes.`,
  },
];

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<
    "ingest" | "search" | "cluster_map" | "documents" | "architecture"
  >("ingest");

  // Ingest State
  const [title, setTitle] = useState("Production RAG Architecture with pgvector");
  const [collection, setCollection] = useState("engineering");
  const [content, setContent] = useState(SAMPLE_DOCUMENTS[0].content);
  const [strategy, setStrategy] = useState<"recursive" | "markdown" | "semantic" | "fixed">("markdown");
  const [useParentChunking, setUseParentChunking] = useState(true);
  const [maxChunkSize, setMaxChunkSize] = useState(500);
  const [overlap, setOverlap] = useState(120);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<Record<string, unknown> | null>(null);

  // Premium: File Upload State
  const [ingestMode, setIngestMode] = useState<"text" | "file" | "url">("text");
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<Record<string, unknown>>>([]);
  const [fetchUrl, setFetchUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState<string>("");

  // Live Chunk Preview
  const [chunkPreview, setChunkPreview] = useState(() => previewChunks(content, { strategy, maxChunkSize, overlap }));

  // Search State
  const [searchQuery, setSearchQuery] = useState("How does pgvector cosine distance search work?");
  const [searchCollection, setSearchCollection] = useState("");
  const [searchLimit, setSearchLimit] = useState(5);
  const [minScore, setMinScore] = useState(0.2);
  const [useHybridSearch, setUseHybridSearch] = useState(true);
  const [expandToParent, setExpandToParent] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<Record<string, unknown>>>([]);
  const [qaAnswer, setQaAnswer] = useState<{
    answer: string;
    sources: Array<{ title: string; score: number; snippet: string; section?: string }>;
  } | null>(null);
  const [isGeneratingQA, setIsGeneratingQA] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState<RAGTriadEvaluationReport | null>(null);

  // Cluster Map State
  const [clusterData, setClusterData] = useState<ClusterMapData | null>(null);
  const [isLoadingCluster, setIsLoadingCluster] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Documents State
  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [collections, setCollections] = useState<
    Array<{ name: string; documentCount: number; chunkCount: number; totalTokens: number }>
  >([]);
  const [stats, setStats] = useState<{ documentCount: number; chunkCount: number; storageEngine: string } | null>(
    null
  );
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocChunks, setSelectedDocChunks] = useState<Record<string, unknown> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Update preview when content or chunk settings change
  useEffect(() => {
    try {
      const res = previewChunks(content, { strategy, maxChunkSize, overlap });
      setChunkPreview(res);
    } catch {
      // Ignore preview errors
    }
  }, [content, strategy, maxChunkSize, overlap]);

  // Load documents and collections
  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch("/api/rag/documents?includeCollections=true");
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.documents || []);
        setCollections(json.collections || []);
        setStats(json.stats || null);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Load 2D Vector Cluster Data
  const fetchClusterData = useCallback(async (queryText?: string) => {
    setIsLoadingCluster(true);
    try {
      const queryParam = queryText || searchQuery;
      const res = await fetch(
        `/api/rag/cluster?${queryParam ? `query=${encodeURIComponent(queryParam)}` : ""}${
          searchCollection ? `&collection=${encodeURIComponent(searchCollection)}` : ""
        }`
      );
      if (res.ok) {
        const json = await res.json();
        setClusterData(json);
      }
    } catch {
      // Handled
    } finally {
      setIsLoadingCluster(false);
    }
  }, [searchQuery, searchCollection]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (activeTab === "cluster_map") {
      fetchClusterData();
    }
  }, [activeTab, fetchClusterData]);

  // Render 2D Vector Canvas
  useEffect(() => {
    if (activeTab !== "cluster_map" || !clusterData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Draw Grid & Axes
    ctx.strokeStyle = "rgba(128, 128, 128, 0.15)";
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Origin Axes
    ctx.strokeStyle = "rgba(128, 128, 128, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Map color by collection
    const colorMap = new Map<string, string>();
    clusterData.collections.forEach((c) => colorMap.set(c.name, c.color));

    // Draw Cluster Points
    for (const pt of clusterData.points) {
      const px = width / 2 + pt.x * (width * 0.42);
      const py = height / 2 - pt.y * (height * 0.42);

      const color = colorMap.get(pt.collection) || "#8a8a8a";

      // Core point
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Draw Query Point Pin (if available)
    if (clusterData.queryPoint) {
      const qx = width / 2 + clusterData.queryPoint.x * (width * 0.42);
      const qy = height / 2 - clusterData.queryPoint.y * (height * 0.42);

      ctx.beginPath();
      ctx.arc(qx, qy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      ctx.font = "12px monospace";
      ctx.fillStyle = "#ef4444";
      ctx.fillText("query", qx + 8, qy - 8);
    }
  }, [clusterData, activeTab]);

  // Handle Ingest
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !title.trim()) return;

    setIsIngesting(true);
    setIngestSuccess(null);

    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          collection: collection || "default",
          content,
          mimeType: strategy === "markdown" ? "text/markdown" : "text/plain",
          chunking: {
            strategy,
            maxChunkSize,
            overlap,
            parentChunkSize: useParentChunking ? 1200 : undefined,
          },
          useParentChunking,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIngestSuccess(json.document);
        fetchDocuments();
      } else {
        alert(json.error || "Failed to ingest document");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error during ingestion");
    } finally {
      setIsIngesting(false);
    }
  };

  // Handle Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setQaAnswer(null);
    setEvaluationReport(null);

    try {
      const res = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          collection: searchCollection || undefined,
          limit: searchLimit,
          minScore,
          useHybridSearch,
          expandToParent,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSearchResults(json.context || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Grounded QA & Evaluation
  const handleGenerateQA = async () => {
    if (!searchQuery.trim()) return;

    setIsGeneratingQA(true);
    setEvaluationReport(null);

    try {
      const res = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          collection: searchCollection || undefined,
          limit: searchLimit,
          minScore,
          generateAnswer: true,
          expandToParent,
        }),
      });

      const json = await res.json();
      if (res.ok && json.result) {
        setQaAnswer(json.result);

        // Run automated RAG Triad Evaluation
        const evalRes = await fetch("/api/rag/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery,
            contextChunks: searchResults.map((r) => ({ content: r.content as string, score: r.score as number })),
            generatedAnswer: json.result.answer,
          }),
        });

        if (evalRes.ok) {
          const evalJson = await evalRes.json();
          setEvaluationReport(evalJson.evaluation);
        }
      }
    } catch (err) {
      console.error("QA generation failed:", err);
    } finally {
      setIsGeneratingQA(false);
    }
  };

  // Handle Delete Document
  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document and all its pgvector embeddings?")) return;

    try {
      const res = await fetch(`/api/rag/documents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDocuments();
        if (selectedDocChunks?.id === id) {
          setSelectedDocChunks(null);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // Handle Inspect Document Chunks
  const handleInspectDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/rag/documents/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedDocChunks(json.document);
      }
    } catch (err) {
      console.error("Failed to load document chunks:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-12">
      <PageHeader
        title="Knowledge base"
        meta="Ingest documents, search them with hybrid retrieval, and inspect chunks, clusters and benchmarks"
        action={
          <span className={META}>
            {(stats?.documentCount ?? documents.length).toLocaleString()} documents · {(stats?.chunkCount ?? 0).toLocaleString()} chunks
          </span>
        }
      />
      {/* Tabs */}
      <div role="tablist" className="flex items-center gap-6 overflow-x-auto border-b border-[var(--border-subtle)]">
        {[
    { id: "ingest" as const, label: "Ingestion" },
    { id: "search" as const, label: "Search" },
    { id: "cluster_map" as const, label: "Cluster map" },
    { id: "documents" as const, label: `Collections (${documents.length})` },
    { id: "architecture" as const, label: "Architecture" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`-mb-px flex h-10 shrink-0 cursor-pointer items-center border-b-2 font-sans text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
              activeTab === t.id
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ingestion */}
      {activeTab === "ingest" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <form onSubmit={handleIngest} className={CARD}>
              <div className={CARD_HEAD}>
                <h2 className={CARD_TITLE}>Add a document</h2>
                <div className="flex items-center gap-2">
                  <span className={META}>sample</span>
                  {SAMPLE_DOCUMENTS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTitle(s.title);
                        setCollection(s.collection);
                        setContent(s.content);
                      }}
                      className={BTN_SECONDARY_SM}
                    >
                      {s.collection}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 p-5">
                <Segmented
                  label="Source"
                  value={ingestMode}
                  onChange={setIngestMode}
                  options={[
                    { id: "text", label: "Paste text" },
                    { id: "file", label: "Upload files" },
                    { id: "url", label: "Fetch URL" },
                  ]}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="kb-title" className={LABEL}>
                      Title
                    </label>
                    <input
                      id="kb-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required={ingestMode === "text"}
                      className={clsx(INPUT, "w-full")}
                      placeholder="System architecture whitepaper"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="kb-collection" className={LABEL}>
                      Collection
                    </label>
                    <input
                      id="kb-collection"
                      type="text"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                      required
                      className={clsx(INPUT, "w-full")}
                      placeholder="engineering"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="kb-tags" className={LABEL}>
                      Tags
                    </label>
                    <div className={clsx(FIELD, "flex min-h-9 flex-wrap items-center gap-1.5 px-2 py-1")}>
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--text-primary)]/10 px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
                        >
                          {tag}
                          <button
                            type="button"
                            aria-label={`Remove ${tag}`}
                            onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                            className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--state-error)]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        id="kb-tags"
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                            e.preventDefault();
                            if (!tags.includes(tagInput.trim())) {
                              setTags((prev) => [...prev, tagInput.trim()]);
                            }
                            setTagInput("");
                          }
                        }}
                        className="min-w-[80px] flex-1 bg-transparent font-sans text-sm outline-none placeholder:text-[var(--text-muted)]"
                        placeholder="Press Enter to add"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="kb-embed" className={LABEL}>
                      Embedding model
                    </label>
                    <select
                      id="kb-embed"
                      value={embeddingModel}
                      onChange={(e) => setEmbeddingModel(e.target.value)}
                      className={clsx(FIELD, "h-9 w-full cursor-pointer px-3")}
                    >
                      <option value="">Default (text-embedding-3-small)</option>
                      <option value="text-embedding-3-small">OpenAI text-embedding-3-small (1536D)</option>
                      <option value="text-embedding-3-large">OpenAI text-embedding-3-large (3072D)</option>
                      <option value="text-embedding-ada-002">OpenAI text-embedding-ada-002 (1536D)</option>
                    </select>
                  </div>
                </div>

                {/* Chunking */}
                <fieldset className="space-y-4 rounded-[10px] border border-[var(--border-subtle)] p-4">
                  <legend className="px-2 font-sans text-[13px] text-[var(--text-muted)]">Chunking</legend>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Segmented
                      label="Strategy"
                      hideLabel
                      value={strategy}
                      onChange={setStrategy}
                      options={(["markdown", "recursive", "semantic", "fixed"] as const).map((s) => ({
                        id: s,
                        label: s.charAt(0).toUpperCase() + s.slice(1),
                      }))}
                    />
                    <label className="flex cursor-pointer items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={useParentChunking}
                        onChange={(e) => setUseParentChunking(e.target.checked)}
                        className="h-4 w-4 accent-[var(--accent-primary)]"
                      />
                      Keep parent context (small-to-big)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <label htmlFor="kb-size" className={LABEL}>
                          Chunk size
                        </label>
                        <span className={META}>{maxChunkSize} chars</span>
                      </div>
                      <input
                        id="kb-size"
                        type="range"
                        min="150"
                        max="1200"
                        step="50"
                        value={maxChunkSize}
                        onChange={(e) => setMaxChunkSize(parseInt(e.target.value, 10))}
                        className="w-full accent-[var(--accent-primary)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <label htmlFor="kb-overlap" className={LABEL}>
                          Overlap
                        </label>
                        <span className={META}>{overlap} chars</span>
                      </div>
                      <input
                        id="kb-overlap"
                        type="range"
                        min="0"
                        max="300"
                        step="20"
                        value={overlap}
                        onChange={(e) => setOverlap(parseInt(e.target.value, 10))}
                        className="w-full accent-[var(--accent-primary)]"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Paste text */}
                {ingestMode === "text" && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="kb-content" className={LABEL}>
                        Content (Markdown or plain text)
                      </label>
                      <textarea
                        id="kb-content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={12}
                        required
                        className={clsx(FIELD, "w-full p-3 leading-6")}
                        placeholder="Paste or write document text here"
                      />
                    </div>
                    <button type="submit" disabled={isIngesting || !content.trim()} className={clsx(BTN_PRIMARY, "w-full")}>
                      {isIngesting ? "Chunking, embedding and storing" : "Ingest document"}
                    </button>
                  </>
                )}

                {/* Upload files */}
                {ingestMode === "file" && (
                  <>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const files = Array.from(e.dataTransfer.files);
                        setUploadFiles((prev) => [...prev, ...files]);
                      }}
                      className={clsx(
                        "relative space-y-1 rounded-[12px] border border-dashed p-8 text-center transition-colors",
                        dragActive
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                          : "border-[var(--border-strong)] hover:border-[var(--text-muted)]"
                      )}
                    >
                      <p className="font-sans text-sm text-[var(--text-primary)]">Drop files here or click to browse</p>
                      <p className="font-sans text-[13px] text-[var(--text-muted)]">
                        PDF, DOCX, HTML, CSV, JSON, TXT, MD. Up to 20 files, 20 MB each
                      </p>
                      <input
                        type="file"
                        multiple
                        aria-label="Choose files to upload"
                        accept=".pdf,.docx,.doc,.html,.htm,.csv,.json,.txt,.md,.markdown,.xml,.yaml,.yml"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setUploadFiles((prev) => [...prev, ...files]);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </div>

                    {uploadFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={META}>{uploadFiles.length} selected</span>
                          <button
                            type="button"
                            onClick={() => setUploadFiles([])}
                            className="cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                          >
                            Clear all
                          </button>
                        </div>
                        <ul className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
                          {uploadFiles.map((f, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2">
                              <span className="min-w-0 truncate font-sans text-sm text-[var(--text-primary)]">{f.name}</span>
                              <div className="flex shrink-0 items-center gap-3">
                                <span className={META}>{(f.size / 1024).toFixed(0)} KB</span>
                                <button
                                  type="button"
                                  onClick={() => setUploadFiles((prev) => prev.filter((_, i) => i !== idx))}
                                  className="cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)]"
                                >
                                  Remove
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isUploading || uploadFiles.length === 0}
                      onClick={async () => {
                        setIsUploading(true);
                        setUploadResults([]);
                        try {
                          const formData = new FormData();
                          for (const f of uploadFiles) formData.append("file", f);
                          formData.append("collection", collection || "default");
                          if (tags.length > 0) formData.append("tags", tags.join(","));
                          if (embeddingModel) formData.append("embeddingModel", embeddingModel);
                          formData.append("chunking", JSON.stringify({ strategy, maxChunkSize, overlap, parentChunkSize: useParentChunking ? 1200 : undefined }));

                          const res = await fetch("/api/rag/upload", { method: "POST", body: formData });
                          const json = await res.json();
                          if (json.results) setUploadResults(json.results);
                          fetchDocuments();
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      className={clsx(BTN_PRIMARY, "w-full")}
                    >
                      {isUploading ? `Ingesting ${uploadFiles.length} files` : `Upload and ingest ${uploadFiles.length} ${uploadFiles.length === 1 ? "file" : "files"}`}
                    </button>

                    {uploadResults.length > 0 && (
                      <ul className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
                        {uploadResults.map((r, idx) => (
                          <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="min-w-0 truncate font-sans text-sm text-[var(--text-primary)]">{r.filename as string}</span>
                            {r.status === "success" ? (
                              <Tag tone="good">{r.chunkCount as number} chunks</Tag>
                            ) : (
                              <Tag tone="bad">{r.error as string}</Tag>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {/* Fetch URL */}
                {ingestMode === "url" && (
                  <div className="space-y-2">
                    <label htmlFor="kb-url" className={LABEL}>
                      Page URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="kb-url"
                        type="url"
                        value={fetchUrl}
                        onChange={(e) => setFetchUrl(e.target.value)}
                        className={clsx(INPUT, "min-w-0 flex-1")}
                        placeholder="https://docs.example.com/api/reference"
                      />
                      <button
                        type="button"
                        disabled={isFetchingUrl || !fetchUrl.trim()}
                        onClick={async () => {
                          if (!fetchUrl.trim()) return;
                          setIsFetchingUrl(true);
                          try {
                            const res = await fetch("/api/rag/fetch-url", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                url: fetchUrl.trim(),
                                collection: collection || "default",
                                tags,
                                chunking: { strategy, maxChunkSize, overlap, parentChunkSize: useParentChunking ? 1200 : undefined },
                              }),
                            });
                            const json = await res.json();
                            if (json.success) {
                              setIngestSuccess(json.document);
                              fetchDocuments();
                              setFetchUrl("");
                            } else {
                              alert(json.error || "Failed to fetch URL");
                            }
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Network error");
                          } finally {
                            setIsFetchingUrl(false);
                          }
                        }}
                        className={BTN_PRIMARY}
                      >
                        {isFetchingUrl ? "Fetching" : "Fetch and ingest"}
                      </button>
                    </div>
                    <p className="font-sans text-[13px] text-[var(--text-muted)]">
                      Fetches a public HTTP or HTTPS page, converts it to markdown and ingests it.
                    </p>
                  </div>
                )}
              </div>
            </form>

            {ingestSuccess && (
              <section className={clsx(CARD, "animate-fadeIn space-y-3 p-5")}>
                <Tag tone="good">Ingested and indexed</Tag>
                <dl className={clsx(META, "grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4")}>
                  <div>
                    <dt className="text-[var(--text-muted)]">Document</dt>
                    <dd className="text-[var(--text-primary)]">{(ingestSuccess.documentId as string)?.slice(0, 10)}…</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Chunks</dt>
                    <dd className="text-[var(--text-primary)]">{ingestSuccess.chunkCount as number}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Tokens</dt>
                    <dd className="text-[var(--text-primary)]">{ingestSuccess.totalTokens as number}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Embedding</dt>
                    <dd className="truncate text-[var(--text-primary)]">{ingestSuccess.embeddingModel as string}</dd>
                  </div>
                </dl>
              </section>
            )}
          </div>

          {/* Live chunk preview */}
          <section className={clsx(CARD, "self-start lg:col-span-5")}>
            <div className={CARD_HEAD}>
              <h2 className={CARD_TITLE}>Chunk preview</h2>
              <span className={META}>{chunkPreview.stats.chunkCount} chunks</span>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
              {[
                { label: "Characters", value: chunkPreview.stats.totalChars },
                { label: "Est. tokens", value: chunkPreview.stats.totalTokens },
                { label: "Avg chars per chunk", value: chunkPreview.stats.avgChunkChars },
              ].map((s) => (
                <div key={s.label} className="space-y-1 px-5 py-3">
                  <dt className="font-sans text-[13px] text-[var(--text-muted)]">{s.label}</dt>
                  <dd className="font-mono text-sm tabular-nums text-[var(--text-primary)]">{s.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="max-h-[500px] divide-y divide-[var(--border-subtle)] overflow-y-auto">
              {chunkPreview.chunks.map((chunk, idx) => (
                <li key={idx} className="space-y-2 px-5 py-3">
                  <div className={clsx(META, "flex items-center justify-between gap-3")}>
                    <span>
                      #{idx + 1}
                      {chunk.metadata.section && <> · {chunk.metadata.section}</>}
                    </span>
                    <span>
                      {chunk.metadata.charCount} chars · {chunk.metadata.tokenCount} tokens
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{chunk.content}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* Search */}
      {activeTab === "search" && (
        <div className="max-w-4xl space-y-6">
          <section className={CARD}>
            <div className={CARD_HEAD}>
              <h2 className={CARD_TITLE}>Search</h2>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={useHybridSearch}
                    onChange={(e) => setUseHybridSearch(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  Hybrid ranking
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={expandToParent}
                    onChange={(e) => setExpandToParent(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  Parent context
                </label>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <form onSubmit={handleSearch} className="flex gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Search query</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ask a question or describe what you need"
                    className={clsx(INPUT, "h-10 w-full")}
                  />
                </label>
                <button type="submit" disabled={isSearching || !searchQuery.trim()} className={clsx(BTN_PRIMARY, "h-10")}>
                  {isSearching ? "Searching" : "Search"}
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-[13px] text-[var(--text-muted)]">
                <span>Try</span>
                {[
                  "How does pgvector cosine distance search work?",
                  "Explain A2A protocol task delegation",
                  "What is hierarchical chunking with overlap?",
                  "How does Reciprocal Rank Fusion combine dense and sparse search?",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(q);
                      setTimeout(() => handleSearch(), 50);
                    }}
                    className="cursor-pointer text-left text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--text-primary)]"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--border-subtle)] pt-4">
                <label className="flex items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
                  Collection
                  <select
                    value={searchCollection}
                    onChange={(e) => setSearchCollection(e.target.value)}
                    className={clsx(FIELD, "h-8 cursor-pointer px-2 text-[13px]")}
                  >
                    <option value="">All collections</option>
                    {collections.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.chunkCount} chunks)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
                  Results
                  <select
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(parseInt(e.target.value, 10))}
                    className={clsx(FIELD, "h-8 cursor-pointer px-2 text-[13px]")}
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
                  Min similarity
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.05"
                    value={minScore}
                    onChange={(e) => setMinScore(parseFloat(e.target.value))}
                    className="w-24 accent-[var(--accent-primary)]"
                  />
                  <span className={META}>{Math.round(minScore * 100)}%</span>
                </label>

                <button
                  type="button"
                  onClick={handleGenerateQA}
                  disabled={isGeneratingQA || !searchQuery.trim()}
                  className={clsx(BTN_SECONDARY_SM, "ml-auto")}
                >
                  {isGeneratingQA ? "Writing answer" : "Answer with sources"}
                </button>
              </div>
            </div>
          </section>

          {qaAnswer && (
            <section className={clsx(CARD, "animate-fadeIn")}>
              <div className={CARD_HEAD}>
                <h2 className={CARD_TITLE}>Answer</h2>
                <span className={META}>{qaAnswer.sources?.length} sources cited</span>
              </div>
              <div className="whitespace-pre-wrap p-5 font-sans text-sm leading-6 text-[var(--text-primary)]">{qaAnswer.answer}</div>
            </section>
          )}

          {evaluationReport && (
            <section className={clsx(CARD, "animate-fadeIn")}>
              <div className={CARD_HEAD}>
                <h2 className={CARD_TITLE}>Answer quality</h2>
                <Tag tone={evaluationReport.overallGrade === "A" ? "good" : evaluationReport.overallGrade === "B" ? "accent" : "warn"}>
                  Grade {evaluationReport.overallGrade} · {Math.round(evaluationReport.overallScore * 100)}%
                </Tag>
              </div>
              <div className="grid grid-cols-1 divide-y divide-[var(--border-subtle)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  { label: "Context relevance", r: evaluationReport.contextRelevance },
                  { label: "Groundedness", r: evaluationReport.groundedness },
                  { label: "Answer relevance", r: evaluationReport.answerRelevance },
                ].map((m) => (
                  <div key={m.label} className="space-y-2 p-5">
                    <div className="font-sans text-[13px] text-[var(--text-muted)]">{m.label}</div>
                    <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">
                      {Math.round(m.r.score * 100)}%
                    </div>
                    <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{m.r.details}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Retrieved chunks */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={SECTION_TITLE}>Retrieved chunks</h2>
              <span className={META}>{searchResults.length}</span>
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <div className="rounded-[14px] border border-dashed border-[var(--border-strong)] p-10 text-center font-sans text-sm text-[var(--text-muted)]">
                No matches. Ingest documents or lower the similarity threshold.
              </div>
            ) : (
              <ul className="space-y-4">
                {searchResults.map((result, idx) => {
                  const scorePct = Math.round(((result.score as number) || 0) * 100);
                  const searchType = (result.searchType as string) || "dense";
                  return (
                    <li key={idx} className={clsx(CARD, "space-y-3 p-5")}>
                      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                        <div className="min-w-0 space-y-1">
                          <div className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">
                            {result.title as string}
                          </div>
                          <div className={META}>
                            {result.collection as string}
                            {Boolean(result.section) && <> · {result.section as string}</>} · {searchType}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-1 w-24 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${scorePct}%`,
                                background: idx === 0 ? "var(--accent-primary)" : "var(--text-muted)",
                                opacity: idx === 0 ? 1 : 0.6,
                              }}
                            />
                          </div>
                          <span className={META}>{scorePct}%</span>
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                        {result.content as string}
                      </p>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(result.content as string, `result-${idx}`)}
                        className="cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {copiedId === `result-${idx}` ? "Copied" : "Copy chunk"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Cluster map */}
      {activeTab === "cluster_map" && (
        <section className={CARD}>
          <div className={CARD_HEAD}>
            <div className="space-y-1">
              <h2 className={CARD_TITLE}>Vector space</h2>
              <p className="font-sans text-[13px] text-[var(--text-muted)]">
                Embedding vectors projected to two dimensions with PCA. Nearby points have similar meaning.
              </p>
            </div>
            <button onClick={() => fetchClusterData()} disabled={isLoadingCluster} className={BTN_SECONDARY_SM}>
              {isLoadingCluster ? "Calculating" : "Recalculate"}
            </button>
          </div>

          <div className="space-y-4 p-5">
            {clusterData && clusterData.collections.length > 0 && (
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[13px] text-[var(--text-secondary)]">
                {clusterData.collections.map((coll) => (
                  <li key={coll.name} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: coll.color }} />
                    {coll.name}
                    <span className={META}>{coll.count}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--state-error)]" />
                  Query
                </li>
              </ul>
            )}

            <div className="flex items-center justify-center overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                aria-label="Two-dimensional map of document chunk embeddings"
                className="h-[500px] w-full max-w-[800px] cursor-crosshair"
              />
            </div>
          </div>
        </section>
      )}

      {/* Collections and documents */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-sm text-[var(--text-secondary)]">Everything stored in PostgreSQL with pgvector.</p>
            <button onClick={fetchDocuments} disabled={isLoadingDocs} className={BTN_SECONDARY_SM}>
              {isLoadingDocs ? "Refreshing" : "Refresh"}
            </button>
          </div>

          {collections.length > 0 && (
            <div className="grid gap-px overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-3">
              {collections.map((coll) => (
                <div key={coll.name} className="space-y-3 bg-[var(--surface-raised)] p-5">
                  <div className="font-sans text-[13px] text-[var(--text-muted)]">{coll.name}</div>
                  <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">
                    {coll.chunkCount.toLocaleString()}
                  </div>
                  <div className={META}>
                    chunks · {coll.documentCount} {coll.documentCount === 1 ? "document" : "documents"} · ~{coll.totalTokens.toLocaleString()} tokens
                  </div>
                </div>
              ))}
            </div>
          )}

          <section className={clsx(CARD, "overflow-hidden")}>
            <div className={CARD_HEAD}>
              <h2 className={CARD_TITLE}>Documents</h2>
              <span className={META}>{documents.length}</span>
            </div>

            {documents.length === 0 ? (
              <p className="px-5 py-10 text-center font-sans text-sm text-[var(--text-muted)]">
                Nothing ingested yet. Add your first document on the Ingestion tab.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {documents.map((doc) => (
                  <li key={doc.id as string} className={clsx(ROW_HOVER, "flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center")}>
                    <div className="min-w-0 space-y-1">
                      <div className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{doc.title as string}</div>
                      <div className={clsx(META, "flex flex-wrap items-center gap-x-4")}>
                        <span>{doc.collection as string}</span>
                        <span>{(doc.id as string).slice(0, 10)}…</span>
                        <span>{doc.chunkCount as number} chunks</span>
                        <span>{doc.tokenCount as number} tokens</span>
                        <span>{new Date(doc.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => handleInspectDoc(doc.id as string)} className={BTN_SECONDARY_SM}>
                        View chunks
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id as string)}
                        className={clsx(BTN_SECONDARY_SM, "text-[var(--state-error)]")}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selectedDocChunks && (
            <section className={clsx(CARD, "animate-fadeIn")}>
              <div className={CARD_HEAD}>
                <div className="min-w-0 space-y-1">
                  <h2 className={clsx(CARD_TITLE, "truncate")}>{selectedDocChunks.title as string}</h2>
                  <div className={META}>{selectedDocChunks.chunkCount as number} chunks</div>
                </div>
                <button onClick={() => setSelectedDocChunks(null)} className={BTN_SECONDARY_SM}>
                  Close
                </button>
              </div>
              <ul className="max-h-[400px] divide-y divide-[var(--border-subtle)] overflow-y-auto">
                {((selectedDocChunks.chunks as Array<Record<string, unknown>>) || []).map((chunk, idx) => (
                  <li key={idx} className="space-y-2 px-5 py-3">
                    <div className={clsx(META, "flex items-center justify-between")}>
                      <span>#{chunk.chunkIndex as number}</span>
                      <span>{chunk.tokenCount as number} tokens</span>
                    </div>
                    <p className="whitespace-pre-wrap font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{chunk.content as string}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Architecture */}
      {activeTab === "architecture" && (
        <section className={clsx(CARD, "max-w-3xl")}>
          <div className={CARD_HEAD}>
            <h2 className={CARD_TITLE}>How retrieval works</h2>
          </div>
          <ol className="divide-y divide-[var(--border-subtle)]">
            {[
              { name: "Ingestion", text: "Parses Markdown, PDF and plain text, keeping section metadata and links to parent context." },
              { name: "Small-to-big chunks", text: "Indexes 200-character leaf chunks while keeping the 1200-character parent section for context." },
              { name: "Vectors", text: "OpenAI text-embedding-3, open models or local normalized embeddings, 1536 dimensions by default." },
              { name: "Hybrid ranking", text: "Combines pgvector cosine distance (<=>) with sparse full-text keyword ranking using Reciprocal Rank Fusion." },
              { name: "Quality audit", text: "Scores context relevance, groundedness and answer relevance on every answered query." },
            ].map((step, i) => (
              <li key={step.name} className="grid gap-1 px-5 py-4 sm:grid-cols-12 sm:gap-6">
                <div className="flex items-baseline gap-3 sm:col-span-4">
                  <span className={META}>{i + 1}</span>
                  <span className="font-sans text-sm font-medium text-[var(--text-primary)]">{step.name}</span>
                </div>
                <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)] sm:col-span-8">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
