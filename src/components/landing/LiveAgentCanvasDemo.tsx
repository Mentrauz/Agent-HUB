"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  RefreshCw,
  CircleDot,
  Flag,
  GitFork,
  Search,
  Code2,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Radio,
  Plus,
  Minus,
  MousePointerClick,
  Layers,
  Zap,
  Clock,
  Cpu,
  RotateCcw,
  Sparkles,
  FileCheck,
  HardDrive,
  BrainCircuit,
  FileSpreadsheet,
  Gauge,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "next-themes";
import { parseThemeKey } from "@/components/providers/ThemeProvider";

type NodeStatus = "idle" | "running" | "done" | "awaiting";

interface DemoNodeDef {
  id: string;
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  sub: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accentClass: string;
  badgeClass: string;
  prompt?: string;
  tool?: string;
  snippet?: string;
  outputPreview?: string;
  latencyMs: number;
  tokens: number;
}

interface DemoEdgeLink {
  id: string;
  source: string;
  target: string;
  label?: string;
  loop?: boolean;
  accept?: boolean;
}

interface DemoTraceStep {
  nodeId: string;
  stepName: string;
  type: "START" | "AGENT" | "TOOL" | "APPROVAL" | "ROUTER" | "END";
  message: string;
  latencyMs: number;
  tokens: number;
  outputSummary: string;
  cls: string;
}

interface BlueprintPreset {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  nodes: DemoNodeDef[];
  edges: DemoEdgeLink[];
  traceSteps: DemoTraceStep[];
}

// ────────────── PRESET 1: OPEN-SOURCE DEEP RESEARCH & PDF MEMO ──────────────
const PRESET_DEEP_RESEARCH: BlueprintPreset = {
  id: "deep_research",
  name: "Deep Research & Gotenberg PDF",
  tagline: "SearXNG ➔ Crawl4AI ➔ AI Scientist ➔ Gotenberg PDF Generator",
  badge: "OPEN SOURCE STACK",
  icon: Search,
  nodes: [
    {
      id: "start",
      label: "START",
      badge: "TRIGGER",
      icon: CircleDot,
      sub: "query: 'Autonomous Multi-Agent Systems'",
      snippet: 'q: "Autonomous Multi-Agent Architectures"',
      x: 30,
      y: 180,
      width: 175,
      height: 90,
      accentClass: "border-emerald-500/70 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-black/60",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
      prompt: "Ingest research topic parameter validated against JSON Schema.",
      outputPreview: '{\n  "query": "Autonomous Multi-Agent Architectures",\n  "maxResults": 5,\n  "language": "en"\n}',
      latencyMs: 12,
      tokens: 28,
    },
    {
      id: "searxng",
      label: "SEARXNG SEARCH",
      badge: "ZERO-KEY",
      icon: Search,
      sub: "Multi-engine metasearch (Google, Bing, Reddit, ArXiv)",
      snippet: "metasearch: google, bing, reddit, arxiv",
      x: 235,
      y: 60,
      width: 215,
      height: 98,
      accentClass: "border-emerald-500/70 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-black/60",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
      prompt: "Query public SearXNG instance for latest agent orchestration benchmarks.",
      tool: "searxng_search (format=json, 5 results)",
      outputPreview: '{\n  "results": [\n    {"title": "Agent Orchestration Survey", "url": "https://arxiv.org/abs/2401.03412"},\n    {"title": "Multi-Agent Reflection Loops", "url": "https://github.com/agent-studio"}\n  ],\n  "total": 5\n}',
      latencyMs: 340,
      tokens: 180,
    },
    {
      id: "crawl4ai",
      label: "CRAWL4AI SCRAPER",
      badge: "AI CRAWLER",
      icon: Sparkles,
      sub: "Clean markdown extraction & noise stripping",
      snippet: "extract: structured_markdown (no-ads)",
      x: 235,
      y: 280,
      width: 215,
      height: 98,
      accentClass: "border-teal-500/70 text-teal-600 dark:text-teal-400 bg-teal-50/70 dark:bg-black/60",
      badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/40",
      prompt: "Crawl target URLs and extract clean LLM-friendly markdown content without boilerplate.",
      tool: "crawl4ai_scrape (word_count_threshold=200)",
      outputPreview: '{\n  "url": "https://arxiv.org/abs/2401.03412",\n  "markdown": "## Multi-Agent Systems in 2026\\n\\nDynamic routing outperforms static DAGs...",\n  "wordCount": 1420\n}',
      latencyMs: 460,
      tokens: 380,
    },
    {
      id: "scientist",
      label: "RESEARCH SCIENTIST",
      badge: "AGENT",
      icon: Cpu,
      sub: "Analyze breakthroughs & synthesize report",
      snippet: "model: llama-3.3-70b · failover: active",
      x: 480,
      y: 160,
      width: 210,
      height: 100,
      accentClass: "border-indigo-500/70 text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-black/60",
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/40",
      prompt: "Synthesize findings into an executive briefing on Multi-Agent architectures with benchmark tables.",
      outputPreview: '{\n  "executiveSummary": "Multi-agent systems with supervisor-critic loops yield 38% higher task completion.",\n  "sections": ["Architecture", "Benchmarks", "Governance"]\n}',
      latencyMs: 620,
      tokens: 580,
    },
    {
      id: "gotenberg",
      label: "GOTENBERG PDF",
      badge: "PDF EXPORT",
      icon: HardDrive,
      sub: "Stateless HTML/Markdown to PDF engine",
      snippet: "layout: A4 · landscape: false",
      x: 720,
      y: 160,
      width: 195,
      height: 98,
      accentClass: "border-blue-500/70 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-black/60",
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40",
      prompt: "Compile generated research report into an executive PDF with custom styling and header banners.",
      tool: "gotenberg_pdf_exporter (margins=0.4in)",
      outputPreview: '{\n  "pdfUrl": "/api/reports/deep-research-2026.pdf",\n  "pageCount": 4,\n  "status": "GENERATED"\n}',
      latencyMs: 240,
      tokens: 120,
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "searxng", label: "search" },
    { id: "e2", source: "searxng", target: "crawl4ai", label: "crawl urls" },
    { id: "e3", source: "crawl4ai", target: "scientist", label: "markdown" },
    { id: "e4", source: "scientist", target: "gotenberg", label: "render report" },
  ],
  traceSteps: [
    {
      nodeId: "start",
      stepName: "START · User Research Directive",
      type: "START",
      message: "Research query payload validated: 'Autonomous Multi-Agent Architectures'",
      latencyMs: 12,
      tokens: 28,
      outputSummary: 'Input: {"query": "Autonomous Multi-Agent Architectures"}',
      cls: "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      nodeId: "searxng",
      stepName: "SEARXNG · Free Privacy Metasearch",
      type: "TOOL",
      message: "Queried SearXNG multi-engine (Google, Bing, Reddit, ArXiv). 5 top URLs extracted.",
      latencyMs: 340,
      tokens: 180,
      outputSummary: "Found: ArXiv paper, Agent Hub GitHub, 3 research briefs",
      cls: "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      nodeId: "crawl4ai",
      stepName: "CRAWL4AI · Clean LLM Web Scraper",
      type: "TOOL",
      message: "Crawled 3 URLs in parallel. Extracted 4,200 words of structured markdown with ad removal.",
      latencyMs: 460,
      tokens: 380,
      outputSummary: "Clean markdown extracted (1,420 words of technical content)",
      cls: "text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-500/40 bg-teal-50 dark:bg-teal-950/20",
    },
    {
      nodeId: "scientist",
      stepName: "RESEARCH SCIENTIST · LLM Synthesis",
      type: "AGENT",
      message: "Analyzed multi-agent design patterns, token cost metrics, and supervisor-critic loops.",
      latencyMs: 620,
      tokens: 580,
      outputSummary: "Generated 4 structured report sections + executive takeaway",
      cls: "text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      nodeId: "gotenberg",
      stepName: "GOTENBERG · PDF Report Compilation",
      type: "TOOL",
      message: "Rendered styled 4-page PDF document via stateless Chromium engine.",
      latencyMs: 240,
      tokens: 120,
      outputSummary: "PDF Ready: /api/reports/deep-research-2026.pdf (4 pages)",
      cls: "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-950/20",
    },
  ],
};

