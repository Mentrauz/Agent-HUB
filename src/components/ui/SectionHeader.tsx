import React from "react";
import { clsx } from "clsx";

interface SectionHeaderProps {
  /** Small uppercase eyebrow text above the heading */
  eyebrow?: string;
  /** Optional icon before the eyebrow text */
  eyebrowIcon?: React.ReactNode;
  /** Main section heading */
  heading: string;
  /** Optional one-line subhead below the heading */
  subhead?: string;
  /** Alignment */
  align?: "left" | "center";
  /** Extra class on the wrapper */
  className?: string;
  /** Heading element level */
  as?: "h1" | "h2" | "h3";
  /** Accent color for the eyebrow */
  eyebrowColor?: string;
}

export function SectionHeader({
  eyebrow,
  eyebrowIcon,
  heading,
  subhead,
  align = "left",
  className,
  as: Tag = "h2",
  eyebrowColor = "text-indigo-600 dark:text-indigo-400",
}: SectionHeaderProps) {
  return (
    <div
      className={clsx(
        "space-y-3",
        align === "center" && "text-center",
        className
      )}
    >
      {eyebrow && (
        <div
          className={clsx(
            "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]",
            eyebrowColor,
            align === "center" && "justify-center w-full"
          )}
        >
          {eyebrowIcon && (
            <span className="shrink-0" aria-hidden="true">
              {eyebrowIcon}
            </span>
          )}
          {eyebrow}
        </div>
      )}
      <Tag
        className={clsx(
          "font-sans font-bold text-[var(--text-primary)] leading-tight tracking-tight",
          "text-3xl sm:text-4xl lg:text-5xl"
        )}
      >
        {heading}
      </Tag>
      {subhead && (
        <p
          className={clsx(
            "text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed",
            align === "center" && "max-w-2xl mx-auto"
          )}
        >
          {subhead}
        </p>
      )}
    </div>
  );
}
