"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { GraphNodeType, AgentGraphDefinition } from "@/types/graph";
import { CANVAS_NODE_TYPES } from "./nodeTypes";
import { canvasNodeTypes } from "./CanvasNodes";
import { NodePalette } from "./NodePalette";
import { NodeInspector } from "./NodeInspector";
import { graphToFlow, flowToGraph, createNodeFromType, nextNodeId, nextEdgeId, CanvasNode, CanvasNodeData } from "./graphUtils";
import { importGraphFromJson } from "./exportUtils";
import { useExecutionStream, replayEvents } from "./useExecutionStream";
import { computeLayout } from "./autoLayout";
import { validateGraph } from "./graphValidation";
import { collapseSelection } from "./subgraphUtils";
import { Workflow, Play, Link2, X, Pause, Radio, Flame, LayoutTemplate, AlertTriangle, GitBranch, Keyboard, Copy, Boxes, CornerUpLeft, Maximize, Minimize, Undo2, Redo2, Search, Download, Upload, Package, Bug, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, ChevronDown, ChevronUp, Network, Sparkles, Activity } from "lucide-react";
import { toast } from "@/stores/toastStore";
import { QuickConnectSearch } from "./quickConnectSearch";
import { AlignmentBar } from "./AlignmentBar";
import { CanvasCopilot } from "./CanvasCopilot";
import { ExportDialog } from "./ExportDialog";
import { MacroLibrary } from "./MacroLibrary";
import { DebuggerPanel } from "./DebuggerPanel";
import { CollaborationOverlay } from "./CollaborationOverlay";
import { A2ADirectoryModal } from "./A2ADirectoryModal";
import type { A2AAgentManifest } from "@/types/a2a";
import { MarketplacePanel } from "./MarketplacePanel";
import { ExecutionProgressOverlay } from "./ExecutionProgressOverlay";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { clsx } from "clsx";

const labelClass = "text-xs font-mono text-[var(--accent-primary)] font-medium";

const toolbarGroupClass =
  "inline-flex shrink-0 items-center rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)]/95 overflow-hidden";
const toolbarIconBtnClass =
  "p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] transition-colors disabled:opacity-30 cursor-pointer";
const toolbarTextBtnClass =
  "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-30";
const toolbarIdleClass = "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]";
const toolbarPillClass =
  "inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)]/95 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer";
const toolbarDivider = <div className="w-px h-3.5 bg-[var(--surface-sunken)]" />;
const sidePanelClass =
  "shrink-0 transition-colors duration-200 overflow-hidden rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 flex flex-col";
const sidePanelHeaderClass =
  "flex items-center justify-between px-2.5 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 shrink-0";
const sidePanelToggleClass =
  "p-1 rounded hover:bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer";

const SHORTCUTS = [
  ["⌘/Ctrl + Z", "undo"],
  ["⌘/Ctrl + Shift + Z", "redo"],
  ["⌘/Ctrl + C", "copy selected"],
  ["⌘/Ctrl + V", "paste"],
  ["⌘/Ctrl + D", "duplicate"],
  ["⌘/Ctrl + F", "find node"],
  ["⌘/Ctrl + E", "export graph"],
  ["F11 / Esc", "toggle / exit full-screen"],
  ["⌥ + click node", "duplicate it"],
  ["⌫ / Backspace", "delete selection"],
  ["Ctrl / ⌘ + A", "select all"],
  ["Drag edge handle", "connect nodes"],
  ["Scroll", "zoom · drag empty space to pan"],
];

/** Trace-decorated node per source node object — lets unchanged nodes keep their identity across trace events. */
const traceNodeCache = new WeakMap<CanvasNode, { deps: unknown[]; node: CanvasNode }>();

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT"));
}

interface AgentGraphCanvasProps {
  graph: AgentGraphDefinition | null | undefined;
  onChange: (graph: AgentGraphDefinition) => void;
  /** Live execution id — when set the canvas enters trace mode. */
  executionId?: string | null;
  /** Trace source: a real execution (default) or a ghost-mode preview. */
  mode?: "execution" | "preview";
  /** Edge ids traversed across past runs of this version — coverage view. */
  coverage?: string[];
  readOnly?: boolean;
  /** Rendered inside the trace panel header (e.g. run control button). */
  traceHeaderExtra?: React.ReactNode;
  /** Called when the user enters/exits subgraph editing (page disables run/save). */
  onSubgraphEdit?: (editing: boolean) => void;
}

