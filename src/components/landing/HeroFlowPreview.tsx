"use client";

import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Zap, Search, Globe, BrainCircuit, ShieldCheck, FileCheck, type LucideIcon } from "lucide-react";
import { getEdgeGeometry } from "./edgeGeometry";

/**
 * Hero preview — a compact, self-running agent graph.
 * Pure SVG on a fixed viewBox so it scales as one piece; colours come from theme tokens.
 * Pauses off-screen / in background tabs; shows the finished run statically under reduced motion.
 */

type NodeStatus = "idle" | "running" | "awaiting" | "done";

interface FlowNode {
  id: string;
  label: string;
  sub: string;
  awaitSub?: string;
  doneSub?: string;
  icon: LucideIcon;
  x: number;
  y: number;
  /** Execution step this node runs in (parallel branches share a step). */
  step: number;
  warning?: boolean;
}

const VIEW_W = 640;
const VIEW_H = 288;
const NODE_W = 122;
const NODE_H = 60;

const NODES: FlowNode[] = [
  { id: "trigger", label: "TRIGGER", sub: "webhook · query", icon: Zap, x: 13, y: 114, step: 0 },
  { id: "searxng", label: "SEARXNG", sub: "metasearch · 0 keys", icon: Search, x: 177, y: 28, step: 1 },
  { id: "crawl4ai", label: "CRAWL4AI", sub: "pages → markdown", icon: Globe, x: 177, y: 200, step: 1 },
  { id: "agent", label: "RESEARCHER", sub: "llama-3.3-70b", icon: BrainCircuit, x: 341, y: 114, step: 2 },
  {
    id: "approval",
    label: "APPROVAL",
    sub: "human-in-the-loop",
    awaitSub: "awaiting review…",
    doneSub: "approved ✓",
    icon: ShieldCheck,
    x: 505,
    y: 28,
    step: 3,
    warning: true,
  },
  { id: "pdf", label: "GOTENBERG", sub: "html → pdf", doneSub: "report.pdf ✓", icon: FileCheck, x: 505, y: 200, step: 4 },
];

const EDGES: [string, string][] = [
  ["trigger", "searxng"],
  ["trigger", "crawl4ai"],
  ["searxng", "agent"],
  ["crawl4ai", "agent"],
  ["agent", "approval"],
  ["approval", "pdf"],
];

const LAST_STEP = 5;
/** How long each step is held, in ms; index = step. The approval pause and final state linger. */
const STEP_MS = [1000, 1300, 1400, 1800, 1300, 2600];
const IDLE_MS = 700;

const LOG_LINES: Record<number, string> = {
  [-1]: "$ agent-hub run deep-research.flow",
  0: "▸ trigger · query: \"multi-agent orchestration\"",
  1: "▸ searxng · 24 results   ▸ crawl4ai · 12 pages → markdown",
  2: "▸ researcher · synthesizing 3.1k tokens",
  3: "⏸ approval required · write report.pdf (single-use token)",
  4: "✓ approved · gotenberg rendering A4 report",
  5: "✓ run complete · 6 nodes · 4.2s · $0.00",
};

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
const box = (n: FlowNode) => ({ x: n.x, y: n.y, width: NODE_W, height: NODE_H });
const EDGE_PATHS = EDGES.map(([from, to]) => ({
  from,
  to,
  d: getEdgeGeometry(box(NODE_BY_ID.get(from)!), box(NODE_BY_ID.get(to)!)).d,
}));

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function nodeStatus(node: FlowNode, step: number): NodeStatus {
  if (step > node.step) return "done";
  if (step === node.step) return node.warning ? "awaiting" : "running";
  return "idle";
}

