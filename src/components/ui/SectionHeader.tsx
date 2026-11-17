import React from "react";
import { clsx } from "clsx";

interface SectionHeaderProps {
  /** Main section heading */
  heading: string;
  /** Optional one-line subhead below the heading */
  subhead?: string;
  /** Short mono readout on the right, shown with a status dot, e.g. "41 node types" */
  rightMeta?: string;
  /** Extra class on the wrapper */
  className?: string;
  /** Heading element level */
  as?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  heading,
  subhead,
  rightMeta,
  className,
  as: Tag = "h2",
}: SectionHeaderProps) {
  return (
    <div className={clsx("flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-12", className)}>
      <div className="max-w-2xl space-y-3">
        <Tag className="font-pixel text-3xl font-medium leading-tight text-[var(--text-primary)] sm:text-4xl">
          {heading}
        </Tag>
        {subhead && (
          <p className="font-sans text-base leading-relaxed text-[var(--text-secondary)]">{subhead}</p>
        )}
      </div>
      {rightMeta && (
        <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
          {rightMeta}
        </span>
      )}
    </div>
  );
}