// ────────────── PRESET 2: SUPERVISOR & CRITIC REFINEMENT LOOP ──────────────
const PRESET_SUPERVISOR_LOOP: BlueprintPreset = {
  id: "supervisor_loop",
  name: "Supervisor, Coder & HITL Approval",
  tagline: "Supervisor ⇄ Coder ➔ HITL Approval Gate ➔ Critic Verifier Loop",
  badge: "MULTI-AGENT LOOP",
  icon: GitFork,
  nodes: [
    {
      id: "start",
      label: "START",
      badge: "ENTRY",
      icon: CircleDot,
      sub: "feature: 'JWT Auth Guard'",
      snippet: 'repo: "agent-studio" · mode: "strict"',
      x: 30,
      y: 50,
      width: 170,
      height: 88,
      accentClass: "border-emerald-500/70 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-black/60",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
      prompt: "User Input payload validated against JSON schema.",
      outputPreview: '{\n  "feature": "JWT Auth Guard",\n  "repo": "agent-studio"\n}',
      latencyMs: 14,
      tokens: 42,
    },
    {
      id: "supervisor",
      label: "SUPERVISOR",
      badge: "ROUTER·LLM",
      icon: GitFork,
      sub: "Plan & orchestrate specialist agents",
      snippet: "plan: coder ➔ approval ➔ critic",
      x: 230,
      y: 50,
      width: 185,
      height: 94,
      accentClass: "border-violet-500/70 text-violet-600 dark:text-violet-400 bg-violet-50/70 dark:bg-black/60",
      badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/40",
      prompt: "You are the supervisor. Orchestrate: coder → approval → critic loop.",
      outputPreview: '{\n  "plan": ["code", "approval", "verify"],\n  "decision": "route_coder"\n}',
      latencyMs: 340,
      tokens: 280,
    },
    {
      id: "coder",
      label: "CODER AGENT",
      badge: "AGENT",
      icon: Code2,
      sub: "Generate clean TypeScript diff",
      snippet: "diff: export async function verifyToken...",
      x: 450,
      y: 50,
      width: 185,
      height: 94,
      accentClass: "border-indigo-500/70 text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-black/60",
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/40",
      prompt: "Implement JWT validation middleware with transient retry handling.",
      outputPreview: "+ export async function verifyToken(req) {\n+   return jwt.verify(req.headers.auth);\n+ }",
      latencyMs: 580,
      tokens: 490,
    },
    {
      id: "approval",
      label: "APPROVAL GATE",
      badge: "HITL·LOCK",
      icon: ShieldCheck,
      sub: "Single-use idempotency write token",
      snippet: "riskScore: 1.2 < 3.0 (AUTO_GRANTED)",
      x: 230,
      y: 220,
      width: 185,
      height: 94,
      accentClass: "border-amber-500/70 text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-black/60",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
      prompt: "Check write permissions. Action: write_code_diff. Auto-grant if safety risk < 3.",
      outputPreview: '{\n  "action": "write_diff",\n  "riskScore": 1.2,\n  "decision": "AUTO_GRANTED"\n}',
      latencyMs: 45,
      tokens: 65,
    },
    {
      id: "critic",
      label: "CRITIC VERIFIER",
      badge: "AGENT",
      icon: CheckCircle2,
      sub: "Static analysis & quality loop back",
      snippet: "syntax: valid · testScan: PASS",
      x: 450,
      y: 220,
      width: 185,
      height: 94,
      accentClass: "border-indigo-500/70 text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-black/60",
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/40",
      prompt: "Run linter and static verification on generated diff. Loop back if issues found.",
      outputPreview: '{\n  "syntaxValid": true,\n  "securityScan": "PASS",\n  "testsPass": true\n}',
      latencyMs: 290,
      tokens: 220,
    },
    {
      id: "end",
      label: "END",
      badge: "PR MERGE",
      icon: Flag,
      sub: "Synthesize final PR #412 artifact",
      snippet: "pullRequest: #412 Ready for merge",
      x: 670,
      y: 220,
      width: 160,
      height: 88,
      accentClass: "border-emerald-500/70 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-black/60",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
      prompt: "Synthesize all intermediate node artifacts into final auditable output.",
      outputPreview: '{\n  "status": "SUCCESS",\n  "pullRequest": "#412 Ready for merge",\n  "durationMs": 1820\n}',
      latencyMs: 22,
      tokens: 78,
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "supervisor" },
    { id: "e2", source: "supervisor", target: "coder", label: "diff plan" },
    { id: "e3", source: "coder", target: "approval", label: "check write" },
    { id: "e4", source: "approval", target: "critic", label: "review" },
    { id: "e5", source: "critic", target: "supervisor", label: "loop 1/2", loop: true },
    { id: "e6", source: "critic", target: "end", label: "accept", accept: true },
  ],
  traceSteps: [
    {
      nodeId: "start",
      stepName: "START · Feature Request",
      type: "START",
      message: "Received feature requirement for JWT validation guard.",
      latencyMs: 14,
      tokens: 42,
      outputSummary: 'Input: {"feature": "JWT Auth Guard"}',
      cls: "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      nodeId: "supervisor",
      stepName: "SUPERVISOR · Orchestration Plan",
      type: "ROUTER",
      message: "Generated 3-stage plan: Coder ➔ Approval Gate ➔ Critic Verification.",
      latencyMs: 340,
      tokens: 280,
      outputSummary: "Decision: Route to Coder Agent",
      cls: "text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-950/20",
    },
    {
      nodeId: "coder",
      stepName: "CODER · Unified Diff Implementation",
      type: "AGENT",
      message: "Synthesized 214 lines of TypeScript JWT middleware implementation.",
      latencyMs: 580,
      tokens: 490,
      outputSummary: "Generated: export async function verifyToken(req) { ... }",
      cls: "text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      nodeId: "approval",
      stepName: "APPROVAL · Safety Gate Checkpoint",
      type: "APPROVAL",
      message: "HITL Gate evaluation: Risk score 1.2 < threshold 3.0 → Auto-Granted.",
      latencyMs: 45,
      tokens: 65,
      outputSummary: "Security policy check PASSED with cryptographic token key",
      cls: "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20",
    },
    {
      nodeId: "critic",
      stepName: "CRITIC · Static Verification & Review",
      type: "AGENT",
      message: "Static verification PASS: 0 lint errors, 100% type safety.",
      latencyMs: 290,
      tokens: 220,
      outputSummary: "Review decision: ACCEPT → Transition to END",
      cls: "text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      nodeId: "end",
      stepName: "END · Final Report & Pull Request",
      type: "END",
      message: "Multi-agent run successfully finished in 1.8s (6 node visits).",
      latencyMs: 22,
      tokens: 78,
      outputSummary: "Ready for merge · Graph execution trace committed",
      cls: "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20",
    },
  ],
};

