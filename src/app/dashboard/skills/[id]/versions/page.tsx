"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { skillsApi } from "@/lib/api/skills";
import { StatusBadge } from "@/components/skills/StatusBadge";
import { SkeletonVersions } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BTN_SECONDARY_SM, CARD, META, PageHeader, ROW_HOVER, Tag } from "@/components/ui/surfaces";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function SkillVersionsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: skill, isLoading, isError } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => skillsApi.get(id),
  });

  if (isLoading) return <SkeletonVersions />;
  if (isError || !skill) {
    return (
      <EmptyState
        title="Skill not found"
        description="This skill does not exist or you do not have access to it."
        action={
          <Link href="/dashboard/skills" className={BTN_SECONDARY_SM}>
            Back to Studio
          </Link>
        }
      />
    );
  }

  const versions = [...(skill.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href={`/dashboard/skills/${id}`}
        className="inline-flex rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        {skill.name}
      </Link>

      <PageHeader title="Version history" meta={skill.name} />

      {versions.length === 0 ? (
        <EmptyState title="No versions yet" description="Save your draft and publish it to start building version history." />
      ) : (
        <ol className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
          {versions.map((v) => (
            <li
              key={v.id}
              className={clsx(ROW_HOVER, "flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center")}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-mono text-sm text-[var(--text-primary)]">v{v.versionNumber}</span>
                  <StatusBadge status={v.status} />
                  {skill.currentDraftId === v.id && <span className={META}>current draft</span>}
                  {skill.publishedVersionId === v.id && <Tag tone="good">Live</Tag>}
                </div>
                <div className={clsx(META, "flex flex-wrap items-center gap-x-4")}>
                  <span>created {formatDate(v.createdAt)}</span>
                  {v.publishedAt && <span>published {formatDate(v.publishedAt)}</span>}
                </div>
                {(v.notes || v.changelog) && (
                  <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{v.notes || v.changelog}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/dashboard/skills/${id}/edit`} className={BTN_SECONDARY_SM}>
                  {v.status !== "PUBLISHED" ? "Continue draft" : "Edit"}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
