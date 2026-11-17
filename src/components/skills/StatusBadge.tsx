import React from "react";
import { SkillStatus } from "@/types/skill";
import { Tag } from "@/components/ui/surfaces";

const TONE: Record<SkillStatus, { label: string; tone: "neutral" | "good" | "warn" }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PUBLISHED: { label: "Published", tone: "good" },
  ARCHIVED: { label: "Archived", tone: "warn" },
};

export function StatusBadge({ status }: { status: SkillStatus }) {
  const t = TONE[status];
  return <Tag tone={t.tone}>{t.label}</Tag>;
}
