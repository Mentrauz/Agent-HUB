"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { PinnedSkillDTO } from "@/types/dashboard";
import { BTN_SECONDARY_SM, CARD, HEAD_LINK, META, SECTION_TITLE, plural } from "@/components/ui/surfaces";

interface PinnedSkillsLaunchpadProps {
  skills: PinnedSkillDTO[];
  onQuickRun: (skillId: string) => void;
}

/** The most recently updated active skills (there is no real pinning yet). */
export function PinnedSkillsLaunchpad({ skills, onQuickRun }: PinnedSkillsLaunchpadProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className={SECTION_TITLE}>Recent skills</h2>
          {skills.length > 0 && <span className={META}>last updated first</span>}
        </div>
        <Link href="/dashboard/skills" className={HEAD_LINK}>
          All skills
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className={clsx(CARD, "flex flex-col items-start justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center")}>
          <div className="space-y-1">
            <p className="font-sans text-sm text-[var(--text-primary)]">No skills yet</p>
            <p className="font-sans text-[13px] text-[var(--text-muted)]">
              A skill pairs a prompt with input and output schemas and the tools it may call
            </p>
          </div>
          <Link href="/dashboard/skills/new" className={BTN_SECONDARY_SM}>
            New skill
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {skills.map((skill) => (
            <div key={skill.id} className={clsx(CARD, "flex flex-col gap-4 p-5")}>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]" title={skill.name}>
                  {skill.name}
                </h3>
                <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                  {skill.purpose}
                </p>
                <div className={META}>
                  v{skill.versionNumber} · {plural(skill.allowedTools.length, "tool")}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onQuickRun(skill.id)} className={BTN_SECONDARY_SM}>
                  Quick run
                </button>
                <Link href={`/dashboard/skills/${skill.id}`} className={clsx(HEAD_LINK, "px-2 text-[13px]")}>
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
