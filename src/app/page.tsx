import React from "react";
import Link from "next/link";
import {
  Check,
  GitCompare,
  Lock,
  Database,
  Zap,
  ChevronDown,
  RefreshCw,
  Braces,
  Activity,
  Search,
  Workflow,
  Cpu,
  Layers,
  Boxes,
  Eye,
  Gauge,
  TimerReset,
  Wallet,
  LayoutTemplate,
  Palette,
  Link2,
  Network,
  Globe,
  Sparkles,
  HardDrive,
  FileCheck,
  BrainCircuit,
  Terminal,
} from "lucide-react";

import dynamic from "next/dynamic";
import { Reveal } from "@/components/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Accordion } from "@/components/ui/Accordion";
import {
  N8nOfficialLogo,
  DifyOfficialLogo,
  SmitheryOfficialLogo,
} from "@/components/common/BrandLogos";
import { canvasNodeCategories } from "@/components/landing/data/canvasNodes";

// Lazy-loaded client components
const LiveAgentCanvasDemo = dynamic(() =>
  import("@/components/landing/LiveAgentCanvasDemo").then((m) => m.LiveAgentCanvasDemo)
);
const FooterPortfolioWidget = dynamic(() =>
  import("@/components/landing/FooterPortfolioWidget").then((m) => m.FooterPortfolioWidget)
);
const HeroAuthSection = dynamic(() =>
  import("@/components/landing/HeroAuthSection").then((m) => m.HeroAuthSection)
);
const FooterAuthCTA = dynamic(() =>
  import("@/components/landing/HeroAuthSection").then((m) => m.FooterAuthCTA)
);

// ────────────── Data ──────────────
const openSourcePillars = [
  {
    title: "SearXNG Metasearch",
    badge: "100% FREE SEARCH",
    icon: Search,
    accent: "text-emerald-600 dark:text-emerald-400",
    chipBg: "bg-emerald-50 dark:bg-emerald-950/40",
    desc: "Privacy-first metasearch querying Google, Bing, Reddit, DuckDuckGo and ArXiv concurrently with zero API keys or rate-limit paywalls.",
    useCase: "Autonomous research, live news monitoring, fact-checking, CVE vulnerability discovery.",
  },
  {
    title: "Crawl4AI Web Scraper",
    badge: "AI-NATIVE MARKDOWN",
    icon: Sparkles,
    accent: "text-teal-600 dark:text-teal-400",
    chipBg: "bg-teal-50 dark:bg-teal-950/40",
    desc: "Blazing fast open-source crawler that extracts clean, structured markdown with noise/ad removal and token-efficient formatting.",
    useCase: "Deep web extraction, documentation ingestion, competitive pricing intelligence.",
  },
  {
    title: "IBM Docling Parser",
    badge: "PDF & TABLE OCR",
    icon: FileCheck,
    accent: "text-sky-600 dark:text-sky-400",
    chipBg: "bg-sky-50 dark:bg-sky-950/40",
    desc: "Enterprise document parsing engine by IBM Research that turns complex research PDFs, multi-column papers, and tables into markdown.",
    useCase: "Scientific paper analysis, financial report extraction, compliance PDF audits.",
  },
  {
    title: "Gotenberg PDF Exporter",
    badge: "STATELESS PDF ENGINE",
    icon: HardDrive,
    accent: "text-blue-600 dark:text-blue-400",
    chipBg: "bg-blue-50 dark:bg-blue-950/40",
    desc: "Stateless microservice that renders agent-generated Markdown, HTML, and LaTeX into publication-ready PDF documents on demand.",
    useCase: "Executive memos, automated client invoices, weekly research dossiers.",
  },
  {
    title: "Qdrant Vector Memory",
    badge: "OPEN-SOURCE RAG",
    icon: BrainCircuit,
    accent: "text-purple-600 dark:text-purple-400",
    chipBg: "bg-purple-50 dark:bg-purple-950/40",
    desc: "High-performance vector similarity search engine powering long-term conversational memory and semantic knowledge retrieval.",
    useCase: "Episodic agent memory, large knowledge base lookup, contextual grounded reasoning.",
  },
  {
    title: "PocketBase & NocoDB",
    badge: "OPEN STATE DB",
    icon: Database,
    accent: "text-amber-600 dark:text-amber-400",
    chipBg: "bg-amber-50 dark:bg-amber-950/40",
    desc: "PocketBase provides single-file SQLite state persistence; NocoDB provides smart relational Airtable-style spreadsheet APIs.",
    useCase: "Execution checkpoint logs, lead database sync, structured audit registers.",
  },
];

