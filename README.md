# Agent Hub — Visual Agent Canvas & Multi-Agent Orchestration Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://agenthub-seven-rouge.vercel.app/)
[![MCP](https://img.shields.io/badge/MCP-Protocol_Client_%26_Server-8A2BE2?style=for-the-badge&logoColor=white)](https://modelcontextprotocol.io)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_%2B_pgvector-02E693?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-86_Vitest_Suites_%2B_Playwright-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)
[![React Flow](https://img.shields.io/badge/Canvas-XYFlow_React-FF0072?style=for-the-badge&logo=react&logoColor=white)](https://reactflow.dev)


---

> **Visual AI Agent & Multi-Agent Orchestration Platform.** Users can:
> - build agent graphs on an interactive node canvas
> - import Dify and n8n workflows
> - manage schema-validated AI skills with immutable versioning
> - connect and discover **Model Context Protocol (MCP)** and OpenAPI tools
> - execute under tool-permission and Human-in-the-Loop (HITL) approval guardrails
> - stream live execution telemetry over Server-Sent Events (SSE)

---

## Documentation

| Document | What it covers |
|---|---|
| **README.md** (this file) | Product overview, quickstart, contribution workflow |
| **[frontend.md](frontend.md)** | Every frontend file: pages, route map, components, canvas architecture, theming, conventions, component and e2e tests |
| **[backend.md](backend.md)** | Every backend file: all 113 API routes, the Skills API reference, services, runtime modules, LLM routing, Prisma schema, env vars, local services, conventions, unit, integration and perf tests |

---

## Overview

Agent Hub is a **visual AI agent platform** built on:
- **Next.js 16** (App Router + Turbopack)
- **React 19**
- **XYFlow / React Flow**
- **PostgreSQL + pgvector**, through Prisma

Users can:
- design **multi-agent graphs** visually;
- import **Dify YAML** and **n8n JSON** workflows through converters;
- connect **MCP** servers found in public directories (Glama, mcp.so, Smithery, Composio, Arcade, awesome-mcp-servers);
- mount **OpenAPI** specs as tools;
- version **skills** like software;
- track **live model pricing** from OpenRouter and Groq.

Graphs run on a **Graph Interpreter runtime** that provides:
- real-time SSE streaming
- permission validation
- cooldown-based LLM failover
- HITL approval gates

```
+-----------------------------------------------------------------------------------------+
|                                   Agent Hub LIFECYCLE                                   |
|                                                                                         |
|  [ Visual Canvas Builder ] ---> [ Graph Validation & Diff ] ---> [ Immutable Versioning ]|
|             |                                                                |          |
|             v                                                                v          |
|  [ Workflow Templates ]    ---> [ Live SSE Execution Engine ] <--- [ Skills & MCP Tool Hub ]|
|             |                               |                                           |
|             v                               v                                           |
|  [ Human Review (HITL) ]   ---> [ History, Trace & Metrics ] ---> [ Audit Logs & Replay ]|
+-----------------------------------------------------------------------------------------+
```

---

## Core Capabilities

### 1. Visual Agent Graph Builder & Canvas (`/dashboard/canvas`)
- **Interactive drag-and-drop canvas** built on `@xyflow/react`. It supports:
  - undo/redo, copy/paste and keyboard shortcuts
  - node search
  - collapsing a selection into a subgraph
  - a reusable macro library
- **41 node types** (`src/components/canvas/nodeTypes.ts`):
  - **Core flow:** `start`, `end`, `agent`, `supervisor`, `tool`, `router`, `approval`, `loop`, `parallel`, `subgraph`.
  - **Integrations:** `mcp_server`, `mcp_tool`, `skill`, `http`, `web_reader`, `rss_feed`, `notification_dispatcher`.
  - **Data and control:** `transform`, `data_mapper`, `variable`, `aggregate`, `delay`, `output`, `code_sandbox`.
  - **Multi-model:** `consensus`, `critic`.
  - **Triggers:** `schedule_trigger`, `webhook_trigger`.
  - **Self-hosted microservice nodes:** SearXNG, Crawl4AI, Docling, Gotenberg, NocoDB, PocketBase, Qdrant, Whisper, Piper.
  - **A2A:** `a2a_delegate`, `a2a_channel`.
  - **Annotations:** `sticky_note`, `frame`.
- **One-click auto-layout**: a dependency-free, left-to-right layered layout.
- **Real-time graph validation** flags:
  - a missing START or END node
  - nodes unreachable from START, or unable to reach END
  - unconfigured tool, router, loop or MCP nodes
  - approvals placed inside parallel branches or subgraphs
- **Visual graph diff** of the draft against the published graph, showing added, removed and changed nodes and edges.
- **20 prebuilt templates**, e.g. Supervisor → Researcher → Coder → Critic, map-reduce invoice screening, HITL-gated disbursement, CVE watcher, Qdrant RAG.
- **AI copilot**: describe a graph in natural language and the copilot generates it.
- **Snapshots, ghost preview (dry run) and deterministic replay** from the editor.

### 2. Graph Interpreter Runtime
- **State machine** that executes canvas graphs node by node, with step persistence. Its limits are:
  - a step budget
  - a per-node visit cap
  - subgraph depth
  - a 120s wall clock
  - a token budget
- **Safe expression evaluator** (`src/modules/graph/expression.ts`) for router and loop conditions. It is a tokenizer plus recursive-descent parser, with no `eval()`:
  - comparisons (`==`, `!=`, `>`, `>=`, `<`, `<=`)
  - string operators (`contains`, `startsWith`, `endsWith`)
  - logic (`&&`, `||`, `!`)
  - paths over `results.*`, `input.*` and `item.*`
- **Event bus telemetry**: 19 event kinds streamed to clients over SSE, including `node:start`/`node:end`, `tool:call:*`, `llm:call:*`, `approval:requested`, `router:decision` and `node:token_chunk`.
- **Planner fallback**: skills without a graph run on a LangGraph `StateGraph` planner engine instead. Its loop is planner → permission → tool selection → tool execution → finish.

### 3. Workflow Templates & Converters (`/dashboard/skills` → Workflows)
- **Unified workflow search** across Studio templates, the Dify marketplace and n8n templates.
- **Dify DSL converter** and **n8n workflow converter** (`src/lib/converters/`) turn imported workflows into executable agent graphs.
- **15 production skill templates**, e.g. Customer Refund Automation, Invoice Risk Screening, Support Ticket Triage, CVE Watcher, FX Monitor.
- **Visual step chain** showing data flow, required tools and approval checkpoints.

### 4. Skills & Versioning (`/dashboard/skills`)
- **Schema-validated skills**: Zod-validated input/output schemas, examples, allowed tools, approval policy, and a step limit.
- **Immutable versioning**: `DRAFT → PUBLISHED → ARCHIVED`. Editing a published skill creates a new draft version.
- **Version compare** (`/dashboard/compare`): field-level diff of instructions, schemas, tools and parameters.
- **Skill packs, marketplace and synthesizer**:
  - install curated packs (MCP servers + skills);
  - install skills from MCP marketplaces;
  - generate a skill from a prompt.

### 5. Human-in-the-Loop (HITL) Review Queue (`/dashboard/review`)
- **Write-action guardrails**: WRITE tools, or tools matched by the approval policy, pause the run in `PAUSED_FOR_APPROVAL`.
- **Idempotency keys**: atomic responses prevent duplicate approvals and replay races.
- **Interactive forms**: approval nodes can collect structured reviewer input (text, number, select, boolean, date, JSON, …). Later nodes read it at `results.<approvalNodeId>`.

### 6. Observability, History & Audit (`/dashboard/executions`, `/dashboard/history`, `/dashboard/audit`)
- **Execution traces**: timeline, steps, tool inputs and outputs, logs, and actions to cancel, retry, replay or export.
- **Metrics**: success rate, average duration, approvals, top skills and tools.
- **Audit trail**: skill, approval and execution mutations, exportable as JSON.

### 7. Resilient LLM Router with Live Pricing (`/dashboard/settings`)
- **Vendor-agnostic `LLMProvider` abstraction** over Groq, OpenRouter and any OpenAI-compatible endpoint, called with raw `fetch` (no vendor SDKs).
- **Ordered failover across 28 free models**: 7 on Groq, then 21 OpenRouter `:free` models.
- **Cooldowns after a failure:**

  | Error | Cooldown |
  |---|---|
  | 429 | 60 s |
  | 404 | 10 min |
  | 401/403 | 5 min, for the whole vendor |
  | Other errors | 30 s |
- **Live model catalog and pricing** fetched from the provider `/models` APIs, falling back to a static catalog.

### 8. Model Context Protocol (MCP) Ecosystem (`/dashboard/tools?tab=mcp`)
- **MCP client hub**:
  - connects remote Streamable HTTP servers (falling back to legacy SSE) and local stdio servers; stdio is disabled on serverless hosts;
  - discovers `tools/list`;
  - registers each tool as `mcp_<serverId>_<tool>`;
  - inspects resources and prompts, handles sampling, and streams progress;
  - wraps each server in a per-server circuit breaker.
- **22 one-click presets**: GitHub, Git, Postgres, SQLite, Memory, Fetch, Brave Search, Playwright, Filesystem, Slack, Notion, Linear, Docker, Sentry, …
- **Public directory browser**:
  - sources: Glama, mcp.so, Smithery, Composio, Arcade, mcpservers.org and awesome-mcp-servers;
  - quality grades, GitHub README and changelog, and a health ping.
- **Tool-update diffs**: detects schema changes in connected servers and applies them to affected skill drafts.
- **Agent Hub as an MCP server**: external agents (Cursor, Claude Desktop, …) connect to `/api/mcp/sse` and call published skills as `run_skill_*` tools. They authenticate with a Clerk session or the `MCP_ACCESS_TOKEN` bearer token.

### 9. OpenAPI & REST Integration (`/dashboard/tools?tab=openapi`)
- **Public API directory** powered by the APIs.guru registry.
- **13 key-free API presets**: Frankfurter FX, Open-Meteo, Wikipedia, REST Countries, CoinGecko, Hacker News, WorldTime, Nominatim, …
- **Custom spec import**: OpenAPI 3.x or Swagger 2 (JSON/YAML) from a URL or pasted text. You pick endpoints, configure auth (Bearer, API key, Basic, custom header), and test calls. Credentials are stored with AES-256-GCM encryption.

### 10. Execution Timeline & Trace Mode
- **Live trace mode on the canvas**:
  - node status, edge traversal and a token-stream overlay
  - a progress HUD
  - a time scrubber that replays events
- **Timeline sidebar**:
  - step cards with sub-events (tool, LLM, MCP, router, loop, parallel, approval, A2A)
  - search and filters
  - click a step to focus its canvas node
  - JSON or Markdown export

### 11. RAG Knowledge Base (`/dashboard/knowledge`, `src/modules/rag/`)
- **Ingestion**:
  - sources: text, file upload (PDF, DOCX, HTML, CSV, JSON, Markdown, XML, YAML) or URL;
  - chunking strategies: recursive, semantic, markdown, fixed, and parent/child (small-to-big).
- **Embeddings**: Groq → OpenRouter → Ollama → a deterministic local fallback.
- **pgvector store**: IVFFlat index, plus **hybrid search** that fuses dense and keyword scores with Reciprocal Rank Fusion (RRF).
- **Retrieval extras**: optional HyDE query expansion and a heuristic reranker.
- **Answer generation**: grounded QA with citations.
- **RAG triad evaluation**: context relevance, groundedness and answer relevance.
- **Cluster map**: a PCA projection of chunk embeddings.
- **Experimental modules**, present in the repo but not yet wired into the pipeline: knowledge graph, chunk-size optimizer, cross-collection MMR search, extended RAG eval and the multi-modal processor.

### 12. Webhooks & Cron Triggers (`/api/triggers`)
- **Inbound webhooks**: `wh_…` tokens, HMAC-SHA256 signature verification (GitHub- and Stripe-style headers, constant-time compare), and payload mapping such as `{{body.customer.id}}`.
- **Cron schedules**: stored 5-part cron expressions run via `POST /api/triggers/cron/:id`, which requires `Authorization: Bearer <CRON_SECRET>` and is disabled while `CRON_SECRET` is unset. There is no built-in scheduler: point an external scheduler (e.g. Vercel Cron) at that endpoint.

### 13. Code Execution
- **`code_execution` tool**:
  - JavaScript runs in a hardened `node:vm` context;
  - Python runs as a real `python3 -I` subprocess with a minimal environment;
  - timeouts, plus a 100KB output cap.
- **`code_sandbox` canvas node**: lightweight `node:vm` evaluation with a timeout, plus a JS-transpiled Python subset for simple data transforms. It is not a security boundary.

### 14. Persistent Agent Memory (`src/services/MemoryService.ts`)
- Stores user- and skill-scoped memories. When `enableMemory` is set on an `agent` node, matching memories are retrieved by text match and injected into its system prompt.

### 15. Multi-Model Consensus & Critic Nodes
- **`consensus`**: sends the prompt to several models in parallel.
  - `judge_synthesis` merges the answers with an impartial LLM judge.
  - The UI also offers `majority_vote` and `highest_confidence`, but at runtime both currently return the first successful response.
- **`critic`**: an iterative critique → score (0–100) → refine loop against a rubric, until it reaches the threshold or `maxTurns`.

### 16. Agent-to-Agent (A2A) (`/dashboard/a2a`)
- **Agent manifest**: served at `/.well-known/agent.json`. Inbound tasks (`/api/a2a/tasks`) require a session or `Authorization: Bearer <A2A_ACCESS_TOKEN>`.
- **Discovery** of remote agents.
- **Task delegation**, with JSON or SSE responses.
- **Sealed-bid task auctions**: RFP envelope digest and capability-based scoring.
- **Multi-agent debates** over a shared transcript.

### 17. Eject to Code (`src/components/canvas/exportUtils.ts`)
- Export a graph as **LangGraph Python** (`StateGraph`), **LangGraph.js TypeScript** (`Annotation.Root()`), Mermaid, JSON, PNG, SVG or PDF.

### 18. Organizations, RBAC & Vault
- **Organizations**: members, invitations, built-in roles (OWNER/ADMIN/MEMBER/VIEWER), custom roles with granular permissions, and an org audit log.
- **Org API keys** for programmatic access to skills and executions. Keys are sent as `X-API-Key` (or `Bearer as_…`), scoped, and pinned to their organization.
- **Secret vault**: AES-256-GCM encryption with versioned keys. `${vault.KEY}` placeholders are resolved at run time.

---

## Architecture

```
Agent Hub
|-- Presentation (Next.js 16 App Router, React 19, Tailwind CSS v4, next-themes, XYFlow, Zustand, TanStack Query)
|   |-- /dashboard/canvas       -> Visual graph builder, palette, inspector, auto-layout, trace mode, diff
|   |-- /dashboard/skills       -> Skill registry, editor, versions, marketplaces, packs, synthesizer
|   |-- /dashboard/executions   -> Execution traces, replay, export
|   |-- /dashboard/review       -> HITL approval queue
|   |-- /dashboard/tools        -> Built-in tools, MCP Hub, OpenAPI Hub
|   |-- /dashboard/knowledge    -> RAG workbench
|   `-- /api/                   -> 113 REST & SSE route handlers
|
|-- Application & Domain (services + runtime modules)
|   |-- modules/graph/          -> GraphInterpreter, expression evaluator, event bus, preview store
|   |-- modules/execution/      -> LangGraph planner engine, retry, cancellation, sandbox
|   |-- modules/approval/       -> Approval engine, policy, history
|   |-- modules/tools/          -> Tool registry + 9 built-in tools
|   |-- modules/mcp/            -> MCP connection, tool adapter, circuit breaker, MCP server
|   |-- modules/openapi/        -> Spec parser, dynamic tools, presets
|   |-- modules/rag/            -> RAG pipeline, pgvector store, chunking, embeddings, rerank, eval
|   |-- modules/a2a/            -> A2A client, auction, debate store
|   |-- lib/converters/         -> Dify & n8n converters
|   `-- services/               -> SkillService, ExecutionService, McpClientService, OpenApiService, RBACService, …
|
`-- Infrastructure (Prisma + PostgreSQL/pgvector, Clerk, Pino, LLM router)
    |-- providers/llm/          -> Groq, OpenRouter, OpenAI-compatible providers, LLMRouter, live catalog
    |-- repositories/           -> Prisma repositories behind interfaces
    `-- lib/                    -> Composition root, error handlers, rate limiter, env validation, vault crypto
```

### System Architecture Diagram

```mermaid
graph TB
    subgraph Presentation["Presentation Layer"]
        direction LR
        Canvas["Canvas Builder<br/>XYFlow + BFS auto-layout"]
        SkillsUI["Skills Studio<br/>CRUD + Versions + Compare"]
        ExecUI["Executions<br/>Traces + Replay + Metrics"]
        ReviewUI["HITL Review Queue"]
        MCPUI["MCP Hub<br/>Servers + Directory"]
        OpenAPIUI["OpenAPI Hub<br/>APIs.guru + Presets"]
    end

    subgraph API["API Layer — Next.js Route Handlers (behind src/proxy.ts)"]
        direction LR
        SkillsAPI["/api/skills"]
        ExecAPI["/api/executions<br/>+ SSE stream"]
        CanvasAPI["/api/canvas/preview<br/>+ SSE stream"]
        MCPAPI["/api/mcp"]
        OpenAPIAPI["/api/openapi"]
        ApprovAPI["/api/approvals"]
    end

    subgraph Services["Service Layer"]
        direction LR
        SkillSvc["SkillService"]
        ExecSvc["ExecutionService"]
        RBACSvc["RBACService"]
        McpSvc["McpClientService"]
        OpenApiSvc["OpenApiService"]
    end

    subgraph Modules["Core Runtime Modules"]
        direction LR
        GI["Graph Interpreter<br/>41 node types"]
        EE["Planner Engine<br/>LangGraph StateGraph"]
        EB["Event Bus<br/>19 event kinds"]
        TR["Tool Registry<br/>9 built-ins + MCP + OpenAPI"]
        AE["Approval Engine"]
        RAG["RAG Pipeline<br/>pgvector + hybrid RRF"]
        MCPServer["MCP Server<br/>/api/mcp/sse"]
    end

    subgraph Infra["Infrastructure Layer"]
        direction LR
        Prisma["Prisma ORM<br/>PostgreSQL + pgvector"]
        Clerk["Clerk Auth"]
        LLMRouter["LLM Router<br/>Groq + OpenRouter<br/>cooldown failover"]
        Pino["Pino Logger"]
    end

    Canvas --> CanvasAPI
    SkillsUI --> SkillsAPI
    ExecUI --> ExecAPI
    ReviewUI --> ApprovAPI
    MCPUI --> MCPAPI
    OpenAPIUI --> OpenAPIAPI

    SkillsAPI --> SkillSvc
    SkillsAPI --> RBACSvc
    ExecAPI --> ExecSvc
    CanvasAPI --> GI
    ApprovAPI --> AE
    MCPAPI --> McpSvc
    OpenAPIAPI --> OpenApiSvc

    ExecSvc --> GI
    ExecSvc --> EE
    GI --> TR
    EE --> TR
    GI --> AE
    EE --> AE
    GI --> EB
    GI --> LLMRouter
    EE --> LLMRouter
    TR --> RAG
    McpSvc --> TR
    OpenApiSvc --> TR
    MCPServer --> ExecSvc

    SkillSvc --> Prisma
    ExecSvc --> Prisma
    RAG --> Prisma
    RBACSvc --> Prisma
    API --> Clerk
    ExecSvc --> Pino

    classDef presentation fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef api fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef service fill:#10b981,stroke:#047857,color:#fff
    classDef module fill:#f59e0b,stroke:#b45309,color:#000
    classDef infra fill:#6b7280,stroke:#374151,color:#fff

    class Canvas,SkillsUI,ExecUI,ReviewUI,MCPUI,OpenAPIUI presentation
    class SkillsAPI,ExecAPI,CanvasAPI,MCPAPI,OpenAPIAPI,ApprovAPI api
    class SkillSvc,ExecSvc,RBACSvc,McpSvc,OpenApiSvc service
    class GI,EE,EB,TR,AE,RAG,MCPServer module
    class Prisma,Clerk,LLMRouter,Pino infra
```

### Data Flow — Execution Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant CV as Canvas / Skill UI
    participant API as /api/executions
    participant ES as ExecutionService
    participant GI as Graph Interpreter
    participant PE as Planner Engine
    participant TR as Tool Registry
    participant LLM as LLM Router
    participant EB as Event Bus
    participant SSE as /api/executions/:id/stream

    U->>CV: Run
    CV->>API: POST /api/executions {skillVersionId, inputData}
    API->>ES: startExecution()
    alt version has a graphDefinition
        ES->>GI: execute(graph, input)
        loop For each node
            GI->>EB: node:start
            GI->>LLM: agent / router / critic calls
            GI->>TR: tool, MCP and OpenAPI calls
            GI->>EB: node:end (+ tool:call / llm:call events)
            EB-->>SSE: stream event
            SSE-->>CV: live node highlight
        end
    else no graph
        ES->>PE: run LangGraph planner graph
        PE->>LLM: structured plan
        PE->>TR: execute steps (approval pauses when required)
    end
    ES-->>API: execution record
    EB-->>SSE: execution:status
    SSE-->>CV: final status + trace
```

### Data Flow — RAG Pipeline

```mermaid
graph LR
    DOC["Text / File / URL"] --> PARSE["File Parsers<br/>PDF · DOCX · HTML · CSV · …"]
    PARSE --> CHUNK["Chunking Service<br/>recursive · semantic · markdown · parent/child"]
    CHUNK --> EMB["Embedding Service<br/>Groq → OpenRouter → Ollama → local"]
    EMB --> PG["pgvector Store<br/>IVFFlat index"]
    Q["Query"] --> HYDE["Optional HyDE"]
    HYDE --> SEARCH["Dense + keyword search<br/>RRF fusion"]
    PG --> SEARCH
    SEARCH --> RR["Heuristic reranker"]
    RR --> QA["Grounded answer + citations"]
    QA --> EVAL["RAG triad evaluation"]
    PG --> CL["Cluster map (PCA)"]
```

### MCP Ecosystem Data Flow

```mermaid
graph TB
    subgraph External["External MCP Clients"]
        CUR["Cursor"]
        CLAUDE["Claude Desktop"]
        OTHER["Any MCP Client"]
    end

    subgraph Server["Agent Hub as MCP Server"]
        AUTH["Auth: Clerk session or MCP_ACCESS_TOKEN"]
        SSE["/api/mcp/sse · /api/mcp/messages<br/>Streamable HTTP"]
        SK["run_skill_* tools<br/>(published skills)"]
    end

    subgraph ClientSide["Agent Hub as MCP Client"]
        DIR["Directories<br/>Glama · mcp.so · Smithery · Composio · Arcade"]
        MCLI["McpClientService<br/>Streamable HTTP / SSE / stdio"]
        DISC["tools/list discovery + diffs"]
        REG["Tool Registry<br/>mcp_&lt;server&gt;_&lt;tool&gt;"]
    end

    CUR --> AUTH
    CLAUDE --> AUTH
    OTHER --> AUTH
    AUTH --> SSE --> SK
    DIR --> MCLI --> DISC --> REG
```

---

## Tool Registry

Every tool implements the `Tool` interface (`src/modules/tools/interfaces/Tool.ts`): `id`, `name`, `category`, READ/WRITE `type`, schemas, `requiresApproval`, `execute()`, `validate()` and `healthCheck()`.

| Tool ID | Category | Type | Approval Required | Description |
|---|---|---|:---:|---|
| `calculator` | `COMPUTE` | READ | No | Arithmetic, percentage, power and square root |
| `deterministic_condition` | `COMPUTE` | READ | No | Rule checks with 10 operators and an explanation |
| `code_execution` | `COMPUTE` | READ | No | Sandboxed JavaScript or Python |
| `document_search` | `SEARCH` | READ | No | pgvector search with keyword fallback |
| `record_lookup` | `DATA` | READ | No | Record retrieval from NocoDB or Postgres |
| `ai_extraction` | `DATA` | READ | No | LLM structured field extraction |
| `ai_classification` | `DATA` | READ | No | LLM classification into given categories |
| `final_report` | `TASK` | READ | No | Markdown report compilation |
| `mock_task_creator` | `TASK` | WRITE | Yes | Creates a task record, gated by HITL |

MCP tools (`mcp_<serverId>_<tool>`) and OpenAPI endpoints (`openapi_<integrationId>_<op>`) are registered dynamically alongside these.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components, Route Handlers, Turbopack), [React 19](https://react.dev/)
- **Visual graph & canvas**: [@xyflow/react (React Flow)](https://reactflow.dev/) with a custom auto-layout
- **Language & validation**: [TypeScript 5.9](https://www.typescriptlang.org/) (strict mode), [Zod](https://zod.dev/)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), next-themes (Calm Green / Punk × dark / light)
- **State management**: [TanStack Query v5](https://tanstack.com/query), [Zustand](https://zustand-demo.pmnd.rs/), [React Hook Form](https://react-hook-form.com/)
- **Database & ORM**: PostgreSQL + [pgvector](https://github.com/pgvector/pgvector) (e.g. [Neon](https://neon.tech/)), [Prisma 6](https://www.prisma.io/)
- **Authentication**: [Clerk](https://clerk.com/) v7
- **Agent runtime**: custom graph interpreter, plus [LangGraph.js](https://langchain-ai.github.io/langgraphjs/) for the planner engine
- **AI & LLM routing**: [Groq](https://groq.com/) and [OpenRouter](https://openrouter.ai/) through raw `fetch`, with a custom cooldown failover router
- **MCP**: [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) as both client and server
- **Streaming**: Server-Sent Events over the Web Streams API
- **Logging**: [Pino](https://getpino.io/)
- **Testing**: [Vitest](https://vitest.dev/) (86 test files across unit, integration, component and performance tests), [Playwright](https://playwright.dev/) (Chromium e2e smoke)

---

## Repository Structure

```
├── prisma/                 # schema.prisma (29 models, pgvector), seed.ts, baseline migration
├── src/
│   ├── app/
│   │   ├── api/            # 113 REST & SSE route handlers
│   │   ├── dashboard/      # canvas, skills, executions, history, review, compare, audit,
│   │   │                   # tools, a2a, evals, benchmarks, knowledge, settings
│   │   ├── docs/           # Swagger UI for /api/docs
│   │   ├── organizations/  # org management pages
│   │   ├── layout.tsx      # root layout: fonts, providers, header, sidebar, toaster
│   │   └── page.tsx        # landing page with the live canvas demo
│   ├── proxy.ts            # Next.js 16 proxy: Clerk route protection
│   ├── components/         # canvas, dashboard, skills, feedback, layout, providers, ui, …
│   ├── modules/            # graph, execution, approval, tools, mcp, openapi, rag, a2a, evals, …
│   ├── providers/llm/      # LLMProvider, Groq, OpenRouter, OpenAI-compatible, LLMRouter
│   ├── services/           # domain services (+ interfaces)
│   ├── repositories/       # Prisma repositories (+ interfaces)
│   ├── lib/                # composition root, API helpers, catalogs, converters, env, logger, vault
│   ├── validators/         # Zod request schemas
│   ├── types/              # shared TypeScript types
│   ├── hooks/ stores/ data/
├── tests/                  # unit/, integration/, performance/, components/
├── e2e/                    # Playwright specs
└── docker-compose.yml      # Postgres + pgvector and 9 optional microservices
```

For a description of every file, see **[frontend.md](frontend.md)** and **[backend.md](backend.md)**.

---

## Quickstart & Setup

### 1. Prerequisites
- **Node.js** 20.9 or newer (required by Next.js 16)
- **PostgreSQL with pgvector**: use the bundled Docker service or a hosted database such as [Neon](https://neon.tech/)
- **Clerk account** for authentication keys. Without keys, Clerk runs in keyless dev mode.
- Optional: a **Groq** and/or **OpenRouter** API key for LLM execution

### 2. Start a Database (optional, local)

```bash
docker compose up -d postgres   # pgvector/pgvector:pg16 on :5432
```

Other services (`searxng`, `crawl4ai`, `docling`, `gotenberg`, `nocodb`, `pocketbase`, `qdrant`, `whisper`, `piper`) are needed only by the matching graph nodes. Gotenberg binds host port 3000, which collides with `next dev`.

### 3. Environment Configuration

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|:---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (local Docker: `postgresql://agent:secret@localhost:5432/agentstudio`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `GROQ_API_KEY` | Optional* | Groq LLM and embeddings |
| `OPENROUTER_API_KEY` | Optional* | OpenRouter LLM, failover and embeddings |
| `VAULT_MASTER_KEY` | Prod | 64-hex-character key for encrypting secrets |
| `NEXT_PUBLIC_APP_URL` | Optional | App URL, sent as the OpenRouter attribution header |
| `MCP_ACCESS_TOKEN` | Optional | Bearer token external MCP clients use for `/api/mcp/sse` |
| `CRON_SECRET` | Optional | Bearer secret for `/api/triggers/cron/:id`; cron triggers are disabled without it |
| `A2A_ACCESS_TOKEN` | Optional | Bearer token external agents use for `/api/a2a/tasks` |

\* At least one LLM key is needed to execute agents. The full list (catalog keys, microservice hosts, A2A registry, …) is in [backend.md](backend.md#environment-variables-envexample).

### 4. Install & Initialize Database

```bash
npm install          # also runs prisma generate (postinstall)
npm run db:migrate   # apply the baseline migration (prisma migrate deploy)
```

If your database was created earlier with `db:push`, run `npx prisma migrate resolve --applied 0_init` once instead, then use `db:migrate` from then on.

### 5. Optional: Seed Demo Workspace

The seed creates built-in tool definitions, MCP presets, a published demo skill, and a demo organization with a custom role:

```bash
SEED_USER_ID=<your-clerk-user-id> npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If your `.env` sets `NODE_ENV=development`, build with `NODE_ENV=production npm run build`.

---

## API & Streaming Endpoints

All `/api/*` routes require a Clerk session, enforced by `src/proxy.ts`. The exceptions authenticate callers themselves:

| Route | Accepted auth |
|---|---|
| `/api/health`, `/api/a2a/manifest` | Public |
| `/api/mcp/sse`, `/api/mcp/messages` | Clerk session or `MCP_ACCESS_TOKEN` bearer |
| `/api/a2a/tasks` | Clerk session or `A2A_ACCESS_TOKEN` bearer |
| `/api/triggers/webhook/:token` | Webhook token (+ HMAC) |
| `/api/triggers/cron/:id` | `CRON_SECRET` bearer |

The core skill and execution routes also accept org API keys (`X-API-Key: as_…`); see [backend.md](backend.md#api-routes-srcappapi).

Responses use a standard envelope:

```jsonc
{ "success": true, "data": { /* result */ } }
{ "success": false, "error": "message", "code": "VALIDATION_ERROR", "fields": { /* optional */ } }
```

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET / POST` | `/api/skills` | List skills (search, filter, sort) or create a skill |
| `GET / PATCH / DELETE` | `/api/skills/:id` | Get, edit the draft, or soft-delete a skill |
| `POST` | `/api/skills/:id/publish` · `/archive` · `/restore` · `/duplicate` | Skill lifecycle actions |
| `GET / POST` | `/api/executions` | List executions or start one |
| `GET` | `/api/executions/:id/detail` | Full trace: steps, tool calls, logs |
| `GET` | `/api/executions/:id/stream` | **SSE**: live execution events |
| `POST` | `/api/executions/:id/replay` · `/retry` · `/cancel` · `/resume` | Run control |
| `POST` | `/api/canvas/preview` | Start a ghost (dry-run) preview |
| `GET` | `/api/canvas/preview/:id/stream` | **SSE**: preview trace |
| `GET / POST` | `/api/approvals` | List approvals or approve/reject (idempotent) |
| `GET` | `/api/audit` | Audit history with JSON export |
| `GET` | `/api/models` | Live model catalog and pricing |
| `GET` | `/api/workflows/search` · `/dify/:id` · `/n8n/:id` | Workflow search and conversion |
| `GET` | `/api/health` | Public health probe |
| `GET / POST` | `/api/mcp/servers` | List or create MCP servers |
| `POST` | `/api/mcp/servers/:id/connect` · `/discover` | Connect and discover tools |
| `GET` | `/api/mcp/directory` | Public MCP directory |
| `GET / POST` | `/api/mcp/sse`, `POST /api/mcp/messages` | **Agent Hub as an MCP server** |
| `GET` | `/api/openapi/directory` | APIs.guru directory |
| `GET / POST` | `/api/openapi/integrations` | List or mount OpenAPI integrations |
| `GET / POST / DELETE` | `/api/triggers` | Webhook and cron triggers |
| `GET / POST` | `/api/triggers/webhook/:token` | Inbound webhook (HMAC verified) |
| `POST` | `/api/triggers/cron/:id` | Run a cron schedule |
| `GET` | `/api/docs` | OpenAPI spec (rendered at `/docs`) |

The complete list of all 113 routes, with auth, rate limits and validators, is in [backend.md → API Routes](backend.md#api-routes-srcappapi). The detailed Skills API reference is in [backend.md → Skills API Reference](backend.md#skills-api-reference).

---

## Testing & Verification

```bash
npm test                  # Vitest: unit + integration + component suites (excludes perf)
npm run test:unit         # tests/unit only
npm run test:integration  # route handlers called directly with mocked deps
npm run test:e2e          # Playwright (starts the dev server automatically)
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run build             # production build
```

- **What needs infrastructure.** Most suites use in-memory fakes. These three hit a real database through `DATABASE_URL`:
  - `tests/unit/modules/tools/documentSearch`
  - `tests/unit/modules/tools/recordLookup`
  - `tests/unit/modules/tools/mockTaskCreator`
- **Performance tests.** `npm run test:performance` needs a running server and uses POSIX env syntax, so run it from a POSIX shell such as Git Bash.

---

## Contributing

### Workflow
1. **Branch** per change: `feat/<module>-<description>` or `fix/<description>`.
2. **Keep PRs focused**: one logical change per PR.
3. **Commit messages**: conventional style, imperative mood. For example, `feat: add skill version history` or `fix: clear draft pointer on publish`.
4. **Follow the conventions** for your area:
   - frontend: [frontend.md → Frontend Conventions](frontend.md#frontend-conventions)
   - backend: [backend.md → Backend Conventions](backend.md#backend-conventions-as-practiced)

### PR Checklist
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm test` is green, and new logic has new tests (services, validators, modules)
- [ ] `NODE_ENV=production npm run build` compiles
- [ ] Route handlers stay thin (auth → validate → call a service → respond); business logic lives in services/modules
- [ ] External input is validated with Zod schemas from `src/validators/`
- [ ] Shared error handlers are used, no internal error messages leak in 500s, and not-found and no-access both return 404
- [ ] Every query is scoped to the authenticated user or org
- [ ] Structured `logger` calls (no `console.log`); mutations write audit entries with `UPPER_SNAKE_CASE` actions
- [ ] Multi-step DB writes use `prisma.$transaction`
- [ ] No direct LLM vendor calls; everything goes through `LLMProvider`/`LLMRouter`
- [ ] New env vars are added to `.env.example` and `src/lib/config/env.ts`
- [ ] Existing feedback and layout components are reused
- [ ] `frontend.md` / `backend.md` are updated for any file you add, remove or repurpose

---

## In Development Features

- **RBAC hardening**: invitation emails are generated but not yet sent, and the org-skill permission endpoints are still stubs.
- **Wider API-key coverage**: org API keys work on the core skill and execution routes. The remaining routes are session-only.
- **Community Skill & Graph Marketplace**: publishing, rating and one-click cloning of agent workflows.
- **Notification integrations**: Slack, Discord and webhook alerts for approvals and failed runs.
- **Per-node cost attribution**: token and dollar tracking per canvas node.

Known gaps are listed in [frontend.md → Known Gaps](frontend.md#known-gaps) and [backend.md → Known issues](backend.md#known-issues).

---

## Upcoming Features

- **Federated MCP Network Gateway**: zero-configuration local network discovery and peer-to-peer proxying for MCP tools.
- **Automated prompt & graph self-refinement**: LLM-judge benchmark loops that propose and validate graph optimizations.
- **Air-gapped local model runtime**: WebAssembly, Pyodide and Ollama for fully offline execution.
- **Distributed checkpointing**: Redis-backed event bus and execution checkpoints for horizontal scaling.

---

## 👨‍💻 Developer & Maintainer

```typescript
interface Developer {
  name: "Soumya Singh";
  github: "https://github.com/Mentrauz/";
  role: "Fullstack Developer";
  project: "Agent Hub";
  stack: ["Next.js 16", "React 19", "TypeScript", "XYFlow", "MCP", "Prisma", "PostgreSQL"];
  mission: "Architecting autonomous visual agent ecosystems and multi-agent workflows 🚀";
}
```

<p align="left">
  <b>Engineered with ❤️ & ☕ by <a href="https://github.com/Mentrauz/">Soumya Singh (@Mentrauz)</a></b>
</p>

---

## License

This project is open-source software licensed under the **MIT License**.
