"use client";

import React, { useState } from "react";
import {
  Network,
  Search,
  ExternalLink,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { A2A_AGENT_PRESETS } from "@/modules/a2a/presets";
import { A2AAgentManifest } from "@/types/a2a";

interface A2ADirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent: (agent: A2AAgentManifest) => void;
}

export function A2ADirectoryModal({ isOpen, onClose, onSelectAgent }: A2ADirectoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveredAgent, setDiscoveredAgent] = useState<A2AAgentManifest | null>(null);

  if (!isOpen) return null;

  const filteredPresets = A2A_AGENT_PRESETS.filter((agent) => {
    const q = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(q) ||
      (agent.displayName ?? "").toLowerCase().includes(q) ||
      agent.description.toLowerCase().includes(q) ||
      (agent.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleDiscoverCustom = async () => {
    if (!customUrl.trim()) return;
    setDiscovering(true);
    setDiscoveryError(null);
    setDiscoveredAgent(null);

    try {
      const res = await fetch(`/api/a2a/discover?url=${encodeURIComponent(customUrl.trim())}`);
      const data = await res.json();
      if (data.success && data.manifest) {
        setDiscoveredAgent(data.manifest);
      } else {
        setDiscoveryError(data.error || "Failed to discover agent manifest from endpoint.");
      }
    } catch (err) {
      setDiscoveryError(err instanceof Error ? err.message : "Network discovery failed.");
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-3xl rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[12px] bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)]">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-[var(--text-muted)]">
                  A2A agent directory
                </h2>
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  A2A protocol v1.0
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Discover any real A2A-compliant agent by URL and drag it onto your multi-agent canvas.
                This app has no external agent registry — the list below is only agents you've added.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-elevated)]/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Custom Discovery Bar */}
        <div className="p-4 border-b border-[var(--border-subtle)] space-y-3 bg-[var(--surface-elevated)]/40">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by agent name, capability, or tag (e.g. 'research', 'audit', 'finance')..."
              className="w-full pl-9 pr-3 py-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 text-xs text-[var(--text-muted)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-subtle)] font-mono"
            />
          </div>

          <div className="flex gap-2">
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Import any custom A2A Agent URL (e.g. https://my-agent.com/a2a)..."
              className="flex-1 px-3 py-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 text-xs text-[var(--text-muted)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-subtle)] font-mono"
            />
            <button
              onClick={handleDiscoverCustom}
              disabled={discovering || !customUrl.trim()}
              className="px-3 py-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--cta-primary-hover)]/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {discovering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Discover
            </button>
          </div>

          {discoveryError && (
            <div className="p-2 rounded bg-[var(--state-error)]/30 border border-[var(--state-error)]/40 text-xs text-[var(--state-error)] flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0 text-[var(--state-error)]" />
              {discoveryError}
            </div>
          )}

          {discoveredAgent && (
            <div className="p-3 rounded-[12px] bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--state-success)]" />
                  <span className="text-xs font-medium text-[var(--text-muted)]">{discoveredAgent.displayName || discoveredAgent.name}</span>
                  <span className="text-xs px-1 py-0.5 rounded bg-[var(--cta-primary-bg)]/30 text-[var(--text-secondary)]">Verified Manifest</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{discoveredAgent.description}</p>
              </div>
              <button
                onClick={() => {
                  onSelectAgent(discoveredAgent);
                  onClose();
                }}
                className="px-3 py-1 rounded bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] text-xs font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add to Canvas
              </button>
            </div>
          )}
        </div>

        {/* Directory Presets List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs text-[var(--text-muted)] font-medium px-1">
            Curated A2A Agent Presets ({filteredPresets.length})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPresets.map((agent) => (
              <div
                key={agent.name}
                className="p-3.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 hover:border-[var(--border-subtle)] hover:bg-[var(--cta-primary-hover)]/10 transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-xs text-[var(--text-muted)] leading-tight">
                      {agent.displayName || agent.name}
                    </div>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      v{agent.version}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>

                  <div className="pt-1 flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface-elevated)]/80 border border-[var(--border-strong)] text-[10px] text-[var(--text-muted)]"
                        title={cap.description}
                      >
                        <Zap className="h-2 w-2 text-[var(--text-secondary)] shrink-0" />
                        <span>{cap.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-strong)] flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-[var(--state-success)]" />
                    Auth: {agent.auth?.type || "none"}
                  </div>
                  <button
                    onClick={() => {
                      onSelectAgent(agent);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-[var(--cta-primary-bg)]/80 hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" /> Add to Canvas
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)]/80 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Agent Hub is the world&apos;s first visual A2A orchestration platform.</span>
          <a
            href="https://google.com"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--text-secondary)] hover:underline flex items-center gap-1"
          >
            A2A Spec Docs <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
