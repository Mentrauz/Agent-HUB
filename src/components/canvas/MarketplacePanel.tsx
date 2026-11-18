"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Download,
  Sparkles,
  Database,
  BrainCircuit,
  Rss,
  Mic,
  Shield,
  GitFork,
  Target,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { GraphNodeType, AgentGraphDefinition } from "@/types/graph";

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: "starter" | "integration" | "data" | "advanced";
  icon: LucideIcon;
  tags: string[];
  graph: AgentGraphDefinition;
  popularity: number;
}

interface MarketplacePanelProps {
  onDragStart: (event: React.DragEvent, type: GraphNodeType) => void;
  onAddMacro: (graph: AgentGraphDefinition) => void;
  disabled?: boolean;
  onClose: () => void;
}

const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: "tpl-research-agent",
    name: "Research Agent",
    description: "Web search → scrape → analyze → summarize pipeline",
    category: "starter",
    icon: BrainCircuit,
    tags: ["research", "search", "analysis"],
    popularity: 95,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "agent_1", type: "agent", position: { x: 260, y: 200 }, data: { label: "RESEARCHER", prompt: "Research the given topic thoroughly using web search. Identify key findings and sources.", allowedTools: ["web_search"] } },
        { id: "tool_1", type: "tool", position: { x: 500, y: 200 }, data: { label: "Web scrape", toolName: "web_reader", action: "read" } },
        { id: "agent_2", type: "agent", position: { x: 740, y: 200 }, data: { label: "ANALYST", prompt: "Analyze the scraped content and extract key insights." } },
        { id: "end", type: "end", position: { x: 980, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "agent_1" },
        { id: "e2", source: "agent_1", target: "tool_1" },
        { id: "e3", source: "tool_1", target: "agent_2" },
        { id: "e4", source: "agent_2", target: "end" },
      ],
    },
  },
  {
    id: "tpl-classifier-router",
    name: "Intent Classifier & Router",
    description: "Classify input intent and route to specialist agents",
    category: "advanced",
    icon: GitFork,
    tags: ["routing", "classifier", "multi-agent"],
    popularity: 88,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "router_1", type: "router", position: { x: 260, y: 200 }, data: { label: "CLASSIFIER", routerMode: "ai", routerPrompt: "Classify the user request into: question, task, or conversation" } },
        { id: "agent_q", type: "agent", position: { x: 520, y: 80 }, data: { label: "Q&a agent", prompt: "Answer the user's question comprehensively." } },
        { id: "agent_t", type: "agent", position: { x: 520, y: 200 }, data: { label: "Task agent", prompt: "Execute the requested task step by step." } },
        { id: "agent_c", type: "agent", position: { x: 520, y: 320 }, data: { label: "Chat agent", prompt: "Engage in friendly conversation with the user." } },
        { id: "end", type: "end", position: { x: 760, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "router_1" },
        { id: "e2", source: "router_1", target: "agent_q", label: "question" },
        { id: "e3", source: "router_1", target: "agent_t", label: "task" },
        { id: "e4", source: "router_1", target: "agent_c", label: "conversation" },
        { id: "e5", source: "agent_q", target: "end" },
        { id: "e6", source: "agent_t", target: "end" },
        { id: "e7", source: "agent_c", target: "end" },
      ],
    },
  },
  {
    id: "tpl-approval-pipeline",
    name: "HITL Approval Pipeline",
    description: "Agent with human approval gates before critical actions",
    category: "starter",
    icon: Shield,
    tags: ["approval", "safety", "HITL"],
    popularity: 82,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "agent_1", type: "agent", position: { x: 260, y: 200 }, data: { label: "ANALYZER", prompt: "Analyze the request and prepare an action plan." } },
        { id: "approval_1", type: "approval", position: { x: 500, y: 200 }, data: { label: "Review gate", approvalReason: "Human must approve the proposed action before execution." } },
        { id: "tool_1", type: "tool", position: { x: 740, y: 200 }, data: { label: "EXECUTE", toolName: "action_executor", action: "run" } },
        { id: "end", type: "end", position: { x: 980, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "agent_1" },
        { id: "e2", source: "agent_1", target: "approval_1" },
        { id: "e3", source: "approval_1", target: "tool_1" },
        { id: "e4", source: "tool_1", target: "end" },
      ],
    },
  },
  {
    id: "tpl-rss-ingest",
    name: "RSS Feed Monitor",
    description: "Poll RSS feeds → extract content → notify",
    category: "integration",
    icon: Rss,
    tags: ["rss", "monitoring", "notification"],
    popularity: 75,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "rss_1", type: "rss_feed", position: { x: 260, y: 200 }, data: { label: "Rss feed", rssUrl: "https://news.ycombinator.com/rss", rssMaxItems: 10 } },
        { id: "agent_1", type: "agent", position: { x: 500, y: 200 }, data: { label: "SUMMARIZER", prompt: "Summarize the RSS feed items and identify noteworthy articles." } },
        { id: "dispatch_1", type: "notification_dispatcher", position: { x: 740, y: 200 }, data: { label: "NOTIFY", dispatchDestination: "discord", dispatchMessage: "**Feed Update:**\n{{ results.summarizer }}" } },
        { id: "end", type: "end", position: { x: 980, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "rss_1" },
        { id: "e2", source: "rss_1", target: "agent_1" },
        { id: "e3", source: "agent_1", target: "dispatch_1" },
        { id: "e4", source: "dispatch_1", target: "end" },
      ],
    },
  },
  {
    id: "tpl-doc-processor",
    name: "Document Processor",
    description: "Parse PDFs → extract tables → store in database",
    category: "data",
    icon: Database,
    tags: ["pdf", "extraction", "database"],
    popularity: 70,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "docling_1", type: "docling_pdf_parser", position: { x: 260, y: 200 }, data: { label: "PDF parse", doclingDocumentUrl: "{{ input.documentUrl }}", doclingOutputFormat: "markdown" } },
        { id: "agent_1", type: "agent", position: { x: 500, y: 200 }, data: { label: "EXTRACTOR", prompt: "Extract structured data from the parsed document." } },
        { id: "nocodb_1", type: "nocodb_record", position: { x: 740, y: 200 }, data: { label: "STORE", nocodbOperation: "create", nocodbTableId: "documents" } },
        { id: "end", type: "end", position: { x: 980, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "docling_1" },
        { id: "e2", source: "docling_1", target: "agent_1" },
        { id: "e3", source: "agent_1", target: "nocodb_1" },
        { id: "e4", source: "nocodb_1", target: "end" },
      ],
    },
  },
  {
    id: "tpl-parallel-map",
    name: "Parallel Map-Reduce",
    description: "Fan out work across parallel branches then aggregate",
    category: "advanced",
    icon: Target,
    tags: ["parallel", "fan-out", "aggregate"],
    popularity: 72,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "parallel_1", type: "parallel", position: { x: 260, y: 200 }, data: { label: "Fan out", parallelMode: "map", mapField: "input.items" } },
        { id: "agent_1", type: "agent", position: { x: 520, y: 120 }, data: { label: "Worker 1", prompt: "Process this item in parallel." } },
        { id: "agent_2", type: "agent", position: { x: 520, y: 200 }, data: { label: "Worker 2", prompt: "Process this item in parallel." } },
        { id: "agent_3", type: "agent", position: { x: 520, y: 280 }, data: { label: "Worker 3", prompt: "Process this item in parallel." } },
        { id: "aggregate_1", type: "aggregate", position: { x: 760, y: 200 }, data: { label: "MERGE", aggregateMode: "concat" } },
        { id: "end", type: "end", position: { x: 980, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "parallel_1" },
        { id: "e2", source: "parallel_1", target: "agent_1", label: "worker" },
        { id: "e3", source: "parallel_1", target: "agent_2", label: "worker" },
        { id: "e4", source: "parallel_1", target: "agent_3", label: "worker" },
        { id: "e5", source: "agent_1", target: "aggregate_1", label: "join" },
        { id: "e6", source: "agent_2", target: "aggregate_1", label: "join" },
        { id: "e7", source: "agent_3", target: "aggregate_1", label: "join" },
        { id: "e8", source: "aggregate_1", target: "end" },
      ],
    },
  },
  {
    id: "tpl-voice-pipeline",
    name: "Voice Transcription Pipeline",
    description: "Audio input → transcribe → analyze → TTS response",
    category: "integration",
    icon: Mic,
    tags: ["audio", "transcription", "tts"],
    popularity: 65,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "audio_1", type: "audio_transcriber", position: { x: 260, y: 200 }, data: { label: "STT", audioSourceUrl: "{{ input.audioUrl }}", audioLanguage: "auto" } },
        { id: "agent_1", type: "agent", position: { x: 500, y: 200 }, data: { label: "ANALYZER", prompt: "Analyze the transcribed audio and generate a response." } },
        { id: "tts_1", type: "piper_tts", position: { x: 740, y: 200 }, data: { label: "TTS", piperText: "{{ results.analyzer }}" } },
        { id: "end", type: "end", position: { x: 980, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "audio_1" },
        { id: "e2", source: "audio_1", target: "agent_1" },
        { id: "e3", source: "agent_1", target: "tts_1" },
        { id: "e4", source: "tts_1", target: "end" },
      ],
    },
  },
  {
    id: "tpl-loop-refine",
    name: "Iterative Refinement Loop",
    description: "Generate → evaluate → refine loop until quality threshold",
    category: "advanced",
    icon: Layers,
    tags: ["loop", "refinement", "quality"],
    popularity: 78,
    graph: {
      version: 1,
      nodes: [
        { id: "start", type: "start", position: { x: 40, y: 200 }, data: { label: "START" } },
        { id: "loop_1", type: "loop", position: { x: 260, y: 200 }, data: { label: "Refine loop", maxIterations: 3 } },
        { id: "agent_gen", type: "agent", position: { x: 500, y: 140 }, data: { label: "GENERATOR", prompt: "Generate or improve the output based on feedback." } },
        { id: "agent_crit", type: "agent", position: { x: 500, y: 280 }, data: { label: "CRITIC", prompt: "Evaluate the quality of the output. Be constructive." } },
        { id: "router_1", type: "router", position: { x: 740, y: 200 }, data: { label: "Quality check", routerMode: "deterministic", condition: "results.critic.score >= 8" } },
        { id: "end", type: "end", position: { x: 980, y: 200 }, data: { label: "END" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "loop_1" },
        { id: "e2", source: "loop_1", target: "agent_gen", label: "body" },
        { id: "e3", source: "agent_gen", target: "agent_crit" },
        { id: "e4", source: "agent_crit", target: "router_1" },
        { id: "e5", source: "router_1", target: "loop_1", label: "retry" },
        { id: "e6", source: "router_1", target: "end", label: "pass" },
        { id: "e7", source: "loop_1", target: "end", label: "exit" },
      ],
    },
  },
];

