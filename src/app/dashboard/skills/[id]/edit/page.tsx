"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SkillForm } from "@/components/skills/SkillForm";
import { skillsApi } from "@/lib/api/skills";
import { SkeletonSkillForm } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { toast } from "@/stores/toastStore";
import { BTN_SECONDARY_SM, META, PageHeader } from "@/components/ui/surfaces";

export default function EditSkillPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: skill, isLoading, isError } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => skillsApi.get(id),
  });

  if (isLoading) return <SkeletonSkillForm />;
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href={`/dashboard/skills/${id}`}
        className="inline-flex rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        {skill.name}
      </Link>

      <PageHeader
        title="Edit draft"
        meta={
          <span className={META}>
            {skill.name}
            {skill.currentDraft && <> · draft v{skill.currentDraft.versionNumber} ({skill.currentDraft.status.toLowerCase()})</>}
            {skill.status === "PUBLISHED" && <> · editing creates a new draft version</>}
          </span>
        }
      />

      <SkillForm
        mode="edit"
        skill={skill}
        initialDraft={skill.currentDraft}
        onSubmit={async (values) => {
          setIsSubmitting(true);
          try {
            const updated = await skillsApi.update(id, values);
            toast.success("Draft saved", `Saved as Draft v${updated.versionNumber}`);
            router.push(`/dashboard/skills/${id}`);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to save draft";
            toast.error("Save failed", message);
            setIsSubmitting(false);
          }
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
