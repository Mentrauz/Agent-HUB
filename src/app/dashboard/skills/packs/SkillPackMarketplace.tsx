"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Layers,
  Container,
  Database,
  TrendingUp,
  Brain,
  Shield,
  Zap,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  Server,
  FileCode2,
  Clock,
  Star,
  ArrowRight,
  Package,
  AlertTriangle,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { SkillPack, PackCategory, PackInstallationState, INSTALLED_PACKS_KEY } from "@/types/skillPacks";
import { SKILL_PACKS, PACK_CATEGORIES, getPacksByCategory } from "@/data/skillPacks";

function loadInstalledPacks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(INSTALLED_PACKS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveInstalledPacks(set: Set<string>) {
  try {
    localStorage.setItem(INSTALLED_PACKS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

// ────────────── Icon Map ──────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Layers,
  Container,
  Database,
  TrendingUp,
  Brain,
  Shield,
  Zap,
  Package,
};

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; accent: string; gradient: string }> = {
  indigo: {
    border: "border-[var(--accent-primary)]/25",
    bg: "bg-[var(--accent-primary)]/10",
    text: "text-[var(--accent-primary)]",
    accent: "bg-[var(--cta-primary-bg)]",
    gradient: "from-[var(--text-muted)] to-[var(--text-muted)]",
  },
  emerald: {
    border: "border-[var(--state-success)]/25",
    bg: "bg-[var(--state-success)]/10",
    text: "text-[var(--state-success)]",
    accent: "bg-[var(--state-success)]",
    gradient: "from-[var(--text-muted)] to-[var(--text-muted)]",
  },
  pink: {
    border: "border-[var(--accent-primary)]/25",
    bg: "bg-[var(--accent-primary)]/10",
    text: "text-[var(--accent-primary)]",
    accent: "bg-[var(--cta-primary-bg)]",
    gradient: "from-[var(--text-muted)] to-[var(--text-muted)]",
  },
  violet: {
    border: "border-[var(--accent-primary)]/25",
    bg: "bg-[var(--accent-primary)]/10",
    text: "text-[var(--accent-primary)]",
    accent: "bg-[var(--cta-primary-bg)]",
    gradient: "from-[var(--text-muted)] to-[var(--text-muted)]",
  },
  red: {
    border: "border-[var(--state-error)]/25",
    bg: "bg-[var(--state-error)]/10",
    text: "text-[var(--state-error)]",
    accent: "bg-[var(--state-error)]",
    gradient: "from-[var(--text-muted)] to-[var(--text-muted)]",
  },
  amber: {
    border: "border-[var(--state-warning)]/25",
    bg: "bg-[var(--state-warning)]/10",
    text: "text-[var(--state-warning)]",
    accent: "bg-[var(--state-warning)]",
    gradient: "from-[var(--text-muted)] to-[var(--text-muted)]",
  },
  slate: {
    border: "border-[var(--border-strong)]",
    bg: "bg-[var(--surface-sunken)]",
    text: "text-[var(--text-secondary)]",
    accent: "bg-[var(--surface-elevated)]",
    gradient: "from-[var(--text-muted)] to-[var(--text-muted)]",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  SCM: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  CLOUD: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  DATABASE: "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]",
  MESSAGING: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  MONITORING: "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  ANALYTICS: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  CRM: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  MARKETING: "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]",
  AI: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  INFRASTRUCTURE: "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  COLLABORATION: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
};

export function SkillPackMarketplace() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<PackCategory | "all">("all");
  const [detailPack, setDetailPack] = useState<SkillPack | null>(null);
  const [installedPacks, setInstalledPacks] = useState<Set<string>>(loadInstalledPacks);
  const [installingPack, setInstallingPack] = useState<string | null>(null);
  const [installState, setInstallState] = useState<PackInstallationState | null>(null);

  const filteredPacks = useMemo(() => getPacksByCategory(selectedCategory), [selectedCategory]);

  const handleInstall = useCallback(
    async (pack: SkillPack) => {
      if (installedPacks.has(pack.id)) return;

      try {
        setInstallingPack(pack.id);
        setInstallState(null);

        const res = await fetch("/api/skills/packs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId: pack.id }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error("Pack installation failed");
        }

        const state: PackInstallationState = json.data;
        setInstallState(state);

        // Persist installed pack
        setInstalledPacks((prev) => {
          const next = new Set(prev);
          next.add(pack.id);
          saveInstalledPacks(next);
          return next;
        });

        // Invalidate queries so Studio tab updates
        queryClient.invalidateQueries({ queryKey: ["skills"] });

        if (state.status === "completed") {
          toast.success(
            "Pack installed!",
            `${pack.name}: ${state.serversInstalled} servers + ${state.skillsInstalled} skills`
          );
        } else if (state.status === "partial") {
          toast.success(
            "Pack partially installed",
            `${pack.name}: ${state.serversInstalled}/${state.serversTotal} servers, ${state.skillsInstalled}/${state.skillsTotal} skills. ${state.errors.length} errors.`
          );
        } else {
          toast.error("Pack installation failed", state.errors.join("; "));
        }
      } catch (err) {
        console.error("Pack install failed:", err);
        toast.error("Install failed", err instanceof Error ? err.message : "Unknown error");
      } finally {
        setInstallingPack(null);
      }
    },
    [installedPacks, queryClient]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-sans font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--accent-primary)]" />
            Skill packs
          </h2>
          <p className="text-xs font-sans text-[var(--text-muted)] mt-0.5">
            1-click solution stacks — pre-configured MCP servers + workflow skills
          </p>
        </div>
        <span className="text-xs font-sans text-[var(--text-muted)] px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          {SKILL_PACKS.length} Packs ·{SKILL_PACKS.reduce((a, p) => a + p.serverCount, 0)} Servers ·{SKILL_PACKS.reduce((a, p) => a + p.skillCount, 0)} SKILLS
        </span>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PACK_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || Layers;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium border transition-colors cursor-pointer",
                active
                  ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] "
                  : "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
              )}
            >
              <Icon className="h-3 w-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Pack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPacks.map((pack) => {
          const colors = COLOR_MAP[pack.color] || COLOR_MAP.slate;
          const isInstalled = installedPacks.has(pack.id);
          const isInstalling = installingPack === pack.id;

          return (
            <div
              key={pack.id}
              className={clsx(
                "group rounded-lg border bg-[var(--surface-raised)]/80 transition-colors flex flex-col cursor-pointer overflow-hidden",
                isInstalled
                  ? "border-[var(--state-success)]/25"
                  : "border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40"
              )}
              onClick={() => setDetailPack(pack)}
            >
              {/* Pack Header Gradient */}
              <div className={clsx("px-4 py-3 bg-gradient-to-r", colors.gradient)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const PackIcon = ICON_MAP[pack.icon] || Layers;
                      return <PackIcon className="h-5 w-5 text-[var(--text-primary)]" />;
                    })()}
                    <div>
                      <h3 className="text-xs font-sans font-medium text-[var(--text-primary)]">
                        {pack.name}
                      </h3>
                      <p className="text-xs font-sans text-[var(--text-primary)]/70">{pack.tagline}</p>
                    </div>
                  </div>
                  {isInstalled && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-sans font-medium bg-[var(--surface-raised)]/20 text-[var(--text-primary)] border border-[var(--border-subtle)]/30">
                      <Check className="h-2.5 w-2.5" /> Installed
                    </span>
                  )}
                </div>
              </div>

              {/* Pack Body */}
              <div className="px-4 py-3 space-y-3 flex-1">
                <p className="text-xs font-sans text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {pack.description}
                </p>

                {/* Server Badges */}
                <div className="space-y-1.5">
                  <div className="text-xs font-sans font-medium text-[var(--text-muted)]">
                    MCP Servers ({pack.serverCount})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {pack.servers.map((s, i) => (
                      <span
                        key={i}
                        className={clsx(
                          "px-1.5 py-0.5 rounded text-xs font-sans font-medium border",
                          CATEGORY_COLORS[s.category] || "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                        )}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skill Badges */}
                <div className="space-y-1.5">
                  <div className="text-xs font-sans font-medium text-[var(--text-muted)]">
                    Workflow Skills ({pack.skillCount})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {pack.skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-xs font-sans bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25"
                      >
                        <FileCode2 className="inline h-2 w-2 mr-0.5" />
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs font-sans text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" /> {pack.estimatedSetupTime}
                  </span>
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded text-xs font-medium border",
                    pack.difficulty === "BEGINNER"
                      ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
                      : pack.difficulty === "INTERMEDIATE"
                      ? "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]"
                      : "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]"
                  )}>
                    {pack.difficulty}
                  </span>
                  {pack.isNew && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                      NEW
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-[var(--text-muted)] text-[var(--state-warning)]" /> {pack.popularity}
                  </span>
                </div>
              </div>

              {/* Install Button */}
              <div className="px-4 pb-3">
                {isInstalled ? (
                  <div className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-sans font-medium border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]">
                    <Check className="h-3 w-3" /> Installed
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstall(pack);
                    }}
                    disabled={isInstalling}
                    className={clsx(
                      "w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-sans font-medium transition-colors cursor-pointer",
                      isInstalling ? "opacity-60 cursor-wait" : "",
                      "border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] active:scale-95"
                    )}
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Installing...
                      </>
                    ) : (
                      <>
                        <Package className="h-3 w-3" /> Install pack
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPacks.length === 0 && (
        <div className="text-center py-12">
          <Layers className="h-8 w-8 text-[var(--accent-primary)] mx-auto" />
          <p className="text-xs font-sans font-medium text-[var(--text-primary)] mt-3">
            No packs in this category
          </p>
        </div>
      )}

      {/* Pack Detail Modal */}
      {detailPack && (
        <PackDetailModal
          pack={detailPack}
          isInstalled={installedPacks.has(detailPack.id)}
          isInstalling={installingPack === detailPack.id}
          installState={installState}
          onInstall={() => handleInstall(detailPack)}
          onClose={() => {
            setDetailPack(null);
            setInstallState(null);
          }}
        />
      )}
    </div>
  );
}

/* ────────────── Pack Detail Modal ────────────── */

function PackDetailModal({
  pack,
  isInstalled,
  isInstalling,
  installState,
  onInstall,
  onClose,
}: {
  pack: SkillPack;
  isInstalled: boolean;
  isInstalling: boolean;
  installState: PackInstallationState | null;
  onInstall: () => void;
  onClose: () => void;
}) {
  const [expandedServer, setExpandedServer] = useState<number | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<number | null>(null);
  const colors = COLOR_MAP[pack.color] || COLOR_MAP.slate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={clsx("px-6 py-5 bg-gradient-to-r rounded-t-xl", colors.gradient)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const PackIcon = ICON_MAP[pack.icon] || Layers;
                return <PackIcon className="h-6 w-6 text-[var(--text-primary)]" />;
              })()}
              <div>
                <h2 className="text-sm font-sans font-medium text-[var(--text-primary)]">
                  {pack.name}
                </h2>
                <p className="text-xs font-sans text-[var(--text-primary)]/70">{pack.tagline}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[var(--surface-raised)]/10 hover:bg-[var(--surface-raised)]/20 text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            {pack.description}
          </p>

          {/* Meta Row */}
          <div className="flex items-center gap-4 text-xs font-sans text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {pack.estimatedSetupTime} setup
            </span>
            <span className={clsx(
              "px-2 py-0.5 rounded border font-medium",
              pack.difficulty === "BEGINNER"
                ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
                : pack.difficulty === "INTERMEDIATE"
                ? "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]"
                : "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]"
            )}>
              {pack.difficulty}
            </span>
            <span>{pack.serverCount} servers</span>
            <span>{pack.skillCount} skills</span>
          </div>

          {/* Installation Progress */}
          {installState && (
            <div className="rounded-lg border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                {installState.status === "completed" ? (
                  <Check className="h-4 w-4 text-[var(--state-success)]" />
                ) : installState.status === "partial" ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--state-warning)]" />
                ) : installState.status === "failed" ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--state-error)]" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
                )}
                <span className="text-xs font-sans font-medium text-[var(--text-secondary)]">
                  {installState.status === "completed"
                    ? "All Done!"
                    : installState.status === "partial"
                    ? "Partially Installed"
                    : installState.status === "failed"
                    ? "Installation Failed"
                    : "Installing..."}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[var(--text-muted)]">Servers: </span>
                  <span className="font-medium text-[var(--text-secondary)]">
                    {installState.serversInstalled}/{installState.serversTotal}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Skills: </span>
                  <span className="font-medium text-[var(--text-secondary)]">
                    {installState.skillsInstalled}/{installState.skillsTotal}
                  </span>
                </div>
              </div>
              {installState.errors.length > 0 && (
                <div className="space-y-1">
                  {installState.errors.map((err, i) => (
                    <p key={i} className="text-xs font-sans text-[var(--state-error)] flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Servers Section */}
          <div className="space-y-2">
            <div className="text-xs font-sans font-medium text-[var(--text-muted)] flex items-center gap-1.5">
              <Server className="h-3 w-3" />
              MCP Servers ({pack.servers.length})
            </div>
            <div className="space-y-2">
              {pack.servers.map((server, idx) => {
                const isExpanded = expandedServer === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedServer(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
                        )}
                        <span className="text-xs font-sans font-medium text-[var(--text-primary)]">
                          {server.name}
                        </span>
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded text-xs font-sans font-medium border",
                            CATEGORY_COLORS[server.category] || "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                          )}
                        >
                          {server.category}
                        </span>
                        <span className="text-xs font-sans text-[var(--text-muted)]">
                          via {server.directorySource || "composio"}
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-[var(--border-subtle)]">
                        <p className="text-xs font-sans text-[var(--text-muted)] mt-2">
                          {server.description}
                        </p>
                        <p className="text-xs font-sans text-[var(--text-muted)] mt-1">
                          Search: &quot;{server.searchQuery}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills Section */}
          <div className="space-y-2">
            <div className="text-xs font-sans font-medium text-[var(--text-muted)] flex items-center gap-1.5">
              <FileCode2 className="h-3 w-3" />
              Workflow Skills ({pack.skills.length})
            </div>
            <div className="space-y-2">
              {pack.skills.map((skill, idx) => {
                const isExpanded = expandedSkill === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSkill(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
                        )}
                        <FileCode2 className="h-3 w-3 text-[var(--accent-primary)]" />
                        <span className="text-xs font-sans font-medium text-[var(--text-primary)]">
                          {skill.name}
                        </span>
                        <span className="text-xs font-sans text-[var(--text-muted)]">
                          {skill.steps.length} steps
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-[var(--border-subtle)] space-y-2 mt-2">
                        <p className="text-xs font-sans text-[var(--text-secondary)]">
                          {skill.purpose}
                        </p>
                        <div className="space-y-1">
                          {skill.steps.map((step, si) => (
                            <div key={si} className="flex items-center gap-2 text-xs font-sans text-[var(--text-muted)]">
                              <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-xs font-medium shrink-0">
                                {step.order}
                              </span>
                              <span className="text-[var(--text-secondary)] font-medium">{step.action}</span>
                              <span className="text-[var(--text-muted)]">— {step.description}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {skill.allowedToolPatterns.map((pattern, pi) => (
                            <span
                              key={pi}
                              className="px-1.5 py-0.5 rounded text-xs font-sans bg-[var(--surface-sunken)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                            >
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-[var(--border-subtle)] text-xs font-sans font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            Close
          </button>
          {isInstalled ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-xs font-sans font-medium text-[var(--state-success)]">
              <Check className="h-3 w-3" /> Installed
            </div>
          ) : (
            <button
              type="button"
              onClick={onInstall}
              disabled={isInstalling}
              className={clsx(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded border text-xs font-sans font-medium transition-colors cursor-pointer",
                isInstalling ? "opacity-50 cursor-wait" : "",
                "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] active:scale-95"
              )}
            >
              {isInstalling ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Installing...
                </>
              ) : (
                <>
                  <Package className="h-3 w-3" /> Install pack
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
