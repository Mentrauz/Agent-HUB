AGENTS.md — Frontend Redesign: Agent Hub → "Agent Infrastructure" Visual Direction

Scope (read this first)

This file governs frontend-only work. You are restyling and restructuring the
presentation layer of Agent Hub. You are not changing product behavior, data
models, execution semantics, or APIs.

In scope:

src/app/** (pages, layouts, route UI — App Router)

src/components/** (or equivalent shared UI components)

src/app/globals.css, tailwind.config.ts, design tokens

Client-side state/UI wiring needed to re-skin existing features (React Flow canvas
theme, SSE trace panel styling, forms, cards, nav, etc.)

Marketing/landing pages AND the authenticated /dashboard/* shell (nav, layout,
cards, tables) — visual layer only

Out of scope — do not touch:

src/app/api/** route handlers, request/response contracts

prisma/schema.prisma, migrations, seed data

src/services/**, src/repositories/**, src/modules/** (business/runtime logic)

src/lib/converters/** (Dify/n8n AST converters), expression.ts, graph
interpreter logic

src/providers/llm/** (LLM routing/failover logic)

src/validators/** (Zod schemas)

Test suites (tests/, e2e/) — you may add/update visual regression or component
tests, but never weaken or delete existing coverage

Auth (Clerk) configuration and middleware behavior

If a visual change seems to require touching an out-of-scope file, stop and flag it
instead of proceeding — there is almost always a way to do it from the presentation
layer (e.g. wrap, restyle, or theme an existing component instead of altering the
data it renders).

Design reference

Structural/reference direction: https://cosmoq.framer.website

Study it before writing any code. Borrow the presentation discipline — spacing,
typography hierarchy, rounded surfaces, section composition, and restrained motion —
but do not copy its palette or make Agent Hub look like a generic AI landing page.
The visual identity should communicate agent infrastructure, orchestration,
developer tooling, MCP, runtime systems, workflows, and governance.

Core visual direction — Agent Infrastructure

Use a dark graphite engineering aesthetic with restrained cyan/blue system
accents, green execution states, and amber governance states. The product should
feel like a serious developer platform rather than a chatbot, AI wrapper, or
terminal-themed hacker console.

Dark graphite foundation — deep neutral backgrounds with layered steel/slate
surfaces. Avoid pure black and avoid large saturated color panels.

Large, confident geometric sans display type — strong section headers with a
small uppercase eyebrow label above them. Use monospace only where it adds
functional meaning: code, JSON, execution logs, node parameters, IDs, etc.

Rounded but technical surfaces — 16–24px card radii, pill buttons/badges,
restrained shadows, and subtle borders. Do not use sharp terminal-style boxes.

Technical depth instead of AI-glow aesthetics — use very subtle radial gradients,
grid/dot patterns, node/graph motifs, and layered surfaces. Do not use oversized
lavender/purple blobs or neon glow as the primary visual treatment.

Card-based feature grids — icon + concise label + one-line description, with
generous internal padding and clear grouping.

Numbered step sections — large, low-contrast numerals behind the content can
remain, but they should use graphite/steel tones rather than pastel decoration.

Comparison/pricing-style information — use clean cards or readable tables with
clear hierarchy rather than dense terminal grids.

FAQ — simple expandable accordion/list, not a collection of boxed tiles.

Subtle motion — scroll-triggered fade/slide reveals and restrained hover states.
Avoid flashy particle effects, excessive parallax, or animated neon.

Button hierarchy — primary action is a solid near-black/white-contrast pill,
secondary is a restrained outlined/ghost pill, and tertiary is a text link with an
arrow.

Semantic color language

Color must communicate system meaning rather than simply making the page look
"AI-like":

Cyan (#22D3EE) = infrastructure / orchestration — MCP, APIs, workflow edges,
runtime, tools, connections, active system paths.

Blue (#60A5FA) = data / integrations — data movement, external systems,
model/provider connections, information flow.

Green (#34D399) = autonomous execution / healthy state — running agents,
successful runs, connected/healthy services, completed actions.

Amber (#FBBF24) = human governance — approval required, review, HITL,
guardrails, pending decisions.

Red (#F87171) = blocked / failure — failed runs, policy violations, blocked
actions, unhealthy services.

These semantic meanings should remain consistent across the marketing site, React
Flow canvas, dashboard, execution traces, badges, alerts, and status indicators.
Do not introduce arbitrary accent colors for individual sections when an existing
semantic color already communicates the state.

This is intentionally different from the current look: replace the existing
lavender/white AI-SaaS treatment and neon multi-color-on-black styling with a
coherent graphite + cyan + blue + green + amber system. The result should feel
closer to a polished developer infrastructure product — think orchestration
platform + workflow engine + observability console — while retaining premium SaaS
spacing and composition inspired by the reference.

Design tokens to establish

Create/update a token layer (CSS variables + Tailwind theme extension) rather than
hardcoding values in components. The dark graphite theme is the new default.
Light mode may remain available as an explicit secondary theme if the existing
product requires it, but the primary visual identity should be the dark
infrastructure palette below.

:root {
  /* Surfaces — dark graphite infrastructure palette */
  --surface-base: #0B0F14;
  --surface-raised: #151E27;
  --surface-sunken: #111820;
  --surface-elevated: #1B2530;

  /* Borders / dividers */
  --border-subtle: #273340;
  --border-strong: #344250;

  /* Text */
  --text-primary: #E8EDF2;
  --text-secondary: #8996A3;
  --text-muted: #5F6C78;

  /* System / brand accents */
  --accent-primary: #22D3EE;   /* cyan — orchestration, MCP, runtime, tools */
  --accent-secondary: #60A5FA; /* blue — data, integrations, connections */
  --accent-contrast: #0B0F14;  /* dark contrast for light-on-accent UI */

  /* Semantic system states */
  --state-success: #34D399;   /* autonomous execution / healthy */
  --state-warning: #FBBF24;   /* human approval / governance */
  --state-error: #F87171;     /* blocked / failure */

  /* React Flow node semantics */
  --node-agent: #8B7CF6;       /* agent / reasoning — violet retained only here */
  --node-tool: #22D3EE;        /* tools / MCP / integrations */
  --node-control: #FBBF24;     /* control / routing / guardrails */
  --node-hitl: #F59E0B;        /* human-in-the-loop / approval */

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.18);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.24);
  --shadow-lg: 0 24px 64px rgba(0,0,0,0.32);

  /* Radius */
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  /* Technical background treatments */
  --grid-dot: rgba(137,150,163,0.13);
  --glow-cyan: rgba(34,211,238,0.10);
  --glow-blue: rgba(96,165,250,0.08);
}

