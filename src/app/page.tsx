import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Reveal } from "@/components/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Accordion } from "@/components/ui/Accordion";
import {
  N8nOfficialLogo,
  DifyOfficialLogo,
  SmitheryOfficialLogo,
} from "@/components/common/BrandLogos";
import { canvasNodeCategories } from "@/components/landing/data/canvasNodes";
import { HeroFlowPreview } from "@/components/landing/HeroFlowPreview";

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
const TOTAL_NODE_TYPES = 41;
const catalogNodeCount = canvasNodeCategories.reduce((sum, c) => sum + c.nodes.length, 0);

const openSourcePillars = [
  {
    title: "SearXNG metasearch",
    desc: "Privacy-first metasearch across Google, Bing, Reddit, DuckDuckGo and ArXiv at once, with no API keys.",
    useCase: "Research, news monitoring, fact-checking, CVE discovery",
  },
  {
    title: "Crawl4AI web scraper",
    desc: "Open-source crawler that returns clean markdown with ads and page noise stripped out.",
    useCase: "Deep web extraction, docs ingestion, pricing research",
  },
  {
    title: "IBM Docling parser",
    desc: "Document parser from IBM Research that turns PDFs, multi-column papers and tables into markdown.",
    useCase: "Paper analysis, financial report extraction, compliance audits",
  },
  {
    title: "Gotenberg PDF exporter",
    desc: "Stateless service that renders the Markdown, HTML and LaTeX your agents write into PDF.",
    useCase: "Memos, invoices, weekly research reports",
  },
  {
    title: "Qdrant vector memory",
    desc: "Vector search engine behind long-term agent memory and semantic retrieval.",
    useCase: "Agent memory, knowledge base lookup, grounded answers",
  },
  {
    title: "PocketBase and NocoDB",
    desc: "PocketBase keeps state in a single SQLite file. NocoDB adds spreadsheet-style relational APIs.",
    useCase: "Checkpoint logs, lead sync, audit registers",
  },
];

const marketplaces = [
  {
    name: "n8n community library",
    source: "api.n8n.io",
    figure: "11,600+",
    unit: "flows",
    logo: <N8nOfficialLogo className="h-6 w-6" />,
    desc: "Search the n8n template registry by app, trigger or automation. Agent Hub parses the n8n JSON and wires the nodes onto the canvas.",
    tags: ["Salesforce", "HubSpot", "Stripe", "Postgres", "Notion"],
  },
  {
    name: "Dify.ai workflows",
    source: "marketplace.dify.ai",
    figure: "290+",
    unit: "blueprints",
    logo: <DifyOfficialLogo className="h-6 w-6" />,
    desc: "Import multi-step LLM chains, agent loops and RAG pipelines built for Dify.ai. The converter turns Dify DSL YAML into Agent Hub graphs.",
    tags: ["RAG pipelines", "Chatbots", "Code generation", "Translation"],
  },
  {
    name: "MCP multi-registry hub",
    source: "5 registries · SSE and stdio",
    figure: "136,500+",
    unit: "servers",
    logo: <SmitheryOfficialLogo className="h-5 w-5" />,
    desc: "Search Smithery, Glama, Composio, Arcade and mcp.so in one place. Mount remote MCP tools, inspect parameter schemas and connect Cursor or Claude as clients.",
    tags: ["Smithery", "Glama", "Composio", "Arcade", "mcp.so"],
  },
];

const llmFigures = [
  { value: "28+", label: "Free models" },
  { value: "512K", label: "Largest context window" },
  { value: "8", label: "Model domains" },
];

const modelDomains = [
  { category: "Reasoning and supervisor", count: 6, specs: "Up to 262k context. Multi-step logic and self-reflection loops." },
  { category: "Code and scripting", count: 4, specs: "256k context. TypeScript, Python, JSON schema and SQL." },
  { category: "High-throughput dispatch", count: 5, specs: "Fast edge routing and triage turns." },
  { category: "Vision and OCR", count: 3, specs: "128k context. UI screenshots, diagrams, papers and charts." },
  { category: "Embeddings and memory", count: 4, specs: "Dense semantic embeddings for Qdrant long-term memory." },
  { category: "Voice and speech", count: 3, specs: "Streaming speech-to-text and neural text-to-speech." },
  { category: "Safety guardrails", count: 2, specs: "Policy enforcement and output validation gates." },
  { category: "Auto-free router", count: 1, specs: "openrouter/free routes to the healthiest available capacity." },
];

