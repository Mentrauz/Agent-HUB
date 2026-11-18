"use client";

import React, { useCallback, useState } from "react";
import type { Edge } from "@xyflow/react";
import type { AgentGraphDefinition, GraphNodeType } from "@/types/graph";
import type { CanvasNode } from "./graphUtils";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/components/ui/surfaces";

const STORAGE_KEY = "agent-studio-component-library";

interface MacroComponent {
  id: string;
  name: string;
  description: string;
  graph: AgentGraphDefinition;
  createdAt: number;
  tags: string[];
}

interface MacroLibraryProps {
  /** Current canvas nodes (for saving selections). */
  nodes: CanvasNode[];
  /** Current canvas edges. */
  edges: Edge[];
  /** IDs of currently selected nodes. */
  selectedNodeIds: Set<string>;
  /** Called when user wants to add a macro to the canvas. */
  onAddMacro: (graph: AgentGraphDefinition) => void;
  /** Whether the palette is visible. */
  isOpen: boolean;
  onToggle: () => void;
}

function loadLibrary(): MacroComponent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(components: MacroComponent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
}

/**
 * Custom Reusable Macro Library ("My Components"):
 * Save subgraph selections to a workspace palette for drag-and-drop reuse.
 */
export function MacroLibrary({
  nodes,
  edges,
  selectedNodeIds,
  onAddMacro,
  isOpen: _isOpen,
  onToggle: _onToggle,
}: MacroLibraryProps) {
  const [components, setComponents] = useState<MacroComponent[]>(loadLibrary);
  const [savingName, setSavingName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [search, setSearch] = useState("");

  const saveSelection = useCallback(() => {
    if (!savingName.trim() || selectedNodeIds.size === 0) return;

    const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
    const selectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );

    const graph: AgentGraphDefinition = {
      version: 1,
      nodes: selectedNodes.map((n) => ({
        id: n.id,
        type: (n.type ?? "agent") as GraphNodeType,
        position: { ...n.position },
        data: { ...n.data },
      })),
      edges: selectedEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === "string" ? e.label : undefined,
      })),
    };

    const macro: MacroComponent = {
      id: `macro_${Date.now()}`,
      name: savingName.trim(),
      description: `${selectedNodes.length} nodes · ${selectedEdges.length} edges`,
      graph,
      createdAt: Date.now(),
      tags: [selectedNodes[0]?.type ?? "custom"],
    };

    const updated = [...components, macro];
    setComponents(updated);
    saveLibrary(updated);
    setSavingName("");
    setShowSave(false);
  }, [savingName, selectedNodeIds, nodes, edges, components]);

  const deleteMacro = useCallback(
    (id: string) => {
      const updated = components.filter((c) => c.id !== id);
      setComponents(updated);
      saveLibrary(updated);
    },
    [components]
  );

  const filtered = components.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q))
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="px-1 font-sans text-sm font-medium text-[var(--text-primary)]">My components</h2>
        {selectedNodeIds.size > 0 && (
          <button type="button" onClick={() => setShowSave(!showSave)} className={BTN_SECONDARY_SM} title="Save selection as component">
            Save selection
          </button>
        )}
      </div>

      {showSave && (
        <div className="space-y-2 rounded-[10px] border border-[var(--border-subtle)] p-3">
          <div className="font-sans text-[13px] text-[var(--text-muted)]">Save {selectedNodeIds.size} selected nodes as a component</div>
          <div className="flex items-center gap-2">
            <input
              value={savingName}
              onChange={(e) => setSavingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveSelection();
              }}
              aria-label="Component name"
              placeholder="Component name"
              className="h-8 flex-1 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2.5 font-sans text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              autoFocus
            />
            <button type="button" onClick={saveSelection} disabled={!savingName.trim()} className={BTN_PRIMARY_SM}>
              Save
            </button>
          </div>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search components"
        placeholder="Search components"
        className="h-8 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2.5 font-sans text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
      />

      <div className="space-y-1">
        {filtered.length === 0 && (
          <p className="py-4 text-center font-sans text-[13px] text-[var(--text-muted)]">
            {components.length === 0 ? "No saved components yet. Select nodes and choose Save selection." : "No matching components"}
          </p>
        )}
        {filtered.map((macro) => (
          <div
            key={macro.id}
            className="group flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-2 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-sans text-[13px] text-[var(--text-primary)]">{macro.name}</div>
              <div className="truncate font-mono text-xs text-[var(--text-muted)]">{macro.description}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => onAddMacro(macro.graph)} className={BTN_SECONDARY_SM} title="Add to canvas">
                Add
              </button>
              <button
                type="button"
                onClick={() => deleteMacro(macro.id)}
                className={BTN_SECONDARY_SM + " text-[var(--state-error)]"}
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