[data-theme="light"] {
  /* Optional secondary theme — keep the same semantic accent language */
  --surface-base: #F5F7F8;
  --surface-raised: #FFFFFF;
  --surface-sunken: #EEF2F4;
  --surface-elevated: #FFFFFF;
  --border-subtle: #D7DEE3;
  --border-strong: #C2CCD4;
  --text-primary: #101820;
  --text-secondary: #5F6B76;
  --text-muted: #7A8792;
  --accent-primary: #0891B2;
  --accent-secondary: #2563EB;
  --accent-contrast: #101820;
  --state-success: #059669;
  --state-warning: #D97706;
  --state-error: #DC2626;
  --node-agent: #6D5EF0;
  --node-tool: #0891B2;
  --node-control: #D97706;
  --node-hitl: #DC2626;
  --shadow-sm: 0 1px 2px rgba(16,24,32,0.05);
  --shadow-md: 0 8px 24px rgba(16,24,32,0.08);
  --shadow-lg: 0 24px 64px rgba(16,24,32,0.12);
  --grid-dot: rgba(95,107,118,0.12);
  --glow-cyan: rgba(8,145,178,0.08);
  --glow-blue: rgba(37,99,235,0.06);
}

Token usage rules

Do not hardcode the palette in page/component CSS when a token exists.

Keep cyan and blue for system/infrastructure communication; do not turn them into
decorative gradients across entire sections.

Green, amber, and red are reserved for their semantic states wherever possible.

Violet may remain as a restrained agent identity color on canvas nodes/icons,
but it must not become the dominant site-wide brand color.

Prefer subtle surface separation and shadows over bright borders or outer glows.

Use radial gradients only as low-opacity atmospheric accents behind hero artwork or
technical diagrams.

Keep the existing theme toggle in the nav and ensure both themes are actually
wired. Dark mode is the default for the redesigned Agent Hub; light mode is the
secondary option.