const comparisonRows = [
  { feature: "Multi-agent supervisor and critic loops", studio: "Supervisor and critic nodes on a visual canvas", n8n: "Step-based DAG workflows", dify: "Mainly single-agent flows", langflow: "Low-level code nodes" },
  { feature: "Built-in open-source tools", studio: "SearXNG, Crawl4AI, Docling, Gotenberg, Qdrant", n8n: "Many need paid API keys", dify: "Smaller built-in tool set", langflow: "Wrappers written in Python" },
  { feature: "Template compatibility", studio: "n8n, Dify and MCP imports", n8n: "n8n only", dify: "Dify only", langflow: "Langflow only" },
  { feature: "Model Context Protocol", studio: "Client and server", n8n: "Community nodes", dify: "Added in recent releases", langflow: "Custom tool scripts" },
  { feature: "Human approval locks", studio: "Single-use database tokens", n8n: "Generic webhook wait", dify: "Basic user input pause", langflow: "No built-in approval lock" },
  { feature: "Run observability", studio: "Live SSE events, latency heatmap, replay", n8n: "Step logs after the run", dify: "Streaming logs", langflow: "Console output" },
  { feature: "Free model failover", studio: "28+ free models across 8 domains, auto-routed", n8n: "A failed key ends the run", dify: "Manual fallback config", langflow: "Manual exception handling" },
];

const observability = [
  { title: "Zero-token dry run", desc: "Run the interpreter in fast-forward against live state. Nodes light up to show the path a run would take, without writing anything or spending tokens." },
  { title: "Per-node cost heatmap", desc: "Latency, token and dollar cost per node, drawn straight onto the canvas. Toggle heatmap mode to find slow or expensive branches." },
  { title: "Time scrubber replay", desc: "Replay any past execution at 1× to 8× speed. Nodes glow and dim in sync, so you can follow where a run diverged." },
  { title: "Hard cost limits", desc: "Set maximum cost, token and step caps per node. The interpreter stops a runaway agent before the bill arrives." },
];

const devTooling = [
  { title: "136,500+ MCP servers and skills", desc: "Connect remote SSE and stdio MCP servers (GitHub, Postgres, Slack, Brave), or expose Agent Hub workflows as MCP tools to Cursor and Claude." },
  { title: "11,600+ n8n workflows", desc: "Browse community n8n workflows and import them into visual graphs, with nodes and parameters translated automatically." },
  { title: "290+ Dify.ai blueprints", desc: "Import Dify DSL YAML and workflow templates into multi-agent canvas graphs and run them in one click." },
  { title: "2,500+ OpenAPI and REST tools", desc: "Browse public APIs (Google, Stripe, Azure, AWS, GitHub) from APIs.guru, install free tool packs, or import any Swagger or OpenAPI URL." },
  { title: "Auto-layout and snap grid", desc: "One click runs a layered BFS auto-layout over a hand-built graph. Snap-to-grid guides keep large designs tidy." },
  { title: "Monaco prompt editor", desc: "Autocomplete for {{ results.node.field }}, live token counts and one-click prompt optimization." },
  { title: "Visual version diffing", desc: "Compare two graph versions side by side, with nodes added or removed and edges rerouted, and roll back in one click." },
  { title: "Sub-graphs and macros", desc: "Collapse any agent branch into a reusable node with typed inputs and outputs. Nest graphs up to 8 levels deep." },
  { title: "Canvas themes", desc: "Calm Green and Punk, each in light and dark, remembered in your browser." },
  { title: "Read-only snapshots", desc: "Share any graph and its live trace as an embeddable read-only link for docs, PR reviews or Slack." },
  { title: "Deterministic step replay", desc: "Persist every step response and replay past runs with the recorded outputs of non-LLM nodes to debug logic branches." },
  { title: "Ghost-mode preview", desc: "Fast-forward dry run against live state. Nodes light up to show what would happen, with no token spend." },
];