// ────────────── PRESET 3: DOCLING & QDRANT VECTOR MEMORY ──────────────
const PRESET_DOCLING_QDRANT: BlueprintPreset = {
  id: "docling_qdrant",
  name: "Docling PDF Intel & Qdrant RAG",
  tagline: "IBM Docling ➔ Intel Agent ➔ Qdrant Vector DB ➔ NocoDB Sync",
  badge: "DOCUMENT INTEL",
  icon: FileCheck,
  nodes: [
    {
      id: "start",
      label: "START",
      badge: "INGESTION",
      icon: CircleDot,
      sub: "docUrl: 'https://arxiv.org/pdf/transformer.pdf'",
      snippet: "document: transformer-paper.pdf",
      x: 30,
      y: 180,
      width: 175,
      height: 90,
      accentClass: "border-emerald-500/70 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-black/60",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
      prompt: "Receive PDF paper ingestion job with target collection name.",
      outputPreview: '{\n  "docUrl": "https://arxiv.org/pdf/transformer.pdf",\n  "collection": "research_papers"\n}',
      latencyMs: 15,
      tokens: 32,
    },
    {
      id: "docling",
      label: "IBM DOCLING",
      badge: "PDF·OCR",
      icon: FileCheck,
      sub: "Parse multi-column PDF, formulas & tables",
      snippet: "ocr: true · tables: markdown_grid",
      x: 235,
      y: 80,
      width: 215,
      height: 98,
      accentClass: "border-sky-500/70 text-sky-600 dark:text-sky-400 bg-sky-50/70 dark:bg-black/60",
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40",
      prompt: "Execute IBM Docling document parsing with OCR and formula preservation.",
      tool: "docling_pdf_parser (format=markdown)",
      outputPreview: '{\n  "markdown": "# Attention Is All You Need\\n\\nTable 1: BLEU scores...",\n  "tablesCount": 4\n}',
      latencyMs: 520,
      tokens: 420,
    },
    {
      id: "qdrant",
      label: "QDRANT VECTOR DB",
      badge: "VECTOR RAG",
      icon: BrainCircuit,
      sub: "Upsert semantic embeddings into collection",
      snippet: "collection: research_papers · dim: 1536",
      x: 235,
      y: 280,
      width: 215,
      height: 98,
      accentClass: "border-purple-500/70 text-purple-600 dark:text-purple-400 bg-purple-50/70 dark:bg-black/60",
      badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40",
      prompt: "Compute vector embeddings and store chunks into self-hosted Qdrant instance.",
      tool: "qdrant_vector_memory (upsert, topK=5)",
      outputPreview: '{\n  "upsertedPoints": 36,\n  "collection": "research_papers",\n  "status": "COMPLETED"\n}',
      latencyMs: 280,
      tokens: 210,
    },
    {
      id: "nocodb",
      label: "NOCODB RECORD",
      badge: "AIRTABLE·DB",
      icon: FileSpreadsheet,
      sub: "Insert metadata row into relational table",
      snippet: "table: LiteratureReview · op: create",
      x: 480,
      y: 180,
      width: 210,
      height: 98,
      accentClass: "border-blue-500/70 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-black/60",
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40",
      prompt: "Insert parsed paper metadata, BLEU benchmark metrics, and authors into NocoDB table.",
      tool: "nocodb_record (operation=create)",
      outputPreview: '{\n  "recordId": "rec_89123",\n  "title": "Attention Is All You Need",\n  "status": "INDEXED"\n}',
      latencyMs: 190,
      tokens: 95,
    },
    {
      id: "end",
      label: "END",
      badge: "COMPLETED",
      icon: Flag,
      sub: "Document indexed into semantic RAG",
      snippet: "status: SUCCESS · chunks: 36",
      x: 720,
      y: 180,
      width: 175,
      height: 88,
      accentClass: "border-emerald-500/70 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-black/60",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
      prompt: "Finish workflow and notify client of successful indexing.",
      outputPreview: '{\n  "status": "INDEXED",\n  "qdrantPoints": 36,\n  "nocoDbId": "rec_89123"\n}',
      latencyMs: 18,
      tokens: 45,
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "docling", label: "parse pdf" },
    { id: "e2", source: "docling", target: "qdrant", label: "chunks" },
    { id: "e3", source: "qdrant", target: "nocodb", label: "sync db" },
    { id: "e4", source: "nocodb", target: "end", label: "done" },
  ],
  traceSteps: [
    {
      nodeId: "start",
      stepName: "START · Document Ingestion",
      type: "START",
      message: "Ingestion job received for Transformer research paper.",
      latencyMs: 15,
      tokens: 32,
      outputSummary: 'docUrl: "https://arxiv.org/pdf/transformer.pdf"',
      cls: "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      nodeId: "docling",
      stepName: "IBM DOCLING · PDF Parsing",
      type: "TOOL",
      message: "Parsed 12-page research PDF with OCR into structured markdown & tables.",
      latencyMs: 520,
      tokens: 420,
      outputSummary: "Extracted 4 tables and 36 semantic content chunks",
      cls: "text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-950/20",
    },
    {
      nodeId: "qdrant",
      stepName: "QDRANT · Vector Memory Upsert",
      type: "TOOL",
      message: "Computed embeddings and saved 36 points into 'research_papers' collection.",
      latencyMs: 280,
      tokens: 210,
      outputSummary: "Upserted 36 dense vectors into Qdrant collection",
      cls: "text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/40 bg-purple-50 dark:bg-purple-950/20",
    },
    {
      nodeId: "nocodb",
      stepName: "NOCODB · Relational Database Sync",
      type: "TOOL",
      message: "Created relational row in self-hosted NocoDB 'LiteratureReview' table.",
      latencyMs: 190,
      tokens: 95,
      outputSummary: "Inserted row rec_89123 into NocoDB table",
      cls: "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      nodeId: "end",
      stepName: "END · Ingestion Complete",
      type: "END",
      message: "Document successfully indexed into semantic vector memory in 1.1s.",
      latencyMs: 18,
      tokens: 45,
      outputSummary: "Status: INDEXED · Vector recall enabled",
      cls: "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20",
    },
  ],
};

const BLUEPRINT_PRESETS: BlueprintPreset[] = [
  PRESET_DEEP_RESEARCH,
  PRESET_SUPERVISOR_LOOP,
  PRESET_DOCLING_QDRANT,
];

