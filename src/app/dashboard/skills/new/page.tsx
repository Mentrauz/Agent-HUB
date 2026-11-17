"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SkillForm } from "@/components/skills/SkillForm";
import { WORKFLOW_TEMPLATES } from "@/components/workflows/WorkflowTemplates";
import { skillsApi } from "@/lib/api/skills";
import { toast } from "@/stores/toastStore";
import { PageHeader } from "@/components/ui/surfaces";

function NewSkillContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href="/dashboard/skills"
        className="inline-flex rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        Studio
      </Link>

      <PageHeader
        title={template ? template.name : "New workflow or skill"}
        meta={template ? template.purpose : "Define a schema-validated bounded workflow or a reusable AI skill"}
      />

      <SkillForm
        mode="create"
        initialTemplate={template ? {
          name: template.name,
          purpose: template.purpose,
          instructions: template.instructions,
          inputSchema: template.inputSchema,
          outputSchema: template.outputSchema,
          examples: template.examples,
          allowedTools: template.allowedTools,
          actionsRequiringApproval: template.actionsRequiringApproval,
          maxExecutionSteps: template.maxExecutionSteps,
        } : null}
        onSubmit={async (values) => {
          setIsSubmitting(true);
          try {
            const skill = await skillsApi.create(values);
            toast.success("Created successfully", `"${skill.name}" saved as Draft v1`);
            router.push(`/dashboard/skills/${skill.id}`);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create";
            toast.error("Create failed", message);
            setIsSubmitting(false);
          }
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default function NewSkillPage() {
  return (
    <Suspense fallback={<div role="status" className="p-8 font-sans text-sm text-[var(--text-muted)]">Loading the builder</div>}>
      <NewSkillContent />
    </Suspense>
  );
}