const guardrails = [
  { title: "Single-use idempotency tokens", desc: "Each approved write action gets a single-use token, enforced atomically in the database. Replays and concurrent duplicates are blocked." },
  { title: "Multi-tenant isolation", desc: "Strict PostgreSQL tenant boundaries separate skills, versions, graph executions and approval records per user account." },
  { title: "Hard execution limits", desc: "Maximum step and loop-cycle limits prevent infinite loops, runaway costs and resource exhaustion." },
  { title: "Circuit-breaker failover", desc: "A single model failure doesn't stop a run. The router parks the failing provider in adaptive cooldown and moves to the next healthy model." },
  { title: "Atomic commit transactions", desc: "Skill creation, draft rotation, publish and execution traces commit atomically, so a crash can't orphan data." },
  { title: "Full audit trails", desc: "Every mutation writes a structured log and an audit row (SKILL_PUBLISHED, APPROVAL_GRANTED, RECOVERY_STARTED) traced to the acting user." },
];

const faqItems = [
  { id: "faq-1", question: "How does the open-source, zero-key stack work?", answer: "Agent Hub embeds native connectors for SearXNG (privacy metasearch), Crawl4AI (LLM-friendly scraper), IBM Docling (PDF and table parser), Gotenberg (PDF exporter), Qdrant (vector database) and PocketBase/NocoDB (SQLite and Airtable-style tables). They can run against public instances with no API keys, or against your self-hosted Docker containers." },
  { id: "faq-2", question: "How do n8n and Dify.ai workflow imports work?", answer: "Agent Hub includes converters in /lib/converters that translate n8n JSON nodes and Dify DSL YAML workflows into native visual graph nodes. You can browse over 11,600 n8n workflows and 290 Dify blueprints in the unified marketplace and launch them in one click." },
  { id: "faq-3", question: "How does Model Context Protocol (MCP) integration work?", answer: "Agent Hub is both an MCP client and an MCP server. As a client, it searches 136,500+ MCP servers across Smithery, Glama, Composio, Arcade and mcp.so and mounts them into agent graphs. As a server, IDEs like Cursor and Claude Desktop can call your published workflows via /api/mcp/sse." },
  { id: "faq-4", question: "How is Agent Hub different from Langflow, Flowise or n8n?", answer: "Agent Hub is built for multi-agent orchestration: supervisor loops, critic reflection, map-reduce fan-out, human-in-the-loop idempotency tokens and real-time SSE execution telemetry, rather than linear step-by-step automation." },
  { id: "faq-5", question: "How does the free model failover router protect my runs?", answer: "Every LLM step goes through a circuit-breaker router covering 28+ free models on OpenRouter and Groq across 8 domains, with context windows up to 512k tokens. If a model hits a rate limit (429) or an outage (5xx), the router quarantines it and falls over to the next healthy model." },
  { id: "faq-6", question: "How do human-in-the-loop write locks keep actions safe?", answer: "When an agent reaches an approval node (before spending money, changing a database or sending email), the run pauses in PAUSED_FOR_APPROVAL. A single-use token is generated atomically in PostgreSQL, so the action can't be dispatched twice." },
];

const GITHUB_URL = "https://github.com/Mentrauz/Agent-HUB";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Canvas", href: "#canvas" },
      { label: "Marketplace", href: "#marketplace" },
      { label: "Models", href: "#models" },
      { label: "Tooling", href: "#tooling" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Open source", href: "#opensource" },
      { label: "Comparison", href: "#comparison" },
      { label: "Guardrails", href: "#guardrails" },
      { label: "Observability", href: "#runtime-intel" },
    ],
  },
  {
    title: "Dashboard",
    links: [
      { label: "Agent canvas", href: "/dashboard/canvas" },
      { label: "Skills studio", href: "/dashboard/skills" },
      { label: "Tool registry", href: "/dashboard/tools" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Live demo", href: "#canvas" },
      { label: "FAQ", href: "#faq" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "GitHub", href: GITHUB_URL },
    ],
  },
];

// Hairline dividers for the hero stat band: 2×2 grid on mobile, single row from lg
const STAT_CELL_BORDERS = [
  "",
  "border-l",
  "border-t lg:border-t-0 lg:border-l",
  "border-l border-t lg:border-t-0",
];

// Shared surfaces: one hairline-divided panel for grouped cells
const GROUP = "grid gap-px overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--border-subtle)]";
const CELL = "bg-[var(--surface-raised)] p-6";