export function HeroFlowPreview() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  const [inView, setInView] = useState(false);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
  const pageVisible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animating = inView && pageVisible && !reducedMotion;
  useEffect(() => {
    if (!animating) return;
    const delay = step < 0 ? IDLE_MS : STEP_MS[step];
    const t = window.setTimeout(() => setStep((s) => (s >= LAST_STEP ? -1 : s + 1)), delay);
    return () => window.clearTimeout(t);
  }, [animating, step]);

  const shown = reducedMotion ? LAST_STEP : step;
  const doneCount = NODES.filter((n) => shown > n.step).length;
  const awaiting = shown === NODE_BY_ID.get("approval")!.step;
  const statusLabel = shown < 0 ? "QUEUED" : shown === LAST_STEP ? "COMPLETED" : awaiting ? "AWAITING APPROVAL" : "RUNNING";
  const statusColor = awaiting ? "var(--state-warning)" : "var(--accent-primary)";

  const glowId = `${uid}-glow`;
  const arrowIdle = `${uid}-arrow-idle`;
  const arrowActive = `${uid}-arrow-active`;

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label="Animated example run: a trigger fans out to SearXNG search and Crawl4AI scraping, a research agent synthesizes the results, a human approves the write, and Gotenberg renders a PDF report."
      className="relative overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-base)] font-mono shadow-[0_30px_90px_-40px_color-mix(in_srgb,var(--accent-primary)_45%,transparent)]"
    >
      {/* Run status bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 text-[10px] uppercase tracking-wider">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${shown >= 0 && shown < LAST_STEP ? "animate-pulse" : ""}`}
            style={{ background: shown < 0 ? "var(--text-muted)" : statusColor }}
          />
          <span className="font-bold" style={{ color: shown < 0 ? "var(--text-secondary)" : statusColor }}>
            {statusLabel}
          </span>
          <span className="truncate text-[var(--text-muted)]">· deep-research.flow</span>
        </div>
        <span className="shrink-0 text-[var(--text-muted)]">{doneCount}/{NODES.length} nodes</span>
      </div>

      {/* Canvas */}
      <div className="bg-[radial-gradient(var(--grid-dot)_1px,transparent_1px)] [background-size:20px_20px] px-3 py-5">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full" aria-hidden="true">
          <defs>
            {/* userSpaceOnUse: a straight vertical edge has a zero-width bbox and would vanish under a bbox-relative filter */}
            <filter id={glowId} filterUnits="userSpaceOnUse" x="0" y="0" width={VIEW_W} height={VIEW_H}>
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <marker id={arrowIdle} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" style={{ fill: "var(--accent-primary)" }} fillOpacity={0.6} />
            </marker>
            <marker id={arrowActive} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" style={{ fill: "var(--accent-primary)" }} />
            </marker>
          </defs>

          {/* Edges */}
          {EDGE_PATHS.map(({ from, to, d }) => {
            const active = shown > NODE_BY_ID.get(from)!.step;
            const flowing = active && !reducedMotion && shown === NODE_BY_ID.get(to)!.step;
            const stroke = { stroke: "var(--accent-primary)" };
            return (
              <g key={`${from}-${to}`}>
                {active ? (
                  <>
                    <path d={d} fill="none" style={stroke} strokeWidth={6} strokeOpacity={0.22} filter={`url(#${glowId})`} />
                    <path d={d} fill="none" style={stroke} strokeWidth={2} strokeOpacity={0.95} markerEnd={`url(#${arrowActive})`} />
                  </>
                ) : (
                  <>
                    <path d={d} fill="none" style={stroke} strokeWidth={1.75} strokeOpacity={0.4} markerEnd={`url(#${arrowIdle})`} />
                    <path d={d} fill="none" style={stroke} strokeWidth={1.75} strokeOpacity={0.8} strokeLinecap="round" className="edge-idle-flow" />
                  </>
                )}
                {flowing && (
                  <g>
                    <circle r={4} style={{ fill: "var(--accent-primary)" }} fillOpacity={0.45}>
                      <animateMotion dur="1.1s" repeatCount="indefinite" path={d} />
                    </circle>
                    <circle r={1.8} fill="#ffffff">
                      <animateMotion dur="1.1s" repeatCount="indefinite" path={d} />
                    </circle>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const status = nodeStatus(node, shown);
            const live = status === "running" || status === "awaiting";
            const accent = node.warning ? "var(--state-warning)" : "var(--accent-primary)";
            const sub = status === "done" && node.doneSub ? node.doneSub : status === "awaiting" && node.awaitSub ? node.awaitSub : node.sub;
            const Icon = node.icon;
            return (
              <g key={node.id}>
                {live && (
                  <rect
                    x={node.x - 2}
                    y={node.y - 2}
                    width={NODE_W + 4}
                    height={NODE_H + 4}
                    rx={12}
                    fill="none"
                    style={{ stroke: accent }}
                    strokeWidth={6}
                    strokeOpacity={0.25}
                    filter={`url(#${glowId})`}
                  />
                )}
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  style={{ fill: "var(--surface-base)", stroke: status === "idle" ? "var(--border-strong)" : accent }}
                  strokeWidth={live ? 1.5 : 1}
                  strokeOpacity={status === "done" ? 0.75 : 1}
                  className={live ? "hero-flow-pulse" : undefined}
                />
                <Icon x={node.x + 10} y={node.y + 10} size={14} strokeWidth={2} style={{ color: accent }} />
                <text
                  x={node.x + 30}
                  y={node.y + 21.5}
                  fontSize={10.5}
                  fontWeight={700}
                  letterSpacing="0.06em"
                  style={{ fill: "var(--text-primary)" }}
                >
                  {node.label}
                </text>
                <circle
                  cx={node.x + NODE_W - 12}
                  cy={node.y + 17}
                  r={3}
                  style={{ fill: status === "idle" ? "var(--border-strong)" : accent }}
                />
                <line
                  x1={node.x + 10}
                  x2={node.x + NODE_W - 10}
                  y1={node.y + 32}
                  y2={node.y + 32}
                  style={{ stroke: "var(--border-subtle)" }}
                />
                <text
                  x={node.x + 10}
                  y={node.y + 47}
                  fontSize={9}
                  style={{
                    fill: status === "awaiting" ? "var(--state-warning)" : status === "done" && node.doneSub ? accent : "var(--text-muted)",
                  }}
                >
                  {sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Execution log line */}
      <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px]">
        <span className="shrink-0 text-[var(--accent-primary)]">&gt;</span>
        <span key={shown} className="animate-fadeIn truncate text-[var(--text-secondary)]">
          {LOG_LINES[shown]}
        </span>
      </div>
    </div>
  );
}