export function LiveAgentCanvasDemo() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const currentThemeKey = theme || resolvedTheme || "calm-green-dark";
  const { identity, appearance } = parseThemeKey(currentThemeKey);
  const isCalmGreen = mounted && identity === "calm-green";
  const isLight = mounted && appearance === "light";

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const currentPreset = BLUEPRINT_PRESETS[selectedPresetIndex];

  const [nodes, setNodes] = useState<DemoNodeDef[]>(currentPreset.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(currentPreset.nodes[1]?.id || currentPreset.nodes[0].id);
  const [activeTab, setActiveTab] = useState<"terminal" | "inspector" | "spec">("terminal");

  // Simulation execution state
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [logHistory, setLogHistory] = useState<DemoTraceStep[]>([]);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  // Canvas Pan and Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const terminalScrollRef = useRef<HTMLDivElement | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Switch preset
  const handleSelectPreset = (idx: number) => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    simTimerRef.current = null;
    setSelectedPresetIndex(idx);
    const preset = BLUEPRINT_PRESETS[idx];
    setNodes(preset.nodes);
    setSelectedNodeId(preset.nodes[1]?.id || preset.nodes[0].id);
    setPhase("idle");
    setCurrentStepIndex(-1);
    setLogHistory([]);
  };

  // Auto-scroll terminal log
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [logHistory]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  // Compute node status based on current simulation step
  const getNodeStatus = useCallback(
    (nodeId: string): NodeStatus => {
      if (phase === "idle" || currentStepIndex < 0) return "idle";
      const steps = currentPreset.traceSteps;
      const currentStep = steps[currentStepIndex];
      if (phase === "running" && currentStep?.nodeId === nodeId) {
        if (currentStep.type === "APPROVAL") return "awaiting";
        return "running";
      }
      const hasExecuted = steps.slice(0, currentStepIndex + 1).some((s) => s.nodeId === nodeId);
      return hasExecuted ? "done" : "idle";
    },
    [phase, currentStepIndex, currentPreset]
  );

  // Determine if an edge is active
  const isEdgeActive = useCallback(
    (edge: DemoEdgeLink): boolean => {
      if (phase === "idle" || currentStepIndex < 0) return false;
      const steps = currentPreset.traceSteps;
      const sourceIndex = steps.findIndex((s) => s.nodeId === edge.source);
      return sourceIndex !== -1 && currentStepIndex > sourceIndex;
    },
    [phase, currentStepIndex, currentPreset]
  );

  // Determine if an edge is currently pulsing data
  const isEdgeCurrent = useCallback(
    (edge: DemoEdgeLink): boolean => {
      if (phase !== "running" || currentStepIndex < 0) return false;
      const steps = currentPreset.traceSteps;
      const currentStep = steps[currentStepIndex];
      return currentStep?.nodeId === edge.target;
    },
    [phase, currentStepIndex, currentPreset]
  );

  // Start / Run Simulation
  const handleRunSimulation = (fastForward = false) => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    const steps = currentPreset.traceSteps;
    setPhase("running");
    setCurrentStepIndex(0);
    setLogHistory([steps[0]]);
    setSelectedNodeId(steps[0].nodeId);

    const intervalMs = fastForward ? 120 : Math.max(120, Math.round(750 / simSpeed));

    let step = 0;
    simTimerRef.current = setInterval(() => {
      step += 1;
      if (step < steps.length) {
        setCurrentStepIndex(step);
        setSelectedNodeId(steps[step].nodeId);
        setLogHistory((prev) => [...prev, steps[step]]);
      } else {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        simTimerRef.current = null;
        setPhase("done");
      }
    }, intervalMs);
  };

  // Step-by-Step advance
  const handleStepAdvance = () => {
    const steps = currentPreset.traceSteps;
    if (currentStepIndex >= steps.length - 1) {
      setPhase("done");
      return;
    }
    const nextStep = currentStepIndex + 1;
    setPhase("running");
    setCurrentStepIndex(nextStep);
    setSelectedNodeId(steps[nextStep].nodeId);
    setLogHistory((prev) => [...prev, steps[nextStep]]);
    if (nextStep === steps.length - 1) {
      setPhase("done");
    }
  };

  // Reset Simulation
  const handleResetSimulation = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    simTimerRef.current = null;
    setPhase("idle");
    setCurrentStepIndex(-1);
    setLogHistory([]);
  };

  // Non-passive wheel and middle-click listeners to prevent page scrolling while zooming or panning canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Strictly prevent browser page scrolling up/down when mouse wheel is turned over canvas
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        const newZoom = Math.max(0.5, Math.min(1.8, Number((prevZoom + delta).toFixed(2))));
        if (newZoom === prevZoom) return prevZoom;

        // Smoothly zoom centered on mouse pointer position
        setPan((prevPan) => {
          const scaleRatio = newZoom / prevZoom;
          return {
            x: Math.round(mouseX - (mouseX - prevPan.x) * scaleRatio),
            y: Math.round(mouseY - (mouseY - prevPan.y) * scaleRatio),
          };
        });

        return newZoom;
      });
    };

    // Prevent browser auto-scroll icon on Windows middle-mouse-click
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  // Canvas Pan Handlers (Left click or Middle mouse button)
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault(); // Stop Windows middle-click autoscroll
    }
    if ((e.button !== 0 && e.button !== 1) || draggingNodeId) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== draggingNodeId) return n;
          return {
            ...n,
            x: (e.clientX - dragOffsetRef.current.x - pan.x) / zoom,
            y: (e.clientY - dragOffsetRef.current.y - pan.y) / zoom,
          };
        })
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag Handler
  const handleNodeMouseDown = (e: React.MouseEvent, node: DemoNodeDef) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    dragOffsetRef.current = {
      x: e.clientX - (node.x * zoom + pan.x),
      y: e.clientY - (node.y * zoom + pan.y),
    };
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  return (
    <div
      className={clsx(
        "rounded-xl border shadow-2xl overflow-hidden backdrop-blur-md font-mono",
        isCalmGreen
          ? (isLight ? "border-[#D5DDD9] bg-white shadow-xl" : "border-[#24332c] bg-[#000000]")
          : "border-slate-300 dark:border-indigo-950 bg-white/90 dark:bg-[#080911]/95"
      )}
    >
      {/* Global CSS for animated glowing edge SVG lines */}
      <style jsx global>{`
        @keyframes edgeFlowSmooth {
          from {
            stroke-dashoffset: 28;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes edgePulseHalo {
          0%,
          100% {
            stroke-opacity: 0.25;
            stroke-width: 4;
          }
          50% {
            stroke-opacity: 0.7;
            stroke-width: 6.5;
          }
        }
        .edge-flowing-stream {
          stroke-dasharray: 8 6;
          animation: edgeFlowSmooth 0.75s linear infinite;
        }
        .edge-loop-stream {
          stroke-dasharray: 10 7;
          animation: edgeFlowSmooth 0.85s linear infinite;
        }
        .edge-halo-anim {
          animation: edgePulseHalo 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Preset Blueprint Switcher Header Bar */}
      <div
        className={clsx(
          "px-3 sm:px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 text-xs",
          isCalmGreen
            ? (isLight ? "bg-[#EAEEEC] border-[#D5DDD9]" : "bg-[#000000] border-[#24332c]")
            : "bg-slate-100/95 dark:bg-[#0a0f1e] border-slate-200 dark:border-indigo-950"
        )}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          <span
            className={clsx(
              "text-[10px] font-bold uppercase mr-1 hidden sm:inline",
              isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#8D9691]") : "text-slate-500"
            )}
          >
            PRESET BLUEPRINTS:
          </span>
          {BLUEPRINT_PRESETS.map((preset, idx) => {
            const isSelected = selectedPresetIndex === idx;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(idx)}
                className={clsx(
                  "px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  isSelected
                    ? isCalmGreen
                      ? (isLight ? "bg-[#4D8A73] text-white shadow-sm ring-1 ring-[#4D8A73]" : "bg-[#7FAF9B] text-[#000000] shadow-sm ring-1 ring-[#7FAF9B]")
                      : "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 ring-1 ring-indigo-400/50"
                    : isCalmGreen
                    ? (isLight
                        ? "border border-[#D5DDD9] bg-white text-[#3D4E47] hover:text-[#0E1411] hover:border-[#4D8A73]/40"
                        : "border border-[#252D2A] bg-[#000000] text-[#8D9691] hover:text-[#E7E9E5] hover:border-[#7FAF9B]/40")
                    : "border border-slate-300 dark:border-indigo-950/80 bg-white dark:bg-black/40 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                )}
              >
                <preset.icon className="h-3 w-3" />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* Speed, Heatmap & Ghost-Mode Toggles */}
        <div className="flex items-center gap-2">
          {/* Speed Buttons */}
          <div
            className={clsx(
              "flex items-center rounded border p-0.5 text-[9px] font-bold",
              isCalmGreen
                ? (isLight ? "border-[#D5DDD9] bg-white" : "border-[#252D2A] bg-[#000000]")
                : "border-slate-300 dark:border-indigo-950 bg-white dark:bg-black/50"
            )}
          >
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSimSpeed(s)}
                className={clsx(
                  "px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                  simSpeed === s
                    ? isCalmGreen
                      ? (isLight ? "bg-[#4D8A73] text-white" : "bg-[#7FAF9B] text-[#000000]")
                      : "bg-indigo-600 text-white"
                    : isCalmGreen
                    ? (isLight ? "text-[#5E7269] hover:text-[#0E1411]" : "text-[#8D9691] hover:text-[#E7E9E5]")
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            title="Toggle per-node latency heatmap mode"
            className={clsx(
              "px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase border transition-all cursor-pointer flex items-center gap-1",
              showHeatmap
                ? "border-amber-500 bg-amber-500/20 text-amber-300"
                : isCalmGreen
                ? (isLight
                    ? "border-[#D5DDD9] bg-white text-[#5E7269] hover:text-[#0E1411]"
                    : "border-[#252D2A] bg-[#000000] text-[#8D9691] hover:text-[#E7E9E5]")
                : "border-slate-300 dark:border-indigo-950 bg-white dark:bg-black/40 text-slate-500 hover:text-slate-300"
            )}
          >
            <Gauge className="h-3 w-3" />
            <span className="hidden sm:inline">HEATMAP</span>
          </button>

          {/* Step Button */}
          <button
            type="button"
            onClick={handleStepAdvance}
            title="Step-by-step debug"
            className={clsx(
              "px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase border transition-all cursor-pointer flex items-center gap-0.5",
              isCalmGreen
                ? (isLight
                    ? "border-[#D5DDD9] bg-white text-[#3D4E47] hover:text-[#0E1411] hover:border-[#4D8A73]/40"
                    : "border-[#252D2A] bg-[#000000] text-[#8D9691] hover:text-[#E7E9E5] hover:border-[#7FAF9B]/40")
                : "border border-slate-300 dark:border-indigo-900 bg-slate-50 dark:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
            )}
          >
            <span>STEP</span>
            <ChevronRight className="h-3 w-3" />
          </button>

          {/* Run / Reset Button */}
          {phase !== "running" ? (
            <button
              type="button"
              onClick={() => handleRunSimulation(false)}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold shadow-md transition-all cursor-pointer whitespace-nowrap",
                isCalmGreen
                  ? (isLight
                      ? "bg-[#4D8A73] hover:bg-[#3D7360] text-white shadow-sm"
                      : "bg-[#7FAF9B] hover:bg-[#9BC7B2] text-[#000000] shadow-sm")
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25"
              )}
            >
              <Play className="h-3 w-3 fill-current" /> <span>RUN SIM</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResetSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3 animate-spin" /> <span>RESET</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Split: Interactive Canvas (Left) + Telemetry & Node Inspector (Right) */}
      <div
        className={clsx(
          "grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x min-h-0",
          isCalmGreen
            ? (isLight ? "divide-[#D5DDD9]" : "divide-[#252D2A]")
            : "divide-slate-200 dark:divide-indigo-950/80"
        )}
      >
        {/* LEFT: Full Interactive Canvas (7 Cols) */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ overscrollBehavior: "contain" }}
          className={clsx(
            "lg:col-span-7 relative h-[380px] sm:h-[480px] lg:h-[540px] overflow-hidden select-none overscroll-contain",
            isCalmGreen
              ? (isLight
                  ? "bg-[#F4F6F5] bg-[radial-gradient(rgba(61,78,71,0.15)_1px,transparent_1px)] [background-size:20px_20px]"
                  : "bg-[#000000] bg-[radial-gradient(rgba(127,175,155,0.12)_1px,transparent_1px)] [background-size:20px_20px]")
              : "bg-slate-50/95 dark:bg-[#07070d] bg-[radial-gradient(rgba(99,102,241,0.18)_1px,transparent_1px)] [background-size:20px_20px]",
            isPanning ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {/* Top Canvas Status Bar */}
          <div className="absolute top-2.5 left-2.5 sm:left-3 right-2.5 sm:right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
            <div
              className={clsx(
                "flex items-center gap-1.5 sm:gap-2 rounded border px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] shadow-sm backdrop-blur-sm",
                isCalmGreen
                  ? (isLight ? "border-[#D5DDD9] bg-white/90" : "border-[#252D2A] bg-[#000000]/90")
                  : "border-slate-200 dark:border-indigo-900/40 bg-white/90 dark:bg-[#0a0f1e]/90"
              )}
            >
              <span
                className={clsx(
                  "inline-block h-2 w-2 rounded-full",
                  phase === "running"
                    ? (isCalmGreen ? (isLight ? "bg-[#4D8A73] animate-pulse" : "bg-[#7FAF9B] animate-pulse") : "bg-emerald-500 animate-pulse")
                    : phase === "done"
                    ? (isCalmGreen ? (isLight ? "bg-[#4D8A73]" : "bg-[#7FAF9B]") : "bg-emerald-500")
                    : "bg-slate-400"
                )}
              />
              <span
                className={clsx(
                  "font-bold",
                  isCalmGreen ? (isLight ? "text-[#0E1411]" : "text-[#E7E9E5]") : "text-slate-700 dark:text-slate-300"
                )}
              >
                {phase === "running"
                  ? "LIVE EXECUTION TRACE STREAMING"
                  : phase === "done"
                  ? "EXECUTION COMPLETED (SUCCESS)"
                  : "CANVAS READY · DRAG NODES TO MOVE"}
              </span>
            </div>

            <div
              className={clsx(
                "text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded border",
                isCalmGreen
                  ? (isLight ? "border-[#D5DDD9] bg-white/80 text-[#5E7269]" : "border-[#252D2A] bg-[#000000]/80 text-[#8D9691]")
                  : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-black/60 text-slate-500 dark:text-slate-400"
              )}
            >
              <span className="hidden sm:inline">Scroll to zoom · Pan canvas · Click node to inspect</span>
              <span className="sm:hidden">Zoom · Pan · Inspect</span>
            </div>
          </div>

          {/* Scaled & Translated Canvas Content Wrapper */}
          <div
            className="absolute inset-0 origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: "950px",
              height: "600px",
            }}
          >
            {/* Dynamic SVG Edges */}
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none"
              style={{ width: "950px", height: "600px" }}
              aria-hidden="true"
            >
              <defs>
                <filter id="edge-neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="packet-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                <marker
                  id="canvas-arrow-default"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={isCalmGreen ? (isLight ? "#5E7269" : "#8D9691") : "#94a3b8"} />
                </marker>
                <marker
                  id="canvas-arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={isCalmGreen ? (isLight ? "#4D8A73" : "#7FAF9B") : "#818cf8"} />
                </marker>
              </defs>

              {/* Render Smooth Bezier SVG Edges */}
              {currentPreset.edges.map((edge) => {
                const src = nodes.find((n) => n.id === edge.source);
                const tgt = nodes.find((n) => n.id === edge.target);
                if (!src || !tgt) return null;

                const active = isEdgeActive(edge);
                const isCurrent = isEdgeCurrent(edge);

                const sx = src.x + src.width;
                const sy = src.y + src.height / 2;
                const tx = tgt.x;
                const ty = tgt.y + tgt.height / 2;

                let pathD = "";
                if (edge.loop) {
                  // Upward return loop curve
                  const loopPeakY = Math.min(sy, ty) - 50;
                  pathD = `M ${sx} ${sy} C ${sx + 60} ${sy}, ${sx + 40} ${loopPeakY}, ${(sx + tx) / 2} ${loopPeakY} C ${tx - 40} ${loopPeakY}, ${tx - 60} ${ty}, ${tx} ${ty}`;
                } else {
                  // Standard smooth horizontal Bezier S-curve
                  const dx = Math.max(30, (tx - sx) / 2);
                  pathD = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
                }

                const baseColor = isCalmGreen ? (isLight ? "#D5DDD9" : "#252D2A") : "#475569";
                const activeColor = isCalmGreen
                  ? (edge.loop ? (isLight ? "#9A7A3A" : "#C7A96B") : (isLight ? "#4D8A73" : "#7FAF9B"))
                  : (edge.accept ? "#34d399" : edge.loop ? "#fbbf24" : "#818cf8");
                const markerId = active ? "url(#canvas-arrow-active)" : "url(#canvas-arrow-default)";

                return (
                  <g key={edge.id}>
                    {/* Layer 1: Base Edge Path */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={active ? activeColor : baseColor}
                      strokeWidth={active ? 2.5 : 1.5}
                      strokeOpacity={active ? 0.9 : 0.4}
                      markerEnd={markerId}
                    />

                    {/* Layer 2: Glowing Halo Aura on Active Traversal */}
                    {active && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth={isCurrent ? 6 : 3.5}
                        strokeOpacity={isCurrent ? 0.6 : 0.25}
                        filter="url(#edge-neon-glow)"
                        className={isCurrent ? "edge-halo-anim" : ""}
                      />
                    )}

                    {/* Layer 3: Smooth Animated Electric Dash Stream */}
                    {active && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth={isCurrent ? 2.5 : 2}
                        strokeLinecap="round"
                        className={edge.loop ? "edge-loop-stream" : "edge-flowing-stream"}
                      />
                    )}

                    {/* Layer 4: Realistic Traveling Energy Particle Packet */}
                    {(active || isCurrent) && phase === "running" && (
                      <g filter="url(#packet-glow)">
                        <circle r="5" fill={activeColor} opacity={0.4}>
                          <animateMotion
                            dur={edge.loop ? "1.4s" : "0.9s"}
                            repeatCount="indefinite"
                            path={pathD}
                            rotate="auto"
                          />
                        </circle>
                        <circle r="3" fill="#ffffff">
                          <animateMotion
                            dur={edge.loop ? "1.4s" : "0.9s"}
                            repeatCount="indefinite"
                            path={pathD}
                            rotate="auto"
                          />
                        </circle>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Draggable Real Canvas-Styled Nodes */}
            {nodes.map((node) => {
              const status = getNodeStatus(node.id);
              const isSelected = selectedNodeId === node.id;
              const showTarget = node.id !== "start";
              const showSource = node.id !== "end" && node.id !== "gotenberg";

              // Heatmap class
              const heatmapColor =
                showHeatmap && node.latencyMs > 400
                  ? "border-red-500/80 shadow-[0_0_18px_rgba(239,68,68,0.4)]"
                  : showHeatmap && node.latencyMs > 200
                  ? "border-amber-500/80 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                  : showHeatmap
                  ? "border-sky-500/80 shadow-[0_0_14px_rgba(56,189,248,0.3)]"
                  : "";

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                  }}
                  className={clsx(
                    "absolute z-10 rounded-xl border font-mono transition-all duration-150 cursor-grab active:cursor-grabbing select-none",
                    isCalmGreen
                      ? (isLight
                          ? "bg-white/95 backdrop-blur-md shadow-md text-[#0E1411] border-[#BEC9C4]"
                          : "bg-[#000000]/95 backdrop-blur-md shadow-md text-[#E7E9E5] border-[#24332c]")
                      : "bg-white/95 dark:bg-[#0c0d18]/95 backdrop-blur-md shadow-md",
                    isCalmGreen ? "" : node.accentClass,
                    heatmapColor,
                    isSelected
                      ? isCalmGreen
                        ? (isLight
                            ? "ring-2 ring-[#4D8A73] border-[#4D8A73] shadow-md scale-[1.02]"
                            : "ring-2 ring-[#7FAF9B] border-[#7FAF9B] shadow-lg shadow-black/40 scale-[1.02]")
                        : "ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.02]"
                      : "",
                    status === "running" &&
                      (isCalmGreen
                        ? (isLight
                            ? "ring-2 ring-[#4D8A73] border-[#4D8A73] shadow-[0_0_16px_rgba(77,138,115,0.4)] animate-pulse"
                            : "ring-2 ring-[#7FAF9B] border-[#7FAF9B] shadow-[0_0_16px_rgba(127,175,155,0.4)] animate-pulse")
                        : "ring-2 ring-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.55)] animate-pulse"),
                    status === "done" &&
                      (isCalmGreen
                        ? (isLight
                            ? "border-[#4D8A73] shadow-[0_0_10px_rgba(77,138,115,0.25)]"
                            : "border-[#7FAF9B] shadow-[0_0_10px_rgba(127,175,155,0.25)]")
                        : "border-emerald-500 dark:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]"),
                    status === "awaiting" && "border-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.45)] animate-pulse"
                  )}
                >
                  {/* Left Target Connection Handle */}
                  {showTarget && (
                    <span
                      className={clsx(
                        "absolute -left-[5px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white dark:border-black shadow-sm",
                        isCalmGreen ? (isLight ? "bg-[#3D6472]" : "bg-[#718A96]") : "bg-indigo-500 dark:bg-indigo-400"
                      )}
                    />
                  )}
                  {/* Right Source Connection Handle */}
                  {showSource && (
                    <span
                      className={clsx(
                        "absolute -right-[5px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white dark:border-black shadow-sm",
                        isCalmGreen ? (isLight ? "bg-[#4D8A73]" : "bg-[#7FAF9B]") : "bg-emerald-500 dark:bg-emerald-400"
                      )}
                    />
                  )}

                  <div className="p-2.5 space-y-1.5">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <node.icon className={clsx("h-3.5 w-3.5 shrink-0", isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "")} />
                        <span className="text-[10px] font-bold tracking-wider uppercase truncate">
                          {node.label}
                        </span>
                      </div>
                      <span
                        className={clsx(
                          "px-1.5 py-0.2 rounded border text-[7.5px] font-bold tracking-wider shrink-0 uppercase",
                          isCalmGreen
                            ? (isLight ? "bg-[#EAEEEC] text-[#4D8A73] border-[#D5DDD9]" : "bg-[#0a0e0c] text-[#7FAF9B] border-[#24332c]")
                            : node.badgeClass
                        )}
                      >
                        {node.badge}
                      </span>
                    </div>

                    {/* Parameter Snippet Preview */}
                    {node.snippet && (
                      <div
                        className={clsx(
                          "text-[8px] font-mono px-1.5 py-0.5 rounded truncate border",
                          isCalmGreen
                            ? (isLight ? "text-[#3D4E47] bg-[#EAEEEC] border-[#D5DDD9]" : "text-[#8D9691] bg-[#000000] border-[#24332c]")
                            : "text-indigo-600 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-900/30"
                        )}
                      >
                        {node.snippet}
                      </div>
                    )}

                    {/* Sub description */}
                    <p
                      className={clsx(
                        "text-[8px] leading-tight line-clamp-1",
                        isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#8D9691]") : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {node.sub}
                    </p>

                    {/* Live Telemetry Pill */}
                    <div
                      className={clsx(
                        "pt-0.5 flex items-center justify-between text-[7.5px] border-t font-mono",
                        isCalmGreen
                          ? (isLight ? "text-[#5E7269] border-[#D5DDD9]" : "text-[#626B66] border-[#252D2A]")
                          : "text-slate-400 border-slate-200/60 dark:border-indigo-950/60"
                      )}
                    >
                      <span>{node.latencyMs}ms</span>
                      <span>{node.tokens} tok</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Controls (Zoom, Reset) */}
          <div
            className={clsx(
              "absolute left-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-md shadow-md",
              isCalmGreen
                ? (isLight ? "border border-[#D5DDD9] bg-white/95" : "border border-[#252D2A] bg-[#000000]/95")
                : "border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-[#0b0b12]/95"
            )}
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
              className={clsx(
                "flex h-7 w-7 items-center justify-center transition-colors cursor-pointer",
                isCalmGreen
                  ? (isLight ? "border-b border-[#D5DDD9] text-[#5E7269] hover:text-[#0E1411] hover:bg-[#EAEEEC]" : "border-b border-[#252D2A] text-[#8D9691] hover:text-[#E7E9E5] hover:bg-[#0a0e0c]")
                  : "border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
              className={clsx(
                "flex h-7 w-7 items-center justify-center transition-colors cursor-pointer",
                isCalmGreen
                  ? (isLight ? "border-b border-[#D5DDD9] text-[#5E7269] hover:text-[#0E1411] hover:bg-[#EAEEEC]" : "border-b border-[#252D2A] text-[#8D9691] hover:text-[#E7E9E5] hover:bg-[#0a0e0c]")
                  : "border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              )}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Reset View"
              className={clsx(
                "flex h-7 w-7 items-center justify-center transition-colors cursor-pointer",
                isCalmGreen
                  ? (isLight ? "text-[#5E7269] hover:text-[#0E1411] hover:bg-[#EAEEEC]" : "text-[#8D9691] hover:text-[#E7E9E5] hover:bg-[#0a0e0c]")
                  : "text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* MiniMap Viewport Preview */}
          <div
            className={clsx(
              "absolute right-3 bottom-3 z-20 h-20 w-32 rounded-md p-1.5 shadow-md hidden sm:block",
              isCalmGreen
                ? (isLight ? "border border-[#D5DDD9] bg-white/95" : "border border-[#252D2A] bg-[#000000]/95")
                : "border border-slate-300 dark:border-slate-700/80 bg-white/95 dark:bg-[#0b0b12]/95"
            )}
          >
            <div
              className={clsx(
                "text-[7px] uppercase font-bold tracking-widest mb-1 flex items-center justify-between",
                isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#8D9691]") : "text-slate-400"
              )}
            >
              <span>MINIMAP</span>
              <span>{(zoom * 100).toFixed(0)}%</span>
            </div>
            <svg viewBox="0 0 950 500" className="h-12 w-full" aria-hidden="true">
              {nodes.map((n) => {
                const s = getNodeStatus(n.id);
                const fill = isCalmGreen
                  ? (s === "running" ? (isLight ? "#4D8A73" : "#7FAF9B") : s === "done" ? (isLight ? "#4D8A73" : "#7FAF9B") : (isLight ? "#D5DDD9" : "#252D2A"))
                  : (s === "running" ? "#818cf8" : s === "done" ? "#34d399" : "#64748b");
                return (
                  <rect
                    key={n.id}
                    x={n.x}
                    y={n.y}
                    width={n.width}
                    height={n.height}
                    rx={6}
                    fill={fill}
                    opacity={selectedNodeId === n.id ? 1 : 0.7}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* RIGHT: Live Execution Terminal & Node Inspector Panel (5 Cols) */}
        <div
          className={clsx(
            "lg:col-span-5 flex flex-col h-[420px] sm:h-[480px] lg:h-[540px] font-mono",
            isCalmGreen ? (isLight ? "bg-white" : "bg-[#000000]") : "bg-white dark:bg-[#0a0a0f]"
          )}
        >
          {/* Panel Header with Switchable Tabs */}
          <div
            className={clsx(
              "flex items-center justify-between border-b px-3 py-2 text-xs",
              isCalmGreen
                ? (isLight ? "border-[#D5DDD9] bg-[#EAEEEC]" : "border-[#24332c] bg-[#000000]")
                : "border-slate-200 dark:border-indigo-950 bg-slate-50 dark:bg-[#0a0f1e]/60"
            )}
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("terminal")}
                className={clsx(
                  "px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1",
                  activeTab === "terminal"
                    ? isCalmGreen
                      ? (isLight ? "bg-[#4D8A73] text-white shadow-sm" : "bg-[#7FAF9B] text-[#000000] shadow-sm")
                      : "bg-indigo-600 text-white shadow-sm"
                    : isCalmGreen
                    ? (isLight ? "text-[#5E7269] hover:text-[#0E1411]" : "text-[#8D9691] hover:text-[#E7E9E5]")
                    : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                )}
              >
                <Terminal className="h-3 w-3" />
                <span>TRACE STREAM</span>
                {phase === "running" && (
                  <span
                    className={clsx(
                      "h-1.5 w-1.5 rounded-full animate-ping",
                      isCalmGreen ? (isLight ? "bg-white" : "bg-[#000000]") : "bg-emerald-400"
                    )}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("inspector")}
                className={clsx(
                  "px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1",
                  activeTab === "inspector"
                    ? isCalmGreen
                      ? (isLight ? "bg-[#4D8A73] text-white shadow-sm" : "bg-[#7FAF9B] text-[#000000] shadow-sm")
                      : "bg-indigo-600 text-white shadow-sm"
                    : isCalmGreen
                    ? (isLight ? "text-[#5E7269] hover:text-[#0E1411]" : "text-[#8D9691] hover:text-[#E7E9E5]")
                    : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                )}
              >
                <Cpu className="h-3 w-3" />
                <span>NODE INSPECTOR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("spec")}
                className={clsx(
                  "px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1",
                  activeTab === "spec"
                    ? isCalmGreen
                      ? (isLight ? "bg-[#4D8A73] text-white shadow-sm" : "bg-[#7FAF9B] text-[#000000] shadow-sm")
                      : "bg-indigo-600 text-white shadow-sm"
                    : isCalmGreen
                    ? (isLight ? "text-[#5E7269] hover:text-[#0E1411]" : "text-[#8D9691] hover:text-[#E7E9E5]")
                    : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                )}
              >
                <Layers className="h-3 w-3" />
                <span>BLUEPRINT SPEC</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Real-time Execution Trace & Terminal Log */}
          {activeTab === "terminal" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div
                ref={terminalScrollRef}
                className={clsx(
                  "flex-1 p-3 overflow-y-auto space-y-2 font-mono text-[10px] leading-relaxed",
                  isCalmGreen
                    ? (isLight ? "bg-[#F4F6F5] text-[#0E1411]" : "bg-[#000000] text-[#E7E9E5]")
                    : "bg-slate-900 text-slate-200 dark:bg-black/70"
                )}
              >
                {logHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Terminal
                      className={clsx(
                        "h-8 w-8 animate-pulse",
                        isCalmGreen ? (isLight ? "text-[#4D8A73]/70" : "text-[#7FAF9B]/60") : "text-indigo-400/60"
                      )}
                    />
                    <p className={clsx("font-semibold", isCalmGreen ? (isLight ? "text-[#0E1411]" : "text-[#E7E9E5]") : "text-slate-400")}>
                      Execution Telemetry Stream Idle
                    </p>
                    <p className={clsx("text-[9px] max-w-xs", isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#8D9691]") : "text-slate-500")}>
                      Press{" "}
                      <span className={clsx("font-bold", isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-emerald-400")}>
                        [ RUN SIM ]
                      </span>{" "}
                      to trace real-time execution across the canvas.
                    </p>
                  </div>
                ) : (
                  logHistory.map((step, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        "p-2.5 rounded border transition-all duration-150 space-y-1",
                        isCalmGreen
                          ? (isLight ? "border-[#D5DDD9] bg-white text-[#0E1411]" : "border-[#24332c] bg-[#000000] text-[#E7E9E5]")
                          : step.cls
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold tracking-wider uppercase flex items-center gap-1.5">
                          <span
                            className={clsx(
                              "h-1.5 w-1.5 rounded-full inline-block",
                              isCalmGreen ? (isLight ? "bg-[#4D8A73]" : "bg-[#7FAF9B]") : "bg-current"
                            )}
                          />
                          {step.stepName}
                        </span>
                        <span className="text-[9px] font-mono opacity-80 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          +{step.latencyMs}ms
                        </span>
                      </div>
                      <p className="text-[9px] opacity-90">{step.message}</p>
                      {step.outputSummary && (
                        <div className="pt-1 text-[8px] font-mono opacity-75 truncate border-t border-current/20">
                          {step.outputSummary}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Execution Summary Metrics Strip */}
              <div
                className={clsx(
                  "p-3 border-t grid grid-cols-4 gap-2 text-center text-[9px] font-mono",
                  isCalmGreen
                    ? (isLight ? "border-[#D5DDD9] bg-[#EAEEEC]" : "border-[#24332c] bg-[#000000]")
                    : "border-slate-200 dark:border-indigo-950 bg-slate-50 dark:bg-[#0a0f1e]/80"
                )}
              >
                <div>
                  <div className={clsx("text-[8px]", isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#626B66]") : "text-slate-400")}>
                    TOTAL TIME
                  </div>
                  <div
                    className={clsx(
                      "font-bold font-mono",
                      isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    {phase === "running" ? `${((currentStepIndex + 1) * 0.28).toFixed(1)}s` : phase === "done" ? "1.8s" : "0.0s"}
                  </div>
                </div>
                <div>
                  <div className={clsx("text-[8px]", isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#626B66]") : "text-slate-400")}>
                    STEPS RUN
                  </div>
                  <div className={clsx("font-bold", isCalmGreen ? (isLight ? "text-[#0E1411]" : "text-[#E7E9E5]") : "text-slate-800 dark:text-slate-200")}>
                    {Math.max(0, currentStepIndex + 1)}/{currentPreset.traceSteps.length}
                  </div>
                </div>
                <div>
                  <div className={clsx("text-[8px]", isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#626B66]") : "text-slate-400")}>
                    ACTIVE NODES
                  </div>
                  <div className={clsx("font-bold", isCalmGreen ? (isLight ? "text-[#9A7A3A]" : "text-[#C7A96B]") : "text-amber-600 dark:text-amber-400")}>
                    {nodes.length}
                  </div>
                </div>
                <div>
                  <div className={clsx("text-[8px]", isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#626B66]") : "text-slate-400")}>
                    TOTAL TOKENS
                  </div>
                  <div className={clsx("font-bold", isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-emerald-600 dark:text-emerald-400")}>
                    {logHistory.reduce((sum, s) => sum + s.tokens, 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Selected Node Inspector */}
          {activeTab === "inspector" && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs">
              <div
                className={clsx(
                  "flex items-center justify-between pb-2 border-b",
                  isCalmGreen ? (isLight ? "border-[#D5DDD9]" : "border-[#252D2A]") : "border-slate-200 dark:border-indigo-950"
                )}
              >
                <div className="flex items-center gap-2">
                  <selectedNode.icon
                    className={clsx(
                      "h-4 w-4",
                      isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-indigo-600 dark:text-indigo-400"
                    )}
                  />
                  <span
                    className={clsx(
                      "font-bold uppercase tracking-wider",
                      isCalmGreen ? (isLight ? "text-[#0E1411]" : "text-[#E7E9E5]") : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {selectedNode.label}
                  </span>
                </div>
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded border text-[9px] font-bold uppercase",
                    isCalmGreen
                      ? (isLight ? "border-[#D5DDD9] bg-[#EAEEEC] text-[#4D8A73]" : "border-[#24332c] bg-[#0a0e0c] text-[#7FAF9B]")
                      : selectedNode.badgeClass
                  )}
                >
                  {selectedNode.badge}
                </span>
              </div>

              <div className="space-y-1">
                <div
                  className={clsx(
                    "text-[9px] uppercase tracking-widest font-bold",
                    isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-indigo-600 dark:text-indigo-400"
                  )}
                >
                  PROMPT / DIRECTIVE TEMPLATE
                </div>
                <div
                  className={clsx(
                    "p-2.5 rounded border text-[10px] leading-relaxed",
                    isCalmGreen
                      ? (isLight ? "border-[#D5DDD9] bg-[#F4F6F5] text-[#0E1411]" : "border-[#24332c] bg-[#000000] text-[#E7E9E5]")
                      : "border-slate-200 dark:border-indigo-900/50 bg-slate-50 dark:bg-black/60 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {selectedNode.prompt}
                </div>
              </div>

              {selectedNode.tool && (
                <div className="space-y-1">
                  <div
                    className={clsx(
                      "text-[9px] uppercase tracking-widest font-bold",
                      isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-indigo-600 dark:text-indigo-400"
                    )}
                  >
                    ATTACHED MICROSERVICE / TOOL
                  </div>
                  <div
                    className={clsx(
                      "p-2 rounded border text-[10px] font-bold flex items-center gap-1.5",
                      isCalmGreen
                        ? (isLight ? "border-[#D5DDD9] bg-[#EAEEEC] text-[#4D8A73]" : "border-[#24332c] bg-[#0a0e0c] text-[#7FAF9B]")
                        : "border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {selectedNode.tool}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div
                  className={clsx(
                    "text-[9px] uppercase tracking-widest font-bold",
                    isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-indigo-600 dark:text-indigo-400"
                  )}
                >
                  LIVE OUTPUT JSON ARTIFACT
                </div>
                <pre
                  className={clsx(
                    "p-2.5 rounded border text-[9px] overflow-x-auto whitespace-pre font-mono",
                    isCalmGreen
                      ? (isLight ? "border-[#D5DDD9] bg-[#F4F6F5] text-[#0E1411]" : "border-[#24332c] bg-[#000000] text-[#E7E9E5]")
                      : "border-slate-200 dark:border-indigo-900/50 bg-slate-900 text-slate-200 dark:bg-black"
                  )}
                >
                  {selectedNode.outputPreview}
                </pre>
              </div>

              <div className={clsx("pt-2 text-[9px]", isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#626B66]") : "text-slate-500")}>
                Click any node on the left canvas to inspect its configuration and runtime telemetry.
              </div>
            </div>
          )}

          {/* TAB 3: Blueprint Specifications */}
          {activeTab === "spec" && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-[11px] leading-relaxed">
              <div
                className={clsx(
                  "text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 pb-2 border-b",
                  isCalmGreen
                    ? (isLight ? "text-[#4D8A73] border-[#D5DDD9]" : "text-[#7FAF9B] border-[#252D2A]")
                    : "text-indigo-700 dark:text-indigo-400 border-slate-200 dark:border-indigo-950"
                )}
              >
                <MousePointerClick className="h-3.5 w-3.5" /> {currentPreset.name.toUpperCase()} SPEC
              </div>
              <p
                className={clsx(
                  "text-[10px]",
                  isCalmGreen ? (isLight ? "text-[#3D4E47]" : "text-[#8D9691]") : "text-slate-600 dark:text-slate-400"
                )}
              >
                {currentPreset.tagline}
              </p>

              <div
                className={clsx(
                  "pt-2 border-t",
                  isCalmGreen ? (isLight ? "border-[#D5DDD9]" : "border-[#252D2A]") : "border-slate-200 dark:border-indigo-950"
                )}
              >
                <div
                  className={clsx(
                    "text-[9px] uppercase tracking-wider mb-2 font-bold",
                    isCalmGreen ? (isLight ? "text-[#5E7269]" : "text-[#8D9691]") : "text-slate-500"
                  )}
                >
                  NODES IN THIS GRAPH:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {nodes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(n.id);
                        setActiveTab("inspector");
                      }}
                      className={clsx(
                        "px-2 py-0.5 rounded border text-[8px] font-bold uppercase transition-all cursor-pointer",
                        selectedNodeId === n.id
                          ? isCalmGreen
                            ? (isLight ? "border-[#4D8A73] bg-[#4D8A73] text-white" : "border-[#7FAF9B] bg-[#7FAF9B] text-[#000000]")
                            : "border-indigo-500 bg-indigo-600 text-white"
                          : isCalmGreen
                          ? (isLight
                              ? "border-[#D5DDD9] bg-white text-[#3D4E47] hover:text-[#0E1411]"
                              : "border-[#24332c] bg-[#000000] text-[#8D9691] hover:text-[#E7E9E5]")
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                      )}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom SSE Stream Status Strip */}
      <div
        className={clsx(
          "px-4 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono",
          isCalmGreen
            ? (isLight ? "border-[#D5DDD9] bg-[#EAEEEC] text-[#3D4E47]" : "border-[#24332c] bg-[#000000] text-[#8D9691]")
            : "border-slate-200 dark:border-indigo-950 bg-slate-100 dark:bg-[#07070d] text-slate-600 dark:text-slate-400"
        )}
      >
        <span className="flex items-center gap-1.5">
          <Radio
            className={clsx(
              "h-3 w-3",
              phase === "running"
                ? (isCalmGreen ? (isLight ? "text-[#4D8A73] animate-pulse" : "text-[#7FAF9B] animate-pulse") : "text-emerald-500 animate-pulse")
                : "text-slate-400"
            )}
          />
          <span>SSE TRACE ENGINE: {phase === "running" ? "ACTIVE STREAM (120ms TICK)" : phase === "done" ? "COMPLETED" : "IDLE"}</span>
        </span>
        <span className="flex items-center gap-2">
          <span>NODES: {nodes.length}</span>
          <span>·</span>
          <span>EDGES: {currentPreset.edges.length}</span>
          <span>·</span>
          <span
            className={clsx(
              "font-bold",
              isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-indigo-600 dark:text-indigo-400"
            )}
          >
            ENGINE: V2 GRAPH RUNTIME
          </span>
        </span>
      </div>
    </div>
  );
}
