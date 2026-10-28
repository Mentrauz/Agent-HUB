# Agent Hub — Frontend Reference

> **Agent Hub** (npm package `agent-studio`, v0.6) is a visual AI-agent and multi-agent orchestration platform. It is built on the Next.js App Router. Users:
> - design agent graphs on an `@xyflow/react` canvas
> - manage versioned skills
> - review HITL approvals
> - browse MCP / OpenAPI / workflow marketplaces
> - watch executions stream live
>
> This document covers everything in the browser: pages, components, hooks, stores, styling and frontend tests. API routes, services, runtime, database and configuration are in **[backend.md](backend.md)**. Setup and contribution workflow are in **[README.md](README.md)**.

Every file listed here was checked against the source on 2026-10-28. Where the code and older docs disagreed, this file follows the code.

## Contents
1. [Stack](#stack)
2. [Commands](#commands)
3. [App Structure](#app-structure)
4. [Frontend Conventions](#frontend-conventions)
5. [Theming & Styling](#theming--styling)
6. [Known Gaps](#known-gaps)
7. [Route Map](#route-map)
8. [Pages (`src/app/`)](#pages-srcapp)
9. [Components (`src/components/`)](#components-srccomponents)
10. [Hooks, Stores & Data](#hooks-stores--data)
11. [Frontend Tests](#frontend-tests)
12. [Frontend Root Files](#frontend-root-files)

## Stack
| Concern | Technology (from `package.json`) |
|---|---|
| Framework | Next.js `^16.4.3` App Router (Turbopack dev), React `^19.3.1`, TypeScript strict |
| Canvas | `@xyflow/react ^12.12.0`, with a custom dependency-free BFS auto-layout (no Dagre) |
| Server state | TanStack Query `^5.105.0`; typed fetch clients in [`src/lib/api/*`](backend.md#shared-library-srclib) |
| Client state | Zustand `^5.0.16` (toasts), React context (sidebar) |
| Forms | `react-hook-form` + `@hookform/resolvers` (`zodResolver` with schemas from `src/validators/`) |
| Auth UI | Clerk `^7.9.22` (`ClerkProvider` themed per app theme, `UserButton`, `UserProfile`, `<Show>`) |
| Styling | Tailwind CSS `^4.3.3` (via `@tailwindcss/postcss`) with CSS-variable theme tokens; `next-themes ^0.4.6`; `lucide-react` icons |
| Fonts | Geist, Geist Mono and VT323 (pixel font) via `next/font` |
| Export | `html-to-image` (PNG/SVG), `jspdf` (PDF) |
| Tests | Vitest + Testing Library (jsdom); Playwright (Chromium only) |

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 (Turbopack). Use `dev:webpack` to run with webpack instead. |
| `npm run build` / `npm start` | Production build and serve. |
| `npm run lint` / `npm run typecheck` | ESLint (`eslint-config-next`) and `tsc --noEmit`. |
| `npm test` | All Vitest suites, including the `components` jsdom project. Excludes perf. |
| `npm run test:e2e` | Playwright. Starts `npm run dev` itself unless `CI` is set, and waits for `/api/health`. Override the URL with `E2E_BASE_URL`. |

## App Structure
- **Root layout** ([`src/app/layout.tsx`](src/app/layout.tsx)). This server component:
  - loads the fonts;
  - wraps everything in `<Providers>`;
  - mounts the global `Header`, `Sidebar`, `<main id="main-content">` and `Toaster`.

  Because this chrome lives in the root layout, it also wraps the landing page, `/docs` and the 404 page.
- **Provider order** ([`src/app/providers.tsx`](src/app/providers.tsx)): `ThemeProvider` (next-themes) → `PixelThemeTransitionProvider` → `ClerkDynamicProvider` → `QueryProvider` → `SidebarProvider`.
- **Dashboard layout** ([`src/app/dashboard/layout.tsx`](src/app/dashboard/layout.tsx)). Only calls `ensureUserExists(userId)`; it adds no UI.
- **Auth.** [`src/proxy.ts`](src/proxy.ts) protects `/dashboard`, `/executions`, `/versions`, `/approvals` and `/api`. Other pages (`/`, `/docs`, `/organizations`, `/invitations/*`, `/loading`) are not protected by the proxy.
- **Server vs. client components.**
  - Server components: root layout, landing page, `/docs` page, dashboard layout, dashboard home, `tools/page.tsx`, `tools/[name]/page.tsx`, the redirect pages, and every `loading.tsx` except `/loading/page.tsx`. These call repositories and services directly, not the HTTP API.
  - Everything else is `"use client"`.
- **Data fetching.**
  - Core CRUD pages use React Query with the typed clients `skillsApi`, `executionsApi`, `compareApi`, `auditApi` and `modelsApi`.
    - Query keys: `["skills"]`, `["skill", id]`, `["executions", …]`, `["execution", id]`, `["metrics"]`, `["approvals"]`.
    - Mutations invalidate those keys.
  - Newer areas use raw `fetch`, sometimes wrapped in `useQuery`: A2A, knowledge, MCP/OpenAPI hubs, marketplaces and organizations.
  - `QueryProvider` sets `staleTime` to 60s and turns off refetch on window focus.
  - The dashboard home polls stats every 12s.
- **Live updates.** Only three things stream:
  - `useExecutionStream`: canvas trace mode, `EventSource` on `/api/executions/:id/stream` or the preview stream.
  - The MCP progress tab.
  - `LiveSandbox`.

  The execution detail page does **not** poll.
- **Loading screens.**
  - [`AgentStudioPreloader`](src/components/feedback/AgentStudioPreloader.tsx) is a skippable "Linux boot" animation. It is the root and dashboard `loading.tsx`, and also the `/loading` page.
  - Routes with their own `loading.tsx` show a matching `Skeleton*` instead.
  - Canvas, A2A, knowledge, evals and benchmarks have no `loading.tsx`, so they show the full preloader.

## Frontend Conventions
These come from the old CONTRIBUTING guide and were re-checked against the code.
- **Server components by default.** Add `"use client"` only for interactivity. Server components read data with `auth()` plus repositories or services.
- **Forms.** React Hook Form + `zodResolver` + schemas from `src/validators/`. JSON editors must validate before submit; [`JsonEditorModal`](src/components/common/JsonEditorModal.tsx) requires an object at the root.
- **State.** TanStack Query for server state and mutations; Zustand for global client state (toasts). Avoid prop-drilling global state.
- **Reuse the feedback components:**
  - `EmptyState`
  - `Skeleton*`; the file is `Skeleton.tsx` (there is no `LoadingSkeleton`)
  - `ConfirmDialog`
  - `ErrorBoundary`
  - `Toaster` together with `toast.success|error|info`

  Every data-heavy page needs loading, empty and error states.
- **Styling.** Tailwind plus theme tokens:
  - surfaces: `--surface-base|raised|sunken|elevated`
  - text: `--text-primary|secondary|muted`
  - accent and borders: `--accent-primary`, `--border-subtle|strong`
  - calls to action: `--cta-*`
  - pixel font: `font-pixel`

  Newer primitives (`ui/*`, Header, Sidebar, ThemePicker) use the tokens. Older feature components still hard-code `slate`/`indigo` with `dark:` variants; prefer tokens in new code.
- **Modals** are hand-rolled: a fixed overlay with `role="dialog"`, usually closable with Esc. There is no Radix or shadcn.
- **Imports and code style:**
  - Use the `@/` alias.
  - Use 2-space indent, double quotes and semicolons.
  - ESLint warns on `any`. JSX comment text nodes are allowed, because the terminal style renders `// LABEL` as text.

## Theming & Styling
- **Themes.** There are four next-themes themes (`attribute="class"`, system theme disabled), named `<identity>-<appearance>`:
  - `calm-green-dark` (the default)
  - `calm-green-light`
  - `punk-dark`
  - `punk-light`
- **Applying a theme.** [`ThemeProvider`](src/components/providers/ThemeProvider.tsx) mirrors the theme onto `<html>`:
  - attributes `data-theme-identity`, `data-theme-appearance` and `data-theme`;
  - the `.dark` or `.light` class, so Tailwind's `dark:` variant works.

  It also migrates the legacy `dark`/`light` values stored in localStorage.
- **Switching themes.** [`ThemePicker`](src/components/ui/ThemePicker.tsx) in the header offers Mode (Light/Dark/System) and Color (Calm Green/Punk). It switches through [`PixelThemeTransition`](src/components/effects/PixelThemeTransition.tsx), a canvas pixel-dissolve that starts at the click point. Users with reduced motion get an instant switch.
- **Clerk.** [`ClerkDynamicProvider`](src/components/providers/ClerkDynamicProvider.tsx) builds Clerk's appearance from the active theme.
- **Stylesheet.** [`globals.css`](src/app/globals.css) (about 2,000 lines) contains:
  - `@import "tailwindcss"` plus `@config "../../tailwind.config.ts"`;
  - the theme token blocks;
  - `font-pixel` and `text-pixel-glow`;
  - glitch, CRT and shimmer effects;
  - React Flow overrides;
  - canvas execution animations;
  - preloader and 404 keyframes;
  - reduced-motion guards.
- **Fonts.** VT323 is loaded three times: by `next/font`, by a `<link>` in the layout, and by `@import` in the CSS.

## Known Gaps
These were found while verifying, and are worth fixing or knowing about:
1. **Settings page theme picker.** It sets `"dark"`/`"light"`, which are not valid theme names, so its active state never matches `calm-green-dark`. Use the header `ThemePicker` instead.
2. **Unreachable views.** `skills/page.tsx` has `"n8n"` and `"dify"` view modes that no button sets, so `N8nWorkflowsMarketplace` and `DifyWorkflowsMarketplace` are never shown.
3. **Unused code:** `usePermissions`, `OrganizationSwitcher`, `ParallelBranchProgress`, `ui/Button`, `ui/Card`, `ui/Badge`.
4. **Placeholder invitation page.** `invitations/[token]` shows hard-coded invitation details.
5. **A2A page fakes some behaviour:**
   - Delegation is plain JSON, not streaming.
   - "Inject human argument" stays local and is never sent.
   - Debate stances are hard-coded.
6. **Install state is per browser.** Marketplace and pack "installed" state lives in localStorage, so it can drift from the DB. Also, the synthesizer's Install re-runs the LLM, so the result may differ from the preview.
7. **Global tool counts.** `tools/page.tsx` shows usage counts for all users, not just the current one.
8. **Execution detail doesn't update live.** It never auto-refreshes, and `dashboard/error.tsx` has no retry action.
9. **Versions page.** Every row links to the same `/edit` page, and there is no rollback.
10. **Knowledge page evaluation uses stale chunks.** The RAG evaluation sends the previous search results, not the chunks the QA answer actually used.
11. **Canvas features that aren't wired up:**
    - Breakpoints (`data.breakpoint`) are never read by the runtime.
    - The `DebuggerPanel` step controls are not wired.
    - `CollaborationOverlay` only works between tabs of one browser (`BroadcastChannel`).

## Route Map
| URL | Page file | Purpose |
|---|---|---|
| `/` | [`src/app/page.tsx`](src/app/page.tsx) | Public landing page |
| `/docs` | [`src/app/docs/page.tsx`](src/app/docs/page.tsx) | Swagger UI for `/api/docs` |
| `/organizations`, `/organizations/[id]` | [`page.tsx`](src/app/organizations/page.tsx), [`[id]/page.tsx`](src/app/organizations/[id]/page.tsx) | Org list, create and settings |
| `/invitations/[token]` | [`src/app/invitations/[token]/page.tsx`](src/app/invitations/[token]/page.tsx) | Accept an org invitation |
| `/loading` | [`src/app/loading/page.tsx`](src/app/loading/page.tsx) | Preloader for 3.2s, then `/dashboard` |
| `/approvals`, `/versions` | redirects | → `/dashboard/review`, → `/dashboard/compare` |
| `/dashboard` | [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) | Cockpit with server-fetched 7-day stats |
| `/dashboard/canvas` | [`canvas/page.tsx`](src/app/dashboard/canvas/page.tsx) | Template gallery and the user's graph skills |
| `/dashboard/canvas/new` | [`canvas/new/page.tsx`](src/app/dashboard/canvas/new/page.tsx) | New graph: blank, `?template=`, `?n8nId=` or `?difyId=` |
| `/dashboard/canvas/[id]` | [`canvas/[id]/page.tsx`](src/app/dashboard/canvas/[id]/page.tsx) | Graph editor: autosave, run, replay, ghost preview, diff |
| `/dashboard/canvas/[id]/snapshot` | [`snapshot/page.tsx`](src/app/dashboard/canvas/[id]/snapshot/page.tsx) | Read-only graph with the last run and coverage |
| `/dashboard/skills` | [`skills/page.tsx`](src/app/dashboard/skills/page.tsx) | Studio registry, plus Marketplace, Workflows, Packs and Synthesize sub-views |
| `/dashboard/skills/new` | [`skills/new/page.tsx`](src/app/dashboard/skills/new/page.tsx) | Create-skill form (`?template=`) |
| `/dashboard/skills/[id]` | [`skills/[id]/page.tsx`](src/app/dashboard/skills/[id]/page.tsx) | Skill detail: run, publish, lifecycle actions |
| `/dashboard/skills/[id]/edit` | [`edit/page.tsx`](src/app/dashboard/skills/[id]/edit/page.tsx) | Edit the draft |
| `/dashboard/skills/[id]/versions` | [`versions/page.tsx`](src/app/dashboard/skills/[id]/versions/page.tsx) | Version list |
| `/dashboard/executions` | [`executions/page.tsx`](src/app/dashboard/executions/page.tsx) | Run list: filter, replay, export |
| `/dashboard/executions/[id]` | [`executions/[id]/page.tsx`](src/app/dashboard/executions/[id]/page.tsx) | Run detail and timeline: cancel, retry, replay, export |
| `/dashboard/history` | [`history/page.tsx`](src/app/dashboard/history/page.tsx) | Metric tiles and the last 50 runs |
| `/dashboard/review` | [`review/page.tsx`](src/app/dashboard/review/page.tsx) | HITL queue: approve, reject, cancel |
| `/dashboard/compare` | [`compare/page.tsx`](src/app/dashboard/compare/page.tsx) | Field-level diff of two versions |
| `/dashboard/audit` | [`audit/page.tsx`](src/app/dashboard/audit/page.tsx) | Audit log and JSON export |
| `/dashboard/tools` (`?tab=mcp\|openapi`, `?category=`) | [`tools/page.tsx`](src/app/dashboard/tools/page.tsx) | Built-in tool matrix, MCP Server Hub, OpenAPI Hub |
| `/dashboard/tools/[name]` | [`tools/[name]/page.tsx`](src/app/dashboard/tools/[name]/page.tsx) | Tool detail, health, the user's recent calls |
| `/dashboard/a2a` | [`a2a/page.tsx`](src/app/dashboard/a2a/page.tsx) | A2A discovery, delegation, auction, debate |
| `/dashboard/evals` | [`evals/page.tsx`](src/app/dashboard/evals/page.tsx) | Eval runs, datasets, comparison |
| `/dashboard/benchmarks` | [`benchmarks/page.tsx`](src/app/dashboard/benchmarks/page.tsx) | Benchmark suites, scorecards, model comparison |
| `/dashboard/knowledge` | [`knowledge/page.tsx`](src/app/dashboard/knowledge/page.tsx) | RAG ingest, search/QA, evaluation, cluster map, documents |
| `/dashboard/settings` | [`settings/page.tsx`](src/app/dashboard/settings/page.tsx) | Theme, providers and models, model test, profile, secret vault |
| `/dashboard/workflows[/id[/edit]]` | redirects | → the matching `/dashboard/skills` route |

## Pages (`src/app/`)

### Root
| File | Purpose |
|---|---|
| [`src/app/layout.tsx`](src/app/layout.tsx) | Root server layout. Loads Geist, Geist Mono and VT323 (`--font-geist`, `--font-mono`, `--font-vt323`), adds a skip link, and wraps every route in `Providers` with the global Header, Sidebar, main and Toaster. Theme color is `#000`. |
| [`src/app/providers.tsx`](src/app/providers.tsx) | Client provider tree: Theme → PixelThemeTransition → Clerk → Query → Sidebar. |
| [`src/app/globals.css`](src/app/globals.css) | Tailwind v4 entry: theme tokens, pixel and glow utilities, effects, React Flow overrides, animations, reduced-motion guards. |
| [`src/app/page.tsx`](src/app/page.tsx) | Public landing page (server). Static marketing sections, plus `LiveAgentCanvasDemo`, `HeroAuthSection`, `FooterAuthCTA` and `FooterPortfolioWidget`, loaded with `next/dynamic`. |
| [`src/app/loading.tsx`](src/app/loading.tsx) | Root loading boundary that renders `AgentStudioPreloader`. |
| [`src/app/loading/page.tsx`](src/app/loading/page.tsx) | `/loading`: plays the preloader for 3.2s, then `router.replace("/dashboard")`. Nothing links here. |
| [`src/app/not-found.tsx`](src/app/not-found.tsx) | Animated 404 radar screen that plays a fake "self-healing" sequence and then sends the user to `/`. Has nav links and a sign-in button. |
| [`src/app/global-error.tsx`](src/app/global-error.tsx) | Root error boundary with its own `<html>`/`<body>`, showing "SYSTEM ERROR" and a retry (`reset()`) button. |
| [`src/app/approvals/page.tsx`](src/app/approvals/page.tsx) | Server redirect to `/dashboard/review`. |
| [`src/app/versions/page.tsx`](src/app/versions/page.tsx) | Server redirect to `/dashboard/compare`. |

### docs, organizations, invitations
| File | Purpose |
|---|---|
| [`src/app/docs/page.tsx`](src/app/docs/page.tsx) | Server page that sets the API docs metadata and renders `ApiDocsClient`. |
| [`src/app/docs/ApiDocsClient.tsx`](src/app/docs/ApiDocsClient.tsx) | Loads Swagger UI 5 from unpkg at runtime and points it at `/api/docs` with try-it-out enabled. |
| [`src/app/organizations/page.tsx`](src/app/organizations/page.tsx) | Lists the user's orgs (`GET /api/organizations`) and creates them in a modal (`POST`). |
| [`src/app/organizations/[id]/page.tsx`](src/app/organizations/[id]/page.tsx) | Loads one org, shows a summary, and delegates everything else to `OrganizationSettings`. |
| [`src/app/invitations/[token]/page.tsx`](src/app/invitations/[token]/page.tsx) | Accept page. It shows hard-coded invitation details, accepts via `POST /api/invitations/{token}/accept`, then redirects to `/dashboard`. |

### dashboard (shell)
| File | Purpose |
|---|---|
| [`src/app/dashboard/layout.tsx`](src/app/dashboard/layout.tsx) | Server layout that only calls `ensureUserExists` for the Clerk user. |
| [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) | Server page: `DashboardStatsService.getDashboardStats(userId, "7d")` → `DashboardClientView`. |
| [`src/app/dashboard/loading.tsx`](src/app/dashboard/loading.tsx) | Full-screen preloader; the fallback for dashboard routes that have no `loading.tsx`. |
| [`src/app/dashboard/error.tsx`](src/app/dashboard/error.tsx) | Error boundary that shows the message, with no retry. |

### dashboard/canvas
| File | Purpose |
|---|---|
| [`src/app/dashboard/canvas/page.tsx`](src/app/dashboard/canvas/page.tsx) | Gallery of `CANVAS_TEMPLATES` and the user's skills that have a `graphDefinition`. |
| [`src/app/dashboard/canvas/new/page.tsx`](src/app/dashboard/canvas/new/page.tsx) | New-graph form. Can prefill from a template, an n8n template or a Dify template, then creates the skill and opens the editor. |
| [`src/app/dashboard/canvas/[id]/page.tsx`](src/app/dashboard/canvas/[id]/page.tsx) | Graph editor on `AgentGraphCanvas`. Features:<br>• autosave 1.2s after an edit, plus manual save<br>• run<br>• deterministic replay<br>• ghost preview (`POST /api/canvas/preview`)<br>• diff against the published version<br>• coverage and analytics from the last 50 runs<br>• a snapshot link |
| [`src/app/dashboard/canvas/[id]/snapshot/page.tsx`](src/app/dashboard/canvas/[id]/snapshot/page.tsx) | Read-only canvas showing the published, draft or first version, with the latest run and edge coverage. |

### dashboard/skills
| File | Purpose |
|---|---|
| [`src/app/dashboard/skills/page.tsx`](src/app/dashboard/skills/page.tsx) | Studio registry: filters, lifecycle mutations with `ConfirmDialog`, workflow blueprints, and sub-views (Marketplace, Workflows, Packs, Synthesize). |
| [`src/app/dashboard/skills/loading.tsx`](src/app/dashboard/skills/loading.tsx) | `SkeletonSkills`. |
| [`src/app/dashboard/skills/new/page.tsx`](src/app/dashboard/skills/new/page.tsx) | `SkillForm` in create mode, optionally prefilled from `WORKFLOW_TEMPLATES`. |
| [`src/app/dashboard/skills/new/loading.tsx`](src/app/dashboard/skills/new/loading.tsx) | `SkeletonSkillForm`. |
| [`src/app/dashboard/skills/[id]/page.tsx`](src/app/dashboard/skills/[id]/page.tsx) | Skill detail with a JSON run-input editor, plus publish, duplicate, restore, archive and delete. |
| [`src/app/dashboard/skills/[id]/loading.tsx`](src/app/dashboard/skills/[id]/loading.tsx) | `SkeletonSkillDetail`. |
| [`src/app/dashboard/skills/[id]/edit/page.tsx`](src/app/dashboard/skills/[id]/edit/page.tsx) | `SkillForm` in edit mode; saving creates a new draft version. |
| [`src/app/dashboard/skills/[id]/edit/loading.tsx`](src/app/dashboard/skills/[id]/edit/loading.tsx) | `SkeletonSkillForm`. |
| [`src/app/dashboard/skills/[id]/versions/page.tsx`](src/app/dashboard/skills/[id]/versions/page.tsx) | Version list, newest first, with status, draft and live badges. |
| [`src/app/dashboard/skills/[id]/versions/loading.tsx`](src/app/dashboard/skills/[id]/versions/loading.tsx) | `SkeletonVersions`. |
| [`src/app/dashboard/skills/marketplace/SkillsMarketplace.tsx`](src/app/dashboard/skills/marketplace/SkillsMarketplace.tsx) | Paged MCP skill feed. Install mounts the required MCP servers (Composio, Arcade or directory) and then creates the skill. Install state is kept in localStorage. Includes `LiveSandbox`. |
| [`src/app/dashboard/skills/marketplace/UnifiedWorkflowsMarketplace.tsx`](src/app/dashboard/skills/marketplace/UnifiedWorkflowsMarketplace.tsx) | Paged search over n8n, Dify and studio workflows (`/api/workflows/search`), with filters, caching, prefetch and a detail modal. |
| [`src/app/dashboard/skills/marketplace/N8nWorkflowsMarketplace.tsx`](src/app/dashboard/skills/marketplace/N8nWorkflowsMarketplace.tsx) | n8n template browser; imports a template as a skill or opens it on the canvas. *Currently unreachable.* |
| [`src/app/dashboard/skills/marketplace/DifyWorkflowsMarketplace.tsx`](src/app/dashboard/skills/marketplace/DifyWorkflowsMarketplace.tsx) | Dify template browser; copies the DSL or opens it on the canvas. *Currently unreachable.* |
| [`src/app/dashboard/skills/packs/SkillPackMarketplace.tsx`](src/app/dashboard/skills/packs/SkillPackMarketplace.tsx) | Browses `SKILL_PACKS` and installs one via `POST /api/skills/packs`. Installed pack IDs are kept in localStorage. |
| [`src/app/dashboard/skills/synthesizer/SkillSynthesizer.tsx`](src/app/dashboard/skills/synthesizer/SkillSynthesizer.tsx) | Prompt-to-skill UI: previews the planned servers and graph, then Install calls `/api/skills/synthesize` with `autoMount: true`. |

### dashboard/executions, history, review, compare, audit
| File | Purpose |
|---|---|
| [`src/app/dashboard/executions/page.tsx`](src/app/dashboard/executions/page.tsx) | Run table: debounced search, status filter, sort, and per-row replay and JSON export. |
| [`src/app/dashboard/executions/loading.tsx`](src/app/dashboard/executions/loading.tsx) | `SkeletonExecutions`. |
| [`src/app/dashboard/executions/[id]/page.tsx`](src/app/dashboard/executions/[id]/page.tsx) | Run detail: timeline, steps, tool calls, logs and input/output JSON. Actions: cancel, retry, replay, export. Refresh is manual. |
| [`src/app/dashboard/executions/[id]/loading.tsx`](src/app/dashboard/executions/[id]/loading.tsx) | `SkeletonExecutionDetail`. |
| [`src/app/dashboard/history/page.tsx`](src/app/dashboard/history/page.tsx) | Four metric tiles (`executionsApi.metrics`) and a searchable table of the last 50 runs. |
| [`src/app/dashboard/history/loading.tsx`](src/app/dashboard/history/loading.tsx) | `SkeletonHistory`. |
| [`src/app/dashboard/review/page.tsx`](src/app/dashboard/review/page.tsx) | HITL queue with Pending and History tabs. Each call sends the request's idempotency key:<br>• **Approve:** `POST /api/approvals`, then `executionsApi.resume`.<br>• **Reject:** `POST /api/approvals` with a reason.<br>• **Cancel:** `POST /api/approvals/{id}/cancel`. |
| [`src/app/dashboard/review/loading.tsx`](src/app/dashboard/review/loading.tsx) | `SkeletonReview`. |
| [`src/app/dashboard/compare/page.tsx`](src/app/dashboard/compare/page.tsx) | Pick a skill and two versions to get a field-level `VersionDiffResult`. |
| [`src/app/dashboard/compare/loading.tsx`](src/app/dashboard/compare/loading.tsx) | `SkeletonCompare`. |
| [`src/app/dashboard/audit/page.tsx`](src/app/dashboard/audit/page.tsx) | Audit log table (search, action filter, limit 200) with JSON export. |
| [`src/app/dashboard/audit/loading.tsx`](src/app/dashboard/audit/loading.tsx) | `SkeletonAudit`. |

### dashboard/tools
| File | Purpose |
|---|---|
| [`src/app/dashboard/tools/page.tsx`](src/app/dashboard/tools/page.tsx) | Server page with three tabs selected by `?tab=`:<br>• **default:** the built-in tool matrix, with a health probe for each tool and call counts<br>• **`mcp`:** `McpServerHub`<br>• **`openapi`:** `OpenApiHub` |
| [`src/app/dashboard/tools/loading.tsx`](src/app/dashboard/tools/loading.tsx) | `SkeletonToolRegistry`. |
| [`src/app/dashboard/tools/[name]/page.tsx`](src/app/dashboard/tools/[name]/page.tsx) | Server tool detail: schema JSON, health, and the user's usage and last 10 calls. |
| [`src/app/dashboard/tools/[name]/loading.tsx`](src/app/dashboard/tools/[name]/loading.tsx) | `SkeletonToolDetail`. |
| [`src/app/dashboard/tools/mcp/McpServerHub.tsx`](src/app/dashboard/tools/mcp/McpServerHub.tsx) | MCP manager (about 2,650 lines):<br>• server CRUD, import and batch actions<br>• connect, discover and health checks<br>• presets<br>• tool-update diffs<br>• an inspector with tabs for tools, resources, prompts, sampling and progress (SSE)<br>• embeds the directory browser |
| [`src/app/dashboard/tools/mcp/McpDirectoryBrowser.tsx`](src/app/dashboard/tools/mcp/McpDirectoryBrowser.tsx) | Public MCP directory search across Glama, mcp.so, Smithery, Composio, Arcade and mcpservers.org, with quality grades, GitHub README and changelog, health check and mount. |
| [`src/app/dashboard/tools/openapi/OpenApiHub.tsx`](src/app/dashboard/tools/openapi/OpenApiHub.tsx) | OpenAPI manager with Connected, Presets and Directory modes; hosts the import and tester modals. |
| [`src/app/dashboard/tools/openapi/OpenApiDirectoryBrowser.tsx`](src/app/dashboard/tools/openapi/OpenApiDirectoryBrowser.tsx) | APIs.guru directory search. The detail view parses the spec to list endpoints, and can hand off to the importer. |
| [`src/app/dashboard/tools/openapi/OpenApiImportModal.tsx`](src/app/dashboard/tools/openapi/OpenApiImportModal.tsx) | Import from a spec URL or text: parse, choose endpoints, configure auth, test, then save. |
| [`src/app/dashboard/tools/openapi/OpenApiEndpointTesterModal.tsx`](src/app/dashboard/tools/openapi/OpenApiEndpointTesterModal.tsx) | Fills in params and a sample body, then calls the saved-integration test endpoint or the raw test endpoint. |

### dashboard (other areas)
| File | Purpose |
|---|---|
| [`src/app/dashboard/a2a/page.tsx`](src/app/dashboard/a2a/page.tsx) | A2A console with Discovery, Delegation, Auction and Debate tabs. |
| [`src/app/dashboard/evals/page.tsx`](src/app/dashboard/evals/page.tsx) | Runs, Datasets and Compare tabs over `/api/evals/*`, falling back to the built-in datasets. |
| [`src/app/dashboard/benchmarks/page.tsx`](src/app/dashboard/benchmarks/page.tsx) | Benchmark suites, run modal and scorecard. "Compare" runs 4 hard-coded Groq models. |
| [`src/app/dashboard/knowledge/page.tsx`](src/app/dashboard/knowledge/page.tsx) | RAG workbench with 5 tabs:<br>• **Ingest:** text, file or URL, with chunk preview<br>• **Search:** search and QA, plus triad evaluation<br>• **Cluster map**<br>• **Documents**<br>• **Architecture:** an explainer |
| [`src/app/dashboard/settings/page.tsx`](src/app/dashboard/settings/page.tsx) | Theme toggle, provider status and model rosters, custom OpenAI-compatible model test, Clerk `UserProfile`, and `SecretVault`. |
| [`src/app/dashboard/settings/loading.tsx`](src/app/dashboard/settings/loading.tsx) | `SkeletonSettings`. |
| [`src/app/dashboard/workflows/page.tsx`](src/app/dashboard/workflows/page.tsx) | Redirects to `/dashboard/skills`. |
| [`src/app/dashboard/workflows/[id]/page.tsx`](src/app/dashboard/workflows/[id]/page.tsx) | Redirects to `/dashboard/skills/{id}`. |
| [`src/app/dashboard/workflows/[id]/edit/page.tsx`](src/app/dashboard/workflows/[id]/edit/page.tsx) | Redirects to `/dashboard/skills/{id}/edit`. |

## Components (`src/components/`)

### Canvas architecture
- **Node types.** [`nodeTypes.ts`](src/components/canvas/nodeTypes.ts) defines **41** of them in `CANVAS_NODE_TYPES`, matching the `GraphNodeType` union in [`src/types/graph.ts`](src/types/graph.ts). [`CanvasNodes.tsx`](src/components/canvas/CanvasNodes.tsx) supplies a renderer for each one.
- **Graph conversion.** [`AgentGraphCanvas`](src/components/canvas/AgentGraphCanvas.tsx) converts the stored `AgentGraphDefinition` with `graphToFlow` and turns edits back with `flowToGraph`. On every change it runs `validateGraph`, then uses:
  - `computeLayout` for auto-layout;
  - `collapseSelection` for subgraphs and macros.
- **Editor panels:**
  - left: NodePalette
  - right: NodeInspector, which uses ConditionalBranchEditor → ConditionExpressionEditor
  - in-canvas: QuickConnectSearch, AlignmentBar
  - fullscreen only: CanvasCopilot
  - normal layout only: A2ADirectoryModal
  - other panels and modals: ExportDialog, MacroLibrary, DebuggerPanel, MarketplacePanel, CollaborationOverlay, ExecutionTimeline, ExecutionProgressOverlay
- **Trace mode.** When the canvas has an `executionId`, [`useExecutionStream`](src/components/canvas/useExecutionStream.ts) opens SSE and builds a `TraceState`, which drives node status, edge traversal, the heatmap and token streams. `replayEvents` powers the time scrubber.
- **Export formats.** [`exportUtils`](src/components/canvas/exportUtils.ts) exports PNG, SVG, PDF, Mermaid, LangGraph Python, LangGraph TS and JSON.

### canvas
| File | Purpose |
|---|---|
| [`src/components/canvas/AgentGraphCanvas.tsx`](src/components/canvas/AgentGraphCanvas.tsx) | Main `@xyflow/react` editor with normal and fullscreen layouts. Features:<br>• drag-and-drop from the palette<br>• undo/redo<br>• copy, paste and duplicate<br>• keyboard shortcuts<br>• search<br>• auto-layout<br>• collapse to subgraph, with drill-in<br>• validation badges<br>• heatmap and coverage<br>• canvas themes<br>• trace mode with a time scrubber |
| [`src/components/canvas/AgentGraphTemplates.ts`](src/components/canvas/AgentGraphTemplates.ts) | `CANVAS_TEMPLATES`: 20 prebuilt graphs (A2A swarm, Supervisor→Researcher→Coder→Critic, map-reduce invoice screening, HITL disbursement, CVE watcher, Qdrant RAG, …). |
| [`src/components/canvas/AlignmentBar.tsx`](src/components/canvas/AlignmentBar.tsx) | Toolbar shown when several nodes are selected: align, distribute, and auto-tidy (`computeLayout`). |
| [`src/components/canvas/A2ADirectoryModal.tsx`](src/components/canvas/A2ADirectoryModal.tsx) | Pick an A2A agent from the presets, or discover one from a URL via `/api/a2a/discover`. |
| [`src/components/canvas/CanvasCopilot.tsx`](src/components/canvas/CanvasCopilot.tsx) | Single prompt box: sends a natural-language description to `/api/canvas/copilot` and loads the graph it returns. |
| [`src/components/canvas/CanvasNodes.tsx`](src/components/canvas/CanvasNodes.tsx) | Memoized renderers for all 41 node types, built on a shared `BaseShell` (handles, trace status, heatmap, token stream). |
| [`src/components/canvas/CollaborationOverlay.tsx`](src/components/canvas/CollaborationOverlay.tsx) | Demo presence cursors shared between tabs of the same browser over `BroadcastChannel`; there is no server. |
| [`src/components/canvas/ConditionExpressionEditor.tsx`](src/components/canvas/ConditionExpressionEditor.tsx) | Expression input with highlighting, validation against node IDs, and autocomplete for `results`/`input`/`item` paths. |
| [`src/components/canvas/ConditionalBranchEditor.tsx`](src/components/canvas/ConditionalBranchEditor.tsx) | Router config: deterministic (an expression) or AI (a prompt) mode, branch labels and the default branch. |
| [`src/components/canvas/DebuggerPanel.tsx`](src/components/canvas/DebuggerPanel.tsx) | Running-node list and a variables inspector. The step controls are not wired up and the variables are placeholders. |
| [`src/components/canvas/ExecutionProgressOverlay.tsx`](src/components/canvas/ExecutionProgressOverlay.tsx) | Trace-mode HUD: status counts, percent complete, elapsed time and connection state. |
| [`src/components/canvas/ExecutionTimeline.tsx`](src/components/canvas/ExecutionTimeline.tsx) | Canvas side panel that groups `ExecutionEvent`s into per-node steps with sub-events. Supports search, filters, focusing a node, and JSON or Markdown export. |
| [`src/components/canvas/ExportDialog.tsx`](src/components/canvas/ExportDialog.tsx) | Export modal for the 7 `EXPORT_FORMATS`. |
| [`src/components/canvas/GraphDiffModal.tsx`](src/components/canvas/GraphDiffModal.tsx) | Diff of the draft graph against the published one, shown visually or as a list. |
| [`src/components/canvas/MacroLibrary.tsx`](src/components/canvas/MacroLibrary.tsx) | "My Components": saves the selection as a macro in localStorage and re-inserts it on demand. |
| [`src/components/canvas/MarketplacePanel.tsx`](src/components/canvas/MarketplacePanel.tsx) | 8 hard-coded mini-graphs (research agent, intent router, HITL pipeline, RSS monitor, …) that can be inserted as macros. |
| [`src/components/canvas/NodeInspector.tsx`](src/components/canvas/NodeInspector.tsx) | Per-type config form for the selected node. Includes model pickers, hyperparameters, prompt token estimate, prompt optimizer, model test, MCP server lookup and a breakpoint toggle. |
| [`src/components/canvas/NodePalette.tsx`](src/components/canvas/NodePalette.tsx) | Draggable node types grouped into category tabs (Triggers, Agent Core, APIs & Actions, Data Ops). |
| [`src/components/canvas/ParallelBranchProgress.tsx`](src/components/canvas/ParallelBranchProgress.tsx) | Per-branch progress display for parallel nodes. *Unused.* |
| [`src/components/canvas/quickConnectSearch.tsx`](src/components/canvas/quickConnectSearch.tsx) | Popover that appears when a connection is dropped on empty canvas; pick a node type to create and wire it. |
| [`src/components/canvas/autoLayout.ts`](src/components/canvas/autoLayout.ts) | `computeLayout`: left-to-right layered layout using BFS per connected component, with no dependencies. |
| [`src/components/canvas/exportUtils.ts`](src/components/canvas/exportUtils.ts) | PNG/SVG (`html-to-image`) and PDF (`jspdf`) export; Mermaid and LangGraph Python/TS code generators; JSON export and import. |
| [`src/components/canvas/graphDiff.ts`](src/components/canvas/graphDiff.ts) | `diffGraphs`: nodes and edges added or removed, plus changed nodes compared across 14 config fields. |
| [`src/components/canvas/graphUtils.ts`](src/components/canvas/graphUtils.ts) | `CanvasNodeData`, `graphToFlow`/`flowToGraph`, ID generators, `createNodeFromType`, and `buildInitialGraphFromSkill`. |
| [`src/components/canvas/graphValidation.ts`](src/components/canvas/graphValidation.ts) | `validateGraph` reports errors and warnings, recursing into macros. It checks for:<br>• a missing START or END<br>• nodes that can't be reached, or can't reach END<br>• missing node config<br>• approvals inside subgraphs or parallel branches |
| [`src/components/canvas/nodeTypes.ts`](src/components/canvas/nodeTypes.ts) | `CANVAS_NODE_TYPES` (41 entries, each with label, category, icon, accent and defaults) and `CANVAS_NODE_TYPE_MAP`. |
| [`src/components/canvas/subgraphUtils.ts`](src/components/canvas/subgraphUtils.ts) | `collapseSelection`: wraps the selected nodes in a subgraph node, mapping inputs and rewriting `results.*` references. |
| [`src/components/canvas/useExecutionStream.ts`](src/components/canvas/useExecutionStream.ts) | `EventSource` hook (execution or preview stream) that builds a `TraceState` and keeps the last ~500 events. Also `replayEvents`. |

### dashboard
| File | Purpose |
|---|---|
| [`src/components/dashboard/DashboardClientView.tsx`](src/components/dashboard/DashboardClientView.tsx) | Dashboard cockpit. Starts from the server's stats, then polls every 12s. Has range filter and refresh controls, lays out all the widgets, and owns `QuickRunSkillModal`. |
| [`src/components/dashboard/EnhancedApprovalQueue.tsx`](src/components/dashboard/EnhancedApprovalQueue.tsx) | First 3 pending approvals, with inline approve (then resume) and reject. |
| [`src/components/dashboard/KnowledgeBaseCard.tsx`](src/components/dashboard/KnowledgeBaseCard.tsx) | RAG summary: document and chunk totals, top collections, recent documents. |
| [`src/components/dashboard/LiveExecutionTracker.tsx`](src/components/dashboard/LiveExecutionTracker.tsx) | Runs in progress (RUNNING or PAUSED_FOR_APPROVAL), linking to their trace or to review. |
| [`src/components/dashboard/MultiAgentCanvasShowcase.tsx`](src/components/dashboard/MultiAgentCanvasShowcase.tsx) | Links to 3 templates and up to 3 of the user's graphs. |
| [`src/components/dashboard/PinnedSkillsLaunchpad.tsx`](src/components/dashboard/PinnedSkillsLaunchpad.tsx) | Pinned skills grid with Quick Run and edit links. |
| [`src/components/dashboard/QuickActionHub.tsx`](src/components/dashboard/QuickActionHub.tsx) | Quick Run, New Canvas and New Skill, plus a dropdown of shortcuts. |
| [`src/components/dashboard/QuickRunSkillModal.tsx`](src/components/dashboard/QuickRunSkillModal.tsx) | Pick a skill, edit the prefilled input JSON, start the run, and go to the execution. |
| [`src/components/dashboard/RecentExecutionsAndActivity.tsx`](src/components/dashboard/RecentExecutionsAndActivity.tsx) | `RecentExecutionsCard` (last 5 runs) and `SystemAuditActivityCard`. |
| [`src/components/dashboard/SystemHealthStrip.tsx`](src/components/dashboard/SystemHealthStrip.tsx) | Badges for MCP servers connected, RAG chunks, A2A agents, vault keys and permitted tools. |
| [`src/components/dashboard/TelemetryMetricsGrid.tsx`](src/components/dashboard/TelemetryMetricsGrid.tsx) | Six KPI tiles: skills, graphs, executions, success rate, average latency, pending approvals. |
| [`src/components/dashboard/ToolPerformanceLeaderboard.tsx`](src/components/dashboard/ToolPerformanceLeaderboard.tsx) | Tool table: READ/WRITE type, calls, average latency and error-rate status. |

### benchmarks, evals, executions
| File | Purpose |
|---|---|
| [`src/components/benchmarks/BenchmarkScorecardView.tsx`](src/components/benchmarks/BenchmarkScorecardView.tsx) | Scorecard: overall score and grade, pass rate, bars for 6 dimensions, per-test assertions and recommendations. |
| [`src/components/benchmarks/BenchmarkSuiteCard.tsx`](src/components/benchmarks/BenchmarkSuiteCard.tsx) | Suite card with category icon, test-case chips, recommended model and a Run button. |
| [`src/components/benchmarks/ModelComparisonMatrix.tsx`](src/components/benchmarks/ModelComparisonMatrix.tsx) | Model comparison table: grade, score, pass rate, latency, cost and strengths. |
| [`src/components/benchmarks/RunBenchmarkModal.tsx`](src/components/benchmarks/RunBenchmarkModal.tsx) | Choose a suite and model, then call `POST /api/benchmarks/run`. |
| [`src/components/evals/EvalComparisonView.tsx`](src/components/evals/EvalComparisonView.tsx) | Compare two eval runs via `/api/evals/compare`. |
| [`src/components/evals/EvalDatasetsTab.tsx`](src/components/evals/EvalDatasetsTab.tsx) | Dataset list with expandable items, and a modal to create a dataset from JSON. |
| [`src/components/evals/EvalRunDetailsDrawer.tsx`](src/components/evals/EvalRunDetailsDrawer.tsx) | Run report: summary, metric bars, and verdicts you can filter and expand to see the judge's reasoning. |
| [`src/components/evals/EvalRunModal.tsx`](src/components/evals/EvalRunModal.tsx) | Configure a run (dataset, target MODEL/SKILL/GRAPH, judge, metrics), then call `POST /api/evals/run`. |
| [`src/components/executions/ExecutionStatusBadge.tsx`](src/components/executions/ExecutionStatusBadge.tsx) | Colored badge for each `ExecutionStatus` (RUNNING pulses; PAUSED_FOR_APPROVAL shows as "AWAITING APPROVAL"). |
| [`src/components/executions/ExecutionTimeline.tsx`](src/components/executions/ExecutionTimeline.tsx) | Static vertical list of `TimelineEvent`s for the execution detail page. Not the same component as the canvas timeline. |

### common, effects, feedback
| File | Purpose |
|---|---|
| [`src/components/common/BrandLogos.tsx`](src/components/common/BrandLogos.tsx) | Inline SVG logos for n8n, Dify, Smithery, Groq and OpenRouter. |
| [`src/components/common/ItemIcon.tsx`](src/components/common/ItemIcon.tsx) | Shows a GitHub avatar or logo image, falling back to a Lucide icon picked by category and keywords. |
| [`src/components/common/JsonEditorModal.tsx`](src/components/common/JsonEditorModal.tsx) | Textarea JSON editor: validates that the root is an object; shows stats; can format, copy, paste and reset. |
| [`src/components/common/ModelDropdown.tsx`](src/components/common/ModelDropdown.tsx) | Searchable model picker (`useModels`) grouped into Groq, OpenRouter free and OpenRouter paid, with pricing and Auto-Router/Failover/custom options. |
| [`src/components/common/Pagination.tsx`](src/components/common/Pagination.tsx) | Previous/next pager with up to 7 page numbers and ellipses. |
| [`src/components/effects/PixelThemeTransition.tsx`](src/components/effects/PixelThemeTransition.tsx) | `PixelThemeTransitionProvider` and `usePixelThemeTransition()`: a canvas pixel-dissolve that plays when the theme changes. |
| [`src/components/feedback/AgentStudioPreloader.tsx`](src/components/feedback/AgentStudioPreloader.tsx) | Full-screen fake Linux boot log with an ASCII progress bar. It either runs on a timer (3200 ms by default) or is controlled by the `isLoading` prop, and can be skipped with Esc or Space. |
| [`src/components/feedback/ConfirmDialog.tsx`](src/components/feedback/ConfirmDialog.tsx) | Confirm modal with danger and warning variants and a pending state. |
| [`src/components/feedback/EmptyState.tsx`](src/components/feedback/EmptyState.tsx) | Dashed empty-state box with an icon, title, description and an action slot. |
| [`src/components/feedback/ErrorBoundary.tsx`](src/components/feedback/ErrorBoundary.tsx) | Class error boundary with an optional fallback and a "Try Again" reset. |
| [`src/components/feedback/SignOutModal.tsx`](src/components/feedback/SignOutModal.tsx) | Sign-out confirmation; the Sidebar performs the actual Clerk `signOut`. |
| [`src/components/feedback/Skeleton.tsx`](src/components/feedback/Skeleton.tsx) | `Skeleton` shimmer, generic `SkeletonGrid`/`List`/`Table`/`Panels`, and page-specific skeletons (Dashboard, Skills, Executions, Review, Settings, ToolRegistry, …). |
| [`src/components/feedback/Toaster.tsx`](src/components/feedback/Toaster.tsx) | Bottom-right toast stack read from `useToastStore`, with an optional link or button action. |

### landing, layout
| File | Purpose |
|---|---|
| [`src/components/landing/FooterPortfolioWidget.tsx`](src/components/landing/FooterPortfolioWidget.tsx) | Fixed pill linking to the author's portfolio, shown at the bottom of the page. |
| [`src/components/landing/HeroAuthSection.tsx`](src/components/landing/HeroAuthSection.tsx) | Hero calls to action using Clerk `<Show>`: sign up / sign in, or open the dashboard. Also exports `FooterAuthCTA`. |
| [`src/components/landing/LiveAgentCanvasDemo.tsx`](src/components/landing/LiveAgentCanvasDemo.tsx) | Standalone landing demo with no backend: 3 preset graphs, simulated runs at 1/2/4× speed, a heatmap, zoom and pan, and inspector tabs. |
| [`src/components/landing/data/canvasNodes.ts`](src/components/landing/data/canvasNodes.ts) | `canvasNodeCategories`: the node catalog cards shown on the landing page. |
| [`src/components/layout/Header.tsx`](src/components/layout/Header.tsx) | Sticky header: pixel wordmark, landing anchors, mobile sidebar toggle, `ThemePicker`, and Clerk sign-in or `UserButton`. |
| [`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx) | 15 app links in a sidebar that collapses on desktop and becomes a drawer on mobile, plus sign-out. Renders only for signed-in users on app routes. |

### mcp, organizations, vault, workflows
| File | Purpose |
|---|---|
| [`src/components/mcp/LiveSandbox.tsx`](src/components/mcp/LiveSandbox.tsx) | Runs a proposed skill as a temporary sandbox skill (`/api/skills/sandbox`) and streams the preview over SSE with auto-approve. Cleans up afterwards. |
| [`src/components/mcp/ToolUpdateDiffViewer.tsx`](src/components/mcp/ToolUpdateDiffViewer.tsx) | Shows MCP tool changes with side-by-side schema diffs and the affected skills, then applies the ones you select. |
| [`src/components/organizations/CustomRolesManager.tsx`](src/components/organizations/CustomRolesManager.tsx) | Custom-role CRUD with grouped permission checkboxes and 3 presets. |
| [`src/components/organizations/OrganizationSettings.tsx`](src/components/organizations/OrganizationSettings.tsx) | Org members, invites, role and custom-role changes, removal, and org deletion behind a typed confirmation. |
| [`src/components/organizations/OrganizationSwitcher.tsx`](src/components/organizations/OrganizationSwitcher.tsx) | Org dropdown fed by `/api/organizations`. *Unused.* |
| [`src/components/vault/SecretVault.tsx`](src/components/vault/SecretVault.tsx) | Secret manager on `/api/vault`: search, category filter, create, edit, delete, and reveal or copy. |
| [`src/components/workflows/WorkflowStepChain.tsx`](src/components/workflows/WorkflowStepChain.tsx) | Shows `allowedTools` and the approvals as a linear chain of chips: input → tools → approval → output. |
| [`src/components/workflows/WorkflowTemplates.ts`](src/components/workflows/WorkflowTemplates.ts) | `WORKFLOW_TEMPLATES`: 15 skill templates (refund automation, invoice risk, support triage, CVE watcher, FX monitor, …). Also used by the workflow search API and the converters. |

### providers, skills, ui, root
| File | Purpose |
|---|---|
| [`src/components/providers/ClerkDynamicProvider.tsx`](src/components/providers/ClerkDynamicProvider.tsx) | `ClerkProvider` whose appearance follows the current theme. |
| [`src/components/providers/QueryProvider.tsx`](src/components/providers/QueryProvider.tsx) | TanStack `QueryClient` with `staleTime` 60s and no refetch on window focus. |
| [`src/components/providers/SidebarContext.tsx`](src/components/providers/SidebarContext.tsx) | `useSidebar()`: whether the mobile drawer is open, plus the desktop collapsed state, persisted in localStorage. |
| [`src/components/providers/ThemeProvider.tsx`](src/components/providers/ThemeProvider.tsx) | next-themes wrapper: the 4 compound themes, `parseThemeKey`, syncing to `<html>` attributes, and legacy migration. |
| [`src/components/skills/ApprovalActionMarketplace.tsx`](src/components/skills/ApprovalActionMarketplace.tsx) | Picker for `actionsRequiringApproval`: 34 preset write actions with risk levels, plus actions discovered from tools, OpenAPI and MCP. |
| [`src/components/skills/AvailableMcpTools.tsx`](src/components/skills/AvailableMcpTools.tsx) | Adds discovered MCP tools to a skill as `mcp_<serverId>_<tool>`. |
| [`src/components/skills/AvailableOpenApiTools.tsx`](src/components/skills/AvailableOpenApiTools.tsx) | Adds OpenAPI endpoints to a skill as `openapi_<id>_<opId>`. |
| [`src/components/skills/QuickConnectToolModal.tsx`](src/components/skills/QuickConnectToolModal.tsx) | Skill-editor modal with two tabs: OpenAPI presets and built-in tools. |
| [`src/components/skills/SkillForm.tsx`](src/components/skills/SkillForm.tsx) | Single-page skill form (react-hook-form + `createSkillSchema`). Covers metadata, JSON schemas, examples, tools, approvals, policy and limits, with a `WorkflowStepChain` preview. |
| [`src/components/skills/StatusBadge.tsx`](src/components/skills/StatusBadge.tsx) | DRAFT/PUBLISHED/ARCHIVED badge. |
| [`src/components/ui/Accordion.tsx`](src/components/ui/Accordion.tsx) | Q&A accordion that allows one or several items open at once. |
| [`src/components/ui/Badge.tsx`](src/components/ui/Badge.tsx) | Pill badge with 8 variants. *Unused.* |
| [`src/components/ui/Button.tsx`](src/components/ui/Button.tsx) | Button with primary, secondary, ghost and tertiary variants, sizes and a loading state. `asChild` is not implemented. *Unused.* |
| [`src/components/ui/Card.tsx`](src/components/ui/Card.tsx) | `Card` and `FeatureCard`. *Unused.* |
| [`src/components/ui/SectionHeader.tsx`](src/components/ui/SectionHeader.tsx) | Pixel-font section heading in two styles: terminal banner, or eyebrow + heading. |
| [`src/components/ui/StatTile.tsx`](src/components/ui/StatTile.tsx) | Metric tile: icon, large pixel value, label, detail and badge. |
| [`src/components/ui/ThemePicker.tsx`](src/components/ui/ThemePicker.tsx) | Header popover with Mode and Color tabs; switches theme through the pixel transition. |
| [`src/components/Reveal.tsx`](src/components/Reveal.tsx) | Plays a fade-in-up animation when the content scrolls into view (via `IntersectionObserver`), and respects reduced motion. |

## Hooks, Stores & Data
| File | Purpose |
|---|---|
| [`src/hooks/useModels.ts`](src/hooks/useModels.ts) | React Query hook over `modelsApi.getModels` (5-minute stale time). Returns models grouped by provider and category. Used by `ModelDropdown` and `NodeInspector`. |
| [`src/hooks/usePermissions.ts`](src/hooks/usePermissions.ts) | Fetches `/api/organizations/{id}/permissions` and exposes `can(key)` and role flags. *Unused.* |
| [`src/stores/toastStore.ts`](src/stores/toastStore.ts) | Zustand toast queue (`push`, `dismiss`) plus `toast.success/error/info`. Toasts auto-dismiss after 4s, or 6s if they have an action. |
| [`src/data/skillPacks.ts`](src/data/skillPacks.ts) | `SKILL_PACKS`: 8 curated packs (DevOps, Data & Analytics, Growth, AI/MLOps, Security, Productivity, OSS AI, Self-Hosted Automation), plus lookup helpers. |

## Frontend Tests
**Component tests.** These run in the Vitest `components` project (jsdom, [`tests/components/setup.ts`](tests/components/setup.ts)) as part of `npm test`.

**End-to-end tests.** These are Playwright specs ([`playwright.config.ts`](playwright.config.ts)) run with `npm run test:e2e`:
- Browser: Chromium only.
- Trace: recorded on first retry.
- Retries: 2 on CI.
- Reporter: `github` on CI.

The e2e suite covers the landing page, health and 404 pages only; it has no dashboard flows yet. For backend and unit tests, see [backend.md](backend.md#backend-tests-testsunit-testsintegration-testsperformance).

| File | Purpose |
|---|---|
| [`tests/components/setup.ts`](tests/components/setup.ts) | Imports the `@testing-library/jest-dom/vitest` matchers. |
| [`tests/components/ConfirmDialog.test.tsx`](tests/components/ConfirmDialog.test.tsx) | Open/closed state, the confirm, cancel and backdrop callbacks, pending state, ARIA, and the warning variant. |
| [`tests/components/EmptyState.test.tsx`](tests/components/EmptyState.test.tsx) | Title and description, default and custom icons, the action slot, and structure. |
| [`tests/components/Pagination.test.tsx`](tests/components/Pagination.test.tsx) | Hidden when there is ≤ 1 page, page buttons, prev/next, disabled at the bounds, ellipsis, and loading state. |
| [`tests/components/Skeleton.test.tsx`](tests/components/Skeleton.test.tsx) | Skeleton variants and counts, plus status roles and labels on the page skeletons. |
| [`tests/components/Toaster.test.tsx`](tests/components/Toaster.test.tsx) | Toast rendering per type, close, and actions. The auto-dismiss timer is not tested. |
| [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts) | Landing headline and call to action, the `/api/health` payload, and the 404 page. |
| [`e2e/navigation.spec.ts`](e2e/navigation.spec.ts) | Landing title, health JSON shape and content type, unknown API returns ≥ 400, 404 page, no JS errors, `/api/skills` rejects unauthenticated calls, and no failed assets. |

## Frontend Root Files
| File | Purpose |
|---|---|
| [`next.config.ts`](next.config.ts) | Next config:<br>• `reactStrictMode` on and `compress` off<br>• `optimizePackageImports` for `lucide-react`<br>• `turbopack: {}`<br>• `serverExternalPackages`: LangGraph, MCP SDK, Prisma and pyodide<br>• webpack keeps `node:vm`, `node:child_process` and `node:util` out of client bundles<br>• security headers: `X-Frame-Options DENY`, CSP `frame-ancestors`, `nosniff`, referrer and permissions policy<br>• raises the EventEmitter max-listener count to 30 |
| [`next-env.d.ts`](next-env.d.ts) | Auto-generated Next type references (including `.next/dev/types`); don't edit it. |
| [`tailwind.config.ts`](tailwind.config.ts) | Tailwind config loaded through `@config`: class dark mode, font families (`pixel`/`vt323`, `mono`, `sans`/`geist`, `serif`) and HSL color tokens. |
| [`postcss.config.js`](postcss.config.js) | PostCSS with the `@tailwindcss/postcss` and `autoprefixer` plugins. |
| [`eslint.config.mjs`](eslint.config.mjs) | ESLint 9 flat config extending `eslint-config-next`. `any` is a warning, the React-compiler hook rules are warnings, and JSX comment text nodes are allowed. `any` is fully allowed under `tests/`. |
| [`playwright.config.ts`](playwright.config.ts) | E2E config: `testDir ./e2e`, Chromium only, `E2E_BASE_URL` (default `http://localhost:3000`). Starts the dev server automatically outside CI. |
| [`test-output.css`](test-output.css) | Leftover compiled Tailwind CSS output (~245KB) from a CSS pipeline check. Nothing references it. |