const comparisonRows = [
  { feature: "Multi-Agent Supervisor & Critic Loops", studio: "Native Visual Canvas (Drag-and-Drop)", n8n: "Linear DAG only (No multi-agent loops)", dify: "Limited multi-agent (Primarily single agent)", langflow: "Complex low-level code nodes" },
  { feature: "Zero-Key Open-Source Tools Built-in", studio: "SearXNG, Crawl4AI, Docling, Gotenberg, Qdrant", n8n: "Requires paid external API keys", dify: "Limited built-in tools", langflow: "Manual Python wrapper coding required" },
  { feature: "Template Ecosystem Compatibility", studio: "11.6k+ n8n + 290+ Dify + 136k+ MCP", n8n: "n8n only", dify: "Dify only", langflow: "Langflow only" },
  { feature: "Model Context Protocol (MCP) Hub", studio: "Full Client & Server (136k+ servers)", n8n: "Community node add-ons only", dify: "No native MCP protocol support", langflow: "Custom tool scripts only" },
  { feature: "HITL Write Locks & Idempotency", studio: "Single-Use Database Tokens & Explainer", n8n: "Generic webhook wait (No idempotency lock)", dify: "Basic user input pause", langflow: "No native human approval lock" },
  { feature: "Real-Time Observability & Heatmaps", studio: "Live SSE Glow + Latency Heatmap + Replay", n8n: "Static step logs after completion", dify: "Basic streaming logs", langflow: "Text console output" },
  { feature: "Free LLM Auto-Failover Router", studio: "28+ Free Models across 8 Tiers with Auto-Routing", n8n: "Single API key failure terminates run", dify: "Manual fallback provider config", langflow: "Manual exception handling in Python" },
];

const llmEngineMetrics = [
  { value: "28+", label: "FREE PRODUCTION MODELS", detail: "Zero-cost multi-provider catalog with automated circuit-breaker failover", badge: "100% FREE", accent: "text-indigo-600 dark:text-indigo-400", chipBg: "bg-indigo-50 dark:bg-indigo-950/40", icon: Cpu },
  { value: "512K", label: "MAX CONTEXT TOKENS", detail: "Deep document ingestion and long-chain execution traces per prompt", badge: "LONG CONTEXT", accent: "text-purple-600 dark:text-purple-400", chipBg: "bg-purple-50 dark:bg-purple-950/40", icon: Layers },
  { value: "750 t/s", label: "PEAK GENERATION SPEED", detail: "Ultra-fast streaming for real-time agent loops & supervisor routing decisions", badge: "LIGHTNING FAST", accent: "text-emerald-600 dark:text-emerald-400", chipBg: "bg-emerald-50 dark:bg-emerald-950/40", icon: Zap },
  { value: "8", label: "SPECIALIZED AI DOMAINS", detail: "Reasoning, code, vision OCR, embeddings, TTS, audio & safety guardrails", badge: "FULL SPECTRUM", accent: "text-sky-600 dark:text-sky-400", chipBg: "bg-sky-50 dark:bg-sky-950/40", icon: Sparkles },
  { value: "<300ms", label: "SUB-SECOND TTFT LATENCY", detail: "Near-zero initial turn delay for interactive, responsive agent loops", badge: "LOW LATENCY", accent: "text-amber-600 dark:text-amber-400", chipBg: "bg-amber-50 dark:bg-amber-950/40", icon: Gauge },
  { value: "$0.00", label: "TOKEN EXPENSE PER CALL", detail: "Automatic fallback to free tiers with zero subscription or billing risk", badge: "$0 FOREVER", accent: "text-teal-600 dark:text-teal-400", chipBg: "bg-teal-50 dark:bg-teal-950/40", icon: Wallet },
];