Do not remove the semantic node-type colors used on the canvas (agent/tool/control/
HITL). Re-map them to the tokenized palette above so nodes remain distinguishable
without reverting to neon colors.

Typography: replace the monospace/pixel display font used for headings with a clean
geometric sans for display type (e.g. Geist, Inter, or a similar variable font
already available in the project). Reserve monospace for code, JSON payloads,
execution logs, IDs, and node parameter fields where it improves readability.

Hero and page composition guidance

The landing page should immediately communicate "agent infrastructure" rather
than generic AI. Use the following composition:

Hero background: --surface-base with an extremely subtle dot/grid treatment
and low-opacity cyan/blue radial accents. No large lavender glow.

Headline: high-contrast geometric sans. Highlight terms such as Orchestration,
Runtime, or Multi-Agent with --accent-primary only where it improves
hierarchy.

Hero visual: prefer an abstract workflow/node graph, runtime diagram, or live
canvas preview over a generic AI illustration.

Stats: use layered graphite cards with large numerals and concise labels.

System status: green indicates healthy/running, amber indicates approval/HITL,
red indicates blocked/failure, and cyan/blue indicates infrastructure/data flow.

Section transitions: maintain generous whitespace and strong hierarchy, but use
dark surfaces and subtle elevation rather than switching to pastel panels.

The visual goal is "premium developer infrastructure": sophisticated enough for a
product/marketing site, technical enough that an engineer immediately understands
this is an orchestration/runtime platform.

Functional parity checklist

Every item below currently exists in the product and must still work, and must
still be reachable and legible, after the redesign. Treat this as the acceptance
criteria.

Public/marketing site

Hero section with headline, subhead, stat strip (node types / tool count /
free stack / model count), and primary/secondary/tertiary CTAs
(Get Started / Sign In / Live Demo / GitHub)

Live interactive canvas demo (React Flow) — preset blueprint switcher,
run/step/speed controls, zoom controls, minimap, node inspector, trace
stream panel, and the SSE-driven run simulation must remain fully
interactive, not become a static image

Full node-type catalog grid, grouped by category (Logic & Multi-Agent
Control, Search & Scraping, Document Intel, Databases/Memory, Triggers &
Dispatch) — restyle as dark infrastructure feature cards, keep all ~14+ node types listed

Open-source tool spotlight cards (SearXNG, Crawl4AI, IBM Docling, Gotenberg,
Qdrant, PocketBase/NocoDB) with "best for" copy

Marketplace/template hub section (n8n library, Dify workflows, MCP registry
hub) with counts

LLM router stats section (model count, context window, throughput)

Architectural comparison table (Agent Hub vs n8n vs Dify vs Langflow/Flowise)
— restyle as a clean graphite comparison card/table per the reference site's
pricing-card pattern, not a dense terminal grid; content must remain fully readable

Observability feature cards (ghost/dry-run preview, latency heatmap, time
scrubber/replay, budget caps)

Developer tooling section (MCP servers/skills count, n8n workflow library,
Dify blueprints, OpenAPI hub)

Reliability/safety cards (idempotency, circuit-breaker failover, atomic
transactions, audit trails)

FAQ section — convert from boxed grid to accordion/expandable list per the
reference, preserving all existing Q&A content

Final CTA band + footer with full link map (Canvas, Open Source, Marketplace,
Models, Comparison, Runtime Intel, Tooling, Guardrails, FAQ, Dashboard)