function CanvasInner({
  graph,
  onChange,
  executionId,
  mode = "execution",
  coverage,
  readOnly = false,
  traceHeaderExtra,
  onSubgraphEdit,
}: AgentGraphCanvasProps) {
  const { theme, resolvedTheme } = useTheme();
  // Compound key format: "punk-dark", "calm-green-light" etc.
  const currentThemeKey = theme || resolvedTheme || "calm-green-dark";
  const isCalmGreen = currentThemeKey.startsWith("calm-green");
  // Appearance is "light" if key ends with "-light" or exactly equals "light"
  const isDark =
    !theme?.includes("-light") &&
    theme !== "light" &&
    !resolvedTheme?.includes("-light") &&
    resolvedTheme !== "light";

  const initial = useMemo(() => graphToFlow(graph), [graph]);
  const [nodes, setNodes] = useNodesState<CanvasNode>(initial.nodes);
  const [edges, setEdges] = useEdgesState(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState(false);
  const [coverageMode, setCoverageMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [subgraphStack, setSubgraphStack] = useState<{ nodeId: string; label: string; parentNodes: CanvasNode[]; parentEdges: Edge[] }[]>([]);
  const inSubgraph = subgraphStack.length > 0;
  // Mirrors subgraphStack.length for callbacks: while > 0 the canvas shows an inner graph,
  // which must never be emitted to the parent as if it were the whole graph.
  const subgraphDepthRef = useRef(0);
  const [canvasTheme, setCanvasTheme] = useState<string | null>(null);
  useEffect(() => {
    setCanvasTheme(window.localStorage.getItem("canvas-theme") ?? "neon");
  }, []);
  const cycleTheme = () => {
    const next = canvasTheme === "neon" ? "graphite" : canvasTheme === "graphite" ? "paper" : "neon";
    setCanvasTheme(next);
    window.localStorage.setItem("canvas-theme", next);
  };
  // Time-scrubber: null = follow the live stream, otherwise event index to replay.
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [scrubPlaying, setScrubPlaying] = useState(false);
  const [scrubSpeed, setScrubSpeed] = useState(1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedRef = useRef<AgentGraphDefinition | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Quick-Connect Radial Search state
  const [quickConnect, setQuickConnect] = useState<{ position: { x: number; y: number }; sourceNodeId?: string; sourceHandleId?: string } | null>(null);
  const connectSourceIdRef = useRef<string | null>(null);
  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  // Macro library state
  const [showMacroLibrary, setShowMacroLibrary] = useState(false);
  // A2A Agent Directory state
  const [showA2ADirectory, setShowA2ADirectory] = useState(false);
  // Marketplace state
  const [showMarketplace, setShowMarketplace] = useState(false);
  // Debugger state
  const [showDebugger, setShowDebugger] = useState(false);
  // Execution Timeline state
  const [showTimeline, setShowTimeline] = useState(false);
  // Highlighted node state for pulse animation (auto-expires)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setCenter } = useReactFlow();
  // Collaboration viewport
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  const [showNodeSearch, setShowNodeSearch] = useState(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [clipboard, setClipboard] = useState<{ nodes: CanvasNode[]; edges: Edge[] } | null>(null);
  const [history, setHistory] = useState<{ nodes: CanvasNode[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef<{ nodes: CanvasNode[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef(-1);
  const duplicateNodeRef = useRef<((node: CanvasNode) => void) | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Responsive sidebar collapse on smaller desktop / tablet screens
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 1024) setLeftOpen(false);
      if (window.innerWidth < 1280) setRightOpen(false);
    }
  }, []);

  const previewEndpoint = useCallback((id: string) => `/api/canvas/preview/${id}/stream`, []);
  const trace = useExecutionStream(executionId ?? null, mode === "preview" ? { endpoint: previewEndpoint } : undefined);

  const inTraceMode = Boolean(executionId);
  const isPreview = mode === "preview";
  // `readOnly` alone previously did nothing but hide UI chrome — every actual
  // mutation path (drag/connect/paste/duplicate/delete/drop, plus ReactFlow's
  // own interactivity props) checked only `inTraceMode`. The one current
  // caller of `readOnly` happens to also pass `executionId` (which sets
  // inTraceMode), so this was masked — but a future read-only view without a
  // live execution would have been fully editable. `isLocked` is the real gate.
  const isLocked = inTraceMode || readOnly;

  // ─── Full-Screen Mode (overlay, not browser fullscreen API) ───
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  // ─── Undo / Redo History ───
  const pushHistory = useCallback((nds: CanvasNode[], eds: Edge[]) => {
    const entry = { nodes: nds.map((n) => ({ ...n, data: { ...n.data } })), edges: [...eds] };
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(entry);
    // Cap at 50 entries
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setHistory([...newHistory]);
    setHistoryIndex(historyIndexRef.current);
  }, []);

  /** Start a fresh history at the given state (entering/leaving a subgraph level). */
  const resetHistory = useCallback(
    (nds: CanvasNode[], eds: Edge[]) => {
      historyRef.current = [];
      historyIndexRef.current = -1;
      pushHistory(nds, eds);
    },
    [pushHistory]
  );

  // Emits the current graph back to the parent without recording history (used by undo/redo).
  const emitGraphChange = useCallback(
    (nextNodes: CanvasNode[], nextEdges: Edge[]) => {
      if (isLocked || subgraphDepthRef.current > 0) return;
      const nextGraph = flowToGraph(nextNodes, nextEdges);
      lastEmittedRef.current = nextGraph;
      onChange(nextGraph);
    },
    [isLocked, onChange]
  );

  // Emits graph to parent AND records in history (used by all user modifications).
  const notifyChange = useCallback(
    (nextNodes: CanvasNode[], nextEdges: Edge[]) => {
      if (isLocked) return;
      emitGraphChange(nextNodes, nextEdges);
      pushHistory(nextNodes, nextEdges);
    },
    [isLocked, emitGraphChange, pushHistory]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(entry.nodes);
    setEdges(entry.edges);
    setHistoryIndex(historyIndexRef.current);
    emitGraphChange(entry.nodes, entry.edges);
  }, [setNodes, setEdges, emitGraphChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(entry.nodes);
    setEdges(entry.edges);
    setHistoryIndex(historyIndexRef.current);
    emitGraphChange(entry.nodes, entry.edges);
  }, [setNodes, setEdges, emitGraphChange]);

  // Sync external graph changes (e.g. initial fetch or reset) to local React Flow state.
  // Do NOT re-sync while in active trace mode to prevent canvas position disturbances.
  useEffect(() => {
    if (inTraceMode) return;
    if (graph && graph !== lastEmittedRef.current) {
      const next = graphToFlow(graph);
      setNodes(next.nodes);
      setEdges(next.edges);
    }
  }, [graph, inTraceMode, setNodes, setEdges]);

  // Initialize history when graph first loads
  useEffect(() => {
    if (graph && historyRef.current.length === 0) {
      const initial = graphToFlow(graph);
      pushHistory(initial.nodes, initial.edges);
    }
  }, [graph, pushHistory]);

  // ─── Copy / Paste Nodes ───
  const copySelection = useCallback(() => {
    const selectedIds = new Set(
      nodes.filter((n) => n.selected || n.id === selectedNodeId).map((n) => n.id)
    );
    if (selectedIds.size === 0) return;
    const copiedNodes = nodes.filter((n) => selectedIds.has(n.id));
    const copiedEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));
    setClipboard({ nodes: copiedNodes, edges: copiedEdges });
    toast.success("Copied to clipboard", `${copiedNodes.length} node(s) copied.`);
  }, [nodes, edges, selectedNodeId]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard || isLocked) return;
    const idMap = new Map<string, string>();
    const newNodes = clipboard.nodes.map((n) => {
      const newId = nextNodeId((n.type ?? "agent") as GraphNodeType, [...nodes, ...clipboard.nodes.map((cn) => ({ ...cn, id: cn.id }))]);
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 48, y: n.position.y + 48 },
        selected: true,
        data: { ...n.data, traceStatus: undefined, traceDetail: undefined },
      };
    });
    const currentEdgeList = [...edges];
    const newEdges = clipboard.edges.map((e) => {
      const edgeId = nextEdgeId(currentEdgeList);
      const edgeObj: Edge = {
        ...e,
        id: edgeId,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      };
      currentEdgeList.push(edgeObj);
      return edgeObj;
    });
    const allNodes = [...nodes, ...newNodes];
    const allEdges = [...edges, ...newEdges];
    setNodes(allNodes);
    setEdges(allEdges);
    notifyChange(allNodes, allEdges);
  }, [clipboard, nodes, edges, isLocked, setNodes, setEdges, notifyChange]);

  // ─── Export / Import Graph ───
  const exportGraph = useCallback(() => {
    const graphData = flowToGraph(nodes, edges);
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Graph exported", "JSON file downloaded.");
  }, [nodes, edges]);

  const importGraph = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = importGraphFromJson(ev.target?.result as string);
        if (data && data.nodes.length > 0) {
          const flow = graphToFlow(data);
          setNodes(flow.nodes);
          setEdges(flow.edges);
          notifyChange(flow.nodes, flow.edges);
          toast.success("Graph imported", `Imported ${flow.nodes.length} nodes and ${flow.edges.length} edges.`);
        } else {
          toast.error("Import failed", "File must be a valid exported graph (version 1, with nodes and edges arrays).");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges, notifyChange]);

  // ─── Quick-Connect Radial Search ───
  const handleQuickConnectSelect = useCallback((type: GraphNodeType) => {
    if (!quickConnect) return;
    const node = createNodeFromType(type, quickConnect.position, nodes);
    const nextNodes = [...nodes, node];
    setNodes(nextNodes);
    // Auto-wire: connect source node to the new node
    if (quickConnect.sourceNodeId) {
      const newEdge: Edge = {
        id: nextEdgeId(edges),
        source: quickConnect.sourceNodeId,
        target: node.id,
        type: "smoothstep",
        animated: false,
        labelStyle: { fontSize: 10, fontFamily: "monospace" },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      };
      const nextEdges = [...edges, newEdge];
      setEdges(nextEdges);
      notifyChange(nextNodes, nextEdges);
    } else {
      notifyChange(nextNodes, edges);
    }
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setQuickConnect(null);
  }, [quickConnect, nodes, edges, setNodes, setEdges, notifyChange]);

  // ─── Alignment Bar ───
  const selectedNodesForAlignment = useMemo(
    () => nodes.filter((n) => n.selected),
    [nodes]
  );

  const handleAlignment = useCallback((updatedNodes: CanvasNode[]) => {
    const nextNodes = nodes.map((n) => {
      const updated = updatedNodes.find((u) => u.id === n.id);
      return updated ? { ...n, position: updated.position } : n;
    });
    setNodes(nextNodes);
    notifyChange(nextNodes, edges);
  }, [nodes, edges, setNodes, notifyChange]);

  // ─── Breakpoint Toggle ───
  const handleToggleBreakpoint = useCallback((nodeId: string) => {
    const next = nodes.map((n) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, breakpoint: !n.data.breakpoint } }
        : n
    );
    setNodes(next);
    notifyChange(next, edges);
  }, [nodes, edges, setNodes, notifyChange]);

  // ─── Macro Library Handlers ───
  const handleAddMacro = useCallback((macroGraph: AgentGraphDefinition) => {
    const flow = graphToFlow(macroGraph);
    // Offset positions to avoid overlap
    const offset = { x: 200, y: 100 };
    const newNodes = flow.nodes.map((n) => ({
      ...n,
      id: nextNodeId((n.type ?? "agent") as GraphNodeType, [...nodes, ...flow.nodes]),
      position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
      data: { ...n.data, traceStatus: undefined, traceDetail: undefined },
    }));
    const idMap = new Map<string, string>();
    flow.nodes.forEach((orig, i) => idMap.set(orig.id, newNodes[i].id));
    const currentEdgeList = [...edges];
    const newEdges = flow.edges.map((e) => {
      const edgeId = nextEdgeId(currentEdgeList);
      const edgeObj: Edge = {
        ...e,
        id: edgeId,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      };
      currentEdgeList.push(edgeObj);
      return edgeObj;
    });
    const allNodes = [...nodes, ...newNodes];
    const allEdges = [...edges, ...newEdges];
    setNodes(allNodes);
    setEdges(allEdges);
    notifyChange(allNodes, allEdges);
    toast.success("Macro added", `Inserted ${newNodes.length} nodes onto the canvas.`);
  }, [nodes, edges, setNodes, setEdges, notifyChange]);

  // ─── A2A Directory: Add Agent onto Canvas ───
  const handleAddA2AAgentFromDirectory = useCallback((manifest: A2AAgentManifest) => {
    const position = { x: 350, y: 240 };
    const newNodeId = nextNodeId("a2a_delegate", nodes);
    const firstCap = manifest.capabilities?.[0]?.id || "deep_research";
    const newNode: CanvasNode = {
      id: newNodeId,
      type: "a2a_delegate",
      position,
      data: {
        label: manifest.displayName || manifest.name.toUpperCase(),
        a2aAgentUrl: manifest.endpoints.tasks,
        a2aCapability: firstCap,
        a2aTimeoutMs: 60000,
        a2aFallbackStrategy: "retry",
      },
    };
    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(newNode.id);
    notifyChange(nextNodes, edges);
    toast.success("A2A Agent Added", `Added ${manifest.displayName || manifest.name} to the canvas.`);
  }, [nodes, edges, setNodes, notifyChange]);

  // ─── Canvas Copilot: Generate graph from NL prompt ───
  const handleCopilotGraphGenerated = useCallback((generatedGraph: AgentGraphDefinition) => {
    const flow = graphToFlow(generatedGraph);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    notifyChange(flow.nodes, flow.edges);
    toast.success("Graph generated", `Created architecture with ${flow.nodes.length} nodes.`);
  }, [setNodes, setEdges, notifyChange]);

  // ─── Node Search ───
  const filteredNodes = useMemo(() => {
    if (!nodeSearchQuery.trim()) return [];
    const q = nodeSearchQuery.toLowerCase();
    return nodes.filter((n) => {
      const label = (n.data.label ?? "").toLowerCase();
      const type = (n.type ?? "").toLowerCase();
      const prompt = (n.data.prompt ?? "").toLowerCase();
      return label.includes(q) || type.includes(q) || prompt.includes(q);
    });
  }, [nodes, nodeSearchQuery]);

  const focusNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setShowNodeSearch(false);
    setNodeSearchQuery("");

    // Find the node and smoothly pan + zoom to center it
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const x = node.position.x + 115; // center of 230px-wide node
      const y = node.position.y + 50; // approximate center height
      setCenter(x, y, { zoom: 1.2, duration: 500 });

      // Trigger pulse highlight that auto-expires after 2s
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedNodeId(nodeId);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedNodeId(null);
        highlightTimerRef.current = null;
      }, 2000);
    }
  }, [nodes, setCenter]);

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      // F11 = toggle fullscreen (works everywhere)
      if (e.key === "F11") { e.preventDefault(); toggleFullScreen(); return; }
      // Leave text fields (inspector prompts, JSON editors, search) to the browser's own editing keys.
      if (isTypingTarget(e.target)) return;
      // Escape = exit fullscreen
      if (e.key === "Escape" && isFullScreen) { e.preventDefault(); toggleFullScreen(); }
      // ⌘+Z = undo
      if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      // ⌘+Shift+Z = redo
      if (meta && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      // ⌘+Y = redo (alt)
      if (meta && e.key === "y") { e.preventDefault(); redo(); }
      // ⌘+C = copy
      if (meta && e.key === "c" && !window.getSelection()?.toString()) { e.preventDefault(); copySelection(); }
      // ⌘+V = paste
      if (meta && e.key === "v") { e.preventDefault(); pasteClipboard(); }
      // ⌘+D = duplicate selected
      if (meta && e.key === "d") { e.preventDefault(); if (selectedNodeId) { const node = nodes.find((n) => n.id === selectedNodeId); if (node && duplicateNodeRef.current) duplicateNodeRef.current(node); } }
      // ⌘+F = node search
      if (meta && e.key === "f") { e.preventDefault(); setShowNodeSearch((s) => !s); }
      // ⌘+E = export dialog
      if (meta && e.key === "e") { e.preventDefault(); setShowExportDialog(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, copySelection, pasteClipboard, selectedNodeId, nodes, toggleFullScreen, isFullScreen]);

  // Time-scrub: replay the event prefix; otherwise use the live trace state.
  const totalEvents = trace.events.length;
  const clampedScrubIndex = scrubIndex === null ? totalEvents : Math.min(scrubIndex, totalEvents);
  const replayed = useMemo(
    () => (scrubIndex === null ? null : replayEvents(trace.events.slice(0, clampedScrubIndex))),
    [trace.events, scrubIndex, clampedScrubIndex]
  );
  const effStatuses = replayed?.nodeStatuses ?? trace.nodeStatuses;
  const effDetails = replayed?.nodeDetails ?? trace.nodeDetails;
  const effTraversed = replayed?.traversedEdges ?? trace.traversedEdges;
  const effDurations = replayed?.nodeDurations ?? trace.nodeDurations;
  const effExecutionStatus = replayed?.executionStatus ?? trace.executionStatus;
  const effRouterDecisions = replayed?.routerDecisions ?? trace.routerDecisions;
  const effLoopState = replayed?.loopState ?? trace.loopState;
  const effToolCalls = replayed?.toolCalls ?? trace.toolCalls;
  const effLlmCalls = replayed?.llmCalls ?? trace.llmCalls;
  const effMcpCalls = replayed?.mcpCalls ?? trace.mcpCalls;
  const effApprovalState = replayed?.approvalState ?? trace.approvalState;
  const effTokenStreams = replayed?.tokenStreams ?? trace.tokenStreams;
  const effA2ADelegations = replayed?.a2aDelegations ?? trace.a2aDelegations;
  const effA2AMessages = replayed?.a2aMessages ?? trace.a2aMessages;

  // Playback: step through events while playing; stop at the end.
  useEffect(() => {
    if (!scrubPlaying || scrubIndex === null) return;
    if (clampedScrubIndex >= totalEvents) {
      setScrubPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      setScrubIndex((i) => (i === null ? i : Math.min(i + 1, totalEvents)));
    }, 120 / scrubSpeed);
    return () => clearInterval(timer);
  }, [scrubPlaying, scrubSpeed, totalEvents, scrubIndex, clampedScrubIndex]);

  // Write the subgraph being edited back into its parent node (returns to the outer view).
  const writeBackSubgraph = useCallback(() => {
    if (subgraphStack.length === 0) return;
    const entry = subgraphStack[subgraphStack.length - 1];
    subgraphDepthRef.current = subgraphStack.length - 1;
    // In trace mode or read-only, just navigate back without writing changes
    if (isLocked) {
      setNodes(entry.parentNodes);
      setEdges(entry.parentEdges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSubgraphStack((s) => s.slice(0, -1));
      resetHistory(entry.parentNodes, entry.parentEdges);
      return;
    }
    const inner = flowToGraph(nodes, edges);
    const parentNodes = entry.parentNodes.map((n) =>
      n.id === entry.nodeId ? { ...n, data: { ...n.data, subgraph: inner } } : n
    );
    setNodes(parentNodes);
    setEdges(entry.parentEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSubgraphStack((s) => s.slice(0, -1));
    onSubgraphEdit?.(subgraphStack.length > 1);
    // Only emits once back at the top level; nested levels carry the edit up via parentNodes.
    emitGraphChange(parentNodes, entry.parentEdges);
    resetHistory(parentNodes, entry.parentEdges);
  }, [subgraphStack, nodes, edges, setNodes, setEdges, emitGraphChange, resetHistory, onSubgraphEdit, isLocked]);

  // Enter subgraph editing or trace viewing: load the inner graph onto the canvas.
  const openSubgraph = useCallback(
    (node: CanvasNode) => {
      const inner = node.data.subgraph;
      if (!inner || !Array.isArray(inner.nodes)) return;
      const view = graphToFlow(inner);
      subgraphDepthRef.current = subgraphStack.length + 1;
      setSubgraphStack((s) => [
        ...s,
        { nodeId: node.id, label: node.data.label || "SUBGRAPH", parentNodes: nodes, parentEdges: edges },
      ]);
      setNodes(view.nodes);
      setEdges(view.edges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      resetHistory(view.nodes, view.edges);
      if (!isLocked) onSubgraphEdit?.(true);
    },
    [subgraphStack.length, nodes, edges, setNodes, setEdges, resetHistory, onSubgraphEdit, isLocked]
  );

  // Collapse the current selection into a subgraph (macro) node.
  const handleCollapse = useCallback(() => {
    const selectedIds = new Set(
      nodes.filter((n) => n.selected || n.id === selectedNodeId).map((n) => n.id)
    );
    const innerCount = nodes.filter((n) => selectedIds.has(n.id) && n.type !== "start" && n.type !== "end").length;
    if (innerCount < 2) return;
    const subgraphId = nextNodeId("subgraph", nodes);
    const result = collapseSelection(nodes, edges, selectedIds, subgraphId);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedNodeId(subgraphId);
    setSelectedEdgeId(null);
    notifyChange(result.nodes, result.edges);
  }, [nodes, edges, selectedNodeId, setNodes, setEdges, notifyChange]);

  // Reset the scrubber when a new execution/preview starts.
  useEffect(() => {
    // A run/preview always executes the outer graph — write any in-flight
    // subgraph edits back first so nothing is lost.
    if (executionId && subgraphStack.length > 0) writeBackSubgraph();
    setScrubIndex(null);
    setScrubPlaying(false);
    setHeatmap(false);
    setCoverageMode(false);
    setShowTimeline(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId]);

  const coveredEdges = useMemo(() => new Set(coverage ?? []), [coverage]);

  // Heatmap: average per-node latency scaled by the slowest node.
  const nodeLatencies = useMemo(() => {
    const avg: Record<string, number> = {};
    for (const [id, d] of Object.entries(effDurations)) avg[id] = d.count ? d.total / d.count : 0;
    return avg;
  }, [effDurations]);
  const maxLatency = useMemo(() => Math.max(0, ...Object.values(nodeLatencies)), [nodeLatencies]);

  // Sync trace statuses (+ heatmap) onto node data (read-only trace mode).
  // Nodes whose trace slice is unchanged keep their object identity, so a token
  // chunk on one node doesn't re-render every memoized node on the canvas.
  const traceNodes = useMemo(() => {
    if (!inTraceMode) return nodes;
    return nodes.map((n) => {
      const latency = heatmap ? nodeLatencies[n.id] : undefined;
      const deps = [
        effStatuses[n.id],
        effDetails[n.id],
        latency,
        latency !== undefined ? maxLatency : undefined,
        effRouterDecisions[n.id],
        effLoopState[n.id],
        effToolCalls[n.id],
        effLlmCalls[n.id],
        effMcpCalls[n.id],
        effApprovalState[n.id],
        effTokenStreams[n.id],
        effA2ADelegations[n.id],
        effA2AMessages[n.id],
        highlightedNodeId === n.id,
      ];
      const cached = traceNodeCache.get(n);
      if (cached && cached.deps.every((d, i) => d === deps[i])) return cached.node;
      const node: CanvasNode = {
        ...n,
        data: {
          ...n.data,
          traceStatus: effStatuses[n.id],
          traceDetail: effDetails[n.id],
          heatmapLatency: latency,
          heatmapMax: latency !== undefined ? maxLatency : undefined,
          // Granular trace data
          traceRouterDecision: effRouterDecisions[n.id],
          traceLoopState: effLoopState[n.id],
          traceToolCall: effToolCalls[n.id],
          traceLlmCall: effLlmCalls[n.id],
          traceMcpCall: effMcpCalls[n.id],
          traceApproval: effApprovalState[n.id],
          traceTokenStream: effTokenStreams[n.id],
          traceA2ADelegation: effA2ADelegations[n.id],
          traceA2AMessages: effA2AMessages[n.id],
          isHighlighted: highlightedNodeId === n.id,
        },
      };
      traceNodeCache.set(n, { deps, node });
      return node;
    });
  }, [nodes, inTraceMode, heatmap, effStatuses, effDetails, nodeLatencies, maxLatency, effRouterDecisions, effLoopState, effToolCalls, effLlmCalls, effMcpCalls, effApprovalState, effTokenStreams, effA2ADelegations, effA2AMessages, highlightedNodeId]);

  // Animate + highlight edges as they are traversed during a live run.
  const traceEdges = useMemo(() => {
    if (!inTraceMode) return edges;
    return edges.map((e) => {
      const traversed = Boolean(effTraversed[e.id]);
      if (!traversed) return {
        ...e,
        animated: false,
        style: { stroke: "var(--border-strong)", strokeWidth: 1, opacity: 0.4, ...(e.style ?? {}) },
      };
      return {
        ...e,
        animated: true,
        style: {
          stroke: "var(--accent-primary)",
          strokeWidth: 2,
          ...(e.style ?? {}),
        },
      };
    });
  }, [edges, inTraceMode, effTraversed]);

  // Coverage view (edit mode): never-traversed edges render dashed in the warning colour.
  const coverageEdges = useMemo(() => {
    if (!coverageMode || inTraceMode) return edges;
    return edges.map((e) =>
      coveredEdges.has(e.id)
        ? { ...e, style: { ...(e.style ?? {}), stroke: "var(--state-success)", strokeWidth: 1.5 } }
        : { ...e, style: { ...(e.style ?? {}), stroke: "var(--state-warning)", strokeDasharray: "6 4", strokeWidth: 1.5, opacity: 0.85 } }
    );
  }, [edges, coverageMode, inTraceMode, coveredEdges]);

  const displayedEdges = inTraceMode ? traceEdges : coverageMode ? coverageEdges : edges;

  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  // `nodes` in this closure can lag the final drag frame — take positions from React Flow's dragged nodes.
  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, _node: CanvasNode, draggedNodes: CanvasNode[]) => {
      const moved = new Map(draggedNodes.map((n) => [n.id, n.position]));
      const nextNodes = nodes.map((n) => {
        const position = moved.get(n.id);
        return position ? { ...n, position } : n;
      });
      notifyChange(nextNodes, edges);
    },
    [nodes, edges, notifyChange]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (isLocked) return;
      connectSourceIdRef.current = null;
      const next = addEdge(
        {
          ...connection,
          id: nextEdgeId(edges),
          type: "smoothstep",
          label: "",
          animated: false,
          labelStyle: { fontSize: 10, fontFamily: "monospace" },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        },
        edges
      );
      setEdges(next);
      notifyChange(nodes, next);
    },
    [nodes, edges, setEdges, notifyChange, isLocked]
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (isLocked) return;
      const sourceId = connectSourceIdRef.current;
      connectSourceIdRef.current = null;
      if (!sourceId || !wrapperRef.current) return;
      const targetEl = event.target as HTMLElement | null;
      const isHandle = targetEl?.classList?.contains("react-flow__handle") || targetEl?.closest?.(".react-flow__handle");
      if (isHandle) return;

      const mouseEv = event as MouseEvent;
      const touchEv = event as TouchEvent;
      const clientX = mouseEv.clientX ?? touchEv.touches?.[0]?.clientX ?? (touchEv.changedTouches?.[0]?.clientX ?? 0);
      const clientY = mouseEv.clientY ?? touchEv.touches?.[0]?.clientY ?? (touchEv.changedTouches?.[0]?.clientY ?? 0);
      if (clientX > 0 && clientY > 0) {
        setQuickConnect({
          position: { x: clientX, y: clientY },
          sourceNodeId: sourceId,
        });
      }
    },
    [isLocked]
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  /** ⌥-click duplicates the node (keyboard-first editing). */
  const duplicateNode = useCallback(
    (node: CanvasNode) => {
      if (isLocked) return;
      const clone: CanvasNode = {
        ...node,
        id: nextNodeId((node.type ?? "agent") as GraphNodeType, nodes),
        position: { x: node.position.x + 48, y: node.position.y + 48 },
        selected: true,
        data: { ...node.data, traceStatus: undefined, traceDetail: undefined, heatmapLatency: undefined, heatmapMax: undefined },
      };
      const nextNodes = [...nodes, clone];
      setNodes(nextNodes);
      setSelectedNodeId(clone.id);
      setSelectedEdgeId(null);
      notifyChange(nextNodes, edges);
    },
    [nodes, edges, setNodes, notifyChange, isLocked]
  );

  // Keep the ref in sync
  duplicateNodeRef.current = duplicateNode;

  const onDragStart = (event: React.DragEvent, type: GraphNodeType) => {
    event.dataTransfer.setData("application/agent-node-type", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (isLocked) return;
      event.preventDefault();

      // Handle marketplace template drops
      const templateData = event.dataTransfer.getData("application/marketplace-template");
      if (templateData) {
        try {
          const templateGraph: AgentGraphDefinition = JSON.parse(templateData);
          handleAddMacro(templateGraph);
          setShowMarketplace(false);
        } catch {}
        return;
      }

      const type = event.dataTransfer.getData("application/agent-node-type") as GraphNodeType;
      if (!type || !CANVAS_NODE_TYPES.some((t) => t.type === type)) return;

      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = {
        x: event.clientX - bounds.left - 110,
        y: event.clientY - bounds.top - 60,
      };
      const node = createNodeFromType(type, position, nodes);
      const nextNodes = [...nodes, node];
      setNodes(nextNodes);
      setSelectedNodeId(node.id);
      notifyChange(nextNodes, edges);
    },
    [nodes, edges, setNodes, notifyChange, isLocked, handleAddMacro]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  // Idle-time validation — inline warnings before you pay for a run.
  const issues = useMemo(() => validateGraph(graph), [graph]);

  const handleAutoLayout = useCallback(() => {
    if (isLocked) return;
    const positions = computeLayout(nodes, edges);
    const nextNodes = nodes.map((n, i) => ({ ...n, position: positions[i] ?? n.position }));
    setNodes(nextNodes);
    notifyChange(nextNodes, edges);
  }, [nodes, edges, setNodes, notifyChange, isLocked]);

  const updateNodeData = useCallback(
    (id: string, patch: Partial<CanvasNodeData>) => {
      if (isLocked) return;
      const nextNodes = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
      setNodes(nextNodes);
      notifyChange(nextNodes, edges);
    },
    [nodes, edges, setNodes, notifyChange, isLocked]
  );

  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      if (isLocked) return;
      const nextEdges = edges.map((e) => (e.id === edgeId ? { ...e, label: label || undefined } : e));
      setEdges(nextEdges);
      notifyChange(nodes, nextEdges);
    },
    [nodes, edges, setEdges, notifyChange, isLocked]
  );

  const onNodesDelete = useCallback(
    (deletedNodes: CanvasNode[]) => {
      if (isLocked) return;
      const deletedIds = new Set(deletedNodes.map((n) => n.id));
      const nextNodes = nodes.filter((n) => !deletedIds.has(n.id));
      const nextEdges = edges.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target));
      setNodes(nextNodes);
      setEdges(nextEdges);
      if (selectedNodeId && deletedIds.has(selectedNodeId)) {
        setSelectedNodeId(null);
      }
      notifyChange(nextNodes, nextEdges);
    },
    [isLocked, nodes, edges, selectedNodeId, setNodes, setEdges, notifyChange]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      if (isLocked) return;
      const deletedIds = new Set(deletedEdges.map((e) => e.id));
      const nextEdges = edges.filter((e) => !deletedIds.has(e.id));
      setEdges(nextEdges);
      if (selectedEdgeId && deletedIds.has(selectedEdgeId)) {
        setSelectedEdgeId(null);
      }
      notifyChange(nodes, nextEdges);
    },
    [isLocked, nodes, edges, selectedEdgeId, setEdges, notifyChange]
  );

  const deleteSelected = useCallback(() => {
    if (isLocked) return;
    if (selectedNodeId) {
      const nextNodes = nodes.filter((n) => n.id !== selectedNodeId);
      const nextEdges = edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      notifyChange(nextNodes, nextEdges);
    } else if (selectedEdgeId) {
      const nextEdges = edges.filter((e) => e.id !== selectedEdgeId);
      setEdges(nextEdges);
      setSelectedEdgeId(null);
      notifyChange(nodes, nextEdges);
    }
  }, [selectedNodeId, selectedEdgeId, nodes, edges, setNodes, setEdges, notifyChange, isLocked]);

  const terminal = effExecutionStatus
    ? ["COMPLETED", "FAILED", "CANCELLED", "STEP_LIMIT_EXCEEDED"].includes(effExecutionStatus)
    : false;

  const toggleScrubPlay = () => {
    if (scrubIndex === null) setScrubIndex(0);
    setScrubPlaying((p) => !p);
  };

  // ─── Theme-derived classes ───
  // App chrome follows the app's light/dark theme; the canvas surface (and the
  // panels floating over it) follow the canvas theme (neon / graphite / paper).
  const canvasBgClass = isCalmGreen
    ? (isDark ? "bg-[var(--surface-raised)]" : "bg-[var(--surface-raised)]")
    : (canvasTheme === "paper" ? "bg-[var(--surface-sunken)]" : canvasTheme === "graphite" ? "bg-[var(--surface-raised)]" : "bg-[var(--surface-raised)]");
  const floatingPanelClass = clsx(
    "absolute z-20 rounded-[10px] font-mono border",
    canvasTheme === "paper"
      ? "border-[var(--border-subtle)] bg-[var(--surface-raised)]/95 text-[var(--text-primary)]"
      : canvasTheme === "graphite"
        ? "border-[var(--border-strong)] bg-[var(--surface-raised)]/95 text-[var(--text-muted)]"
        : "border-[var(--border-strong)] bg-[var(--surface-raised)]/95 text-[var(--text-muted)]"
  );
  const fullScreenToggle = (
    <button
      type="button"
      onClick={toggleFullScreen}
      className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      title={isFullScreen ? "Exit full-screen (Esc / F11)" : "Full-screen (F11)"}
    >
      {isFullScreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
      {isFullScreen ? "Exit" : "Fullscreen"}
    </button>
  );
  const graphStats = (
    <div className="border-t border-[var(--border-subtle)] pt-2 space-y-1.5">
      <div className="text-xs text-[var(--text-muted)] font-medium">Graph stats</div>
      <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Nodes</span><span className="text-[var(--accent-primary)] font-medium">{nodes.length}</span></div>
      <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Edges</span><span className="text-[var(--accent-primary)] font-medium">{edges.length}</span></div>
      <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Branches</span><span className="text-[var(--accent-primary)] font-medium">{edges.filter((e) => e.label).length}</span></div>
    </div>
  );

  return (
    <div
      className={clsx(
        "flex flex-col font-mono",
        isFullScreen ? "fixed inset-0 z-[9999] p-2 bg-[var(--surface-sunken)]" : "relative h-full"
      )}
    >
      <div className="flex-1 min-h-0 flex gap-2">
        {/* ─── Left palette (collapsible) ─── */}
        {!readOnly && (
          <div className={clsx(sidePanelClass, leftOpen ? "w-52" : "w-10")}>
            <div className={sidePanelHeaderClass}>
              {leftOpen && <span className="text-xs font-medium text-[var(--accent-primary)]">Nodes</span>}
              <button
                type="button"
                onClick={() => setLeftOpen((p) => !p)}
                className={sidePanelToggleClass}
                title={leftOpen ? "Collapse palette" : "Expand palette"}
              >
                {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
              </button>
            </div>
            {leftOpen && (
              <div className="p-2 flex-1 min-h-0 overflow-hidden">
                <NodePalette onDragStart={onDragStart} disabled={inTraceMode} />
              </div>
            )}
          </div>
        )}

        {/* ─── Center column ─── */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Toolbar (edit mode) — one row; tool groups scroll horizontally instead of wrapping over the graph */}
          {!inTraceMode && (!readOnly || isFullScreen) && (
            <div className="shrink-0 flex items-center gap-2">
              {isFullScreen && (
                <div className="hidden md:flex shrink-0 items-center gap-2 pr-1 text-xs whitespace-nowrap">
                  <Workflow className="h-4 w-4 text-[var(--accent-primary)]" />
                  <span className="font-medium text-[var(--text-primary)]">Canvas editor</span>
                  <span className="text-[var(--text-muted)]"><b>{nodes.length}</b> nodes · <b>{edges.length}</b> edges</span>
                </div>
              )}
              {!readOnly && (
                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {/* History group */}
                  <div className={toolbarGroupClass}>
                    <button type="button" onClick={undo} disabled={historyIndex <= 0} className={toolbarIconBtnClass} title="Undo (⌘+Z)">
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                    {toolbarDivider}
                    <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className={toolbarIconBtnClass} title="Redo (⌘+Shift+Z)">
                      <Redo2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Layout & Selection group */}
                  <div className={toolbarGroupClass}>
                    <button type="button" onClick={handleAutoLayout} className={clsx(toolbarTextBtnClass, toolbarIdleClass)} title="Arrange nodes in layered columns">
                      <LayoutTemplate className="h-3 w-3" /> Auto layout
                    </button>
                    {toolbarDivider}
                    <button
                      type="button"
                      onClick={handleCollapse}
                      disabled={!nodes.some((n) => n.selected || n.id === selectedNodeId)}
                      className={clsx(toolbarTextBtnClass, toolbarIdleClass)}
                      title="Collapse selection into macro"
                    >
                      <Boxes className="h-3 w-3" /> Macro
                    </button>
                    {toolbarDivider}
                    <button type="button" onClick={() => setShowNodeSearch((s) => !s)} className={clsx(toolbarTextBtnClass, toolbarIdleClass)} title="Find node (⌘+F)">
                      <Search className="h-3 w-3" /> Find
                    </button>
                  </div>

                  {/* Portability group */}
                  <div className={toolbarGroupClass}>
                    <button type="button" onClick={importGraph} className={toolbarIconBtnClass} title="Import graph JSON">
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    {toolbarDivider}
                    <button type="button" onClick={exportGraph} className={toolbarIconBtnClass} title="Quick export JSON">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {toolbarDivider}
                    <button type="button" onClick={() => setShowExportDialog(true)} className={clsx(toolbarTextBtnClass, toolbarIdleClass)} title="Export graph (PNG/SVG/PDF/Mermaid/LangGraph)">
                      Export…
                    </button>
                  </div>

                  {/* Tools group */}
                  <div className={toolbarGroupClass}>
                    <button
                      type="button"
                      onClick={() => setShowMacroLibrary((p) => !p)}
                      className={clsx(toolbarTextBtnClass, showMacroLibrary ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10" : toolbarIdleClass)}
                      title="Toggle the components library"
                    >
                      <Package className="h-3 w-3" /> Components
                    </button>
                    {toolbarDivider}
                    <button
                      type="button"
                      onClick={() => setShowDebugger((p) => !p)}
                      className={clsx(toolbarTextBtnClass, showDebugger ? "bg-[var(--surface-sunken)] text-[var(--text-primary)]" : toolbarIdleClass)}
                      title="Toggle debugger panel"
                    >
                      <Bug className="h-3 w-3" /> Debug
                    </button>
                    {toolbarDivider}
                    <button
                      type="button"
                      onClick={() => setShowA2ADirectory(true)}
                      className={clsx(toolbarTextBtnClass, toolbarIdleClass)}
                      title="Open the A2A agent directory"
                    >
                      <Network className="h-3 w-3" /> A2A directory
                    </button>
                    {toolbarDivider}
                    <button
                      type="button"
                      onClick={() => setShowMarketplace((p) => !p)}
                      className={clsx(toolbarTextBtnClass, showMarketplace ? "bg-[var(--surface-sunken)] text-[var(--text-primary)]" : toolbarIdleClass)}
                      title="Marketplace templates"
                    >
                      <Sparkles className="h-3 w-3" /> Marketplace
                    </button>
                    {coverage && coverage.length > 0 && (
                      <>
                        {toolbarDivider}
                        <button
                          type="button"
                          onClick={() => setCoverageMode((c) => !c)}
                          className={clsx(toolbarTextBtnClass, coverageMode ? "bg-[var(--surface-sunken)] text-[var(--text-primary)]" : toolbarIdleClass)}
                          title="Branch coverage highlights"
                        >
                          <GitBranch className="h-3 w-3" /> {coverageMode ? "Coverage on" : "Coverage"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Shortcuts + theme + fullscreen — outside the scroll area so the popover isn't clipped */}
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                {!readOnly && (
                  <>
                    <div className="relative">
                      <button type="button" onClick={() => setShowShortcuts((s) => !s)} className={toolbarPillClass} title="Keyboard shortcuts">
                        <Keyboard className="h-3 w-3" /> <span className="hidden xl:inline">Shortcuts</span>
                      </button>
                      {showShortcuts && (
                        <div className="absolute right-0 top-8 z-[100] w-64 space-y-1.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]/95 p-3">
                          <div className="mb-1 text-xs font-medium text-[var(--text-primary)]">Shortcuts</div>
                          {SHORTCUTS.map(([key, desc]) => (
                            <div key={key} className="flex items-center justify-between gap-2 text-xs">
                              <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-1 py-0.5 font-mono text-[var(--text-secondary)]">{key}</kbd>
                              <span className="text-[var(--text-muted)]">{desc}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={cycleTheme} className={toolbarPillClass} title={`Theme: ${canvasTheme}. Click to cycle`}>
                      <Copy className="h-3 w-3" /> <span className="capitalize">{canvasTheme ?? "theme"}</span>
                    </button>
                  </>
                )}
                {fullScreenToggle}
              </div>
            </div>
          )}

          {/* Trace status bar */}
          {inTraceMode && (
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs">
              <div className="flex items-center gap-2 text-[var(--accent-primary)]">
                <span className={clsx("inline-block h-2 w-2 rounded-full", trace.connected ? "bg-[var(--state-success)]" : "bg-[var(--state-error)]")} />
                <span className="font-medium">
                  {isPreview ? "Ghost preview · dry-run" : "Live trace"} · {effExecutionStatus ?? "Connecting…"}
                </span>
                {trace.connected ? (
                  <span className="text-[var(--state-success)] font-medium">[SSE STREAM]</span>
                ) : !terminal ? (
                  <span className="text-[var(--state-warning)] font-medium">[RECONNECTING]</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTimeline((p) => !p)}
                  className={clsx(
                    "inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors cursor-pointer",
                    showTimeline
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)]/20 text-[var(--accent-primary)]"
                      : "border-[var(--accent-primary)]/25 text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/40"
                  )}
                  title="Toggle execution timeline"
                >
                  <Activity className="h-3 w-3" /> Timeline
                </button>
                {traceHeaderExtra}
                {fullScreenToggle}
              </div>
            </div>
          )}

          {/* Subgraph breadcrumb */}
          {inSubgraph && (
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] px-3 py-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)]">
                <Boxes className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="font-medium">{inTraceMode ? "Subgraph trace" : "Editing macro"}</span>
                <span className="text-[var(--accent-primary)] font-medium">› {subgraphStack[subgraphStack.length - 1].label}</span>
                {!inTraceMode && <span className="text-xs text-[var(--state-warning)] font-medium">(exit to save it back)</span>}
              </div>
              <button
                type="button"
                onClick={writeBackSubgraph}
                className="inline-flex items-center gap-1 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] px-2 py-1 text-xs font-medium text-[var(--cta-primary-text)] hover:bg-[var(--cta-primary-hover)] transition-colors cursor-pointer"
              >
                <CornerUpLeft className="h-3 w-3" /> {inTraceMode ? "BACK" : "Exit subgraph"}
              </button>
            </div>
          )}

          {/* ─── Canvas surface — every overlay below is anchored to it ─── */}
          <div
            ref={wrapperRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className={clsx("relative flex-1 min-h-0 rounded border border-[var(--border-subtle)] overflow-hidden", canvasBgClass)}
          >
            <ReactFlow
              nodes={traceNodes}
              edges={displayedEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              onConnect={onConnect}
              onConnectStart={(_event, params) => {
                // Track connection start for Quick-Connect Radial Search
                if (params?.nodeId) {
                  connectSourceIdRef.current = params.nodeId;
                }
              }}
              onConnectEnd={onConnectEnd}
              onViewportChange={(vp) => setViewport(vp)}
              onNodeClick={(event, node) => {
                if (event.altKey) {
                  duplicateNode(node);
                  return;
                }
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
                if (!rightOpen) setRightOpen(true);
              }}
              onEdgeClick={onEdgeClick}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              nodeTypes={canvasNodeTypes}
              fitView
              minZoom={0.15}
              maxZoom={2}
              snapToGrid
              snapGrid={[12, 12]}
              nodesDraggable={!isLocked}
              nodesConnectable={!isLocked}
              edgesFocusable={!isLocked}
              elementsSelectable={!isLocked}
              preventScrolling={true}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1.5}
                color={
                  isCalmGreen
                    ? (isDark ? "rgba(37, 45, 42, 0.75)" : "#D5DDD9")
                    : (canvasTheme === "paper" ? "#cbd5e1" : canvasTheme === "graphite" ? "#2a2e3a" : isDark ? "#334155" : "#cbd5e1")
                }
              />
              <Controls className={clsx(
                "![&>button]:!",
                isCalmGreen
                  ? (isDark
                      ? "!border-[var(--surface-raised)] !bg-[var(--surface-raised)] [&>button]:!border-[var(--surface-raised)] [&>button]:!text-[var(--surface-raised)] [&>button]:!bg-[var(--surface-raised)] [&>button:hover]:!bg-[var(--surface-raised)] [&>button:hover]:!text-[var(--surface-raised)]"
                      : "!border-[var(--surface-raised)] !bg-[var(--surface-raised)] [&>button]:!border-[var(--surface-raised)] [&>button]:!text-[var(--surface-raised)] [&>button]:!bg-[var(--surface-raised)] [&>button:hover]:!bg-[var(--surface-sunken)]")
                  : (canvasTheme === "paper"
                      ? "!border-[var(--border-subtle)] !bg-[var(--surface-raised)] [&>button]:!border-[var(--border-subtle)] [&>button]:!text-[var(--text-secondary)] [&>button]:!bg-[var(--surface-raised)] [&>button:hover]:!bg-[var(--surface-sunken)]"
                      : canvasTheme === "graphite"
                        ? "!border-[var(--border-strong)] !bg-[var(--surface-raised)] [&>button]:!border-[var(--border-strong)] [&>button]:!text-[var(--text-muted)] [&>button]:!bg-[var(--surface-raised)] [&>button:hover]:!bg-[var(--surface-elevated)]"
                        : "!border-[var(--border-strong)] !bg-[var(--surface-raised)] [&>button]:!border-[var(--border-strong)] [&>button]:!text-[var(--text-muted)] [&>button]:!bg-[var(--surface-raised)] [&>button:hover]:!bg-[var(--surface-elevated)] [&>button:hover]:!text-[var(--text-primary)]")
              )} />
              <MiniMap
                pannable
                zoomable
                className={clsx(
                  "!",
                  isCalmGreen
                    ? (isDark ? "!bg-[var(--surface-raised)] !border-[var(--surface-raised)]" : "!bg-[var(--surface-raised)] !border-[var(--surface-raised)]")
                    : (canvasTheme === "paper"
                        ? "!bg-[var(--surface-raised)] !border-[var(--border-subtle)]"
                        : canvasTheme === "graphite"
                          ? "!bg-[var(--surface-raised)] !border-[var(--border-strong)]"
                          : "!bg-[var(--surface-raised)] !border-[var(--border-strong)]")
                )}
                maskColor={isDark ? (isCalmGreen ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.6)") : "rgba(241, 245, 249, 0.7)"}
                nodeColor={(n) => {
                  const t = n.data?.traceStatus;
                  if (t === "RUNNING") return isCalmGreen ? "#7FAF9B" : "#818cf8";
                  if (t === "SUCCESS") return "#34d399";
                  if (t === "FAILED") return isCalmGreen ? "#A85858" : "#f87171";
                  if (t === "AWAITING_APPROVAL") return isCalmGreen ? "#C7A96B" : "#fbbf24";
                  return isCalmGreen
                    ? (isDark ? "#0a0e0c" : "#EAEEEC")
                    : (canvasTheme === "paper" ? "#cbd5e1" : canvasTheme === "graphite" ? "#2a2e3a" : isDark ? "#334155" : "#cbd5e1");
                }}
              />
            </ReactFlow>

            {/* Node search overlay */}
            {showNodeSearch && (
              <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2 w-72 max-w-[calc(100%-1rem)]">
                <div className="rounded-[8px] border border-[var(--accent-primary)]/25 bg-[var(--surface-raised)]/95 p-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0" />
                    <input
                      autoFocus
                      value={nodeSearchQuery}
                      onChange={(e) => setNodeSearchQuery(e.target.value)}
                      placeholder="Search nodes by name, type, or prompt..."
                      className="flex-1 bg-transparent text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") { setShowNodeSearch(false); setNodeSearchQuery(""); }
                        if (e.key === "Enter" && filteredNodes.length > 0) focusNode(filteredNodes[0].id);
                      }}
                    />
                    <button type="button" onClick={() => { setShowNodeSearch(false); setNodeSearchQuery(""); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"><X className="h-3 w-3" /></button>
                  </div>
                  {nodeSearchQuery && filteredNodes.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                      {filteredNodes.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => focusNode(n.id)}
                          className="w-full flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--accent-primary)]/10 transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-mono text-[var(--accent-primary)] shrink-0 w-16">{n.type}</span>
                          <span className="text-xs font-mono text-[var(--text-primary)] truncate">{n.data.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {nodeSearchQuery && filteredNodes.length === 0 && (
                    <p className="mt-2 text-xs text-[var(--text-muted)] text-center">No nodes found</p>
                  )}
                </div>
              </div>
            )}

            {/* Validation warnings (floating bottom-left, clear of the zoom controls) */}
            {!inTraceMode && !readOnly && issues.length > 0 && (
              <div className="absolute bottom-3 left-14 z-20 font-mono">
                <div className="relative">
                  {showValidationDetails && (
                    <div className="absolute bottom-9 left-0 w-80 max-h-52 overflow-y-auto rounded-[12px] border border-[var(--state-warning)]/40 bg-[var(--surface-raised)]/95 p-3 space-y-1.5 z-30">
                      <div className="flex items-center justify-between border-b border-[var(--state-warning)]/25 pb-1.5 mb-1">
                        <span className="text-xs font-medium text-[var(--state-warning)]">
                          Graph issues ({issues.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowValidationDetails(false)}
                          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs leading-tight text-[var(--text-primary)]">
                          <span className={clsx("shrink-0 font-medium", issue.severity === "error" ? "text-[var(--state-error)]" : "text-[var(--state-warning)]")}>
                            {issue.severity}
                          </span>
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowValidationDetails((p) => !p)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-[var(--state-warning)] hover:bg-[var(--state-warning)]/10 transition-colors text-xs font-medium cursor-pointer"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-[var(--state-warning)] shrink-0" />
                    <span>
                      {issues.filter((i) => i.severity === "error").length} errors · {issues.filter((i) => i.severity === "warning").length} warnings
                    </span>
                    {showValidationDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {nodes.length <= 2 && !inTraceMode && !readOnly && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Workflow className={clsx("h-12 w-12 mx-auto", canvasTheme === "paper" ? "text-[var(--accent-primary)]/60" : "text-[var(--accent-primary)]/40")} />
                  <p className={clsx("text-[12px] font-medium", canvasTheme === "paper" ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]")}>Drag nodes from the left palette</p>
                  <p className={clsx("text-xs", canvasTheme === "paper" ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]")}>Connect them to design your multi-agent architecture</p>
                </div>
              </div>
            )}

            {/* Terminal banner (top-centre — the progress overlay owns bottom-centre) */}
            {terminal && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-2 font-sans text-[13px] text-[var(--text-primary)] flex items-center gap-1.5">
                <span>{isPreview ? "Preview" : "Execution"} {String(effExecutionStatus).toLowerCase().replace(/_/g, " ")}</span>
              </div>
            )}

            {/* Macro Library Panel */}
            {showMacroLibrary && (
              <div className={clsx(floatingPanelClass, "left-2 top-2 w-64 max-h-[calc(100%-1rem)] overflow-y-auto p-3")}>
                <MacroLibrary
                  nodes={nodes}
                  edges={edges}
                  selectedNodeIds={new Set(nodes.filter((n) => n.selected).map((n) => n.id))}
                  onAddMacro={handleAddMacro}
                  isOpen={showMacroLibrary}
                  onToggle={() => setShowMacroLibrary(!showMacroLibrary)}
                />
              </div>
            )}

            {/* Marketplace Panel */}
            {showMarketplace && (
              <div className={clsx(floatingPanelClass, "left-2 top-2 w-72 max-h-[calc(100%-1rem)] overflow-y-auto p-3", showMacroLibrary && "left-[17rem]")}>
                <MarketplacePanel
                  onDragStart={onDragStart}
                  onAddMacro={handleAddMacro}
                  disabled={inTraceMode}
                  onClose={() => setShowMarketplace(false)}
                />
              </div>
            )}

            {/* Debugger Panel */}
            {showDebugger && (
              <div className={clsx(floatingPanelClass, "right-2 top-12 w-64 max-h-[calc(100%-4rem)] overflow-y-auto p-3")}>
                <DebuggerPanel
                  nodeStatuses={effStatuses}
                  nodeDetails={effDetails}
                  isRunning={inTraceMode && effExecutionStatus === "RUNNING"}
                  onToggleBreakpoint={handleToggleBreakpoint}
                />
              </div>
            )}

            {/* Execution Timeline Panel */}
            {showTimeline && inTraceMode && (
              <div className={clsx(floatingPanelClass, "right-2 top-12 bottom-3 w-80 max-w-[calc(100%-1rem)] overflow-hidden")}>
                <ExecutionTimeline
                  events={trace.events}
                  nodeStatuses={effStatuses}
                  isRunning={inTraceMode && effExecutionStatus === "RUNNING"}
                  onNodeClick={(nodeId) => {
                    focusNode(nodeId);
                    if (!rightOpen) setRightOpen(true);
                  }}
                  onClose={() => setShowTimeline(false)}
                />
              </div>
            )}

            {/* Execution Progress Overlay */}
            {inTraceMode && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[480px] max-w-[calc(100%-1rem)]">
                <ExecutionProgressOverlay
                  executionStatus={effExecutionStatus}
                  nodeStatuses={effStatuses as Record<string, "RUNNING" | "SUCCESS" | "FAILED" | "AWAITING_APPROVAL" | "SKIPPED">}
                  nodeDetails={effDetails}
                  totalNodes={nodes.length}
                  connected={trace.connected}
                  startedAt={trace.events.length > 0 ? trace.events[0].at : undefined}
                  isPreview={isPreview}
                />
              </div>
            )}

            {/* Canvas Copilot (Talk to Graph NL Generator) */}
            {!inTraceMode && !readOnly && (
              <CanvasCopilot
                onGraphGenerated={handleCopilotGraphGenerated}
                disabled={inTraceMode}
                position="bottom"
              />
            )}

            {/* Alignment Bar */}
            {selectedNodesForAlignment.length >= 2 && !inTraceMode && (
              <AlignmentBar
                selectedNodes={selectedNodesForAlignment}
                edges={edges}
                onAlign={handleAlignment}
                onDismiss={() => {
                  nodes.forEach((n) => {
                    if (n.selected) {
                      setNodes((prev) => prev.map((p) => p.id === n.id ? { ...p, selected: false } : p));
                    }
                  });
                }}
              />
            )}

            {/* Collaboration Overlay (cursor positions are canvas-relative) */}
            <CollaborationOverlay
              canvasContainerRef={wrapperRef}
              viewport={viewport}
            />
          </div>

          {/* Trace time-travel scrubber */}
          {inTraceMode && trace.events.length > 1 && (
            <div className="shrink-0 flex items-center gap-2 rounded border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={toggleScrubPlay}
                className="shrink-0 p-1 rounded hover:bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                title={scrubPlaying ? "Pause replay" : "Play replay"}
              >
                {scrubPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={totalEvents}
                value={clampedScrubIndex}
                onChange={(e) => {
                  setScrubIndex(Number(e.target.value));
                  setScrubPlaying(false);
                }}
                className="flex-1 accent-[var(--text-muted)] dark:accent-[var(--text-muted)] h-1 bg-[var(--surface-elevated)] rounded-[8px] cursor-pointer"
              />
              <span className="text-[var(--text-secondary)] shrink-0 font-mono text-xs tabular-nums">
                {clampedScrubIndex}/{totalEvents}
              </span>
              <select
                value={scrubSpeed}
                onChange={(e) => setScrubSpeed(Number(e.target.value))}
                className="shrink-0 rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-1 py-0.5 text-xs text-[var(--text-secondary)] cursor-pointer"
                title="Replay speed"
              >
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
                <option value={8}>8×</option>
              </select>
              {scrubIndex !== null && (
                <button
                  type="button"
                  onClick={() => { setScrubIndex(null); setScrubPlaying(false); }}
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-[var(--state-success)] hover:bg-[var(--state-success)]/10 transition-colors cursor-pointer"
                  title="Follow the live stream again"
                >
                  <Radio className="h-2.5 w-2.5" /> LIVE
                </button>
              )}
            </div>
          )}

          {/* Live event console */}
          {inTraceMode && trace.events.length > 0 && (
            <div className="shrink-0 h-24 overflow-y-auto rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-2 space-y-0.5 font-mono text-xs">
              {trace.events.slice(-30).map((ev, i) => {
                const nodeId = "nodeId" in ev ? ev.nodeId : undefined;
                const detail = "detail" in ev ? ev.detail : undefined;
                return (
                  <div key={i} className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="shrink-0">{new Date(ev.at).toLocaleTimeString()}</span>
                    <span className="font-medium shrink-0 text-[var(--accent-primary)]">{ev.type}</span>
                    {nodeId && <span className="truncate text-[var(--text-primary)]">{nodeId}</span>}
                    {detail && <span className="truncate text-[var(--text-muted)]">{detail}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Right inspector (collapsible) ─── */}
        <div className={clsx(sidePanelClass, rightOpen ? "w-72" : "w-10")}>
          <div className={sidePanelHeaderClass}>
            {rightOpen && <span className="text-xs font-medium text-[var(--accent-primary)]">Inspector</span>}
            <button
              type="button"
              onClick={() => setRightOpen((p) => !p)}
              className={sidePanelToggleClass}
              title={rightOpen ? "Collapse inspector" : "Expand inspector"}
            >
              {rightOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
            </button>
          </div>
          {rightOpen && (
            <div className="flex-1 overflow-y-auto p-3">
              {inTraceMode ? (
                selectedNode && selectedNode.type === "subgraph" ? (
                  /* In trace mode, allow opening subgraph nodes to view the inner trace */
                  <NodeInspector
                    key={selectedNode.id}
                    node={selectedNode}
                    onUpdate={() => { }}
                    onDelete={() => { }}
                    allNodeIds={nodes.map((n) => n.id)}
                    onOpenSubgraph={openSubgraph}
                    onToggleBreakpoint={handleToggleBreakpoint}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-[var(--accent-primary)] font-medium">
                      {isPreview ? "Ghost preview" : "Live trace"}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {isPreview
                        ? "Dry run against your current input. Nothing is persisted and approval gates pass automatically, so you can see the path before a real run."
                        : "The canvas is locked while the agent runs. Node borders show state: accent while running, green on success, amber while awaiting approval and red on failure."}
                    </p>
                    <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[var(--cta-primary-bg)]" /> Running</div>
                      <div className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[var(--state-success)]" /> Success</div>
                      <div className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[var(--state-warning)]" /> Awaiting approval</div>
                      <div className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[var(--state-error)]" /> Failed</div>
                    </div>

                    {/* Heatmap toggle */}
                    <div className="border-t border-[var(--border-subtle)] pt-2">
                      <button
                        type="button"
                        onClick={() => setHeatmap((h) => !h)}
                        className={clsx(
                          "inline-flex w-full items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                          heatmap
                            ? "border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-[var(--state-warning)]"
                            : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--state-warning)]/40 hover:text-[var(--state-warning)]"
                        )}
                      >
                        <Flame className="h-3 w-3" /> {heatmap ? "Heatmap: latency on" : "Show latency heatmap"}
                      </button>
                      {heatmap && maxLatency > 0 && (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Slowest node avg {maxLatency >= 1000 ? `${(maxLatency / 1000).toFixed(1)}s` : `${Math.round(maxLatency)}ms`} · cool = fast, hot = slow
                        </p>
                      )}
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-2 space-y-1.5">
                      <div className="text-xs text-[var(--text-muted)] font-medium">Stats</div>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Events received</span><span className="text-[var(--accent-primary)] font-medium">{trace.events.length}</span></div>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Nodes touched</span><span className="text-[var(--accent-primary)] font-medium">{Object.keys(effStatuses).length}</span></div>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Status</span><span className="text-[var(--state-success)] font-medium">{effExecutionStatus ?? "—"}</span></div>
                    </div>
                  </div>
                )
              ) : selectedEdge ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--accent-primary)] font-medium flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" /> EDGE
                    </div>
                    <button
                      type="button"
                      onClick={deleteSelected}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--state-error)]/25 text-xs font-mono text-[var(--state-error)] hover:bg-[var(--state-error)]/10 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Branch Label</label>
                    <input
                      value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                      onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
                      placeholder="e.g. true / false / high / worker / join"
                      className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/40 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-[var(--text-muted)] leading-tight">
                      Router & supervisor nodes pick the outgoing edge whose label matches their decision. Parallel nodes use{" "}
                      <code className="text-[var(--accent-primary)]">worker</code>/<code className="text-[var(--accent-primary)]">join</code> and loop nodes use{" "}
                      <code className="text-[var(--accent-primary)]">body</code>/<code className="text-[var(--accent-primary)]">exit</code> labels.
                    </p>
                  </div>
                  <div className="border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--text-secondary)] font-mono">
                    {selectedEdge.source} → {selectedEdge.target}
                  </div>
                </div>
              ) : readOnly ? (
                <div className="space-y-2">
                  <div className="text-xs text-[var(--accent-primary)] font-medium">Snapshot</div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Read-only view of the graph and its most recent execution trace.
                  </p>
                  {graphStats}
                </div>
              ) : selectedNode ? (
                <NodeInspector
                  key={selectedNode.id}
                  node={selectedNode}
                  onUpdate={(patch) => updateNodeData(selectedNode.id, patch)}
                  onDelete={deleteSelected}
                  allNodeIds={nodes.map((n) => n.id)}
                  onOpenSubgraph={openSubgraph}
                  onToggleBreakpoint={handleToggleBreakpoint}
                />
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-[var(--accent-primary)] font-medium">Inspector</div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Select a node to configure its prompt, tools, condition, or loop count. Click an edge to rename the branch
                    (router edges pick by label).
                  </p>
                  {graphStats}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Quick-Connect Radial Search ─── */}
      {quickConnect && (
        <QuickConnectSearch
          position={quickConnect.position}
          sourceNodeId={quickConnect.sourceNodeId}
          onSelect={handleQuickConnectSelect}
          onClose={() => setQuickConnect(null)}
        />
      )}

      {/* ─── Export Dialog (graph is only serialised while open) ─── */}
      {showExportDialog && (
        <ExportDialog
          isOpen
          onClose={() => setShowExportDialog(false)}
          graph={flowToGraph(nodes, edges)}
          canvasContainerRef={wrapperRef}
        />
      )}

      {/* ─── A2A Agent Directory Modal ─── */}
      <A2ADirectoryModal
        isOpen={showA2ADirectory}
        onClose={() => setShowA2ADirectory(false)}
        onSelectAgent={handleAddA2AAgentFromDirectory}
      />
    </div>
  );
}

export function AgentGraphCanvas(props: AgentGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