export default function LandingPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-10">

      {/* ═══════════════════════════════════════════════════════
          HERO — copy + live run preview, stat band attached
          ═══════════════════════════════════════════════════════ */}
      <section className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="mx-auto max-w-[1320px] pt-12 sm:pt-16 lg:pt-24">
          <div className="grid grid-cols-1 items-center gap-12 xl:grid-cols-12 xl:gap-16">
            <div className="animate-fadeInUp space-y-8 xl:col-span-6">
              <div className="space-y-6">
                <h1 className="font-pixel text-4xl font-medium leading-[1.05] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
                  Orchestrate multi-agent workflows on a visual canvas
                </h1>
                <p className="max-w-xl font-sans text-lg leading-7 text-[var(--text-secondary)]">
                  Wire agents, tools and human approvals into a graph. Run it on free models and open-source services, and watch every step as it executes.
                </p>
                <p className="font-mono text-xs text-[var(--text-muted)]">
                  Works with SearXNG, Crawl4AI, Docling, Qdrant and Gotenberg
                </p>
              </div>

              <HeroAuthSection />
            </div>

            {/* Live run preview */}
            <div
              className="hidden max-w-3xl animate-fadeInUp sm:block xl:col-span-6 xl:max-w-none"
              style={{ animationDelay: "120ms" }}
            >
              <HeroFlowPreview />
            </div>
          </div>

          {/* Stat band */}
          <div
            id="stats"
            className="mt-16 grid grid-cols-2 border-y border-[var(--border-subtle)] lg:mt-24 lg:grid-cols-4"
          >
            {[
              { value: String(TOTAL_NODE_TYPES), label: "Node types on the canvas" },
              { value: "148K+", label: "MCP, n8n and Dify tools to import" },
              { value: "28+", label: "Free LLM models" },
              { value: "512K", label: "Largest context window" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`space-y-2 border-[var(--border-subtle)] px-5 py-6 sm:px-8 sm:py-8 ${STAT_CELL_BORDERS[i]}`}
              >
                <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)] sm:text-4xl">
                  {stat.value}
                </div>
                <div className="font-sans text-sm leading-5 text-[var(--text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto mt-20 w-full max-w-[1320px] space-y-20 lg:mt-28 lg:space-y-28">

        {/* ═══════════════════════════════════════════════════════
            VISUAL CANVAS
            ═══════════════════════════════════════════════════════ */}
        <section id="canvas" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="Design, run and replay on one canvas"
              rightMeta={`${TOTAL_NODE_TYPES} node types`}
              subhead="Build multi-agent graphs with drag and drop. Run them live, watch nodes pulse in real time and replay any past execution."
            />
          </Reveal>

          <Reveal>
            <LiveAgentCanvasDemo />
          </Reveal>

          {/* Node catalog */}
          <Reveal>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-6 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] py-5">
                <div className="font-sans text-base font-medium text-[var(--text-primary)]">Node catalog</div>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {catalogNodeCount} of {TOTAL_NODE_TYPES} node types shown
                </span>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {canvasNodeCategories.map((cat) => (
                  <div key={cat.category} className="grid gap-4 py-6 lg:grid-cols-12 lg:gap-8">
                    <div className="font-sans text-sm font-medium text-[var(--text-primary)] lg:col-span-3">
                      {cat.category}
                    </div>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:col-span-9 lg:grid-cols-3">
                      {cat.nodes.map((n) => (
                        <div key={n.name} className="flex items-start gap-3">
                          <n.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                          <div className="min-w-0 space-y-1">
                            <div className="font-sans text-sm font-medium text-[var(--text-primary)]">{n.name}</div>
                            <p className="font-sans text-sm leading-5 text-[var(--text-secondary)]">{n.desc}</p>
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
            OPEN-SOURCE STACK
            ═══════════════════════════════════════════════════════ */}
        <section id="opensource" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="The open-source, zero-key stack"
              rightMeta="Self-hostable"
              subhead="Six open-source services run as native nodes. No subscriptions, no vendor lock-in, and public instances work without API keys."
            />
          </Reveal>

          <Reveal>
            <div className={`${GROUP} md:grid-cols-2 lg:grid-cols-3`}>
              {openSourcePillars.map((p) => (
                <div key={p.title} className={`${CELL} flex flex-col gap-3`}>
                  <h3 className="font-sans text-base font-medium text-[var(--text-primary)]">{p.title}</h3>
                  <p className="flex-1 font-sans text-sm leading-6 text-[var(--text-secondary)]">{p.desc}</p>
                  <p className="font-sans text-sm leading-5 text-[var(--text-muted)]">
                    <span className="text-[var(--text-secondary)]">Best for</span> {p.useCase}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            MARKETPLACE
            ═══════════════════════════════════════════════════════ */}
        <section id="marketplace" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="One marketplace for templates and tools"
              rightMeta="Import in one click"
              subhead="11,600+ n8n flows, 290+ Dify blueprints and 136,500+ MCP servers, all importable into the canvas."
            />
          </Reveal>

          <Reveal>
            <div className={`${GROUP} md:grid-cols-3`}>
              {marketplaces.map((m) => (
                <div key={m.name} className={`${CELL} flex flex-col gap-5`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                      {m.logo}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-sans text-base font-medium text-[var(--text-primary)]">{m.name}</h3>
                      <div className="truncate font-mono text-xs text-[var(--text-muted)]">{m.source}</div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">
                      {m.figure}
                    </span>
                    <span className="font-sans text-sm text-[var(--text-muted)]">{m.unit}</span>
                  </div>
                  <p className="flex-1 font-sans text-sm leading-6 text-[var(--text-secondary)]">{m.desc}</p>
                  <p className="font-mono text-xs leading-5 text-[var(--text-muted)]">{m.tags.join(" · ")}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            LLM ENGINE
            ═══════════════════════════════════════════════════════ */}
        <section id="models" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="Free models with automatic failover"
              rightMeta="Groq and OpenRouter"
              subhead="A circuit-breaker router moves each step to the next healthy model when one hits a rate limit or an outage."
            />
          </Reveal>

          <Reveal>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {llmFigures.map((f) => (
                <div key={f.label} className="space-y-2">
                  <div className="font-pixel text-5xl font-medium leading-none tabular-nums text-[var(--text-primary)]">
                    {f.value}
                  </div>
                  <div className="font-sans text-sm text-[var(--text-muted)]">{f.label}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-6 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] py-5">
                <div className="font-sans text-base font-medium text-[var(--text-primary)]">Models by capability</div>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  Cooldown: 30 s on transient errors, 40 s on 429
                </span>
              </div>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {modelDomains.map((d) => (
                  <li key={d.category} className="grid gap-1 py-4 sm:grid-cols-12 sm:gap-6">
                    <span className="font-sans text-sm font-medium text-[var(--text-primary)] sm:col-span-4">
                      {d.category}
                    </span>
                    <span className="font-mono text-sm tabular-nums text-[var(--text-secondary)] sm:col-span-2">
                      {d.count} {d.count === 1 ? "model" : "models"}
                    </span>
                    <span className="font-sans text-sm leading-5 text-[var(--text-secondary)] sm:col-span-6">
                      {d.specs}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            COMPARISON
            ═══════════════════════════════════════════════════════ */}
        <section id="comparison" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="How it compares"
              rightMeta="Agent Hub and alternatives"
              subhead="Built for autonomous multi-agent orchestration, not adapted from a linear automation tool."
            />
          </Reveal>

          <Reveal>
            <div className="overflow-x-auto rounded-[14px] border border-[var(--border-subtle)]">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Agent Hub compared with n8n, Dify.ai and Langflow or Flowise</caption>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-muted)]">
                    <th scope="col" className="p-4 font-medium text-[var(--text-secondary)]">Capability</th>
                    <th scope="col" className="border-b-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 p-4 font-medium text-[var(--text-primary)]">
                      Agent Hub
                    </th>
                    <th scope="col" className="p-4 font-medium">n8n</th>
                    <th scope="col" className="p-4 font-medium">Dify.ai</th>
                    <th scope="col" className="hidden p-4 font-medium sm:table-cell">Langflow / Flowise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-raised)] font-sans">
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="transition-colors hover:bg-[var(--surface-sunken)]">
                      <th scope="row" className="max-w-[200px] p-4 text-left font-medium text-[var(--text-primary)]">{row.feature}</th>
                      <td className="bg-[var(--accent-primary)]/5 p-4 text-[var(--text-primary)]">{row.studio}</td>
                      <td className="p-4 text-[var(--text-secondary)]">{row.n8n}</td>
                      <td className="p-4 text-[var(--text-secondary)]">{row.dify}</td>
                      <td className="hidden p-4 text-[var(--text-secondary)] sm:table-cell">{row.langflow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            OBSERVABILITY
            ═══════════════════════════════════════════════════════ */}
        <section id="runtime-intel" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="See what every run is doing"
              rightMeta="SSE events · heatmaps · replay"
              subhead="Preview a run before it spends anything, read cost and latency per node, and replay any execution step by step."
            />
          </Reveal>

          <Reveal>
            <div className={`${GROUP} md:grid-cols-2`}>
              {observability.map((o) => (
                <div key={o.title} className={`${CELL} space-y-2`}>
                  <h3 className="font-sans text-base font-medium text-[var(--text-primary)]">{o.title}</h3>
                  <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">{o.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            DEVELOPER TOOLING
            ═══════════════════════════════════════════════════════ */}
        <section id="tooling" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="Tools for editing graphs"
              rightMeta={`${devTooling.length} capabilities`}
              subhead="Import, lay out, diff, share and replay graphs without leaving the canvas."
            />
          </Reveal>

          <Reveal>
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {devTooling.map((t) => (
                <div key={t.title} className="space-y-2 border-t border-[var(--border-subtle)] pt-5">
                  <h3 className="font-sans text-base font-medium leading-snug text-[var(--text-primary)]">{t.title}</h3>
                  <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">{t.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            GUARDRAILS
            ═══════════════════════════════════════════════════════ */}
        <section id="guardrails" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="Security and governance"
              rightMeta="Enforced at every layer"
              subhead="Idempotency tokens, tenant isolation, circuit breakers and atomic transactions."
            />
          </Reveal>

          <Reveal>
            <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              {guardrails.map((g) => (
                <div key={g.title} className="grid gap-2 py-6 lg:grid-cols-12 lg:gap-8">
                  <h3 className="font-sans text-base font-medium text-[var(--text-primary)] lg:col-span-4">{g.title}</h3>
                  <p className="font-sans text-sm leading-6 text-[var(--text-secondary)] lg:col-span-8">{g.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FAQ
            ═══════════════════════════════════════════════════════ */}
        <section id="faq" className="space-y-10">
          <Reveal>
            <SectionHeader
              heading="Frequently asked questions"
              subhead="How Agent Hub's architecture and integrations work."
            />
          </Reveal>

          <Reveal>
            <div className="max-w-3xl border-y border-[var(--border-subtle)]">
              <Accordion items={faqItems} />
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FINAL CTA
            ═══════════════════════════════════════════════════════ */}
        <section className="mb-16 space-y-6 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-10 text-center sm:p-16 lg:mb-20">
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="font-pixel text-4xl font-medium leading-tight text-[var(--text-primary)] sm:text-5xl">
              Build your first agent graph
            </h2>
            <p className="font-sans text-lg leading-7 text-[var(--text-secondary)]">
              Free, open source and self-hostable.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <FooterAuthCTA />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-base)] px-5 font-sans text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-muted)] sm:w-auto"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FOOTER
            ═══════════════════════════════════════════════════════ */}
        <footer className="border-t border-[var(--border-subtle)] pt-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Brand */}
            <div className="space-y-4 lg:col-span-4">
              <span className="font-pixel text-xl font-medium text-[var(--text-primary)]">Agent Hub</span>
              <p className="max-w-xs font-sans text-sm leading-6 text-[var(--text-muted)]">
                Open-source visual orchestration for multi-agent graphs, with free tools, MCP toolkits and human-in-the-loop approvals.
              </p>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4 lg:col-span-8">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title} className="space-y-3">
                  <div className="font-sans font-medium text-[var(--text-primary)]">{col.title}</div>
                  {col.links.map((l) =>
                    l.href.startsWith("/") ? (
                      <Link key={l.label} href={l.href} className="block text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">{l.label}</Link>
                    ) : (
                      <a
                        key={l.label}
                        href={l.href}
                        {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                        className="block text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {l.label}
                      </a>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legal row — bottom padding clears the fixed portfolio pill */}
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--border-subtle)] pb-16 pt-6 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center">
            <span>© 2026 Agent Hub · Open source</span>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text-primary)]">
              GitHub
            </a>
          </div>
        </footer>
      </div>

      <FooterPortfolioWidget />
    </div>
  );
}