const modelCategoryCounts = [
  { category: "REASONING & SUPERVISOR", count: "6 MODELS", specs: "Up to 262k context · Multi-step logic & self-reflection loops", color: "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40" },
  { category: "CODE SYNTHESIS & SCRIPTING", count: "4 MODELS", specs: "256k context · TypeScript, Python, JSON schema & SQL", color: "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40" },
  { category: "HIGH-THROUGHPUT DISPATCH", count: "5 MODELS", specs: "Up to 750 t/s · Ultra-fast edge routing & triage turns", color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40" },
  { category: "VISION & MULTIMODAL OCR", count: "3 MODELS", specs: "128k context · UI screenshots, diagrams, papers & charts", color: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/40" },
  { category: "VECTOR EMBEDDING & MEMORY", count: "4 MODELS", specs: "Dense semantic embeddings for Qdrant long-term memory", color: "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40" },
  { category: "VOICE, AUDIO & SPEECH AI", count: "3 MODELS", specs: "Streaming STT transcription & natural neural TTS synthesis", color: "text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/30 border-pink-100 dark:border-pink-900/40" },
  { category: "CONTENT SAFETY & GUARDRAILS", count: "2 MODELS", specs: "Sub-260ms policy enforcement & output validation gates", color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40" },
  { category: "DYNAMIC AUTO-FREE ROUTER", count: "1 DYNAMIC", specs: "openrouter/free dynamically routes to the healthiest capacity", color: "text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900/40" },
];

const devTooling = [
  { icon: Network, title: "136,500+ MCP Servers & Skills", desc: "Connect remote SSE and stdio Model Context Protocol servers (GitHub, Postgres, Slack, Brave) or expose Agent Hub workflows as MCP tools to Cursor & Claude." },
  { icon: Workflow, title: "11,600+ n8n Workflow Library", desc: "Browse and import community n8n workflows directly into visual Agent Hub graphs with automatic node and parameter translation." },
  { icon: Sparkles, title: "290+ Dify.ai AI Blueprints", desc: "Import Dify.ai DSL YAML and workflow templates directly into multi-agent canvas graphs with 1-click execution." },
  { icon: Globe, title: "2,500+ OpenAPI & REST Tool Hub", desc: "Browse public APIs (Google, Stripe, Azure, AWS, GitHub) from APIs.guru, install 1-click free tool packs, or import any Swagger/OpenAPI URL." },
  { icon: LayoutTemplate, title: "Auto-Layout & Snap Grid", desc: "One click runs layered BFS auto-layout over any hand-built graph, with snap-to-grid guides so complex multi-agent designs stay immaculate." },
  { icon: Braces, title: "Monaco Prompt Editor & AI Optimizer", desc: "Monaco prompt editor with {{ results.node.field }} autocomplete, live token-count feedback, and 1-click AI prompt prompt engineering." },
  { icon: GitCompare, title: "Visual Version Diffing", desc: "Side-by-side visual diff of two graph versions — nodes added/removed, edges rerouted — with instant one-click rollback." },
  { icon: Boxes, title: "Sub-Graphs & Macros", desc: "Collapse any complex agent branch into a reusable component node with typed inputs and outputs — nest graphs up to 8 levels deep." },
  { icon: Palette, title: "Persisted Canvas Themes", desc: "Neon/cyberpunk default, graphite minimal, and high-contrast themes — persisted per user with full responsive dark-mode support." },
  { icon: Link2, title: "Shareable Read-Only Snapshots", desc: "Render any graph and its live trace as an embeddable, read-only snapshot link — perfect for documentation, PR reviews, or Slack." },
  { icon: Terminal, title: "Deterministic Step Replay", desc: "Persist every step response and replay past executions with exact recorded outputs for non-LLM nodes to quickly debug logic branches." },
  { icon: Eye, title: "Ghost-Mode Dry-Run Preview", desc: "Run the interpreter in fast-forward dry-run against live state — nodes illuminate showing exactly what would happen with zero token spend." },
];

const faqItems = [
  { id: "faq-1", question: "How does the Open-Source & Zero-Key Stack work?", answer: "Agent Hub embeds native connectors for SearXNG (privacy metasearch), Crawl4AI (LLM-friendly scraper), IBM Docling (PDF/table parser), Gotenberg (PDF exporter), Qdrant (vector database), and PocketBase/NocoDB (SQLite & Airtable). These tools can run against public instances with zero API keys or against your self-hosted Docker containers with zero subscription costs." },
  { id: "faq-2", question: "How do n8n and Dify.ai workflow imports work?", answer: "Agent Hub includes universal converters in /lib/converters that translate n8n JSON nodes and Dify DSL YAML workflows into native Agent Hub visual graph nodes. You can browse over 11,600 n8n workflows and 290 Dify blueprints in our Unified Marketplace and launch them with 1 click." },
  { id: "faq-3", question: "How does Model Context Protocol (MCP) integration work?", answer: "Agent Hub is a full dual-mode MCP Client and MCP Server. As a client, it searches 136,500+ MCP servers across Smithery, Glama, Composio, Arcade, and mcp.so and mounts them into agent graphs. As a server, external IDEs like Cursor and Claude Desktop can call your published workflows via /api/mcp/sse." },
  { id: "faq-4", question: "What makes Agent Hub different from Langflow, Flowise, or n8n?", answer: "Unlike traditional ETL tools that only execute linear DAGs, Agent Hub is designed specifically for autonomous Multi-Agent orchestration — supporting supervisor loops, critic reflection, map-reduce fan-out, human-in-the-loop idempotency tokens, and real-time SSE execution telemetry." },
  { id: "faq-5", question: "How does the 28+ Free Model Failover Router protect my runs?", answer: "Every LLM step routes through a resilient circuit-breaker router supporting 28+ free models across OpenRouter and Groq spanning 8 specialization domains. With context windows up to 512k tokens and speeds up to 750 t/s, if any model hits a rate limit (429) or outage (5xx), the router seamlessly quarantines it and falls over to the next healthy model with $0 token expense." },
  { id: "faq-6", question: "How do Human-in-the-Loop (HITL) write locks guarantee safety?", answer: "Whenever an agent reaches an approval node (e.g. before spending money, modifying a database, or sending emails), the execution is paused in PAUSED_FOR_APPROVAL. An atomic single-use cryptographic token is generated in PostgreSQL — guaranteeing the action cannot be dispatched twice." },
];

export default function LandingPage() {
  return (
    <div className="space-y-20 sm:space-y-28 px-4 sm:px-6 lg:px-10 pt-0">

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-10 -mt-0">
        {/* Restrained radial accents — cyan and blue per AGENTS.md */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-500/05 blur-[140px]" />
          <div className="absolute top-1/4 -right-32 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-blue-500/08 to-cyan-500/05 blur-[140px]" />
          {/* Subtle dot grid */}
          <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_80%_80%_at_50%_30%,black_40%,transparent_95%)]" />
        </div>

        <div className="relative z-10 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-10 max-w-5xl space-y-8">
          {/* Announcement pill */}
          <div className="animate-fadeInUp">
            <div
              className="inline-flex max-w-full items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-sm text-xs font-pixel text-cyan-300 uppercase tracking-wider"
              style={{ fontFamily: "'VT323', monospace" }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="truncate">
                • OPEN-SOURCE AI STACK • 11.6K+ N8N & 290+ DIFY WORKFLOWS • 136K+ MCP TOOLS • 28+ VISUAL NODES
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="animate-fadeInUp space-y-4" style={{ animationDelay: "80ms" }}>
            <h1
              className="font-pixel text-5xl sm:text-7xl lg:text-8xl tracking-wider leading-[1.05] uppercase max-w-5xl"
              style={{ fontFamily: "'VT323', monospace" }}
            >
              <span className="text-[var(--text-primary)] inline-block">VISUAL MULTI&#8209;AGENT</span>
              <br />
              <span className="text-cyan-400 [text-shadow:0_0_28px_rgba(34,211,238,0.4)] inline-block">ORCHESTRATION HUB</span>
            </h1>
            <div className="space-y-3 max-w-3xl font-sans text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              <p>
                Architect, simulate, and deploy{" "}
                <span className="font-semibold text-cyan-400">autonomous multi-agent graphs</span>{" "}
                powered by 100% free open-source microservices, Model Context Protocol (MCP) toolkits, and human-in-the-loop governance.
              </p>
              <p className="text-sm sm:text-base text-[var(--text-muted)]">
                Wire Supervisor → Specialist → Critic loops with{" "}
                <span className="font-semibold text-emerald-400">SearXNG</span>,{" "}
                <span className="font-semibold text-teal-400">Crawl4AI</span>,{" "}
                <span className="font-semibold text-sky-400">IBM Docling</span>,{" "}
                <span className="font-semibold text-purple-400">Qdrant</span> &{" "}
                <span className="font-semibold text-blue-400">Gotenberg</span>, import 11,600+ n8n workflows, watch runs pulse in real time, and protect sensitive actions with{" "}
                <span className="font-semibold text-amber-400">single-use approval locks</span>.
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="animate-fadeInUp" style={{ animationDelay: "180ms" }}>
            <HeroAuthSection />
          </div>

          {/* Trust strip */}
          <div
            className="animate-fadeInUp flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-pixel tracking-wider text-[var(--text-secondary)]"
            style={{ animationDelay: "280ms", fontFamily: "'VT323', monospace" }}
          >
            {[
              { label: "100% Zero-Key Public APIs", color: "text-emerald-400" },
              { label: "Open-Source Self-Hostable", color: "text-cyan-400" },
              { label: "11.6k+ n8n & 290+ Dify Library", color: "text-blue-400" },
              { label: "Idempotent Single-Use Tokens", color: "text-amber-400" },
              { label: "28+ Free LLM Models (OpenRouter & Groq)", color: "text-sky-400" },
            ].map(({ label, color }) => (
              <span key={label} className={`flex items-center gap-1.5 ${color}`}>
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                {label}
              </span>
            ))}
          </div>

          {/* Scroll hint */}
          <div className="flex justify-start pt-2 animate-float">
            <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — STAT STRIP
          ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { value: "28+", label: "Native Canvas Node Types" },
          { value: "148K+", label: "MCP, n8n & Dify Ecosystem Tools" },
          { value: "100%", label: "Zero-Key Free & Self-Hosted Stack" },
          { value: "28+ FREE", label: "Multi-Provider LLM Models (512k Ctx)" },
        ].map((stat, i) => (
          <Reveal key={stat.label} delay={i * 80}>
            <div className="bg-[var(--surface-raised)] rounded-md border border-[var(--border-subtle)] shadow-card p-6 space-y-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-[var(--border-strong)] text-center sm:text-left">
              <div
                className="text-4xl sm:text-5xl lg:text-6xl font-pixel leading-none tracking-wider text-slate-100"
                style={{ fontFamily: "'VT323', monospace" }}
              >
                {stat.value}
              </div>
              <div className="text-xs font-sans text-[var(--text-secondary)] leading-snug">
                {stat.label}
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — VISUAL CANVAS
          ═══════════════════════════════════════════════════════ */}
      <section id="canvas" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 01."
            heading="DESIGN, SIMULATE & EXECUTE ON ONE CANVAS"
            rightMeta="28+ PRODUCTION NODE TYPES"
            eyebrowColor="text-cyan-400"
            subhead="Build complex multi-agent graphs with drag-and-drop. Run live, watch nodes pulse in real time, replay any past execution."
          />
        </Reveal>

        <Reveal delay={80}>
          <LiveAgentCanvasDemo />
        </Reveal>

        {/* Node type catalog */}
        <Reveal delay={160}>
          <div className="bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))] shadow-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[hsl(var(--border))]">
              <div className="text-sm font-pixel text-slate-200 uppercase tracking-wider">
                28+ Production Node Types
              </div>
              <span className="text-xs text-[var(--text-muted)] font-pixel uppercase tracking-wider">
                Logic & Control · Search · Document Intel · Memory · Triggers
              </span>
            </div>
            <div className="space-y-5">
              {canvasNodeCategories.map((cat) => (
                <div key={cat.category} className="space-y-2.5">
                  <div className="text-xs font-pixel text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                    • {cat.category}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {cat.nodes.map((n) => (
                      <div
                        key={n.name}
                        className="p-3 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] flex items-start gap-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card hover:border-[var(--border-strong)]"
                      >
                        <n.icon className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-[11px] text-[var(--text-primary)] truncate font-sans">{n.name}</span>
                            <span className="text-[10px] font-pixel px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40 text-cyan-300 uppercase tracking-wider shrink-0">
                              {n.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] leading-snug font-sans">{n.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — OPEN-SOURCE PILLARS
          ═══════════════════════════════════════════════════════ */}
      <section id="opensource" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 02."
            heading="THE OPEN-SOURCE & ZERO-KEY AI STACK"
            rightMeta="SELF-HOSTABLE · ZERO SUBSCRIPTIONS"
            eyebrowColor="text-emerald-400"
            subhead="Six battle-tested open-source tools embedded natively — no subscriptions, no paywalls, no vendor lock-in."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {openSourcePillars.map((p, idx) => (
            <Reveal key={p.title} delay={idx * 60}>
              <div className="bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))] shadow-card p-6 space-y-4 hover:-translate-y-1 hover:shadow-elevated hover:border-emerald-200 dark:hover:border-emerald-800/40 transition-all duration-300 h-full flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${p.chipBg} ${p.accent}`}>
                      <p.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--text-primary)] font-sans">{p.title}</h3>
                    </div>
                  </div>
                  <span className={`text-[10px] font-pixel px-2 py-0.5 rounded uppercase tracking-wider ${p.chipBg} ${p.accent} border border-current/20 shrink-0`}>
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex-1 font-sans">{p.desc}</p>
                <div className="pt-3 border-t border-[hsl(var(--border))] text-xs">
                  <span className="font-pixel text-xs tracking-wider text-[var(--text-secondary)] uppercase">BEST FOR: </span>
                  <span className="font-sans text-[var(--text-muted)]">{p.useCase}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — MARKETPLACE HUB
          ═══════════════════════════════════════════════════════ */}
      <section id="marketplace" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 03."
            heading="UNIFIED MARKETPLACE & TEMPLATE HUB"
            rightMeta="11.6K+ N8N · 290+ DIFY · 136K+ MCP"
            eyebrowColor="text-cyan-400"
            subhead="11.6k+ n8n flows, 290+ Dify blueprints, and 136k+ MCP servers — all importable in one click."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* n8n */}
          <Reveal delay={0}>
            <div className="bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))] shadow-card p-6 space-y-4 hover:-translate-y-1 hover:border-[#EA4B71]/40 hover:shadow-elevated transition-all duration-300 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-[#EA4B71]/10 border border-[#EA4B71]/20 flex items-center justify-center p-2">
                    <N8nOfficialLogo className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)] font-sans">n8n Community Library</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">api.n8n.io · 1-click import</div>
                  </div>
                </div>
                <span className="text-[10px] font-pixel px-2 py-0.5 rounded text-[#EA4B71] bg-[#EA4B71]/10 border border-[#EA4B71]/20 uppercase tracking-wider">11,600+ FLOWS</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex-1 font-sans">
                Direct live access to the entire n8n template registry. Search by apps, triggers, and automations. Agent Hub automatically parses n8n JSON nodes and wires them onto the visual multi-agent canvas.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["SALESFORCE", "HUBSPOT", "STRIPE", "POSTGRES", "NOTION"].map((tag) => (
                  <span key={tag} className="text-[10px] font-pixel px-2 py-0.5 rounded border border-[#EA4B71]/20 text-[#EA4B71] bg-[#EA4B71]/5 uppercase tracking-wider">{tag}</span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Dify */}
          <Reveal delay={80}>
            <div className="bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))] shadow-card p-6 space-y-4 hover:-translate-y-1 hover:border-[#155EEF]/40 hover:shadow-elevated transition-all duration-300 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-[#155EEF]/10 border border-[#155EEF]/20 flex items-center justify-center p-2">
                    <DifyOfficialLogo className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)] font-sans">Dify.ai Workflows</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">marketplace.dify.ai · DSL converter</div>
                  </div>
                </div>
                <span className="text-[10px] font-pixel px-2 py-0.5 rounded text-[#155EEF] bg-[#155EEF]/10 border border-[#155EEF]/20 uppercase tracking-wider">290+ BLUEPRINTS</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex-1 font-sans">
                Import multi-step LLM chains, agent loops, and RAG knowledge pipelines created for Dify.ai. Our universal converter translates Dify DSL YAML files into Agent Hub graphs with live execution.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["RAG PIPELINES", "CHATBOTS", "CODE GEN", "TRANSLATION"].map((tag) => (
                  <span key={tag} className="text-[10px] font-pixel px-2 py-0.5 rounded border border-[#155EEF]/20 text-[#155EEF] bg-[#155EEF]/5 uppercase tracking-wider">{tag}</span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* MCP */}
          <Reveal delay={160}>
            <div className="bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))] shadow-card p-6 space-y-4 hover:-translate-y-1 hover:border-[#FF5601]/40 hover:shadow-elevated transition-all duration-300 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-[#FF5601]/10 border border-[#FF5601]/20 flex items-center justify-center p-2">
                    <SmitheryOfficialLogo className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)] font-sans">MCP Multi-Registry Hub</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">5 registries · SSE & stdio</div>
                  </div>
                </div>
                <span className="text-[10px] font-pixel px-2 py-0.5 rounded text-[#FF5601] bg-[#FF5601]/10 border border-[#FF5601]/20 uppercase tracking-wider">136,500+ SERVERS</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex-1 font-sans">
                Unified discovery across Smithery.ai, Glama.ai, Composio, Arcade, and mcp.so. Mount remote MCP tools, inspect parameter schemas, and connect Cursor/Claude as clients.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["SMITHERY", "GLAMA", "COMPOSIO", "ARCADE", "MCP.SO"].map((tag) => (
                  <span key={tag} className="text-[10px] font-pixel px-2 py-0.5 rounded border border-[#FF5601]/20 text-[#FF5601] bg-[#FF5601]/5 uppercase tracking-wider">{tag}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — LLM ENGINE
          ═══════════════════════════════════════════════════════ */}
      <section id="models" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 04."
            heading="MULTI-PROVIDER FREE LLM ENGINE"
            rightMeta="28+ FREE MODELS · 512K CONTEXT · 750 T/S · 8 SPECIALIZATIONS"
            eyebrowColor="text-cyan-400"
            subhead="Circuit-breaker failover across Groq and OpenRouter — zero cost, 512k context, 750 tokens/second."
          />
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {llmEngineMetrics.map((m, idx) => (
            <Reveal key={m.label} delay={idx * 50}>
              <StatTile
                value={m.value}
                label={m.label}
                detail={m.detail}
                badge={m.badge}
                icon={<m.icon className="h-5 w-5" />}
                accentClass={`${m.accent} ${m.chipBg}`}
              />
            </Reveal>
          ))}
        </div>

        {/* Model domains matrix */}
        <Reveal delay={100}>
          <div className="bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))] shadow-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
              <span className="text-xs sm:text-sm font-pixel tracking-wider text-[var(--text-secondary)] uppercase flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                NUMERICAL BREAKDOWN BY CAPABILITY DOMAIN
              </span>
              <span className="text-xs font-pixel text-emerald-400 uppercase tracking-wider">
                ● AUTOMATIC CIRCUIT-BREAKER COOLDOWN (30S TRANSIENT · 40S 429)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {modelCategoryCounts.map((cat) => (
                <div key={cat.category} className={`p-3 rounded-[10px] border border-[var(--border-subtle)] space-y-1.5 ${cat.color}`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-pixel tracking-wider truncate uppercase">{cat.category}</span>
                    <span className="text-[10px] font-pixel px-1.5 py-0.5 rounded bg-white/10 dark:bg-black/20 shrink-0">{cat.count}</span>
                  </div>
                  <p className="text-[10px] font-sans opacity-85 leading-tight">{cat.specs}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — COMPARISON TABLE
          ═══════════════════════════════════════════════════════ */}
      <section id="comparison" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 05."
            heading="ARCHITECTURAL COMPARISON"
            rightMeta="AGENT STUDIO VS INDUSTRY ALTERNATIVES"
            eyebrowColor="text-cyan-400"
            subhead="Designed from the ground up for autonomous multi-agent orchestration — not a repurposed ETL tool."
          />
        </Reveal>

        <Reveal delay={60}>
          <div className="overflow-x-auto rounded-md border border-[var(--border-subtle)] shadow-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs font-pixel uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="p-4 font-normal text-[var(--text-secondary)]">CAPABILITIES & ARCHITECTURE</th>
                  <th className="p-4 font-normal text-cyan-300 bg-cyan-950/40 border-b-2 border-cyan-400">
                    AGENT STUDIO
                  </th>
                  <th className="p-4 font-normal">N8N</th>
                  <th className="p-4 font-normal">DIFY.AI</th>
                  <th className="p-4 font-normal hidden sm:table-cell">LANGFLOW / FLOWISE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-raised)] font-sans">
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={`transition-colors hover:bg-[var(--surface-sunken)] ${i % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}>
                    <td className="p-4 font-semibold text-[var(--text-primary)] max-w-[160px]">{row.feature}</td>
                    <td className="p-4 font-semibold text-emerald-400 bg-cyan-950/20">{row.studio}</td>
                    <td className="p-4 text-[var(--text-secondary)]">{row.n8n}</td>
                    <td className="p-4 text-[var(--text-secondary)]">{row.dify}</td>
                    <td className="p-4 text-[var(--text-secondary)] hidden sm:table-cell">{row.langflow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>
      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — OBSERVABILITY
          ═══════════════════════════════════════════════════════ */}
      <section id="runtime-intel" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 06."
            heading="LIVE RUNTIME OBSERVABILITY & CONTROLS"
            rightMeta="SSE PULSES · HEATMAPS · STEP REPLAY"
            eyebrowColor="text-cyan-400"
            subhead="Ghost dry-run previews, per-node latency heatmaps, time-scrubber replay, and hard budget caps."
          />
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: "GHOST PREVIEW", accent: "text-sky-600 dark:text-sky-400", chipBg: "bg-sky-50 dark:bg-sky-950/40", hover: "hover:border-sky-200 dark:hover:border-sky-800/40", icon: Eye, title: "Zero-Token Dry Run", desc: "Run the interpreter in fast-forward against live state — nodes light up showing exactly what path a run would take without writing anything or spending tokens." },
            { label: "LATENCY HEATMAP", accent: "text-amber-600 dark:text-amber-400", chipBg: "bg-amber-50 dark:bg-amber-950/40", hover: "hover:border-amber-200 dark:hover:border-amber-800/40", icon: Gauge, title: "Per-Node Cost Metrics", desc: "Per-node latency, token, and dollar costs rendered straight onto the canvas. Toggle heatmap mode to spot slow or expensive branches at a glance." },
            { label: "TIME SCRUBBER", accent: "text-violet-600 dark:text-violet-400", chipBg: "bg-violet-50 dark:bg-violet-950/40", hover: "hover:border-violet-200 dark:hover:border-violet-800/40", icon: TimerReset, title: "1×–8× Speed Playback", desc: "A timeline scrubber replays any past execution — nodes glow and dim in sync with adjustable playback speed so you can debug divergent paths." },
            { label: "BUDGET CAPS", accent: "text-emerald-600 dark:text-emerald-400", chipBg: "bg-emerald-50 dark:bg-emerald-950/40", hover: "hover:border-emerald-200 dark:hover:border-emerald-800/40", icon: Wallet, title: "Hard Cost Limits", desc: "Set max cost, token, and step caps per node. The interpreter stops runaway agents before unexpected bills occur." },
          ].map((card, i) => (
            <Reveal key={card.label} delay={i * 60}>
              <div className={`bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))] shadow-card p-5 space-y-3 hover:-translate-y-1 hover:shadow-elevated ${card.hover} transition-all duration-300 h-full flex flex-col`}>
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${card.chipBg} ${card.accent}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <span className={`text-[10px] font-pixel px-2 py-0.5 rounded uppercase tracking-wider ${card.chipBg} ${card.accent} border border-current/20`}>
                    {card.label}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] font-sans">{card.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1 font-sans">{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — DEVELOPER TOOLING
          ═══════════════════════════════════════════════════════ */}
      <section id="tooling" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 07."
            heading="DEVELOPER TOOLING & GRAPH EDITING"
            rightMeta="ENGINEERED FOR POWER USERS"
            eyebrowColor="text-cyan-400"
            subhead="12 advanced capabilities that make Agent Hub the developer-first choice for serious AI orchestration."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {devTooling.map((t, i) => (
            <Reveal key={t.title} delay={i * 40}>
              <div className="bg-[var(--surface-raised)] rounded-md border border-[var(--border-subtle)] shadow-card p-5 space-y-3 hover:-translate-y-1 hover:shadow-elevated hover:border-[var(--border-strong)] transition-all duration-300 h-full flex flex-col">
                <div className="w-9 h-9 rounded-[8px] flex items-center justify-center bg-cyan-950/40 text-cyan-400 border border-cyan-800/30">
                  <t.icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-snug font-sans">{t.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1 font-sans">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 10 — GUARDRAILS / SECURITY
          ═══════════════════════════════════════════════════════ */}
      <section id="guardrails" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 08."
            heading="ENTERPRISE SECURITY & GOVERNANCE"
            rightMeta="[ ZERO TRUST RUNTIME ]"
            eyebrowColor="text-emerald-400"
            subhead="Idempotency tokens, tenant isolation, circuit-breakers, and atomic transactions at every layer."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Lock, accent: "text-amber-400", chipBg: "bg-amber-950/40", hover: "hover:border-amber-800/40", title: "Single-Use Idempotency Tokens", desc: "Every approved write action generates a single-use token, enforced atomically in the database — replays and concurrent duplicates are blocked." },
            { icon: Database, accent: "text-cyan-400", chipBg: "bg-cyan-950/40", hover: "hover:border-cyan-800/40", title: "Multi-Tenant Isolation", desc: "Strict PostgreSQL tenant boundaries isolate skills, versions, graph executions, and approval records per user account." },
            { icon: Zap, accent: "text-emerald-400", chipBg: "bg-emerald-950/40", hover: "hover:border-emerald-800/40", title: "Hard Execution Limits", desc: "Enforces maximum step boundaries and loop cycles to prevent infinite loops, runaway costs, and resource exhaustion." },
            { icon: RefreshCw, accent: "text-sky-400", chipBg: "bg-sky-950/40", hover: "hover:border-sky-800/40", title: "Circuit-Breaker Failover", desc: "A single model failure never stops a run — the router parks the failing provider in adaptive cooldown and transparently moves to the next healthy model." },
            { icon: Database, accent: "text-violet-400", chipBg: "bg-violet-950/40", hover: "hover:border-violet-800/40", title: "Atomic Commit Transactions", desc: "Skill creation, draft rotation, publish, and execution traces commit in atomic transactions — a crash can never orphan data." },
            { icon: Activity, accent: "text-blue-400", chipBg: "bg-blue-950/40", hover: "hover:border-blue-800/40", title: "Full Audit Trails", desc: "Every mutation writes a structured log and audit row (SKILL_PUBLISHED, APPROVAL_GRANTED, RECOVERY_STARTED) traced back to the acting user." },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 80}>
              <div className={`bg-[var(--surface-raised)] rounded-md border border-[var(--border-subtle)] shadow-card p-5 space-y-3 hover:-translate-y-1 hover:shadow-elevated ${card.hover} hover:border-[var(--border-strong)] transition-all duration-300 h-full flex flex-col`}>
                <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${card.chipBg} ${card.accent}`}>
                  <card.icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] font-sans">{card.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1 font-sans">{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 11 — FAQ (Accordion)
          ═══════════════════════════════════════════════════════ */}
      <section id="faq" className="space-y-10">
        <Reveal>
          <SectionHeader
            sectionNumber="// 09."
            heading="FREQUENTLY ASKED QUESTIONS"
            rightMeta="KNOWLEDGE BASE & FAQ"
            eyebrowColor="text-cyan-400"
            subhead="Everything you need to know about Agent Hub's architecture and capabilities."
          />
        </Reveal>

        <Reveal delay={80}>
          <div className="max-w-3xl mx-auto bg-[var(--surface-raised)] rounded-md border border-[var(--border-subtle)] shadow-card px-6 sm:px-8 py-2">
            <Accordion items={faqItems} />
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 12 — FINAL CTA BAND
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-10 sm:p-16 text-center space-y-6">
        {/* Background glow — restrained cyan and blue per AGENTS.md */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
          <div className="absolute -top-24 left-1/4 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-[80px]" />
          <div className="absolute -bottom-16 right-1/4 h-[250px] w-[250px] rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-[80px]" />
        </div>

        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <div className="text-xs font-pixel uppercase tracking-wider text-[var(--accent-primary)]">
            READY TO BUILD?
          </div>
          <h2 className="font-pixel text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-wider uppercase text-[var(--text-primary)]">
            LAUNCH AGENT STUDIO TODAY
          </h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed font-sans">
            Start building autonomous multi-agent workflows — free, open-source, and self-hostable.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <FooterAuthCTA />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border-subtle)] pt-10 pb-6 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <div>
              <div className="font-bold text-sm text-[var(--text-primary)]">Agent Hub</div>
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                All Systems Operational · © 2026
              </div>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[10px]">Product</div>
              {[
                { label: "Canvas", href: "#canvas" },
                { label: "Marketplace", href: "#marketplace" },
                { label: "Models", href: "#models" },
                { label: "Tooling", href: "#tooling" },
              ].map(l => (
                <a key={l.label} href={l.href} className="block text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">{l.label}</a>
              ))}
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[10px]">Platform</div>
              {[
                { label: "Open Source", href: "#opensource" },
                { label: "Comparison", href: "#comparison" },
                { label: "Guardrails", href: "#guardrails" },
                { label: "Runtime Intel", href: "#runtime-intel" },
              ].map(l => (
                <a key={l.label} href={l.href} className="block text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">{l.label}</a>
              ))}
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[10px]">Dashboard</div>
              {[
                { label: "Agent Canvas", href: "/dashboard/canvas" },
                { label: "Skills Studio", href: "/dashboard/skills" },
                { label: "Tool Registry", href: "/dashboard/tools" },
                { label: "Settings", href: "/dashboard/settings" },
              ].map(l => (
                <Link key={l.label} href={l.href} className="block text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">{l.label}</Link>
              ))}
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[10px]">Resources</div>
              {[
                { label: "FAQ", href: "#faq" },
                { label: "Dashboard", href: "/dashboard" },
              ].map(l => (
                <Link key={l.label} href={l.href} className="block text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <FooterPortfolioWidget />
    </div>
  );
}