Authenticated dashboard (/dashboard/*)

Canvas builder — all 14 node types, drag-and-drop, auto-layout, validation,
diff view, templates, snapshots/replay

Skills registry — CRUD, versioning (draft/published/archived), diff viewer

Executions — history list, trace detail, replay/retry

HITL review queue — approve/reject/cancel, argument inspection

History/observability dashboards, audit trail with JSON export

Tools/MCP hub + OpenAPI hub browsers, connection modals

Settings — model roster, live pricing, provider health

Workflows — Dify/n8n import steppers

A2A, evals, benchmarks pages

Do not drop any route, panel, or control while restyling. If a page's information
density genuinely can't fit the new lighter visual language (e.g. the comparison
table, or dense execution traces), prefer progressive disclosure (tabs, accordions,
"view details" expansion) over deleting content.

Component-by-component restyle guidance

Current pattern

New pattern

Bracketed nav labels [ RUNTIME ] on black bar

Clean horizontal nav on graphite, rounded pill "Get Started" button, logo left, links center/right, subtle bottom border or shadow-on-scroll

Neon-bordered canvas node cards on black grid

Graphite/steel node cards with soft shadow, semantic colored icon chip or left accent per node type, subtle dot-grid canvas background

Dense black stat tiles (28+, 148K+)

Layered graphite stat cards with large high-contrast numerals, semantic accent icon, restrained shadow, generous spacing

Terminal-style comparison table (green/gray text on black rows)

Clean graphite card/table with readable hierarchy, subtle row separation, highlighted "Agent Hub" column, semantic checkmarks/icons

FAQ boxed 2-col grid

Single-column accordion, expand/collapse, with restrained hover/active states

// 0X. SECTION TITLE monospace section headers

Small uppercase eyebrow label with icon + large geometric sans-serif section heading + one-line subhead, centered or left-aligned per section

Flat black footer

Layered graphite footer with organized link columns, subtle borders, and the same Navigation/Documentation/Other Pages/Social structure adapted to Agent Hub's actual links

Buttons: primary = solid high-contrast pill (--text-primary or --accent-primary
with an accessible contrasting foreground), secondary = outlined/ghost pill,
tertiary = text link with arrow. Keep the hierarchy restrained and avoid neon
button glow. Use --accent-primary for system-focused CTAs or active states where
semantic cyan is appropriate.

Technical guardrails

Framework: stay on Next.js 15 App Router, React 19, TypeScript strict,
TailwindCSS. Do not introduce Framer Motion-as-a-service or migrate off the
current stack — recreate the feel of the Framer template with standard
React/CSS (CSS transitions, IntersectionObserver-based reveal animations, or a
lightweight animation lib already in the dependency tree) rather than adopting
Framer itself.

React Flow theming: use React Flow's theming API / CSS variables to restyle
nodes, edges, controls, and minimap — do not fork or replace the library.

Accessibility: both dark and light themes must meet WCAG AA contrast for body
text and interactive elements. Verify every restyled text/background pair, including
semantic cyan/blue/green/amber/red states against their surfaces.

Responsive: the reference site is designed desktop-first with graceful
mobile stacking — preserve Agent Hub's existing responsive breakpoints and test
the canvas builder specifically on tablet/mobile (it's the highest-risk
component for breaking during a restyle).

Dark mode: since the current toggle implies dark mode should exist, ship
both themes properly rather than leaving dark mode half-wired.

No content loss: every stat, label, tooltip, and copy block currently on the
marketing site must survive the restyle unless explicitly told to cut it.

Performance: avoid heavy new dependencies for animation/gradients. Prefer
low-opacity CSS radial-gradient(...) atmospheric accents and existing animation
primitives over imported blob/particle libraries to keep bundle size and Lighthouse
scores stable.

Tests: npm run lint, npm run typecheck, and npm test must stay green.
Update Playwright selectors if you change DOM structure/class names that e2e
tests depend on — do not delete or skip failing e2e tests to make CI pass.

Suggested workflow

Audit current globals.css, tailwind.config.ts, and any design-token file;
propose the new token set above as a diff, get it merged first.

Build/restyle shared primitives first: Button, Card, Badge, SectionHeader
(eyebrow + heading), Accordion, StatTile. These are reused everywhere else.

Re-skin the public landing page section by section, in the order it appears on
the page, verifying functional parity checklist items as you go.

Re-skin the dashboard shell (top nav / sidebar / page container), then individual
dashboard pages, reusing the same primitives.

Re-theme the React Flow canvas (light background, restyled node cards, restyled
controls/minimap) last, since it's the highest-complexity surface.

Run the full checklist above before considering the task done. Call out
anything you could not preserve and why.

Definition of done

Every item in the Functional Parity Checklist is checked off and demonstrably
working (not just visually present).

Lint, typecheck, unit tests, and e2e tests pass.

The site visually reads as a light, premium AI-platform product in the spirit of
the Cosmoq reference, while remaining unmistakably Agent Hub (same content,
same information architecture, same interactive canvas).

No backend, schema, or business-logic files were modified.