const CATEGORIES = [
  { id: "all", label: "ALL" },
  { id: "starter", label: "STARTERS" },
  { id: "integration", label: "INTEGRATIONS" },
  { id: "data", label: "DATA" },
  { id: "advanced", label: "ADVANCED" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  starter: "border-[var(--border-subtle)] text-[var(--text-muted)]",
  integration: "border-[var(--border-subtle)] text-[var(--text-muted)]",
  data: "border-[var(--border-subtle)] text-[var(--text-muted)]",
  advanced: "border-[var(--border-subtle)] text-[var(--text-muted)]",
};

export function MarketplacePanel({ onDragStart: _onDragStart, onAddMacro, disabled = false, onClose }: MarketplacePanelProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [, setDragItem] = useState<MarketplaceItem | null>(null);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MARKETPLACE_ITEMS.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    }).sort((a, b) => b.popularity - a.popularity);
  }, [search, activeCategory]);

  const handleTemplateDragStart = (event: React.DragEvent, item: MarketplaceItem) => {
    event.dataTransfer.setData("application/marketplace-template", JSON.stringify(item.graph));
    event.dataTransfer.effectAllowed = "copy";
    setDragItem(item);
  };

  return (
    <div className="space-y-2.5 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--state-warning)]" />
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            Marketplace
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        Drag templates onto the canvas or click to add them directly.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="w-full pl-6 pr-6 py-1 text-xs rounded bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeCategory === cat.id
                ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template List */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const nodeCount = item.graph.nodes.length;
          const edgeCount = item.graph.edges.length;
          return (
            <div
              key={item.id}
              draggable={!disabled}
              onDragStart={(e) => handleTemplateDragStart(e, item)}
              onClick={() => !disabled && onAddMacro(item.graph)}
              className={`group relative rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/90 p-2.5 transition-colors hover:border-[var(--state-warning)]/40 hover:bg-[var(--state-warning)]/10 shadow-xs ${
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-grab active:cursor-grabbing "
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="shrink-0 p-1.5 rounded bg-[var(--state-warning)]/10">
                  <Icon className="h-3.5 w-3.5 text-[var(--state-warning)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {item.name}
                    </span>
                    <span className={`px-1 py-0.5 rounded border text-xs font-medium ${CATEGORY_COLORS[item.category]}`}>
                      {item.category.toLowerCase()}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {item.description}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-[var(--text-muted)]">{nodeCount} nodes · {edgeCount} edges</span>
                    <div className="flex gap-0.5">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-1 py-0.5 rounded bg-[var(--surface-sunken)] text-xs text-[var(--text-muted)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Download className="h-3 w-3 text-[var(--state-warning)]" />
                </div>
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="text-center py-4 text-xs text-[var(--text-muted)]">
            No matching templates found
          </div>
        )}
      </div>
    </div>
  );
}
