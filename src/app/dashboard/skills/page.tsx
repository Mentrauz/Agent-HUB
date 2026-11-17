"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { skillsApi } from "@/lib/api/skills";
import { SkillDTO, SkillStatus } from "@/types/skill";
import { StatusBadge } from "@/components/skills/StatusBadge";
import { WorkflowStepChain } from "@/components/workflows/WorkflowStepChain";
import { WORKFLOW_TEMPLATES } from "@/components/workflows/WorkflowTemplates";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { SkeletonGrid } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { toast } from "@/stores/toastStore";
import { clsx } from "clsx";
import {
  BTN_PRIMARY,
  BTN_SECONDARY_SM,
  CARD,
  FIELD,
  INPUT,
  META,
  PageHeader,
  ROW_HOVER,
  SECTION_TITLE,
  Segmented,
  plural,
} from "@/components/ui/surfaces";

// Secondary views are code-split so the studio tab doesn't ship every marketplace bundle
const viewLoading = () => <SkeletonGrid cards={6} />;
const SkillsMarketplace = dynamic(() => import("./marketplace/SkillsMarketplace").then((m) => m.SkillsMarketplace), { loading: viewLoading });
const UnifiedWorkflowsMarketplace = dynamic(() => import("./marketplace/UnifiedWorkflowsMarketplace").then((m) => m.UnifiedWorkflowsMarketplace), { loading: viewLoading });
const N8nWorkflowsMarketplace = dynamic(() => import("./marketplace/N8nWorkflowsMarketplace").then((m) => m.N8nWorkflowsMarketplace), { loading: viewLoading });
const DifyWorkflowsMarketplace = dynamic(() => import("./marketplace/DifyWorkflowsMarketplace").then((m) => m.DifyWorkflowsMarketplace), { loading: viewLoading });
const SkillPackMarketplace = dynamic(() => import("./packs/SkillPackMarketplace").then((m) => m.SkillPackMarketplace), { loading: viewLoading });
const SkillSynthesizer = dynamic(() => import("./synthesizer/SkillSynthesizer").then((m) => m.SkillSynthesizer), { loading: viewLoading });

const sortOptions = [
  { value: "updatedAt-desc", label: "Recently updated" },
  { value: "updatedAt-asc", label: "Least recently updated" },
  { value: "name-asc", label: "Name, A to Z" },
  { value: "name-desc", label: "Name, Z to A" },
  { value: "createdAt-desc", label: "Newest" },
];

type ViewMode = "studio" | "workflows" | "marketplace" | "n8n" | "dify" | "packs" | "synthesize";

const TEXT_ACTION =
  "h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50 inline-flex items-center";

