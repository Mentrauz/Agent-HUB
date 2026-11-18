"use client";

import React, { useState, useCallback, useMemo } from "react";
import { clsx } from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { SkillPack, PackCategory, PackInstallationState, INSTALLED_PACKS_KEY } from "@/types/skillPacks";
import { SKILL_PACKS, PACK_CATEGORIES, getPacksByCategory } from "@/data/skillPacks";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  META,
  ROW_HOVER,
  SECTION_TITLE,
  Tag,
  plural,
} from "@/components/ui/surfaces";

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

const DIFFICULTY_TONE = (d: string): "good" | "warn" | "bad" =>
  d === "BEGINNER" ? "good" : d === "INTERMEDIATE" ? "warn" : "bad";

const LABEL = "font-sans text-[13px] text-[var(--text-muted)]";

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
            "Pack installed",
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h2 className={SECTION_TITLE}>Skill packs</h2>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">
            One-click stacks of preconfigured MCP servers and workflow skills
          </p>
        </div>
        <span className={META}>
          {SKILL_PACKS.length} packs · {SKILL_PACKS.reduce((a, p) => a + p.serverCount, 0)} servers ·{" "}
          {SKILL_PACKS.reduce((a, p) => a + p.skillCount, 0)} skills
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm">
        {PACK_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            aria-pressed={selectedCategory === cat.id}
            className={clsx(
              "cursor-pointer rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
              selectedCategory === cat.id
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPacks.map((pack) => {
          const isInstalled = installedPacks.has(pack.id);
          const isInstalling = installingPack === pack.id;

          return (
            <div key={pack.id} className={clsx(CARD, "flex flex-col gap-4 p-5")}>
              <button
                type="button"
                onClick={() => setDetailPack(pack)}
                className="flex-1 cursor-pointer space-y-3 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">{pack.name}</h3>
                    {pack.isNew && <span className={META}>new</span>}
                  </div>
                  <p className="font-sans text-[13px] text-[var(--text-muted)]">{pack.tagline}</p>
                </div>

                <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{pack.description}</p>

                <div className="space-y-1">
                  <div className={LABEL}>MCP servers ({pack.serverCount})</div>
                  <p className="font-mono text-xs leading-5 text-[var(--text-secondary)]">{pack.servers.map((s) => s.name).join(", ")}</p>
                </div>

                <div className="space-y-1">
                  <div className={LABEL}>Workflow skills ({pack.skillCount})</div>
                  <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{pack.skills.map((s) => s.name).join(", ")}</p>
                </div>
              </button>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                <span className={clsx(META, "flex items-center gap-3")}>
                  <span>{pack.estimatedSetupTime}</span>
                  <span>{pack.difficulty.toLowerCase()}</span>
                  <span>{pack.popularity} stars</span>
                </span>
                {isInstalled ? (
                  <Tag tone="good">Installed</Tag>
                ) : (
                  <button type="button" onClick={() => handleInstall(pack)} disabled={isInstalling} className={BTN_SECONDARY_SM}>
                    {isInstalling ? "Installing" : "Install pack"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPacks.length === 0 && (
        <p className="py-12 text-center font-sans text-sm text-[var(--text-muted)]">No packs in this category</p>
      )}

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

  const statusLabel =
    installState?.status === "completed"
      ? "Installed"
      : installState?.status === "partial"
      ? "Partly installed"
      : installState?.status === "failed"
      ? "Install failed"
      : "Installing";
  const statusTone =
    installState?.status === "completed" ? "good" : installState?.status === "partial" ? "warn" : installState?.status === "failed" ? "bad" : "neutral";

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-modal-title"
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="space-y-1">
            <h2 id="pack-modal-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
              {pack.name}
            </h2>
            <p className="font-sans text-[13px] text-[var(--text-muted)]">{pack.tagline}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 shrink-0 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">{pack.description}</p>

          <div className={clsx(META, "flex flex-wrap items-center gap-x-5 gap-y-1")}>
            <span>{pack.estimatedSetupTime} setup</span>
            <Tag tone={DIFFICULTY_TONE(pack.difficulty)}>{pack.difficulty.toLowerCase()}</Tag>
            <span>{plural(pack.serverCount, "server")}</span>
            <span>{plural(pack.skillCount, "skill")}</span>
          </div>

          {installState && (
            <div className="space-y-2 rounded-[10px] border border-[var(--border-subtle)] px-4 py-3">
              <Tag tone={statusTone}>{statusLabel}</Tag>
              <p className={META}>
                servers {installState.serversInstalled}/{installState.serversTotal} · skills {installState.skillsInstalled}/{installState.skillsTotal}
              </p>
              {installState.errors.map((err, i) => (
                <p key={i} className="font-sans text-[13px] text-[var(--state-error)]">
                  {err}
                </p>
              ))}
            </div>
          )}

          <section className="space-y-2">
            <h3 className={LABEL}>MCP servers ({pack.servers.length})</h3>
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[10px] border border-[var(--border-subtle)]">
              {pack.servers.map((server, idx) => {
                const isExpanded = expandedServer === idx;
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => setExpandedServer(isExpanded ? null : idx)}
                      aria-expanded={isExpanded}
                      className={clsx(ROW_HOVER, "flex w-full cursor-pointer items-baseline justify-between gap-3 px-3 py-2.5 text-left")}
                    >
                      <span className="font-sans text-sm text-[var(--text-primary)]">{server.name}</span>
                      <span className={META}>
                        {String(server.category).toLowerCase()} · via {server.directorySource || "composio"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="space-y-1 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-3">
                        <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{server.description}</p>
                        <p className={META}>search: &quot;{server.searchQuery}&quot;</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className={LABEL}>Workflow skills ({pack.skills.length})</h3>
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[10px] border border-[var(--border-subtle)]">
              {pack.skills.map((skill, idx) => {
                const isExpanded = expandedSkill === idx;
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => setExpandedSkill(isExpanded ? null : idx)}
                      aria-expanded={isExpanded}
                      className={clsx(ROW_HOVER, "flex w-full cursor-pointer items-baseline justify-between gap-3 px-3 py-2.5 text-left")}
                    >
                      <span className="font-sans text-sm text-[var(--text-primary)]">{skill.name}</span>
                      <span className={META}>{plural(skill.steps.length, "step")}</span>
                    </button>
                    {isExpanded && (
                      <div className="space-y-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-3">
                        <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{skill.purpose}</p>
                        <ol className="space-y-1">
                          {skill.steps.map((step, si) => (
                            <li key={si} className="flex items-baseline gap-3 font-sans text-[13px] leading-5">
                              <span className={clsx(META, "w-4 shrink-0")}>{step.order}</span>
                              <span>
                                <span className="text-[var(--text-primary)]">{step.action}</span>
                                <span className="text-[var(--text-muted)]">: {step.description}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                        <p className="font-mono text-xs leading-5 text-[var(--text-muted)]">{skill.allowedToolPatterns.join(" · ")}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Close
          </button>
          {isInstalled ? (
            <Tag tone="good">Installed</Tag>
          ) : (
            <button type="button" onClick={onInstall} disabled={isInstalling} className={BTN_PRIMARY}>
              {isInstalling ? "Installing" : "Install pack"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

