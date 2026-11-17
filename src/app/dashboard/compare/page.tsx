"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { skillsApi } from "@/lib/api/skills";
import { compareApi } from "@/lib/api/compare";
import { SkeletonList, SkeletonPanels } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { clsx } from "clsx";
import { VersionDiffResult } from "@/types/observability";
import { BTN_SECONDARY_SM, CARD, FIELD, LABEL, META, PageHeader, Tag } from "@/components/ui/surfaces";

const KIND: Record<string, { label: string; tone: "good" | "bad" | "warn" }> = {
  added: { label: "Added", tone: "good" },
  removed: { label: "Removed", tone: "bad" },
  modified: { label: "Modified", tone: "warn" },
};

const PRE =
  "max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-[8px] border bg-[var(--surface-sunken)] p-3 font-mono text-xs leading-5";

function renderValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

const SELECT = clsx(FIELD, "h-9 w-full cursor-pointer px-3");

export default function ComparePage() {
  const [skillId, setSkillId] = useState("");
  const [versionA, setVersionA] = useState("");
  const [versionB, setVersionB] = useState("");

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillsApi.list({}),
  });

  const versions = useMemo(() => {
    const skill = skills?.items.find((s) => s.id === skillId);
    return skill?.versions ?? [];
  }, [skills, skillId]);

  const { data: diff, isLoading: diffLoading, isError, refetch } = useQuery({
    queryKey: ["compare", versionA, versionB],
    queryFn: () => compareApi.compare(versionA, versionB),
    enabled: Boolean(versionA && versionB && versionA !== versionB),
  });

  const handleSkillChange = (id: string) => {
    setSkillId(id);
    setVersionA("");
    setVersionB("");
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Compare versions"
        meta="Diff two versions of one skill: instructions, schemas, tools and approval actions"
      />

      {/* Picker */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className={LABEL}>Skill</span>
          <select value={skillId} onChange={(e) => handleSkillChange(e.target.value)} className={SELECT}>
            <option value="">Select a skill</option>
            {(skills?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className={LABEL}>Version A (base)</span>
          <select
            value={versionA}
            onChange={(e) => setVersionA(e.target.value)}
            disabled={!skillId || versions.length === 0}
            className={SELECT}
          >
            <option value="">Select a version</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id} disabled={v.id === versionB}>
                v{v.versionNumber} · {v.status.toLowerCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className={LABEL}>Version B (compare)</span>
          <select
            value={versionB}
            onChange={(e) => setVersionB(e.target.value)}
            disabled={!skillId || versions.length === 0}
            className={SELECT}
          >
            <option value="">Select a version</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id} disabled={v.id === versionA}>
                v{v.versionNumber} · {v.status.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : !skills || skills.items.length === 0 ? (
        <EmptyState
          title="No skills to compare"
          description="Create a skill with at least two versions to see diffs here."
        />
      ) : !versionA || !versionB ? (
        <EmptyState
          title="Select two versions"
          description="Pick a skill, then choose version A and version B to generate a diff."
        />
      ) : diffLoading ? (
        <SkeletonPanels panels={2} rows={5} />
      ) : isError ? (
        <EmptyState
          title="Comparison failed"
          description="Could not compare these versions."
          action={
            <button onClick={() => refetch()} className={BTN_SECONDARY_SM}>
              Retry
            </button>
          }
        />
      ) : diff ? (
        <DiffView diff={diff} />
      ) : null}
    </div>
  );
}

function DiffView({ diff }: { diff: VersionDiffResult }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className={clsx(CARD, "flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4")}>
        <span className="font-sans text-sm font-medium text-[var(--text-primary)]">{diff.skillName}</span>
        <span className={META}>
          v{diff.versionA.versionNumber} → v{diff.versionB.versionNumber}
        </span>
        {diff.identical ? (
          <Tag tone="good">Identical</Tag>
        ) : (
          <Tag tone="warn">
            {diff.changes.length} {diff.changes.length === 1 ? "change" : "changes"}
          </Tag>
        )}
      </div>

      {diff.identical ? (
        <EmptyState title="Versions are identical" description="No differences found between these two versions." />
      ) : (
        <div className="space-y-4">
          {diff.changes.map((change, idx) => {
            const kind = KIND[change.kind] ?? KIND.modified;
            return (
              <div key={`${change.field}-${idx}`} className={clsx(CARD, "space-y-4 p-5")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-[var(--text-primary)]">{change.field}</span>
                  <Tag tone={kind.tone}>{kind.label}</Tag>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="font-sans text-[13px] text-[var(--text-muted)]">
                      v{diff.versionA.versionNumber} (base)
                    </div>
                    <pre
                      className={clsx(
                        PRE,
                        change.kind === "removed"
                          ? "border-[var(--state-error)] text-[var(--text-primary)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]",
                        change.kind === "added" && "text-[var(--text-muted)]"
                      )}
                    >
                      {change.kind === "added" ? "—" : renderValue(change.oldValue)}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="font-sans text-[13px] text-[var(--text-muted)]">
                      v{diff.versionB.versionNumber} (compare)
                    </div>
                    <pre
                      className={clsx(
                        PRE,
                        change.kind === "added"
                          ? "border-[var(--state-success)] text-[var(--text-primary)]"
                          : "border-[var(--border-subtle)] text-[var(--text-primary)]",
                        change.kind === "removed" && "text-[var(--text-muted)]"
                      )}
                    >
                      {change.kind === "removed" ? "—" : renderValue(change.newValue)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