export default function SkillsDashboardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<SkillStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "WORKFLOWS" | "PROMPT">("ALL");
  const [sort, setSort] = useState("updatedAt-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("studio");
  const [showAllBlueprints, setShowAllBlueprints] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const [target, setTarget] = useState<{ skill: SkillDTO; action: "archive" | "delete" } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const [sortBy, sortOrder] = sort.split("-") as [string, string];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["skills", debouncedSearch, status, sortBy, sortOrder],
    queryFn: () =>
      skillsApi.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        sortBy: sortBy as "updatedAt" | "name" | "createdAt",
        sortOrder: sortOrder as "asc" | "desc",
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["skills"] });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => skillsApi.duplicate(id),
    onSuccess: () => {
      toast.success("Skill duplicated");
      invalidate();
    },
    onError: (e) => toast.error("Duplicate failed", e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => skillsApi.archive(id),
    onSuccess: () => {
      toast.success("Skill archived");
      setTarget(null);
      invalidate();
    },
    onError: (e) => toast.error("Archive failed", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => {
      toast.success("Skill deleted");
      setTarget(null);
      invalidate();
    },
    onError: (e) => toast.error("Delete failed", e.message),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => skillsApi.restore(id),
    onSuccess: () => {
      toast.success("Skill restored successfully");
      invalidate();
    },
    onError: (e) => toast.error("Restore failed", e.message),
  });

  const confirmAction = async () => {
    if (!target) return;
    setIsActionPending(true);
    try {
      if (target.action === "archive") await archiveMutation.mutateAsync(target.skill.id);
      else await deleteMutation.mutateAsync(target.skill.id);
    } catch {
      // Already surfaced by the mutation's onError toast
    } finally {
      setIsActionPending(false);
    }
  };

  const allSkills = data?.items ?? [];
  const isArchiveView = status === "ARCHIVED";
  const hasActiveFilters = Boolean(debouncedSearch || status || typeFilter !== "ALL");

  // Filter based on typeFilter
  const filteredSkills = allSkills.filter((skill) => {
    // The API includes archived items when no status is set; they belong in the Archive view only
    if (!status && skill.status === "ARCHIVED") return false;
    const version = skill.publishedVersion ?? skill.currentDraft;
    const isMultiStep = (version?.allowedTools?.length ?? 0) > 1;
    if (typeFilter === "WORKFLOWS") return isMultiStep;
    if (typeFilter === "PROMPT") return !isMultiStep;
    return true;
  });

  const tabs: { id: string; label: string; meta?: string; active: boolean; onSelect: () => void }[] = [
    {
      id: "studio",
      label: "My studio",
      active: viewMode === "studio" && status !== "ARCHIVED",
      onSelect: () => {
        setViewMode("studio");
        if (status === "ARCHIVED") setStatus("");
      },
    },
    { id: "marketplace", label: "Skills marketplace", active: viewMode === "marketplace", onSelect: () => setViewMode("marketplace") },
    { id: "workflows", label: "Workflows marketplace", meta: "11.9k+", active: viewMode === "workflows", onSelect: () => setViewMode("workflows") },
    { id: "packs", label: "Packs", active: viewMode === "packs", onSelect: () => setViewMode("packs") },
    { id: "synthesize", label: "Synthesize", active: viewMode === "synthesize", onSelect: () => setViewMode("synthesize") },
    {
      id: "archive",
      label: "Archive",
      active: viewMode === "studio" && status === "ARCHIVED",
      onSelect: () => {
        setViewMode("studio");
        setStatus("ARCHIVED");
      },
    },
  ];

  const visibleTemplates = WORKFLOW_TEMPLATES.filter(
    // Collapsed: one row, 2 on mobile and 3 from md up
    (_, i) => showAllBlueprints || i < 3
  );

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Studio"
        meta="Define, validate, version and run bounded multi-step workflows and AI skills"
        action={
          <Link href="/dashboard/skills/new" className={BTN_PRIMARY}>
            New workflow or skill
          </Link>
        }
      />

      <div role="tablist" className="flex items-center gap-6 overflow-x-auto border-b border-[var(--border-subtle)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.active}
            onClick={t.onSelect}
            className={clsx(
              "-mb-px flex h-10 shrink-0 cursor-pointer items-center gap-2 border-b-2 font-sans text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
              t.active
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {t.label}
            {t.meta && <span className={META}>{t.meta}</span>}
          </button>
        ))}
      </div>

      {viewMode === "synthesize" ? (
        <SkillSynthesizer />
      ) : viewMode === "packs" ? (
        <SkillPackMarketplace />
      ) : viewMode === "marketplace" ? (
        <SkillsMarketplace />
      ) : viewMode === "workflows" ? (
        <UnifiedWorkflowsMarketplace />
      ) : viewMode === "n8n" ? (
        <N8nWorkflowsMarketplace />
      ) : viewMode === "dify" ? (
        <DifyWorkflowsMarketplace />
      ) : (
        <>
          {/* Blueprints */}
          {!isArchiveView && (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <h2 className={SECTION_TITLE}>Blueprints</h2>
                  <span className={META}>one-click starters</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllBlueprints((v) => !v)}
                  aria-expanded={showAllBlueprints}
                  className="cursor-pointer font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {showAllBlueprints ? "Show fewer" : `Show all ${WORKFLOW_TEMPLATES.length}`}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {visibleTemplates.map((tmpl) => (
                  <div key={tmpl.id} className={clsx(CARD, "flex flex-col justify-between gap-4 p-5")}>
                    <div className="space-y-2">
                      <div className={clsx(META, "flex items-center justify-between gap-3")}>
                        <span className="truncate">{tmpl.badge.toLowerCase()}</span>
                        <span className="shrink-0">{tmpl.category.toLowerCase()}</span>
                      </div>
                      <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">{tmpl.name}</h3>
                      <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{tmpl.purpose}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className={META}>{plural(tmpl.allowedTools.length + 1, "step")}</span>
                      <Link href={`/dashboard/skills/new?template=${tmpl.id}`} className={BTN_SECONDARY_SM}>
                        Use blueprint
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Your items */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={SECTION_TITLE}>{isArchiveView ? "Archived" : "Your workflows and skills"}</h2>
              {!isLoading && !isError && <span className={META}>{filteredSkills.length}</span>}
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <Segmented
                label="Type"
                hideLabel
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { id: "ALL", label: "All" },
                  { id: "WORKFLOWS", label: "Workflows" },
                  { id: "PROMPT", label: "Prompt skills" },
                ]}
              />

              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <label className="flex-1">
                  <span className="sr-only">Search workflows and skills</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className={clsx(INPUT, "w-full")}
                  />
                </label>

                {/* Archived items have their own tab, so the status filter only covers active ones */}
                {!isArchiveView && (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SkillStatus | "")}
                    aria-label="Filter by status"
                    className={clsx(FIELD, "h-9 cursor-pointer px-3")}
                  >
                    <option value="">All statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                )}

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort"
                  className={clsx(FIELD, "h-9 cursor-pointer px-3")}
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <SkeletonGrid cards={6} />
            ) : isError ? (
              <EmptyState
                title="Couldn't load studio items"
                description="There was an error fetching your workflows and skills."
                action={
                  <button onClick={() => refetch()} className={BTN_SECONDARY_SM}>
                    Retry
                  </button>
                }
              />
            ) : filteredSkills.length === 0 ? (
              <EmptyState
                title={status === "ARCHIVED" ? "No archived items" : hasActiveFilters ? "No matching items" : "Nothing here yet"}
                description={
                  status === "ARCHIVED"
                    ? "Archived workflows and skills appear here. You can restore them at any time."
                    : hasActiveFilters
                    ? "No workflows or skills match the current filters."
                    : "Create your first bounded multi-step workflow or start from a blueprint."
                }
                action={
                  status === "ARCHIVED" ? (
                    <button type="button" onClick={() => setStatus("")} className={BTN_SECONDARY_SM}>
                      View active items
                    </button>
                  ) : !hasActiveFilters ? (
                    <Link href="/dashboard/skills/new" className={BTN_SECONDARY_SM}>
                      Create the first one
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
                {filteredSkills.map((skill) => {
                  const version = skill.publishedVersion ?? skill.currentDraft;
                  const allowedTools = version?.allowedTools ?? [];
                  const actionsRequiringApproval = version?.actionsRequiringApproval ?? [];
                  const isWorkflow = allowedTools.length > 1;
                  const isArchived = skill.status === "ARCHIVED";

                  return (
                    <li key={skill.id} className={clsx(ROW_HOVER, "space-y-3 px-5 py-4")}>
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                            <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{skill.name}</h3>
                            <StatusBadge status={skill.status} />
                            <span className={META}>{isWorkflow ? "workflow" : "skill"}</span>
                            <span className={META}>
                              v{skill.currentDraft?.versionNumber ?? skill.publishedVersion?.versionNumber ?? 1} ·{" "}
                              {plural(skill.versions?.length ?? 0, "version")}
                            </span>
                          </div>
                          <p className="line-clamp-2 max-w-3xl font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                            {skill.purpose}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => restoreMutation.mutate(skill.id)}
                              disabled={restoreMutation.isPending && restoreMutation.variables === skill.id}
                              className={BTN_SECONDARY_SM}
                              title="Restore this archived skill"
                            >
                              Restore
                            </button>
                          ) : (
                            <Link href={`/dashboard/skills/${skill.id}`} className={BTN_SECONDARY_SM}>
                              Run
                            </Link>
                          )}
                          <Link href={`/dashboard/canvas/${skill.id}`} className={TEXT_ACTION} title="Open on the Agent canvas">
                            Canvas
                          </Link>
                          <Link
                            href={isArchived ? `/dashboard/skills/${skill.id}` : `/dashboard/skills/${skill.id}/edit`}
                            className={TEXT_ACTION}
                          >
                            {isArchived ? "Details" : "Edit"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => duplicateMutation.mutate(skill.id)}
                            disabled={duplicateMutation.isPending && duplicateMutation.variables === skill.id}
                            className={TEXT_ACTION}
                          >
                            Duplicate
                          </button>
                          {!isArchived && (
                            <button type="button" onClick={() => setTarget({ skill, action: "archive" })} className={TEXT_ACTION}>
                              Archive
                            </button>
                          )}
                          {skill.status !== "PUBLISHED" && !isArchived && (
                            <button
                              type="button"
                              onClick={() => setTarget({ skill, action: "delete" })}
                              className={clsx(TEXT_ACTION, "hover:!text-[var(--state-error)]")}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {allowedTools.length > 0 && (
                        <div className="space-y-1">
                          <div className={META}>pipeline · {plural(allowedTools.length + 1, "step")}</div>
                          <WorkflowStepChain
                            allowedTools={allowedTools}
                            actionsRequiringApproval={actionsRequiringApproval}
                            compact
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        isOpen={target !== null}
        title={target?.action === "archive" ? "Archive skill" : "Delete skill"}
        description={
          target?.action === "archive"
            ? `Archive "${target?.skill.name}"? It will be hidden from active lists but preserved.`
            : `Delete "${target?.skill.name}"? This permanently removes the draft and cannot be undone.`
        }
        confirmLabel={target?.action === "archive" ? "Archive" : "Delete"}
        variant={target?.action === "archive" ? "warning" : "danger"}
        isPending={isActionPending}
        onConfirm={confirmAction}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
