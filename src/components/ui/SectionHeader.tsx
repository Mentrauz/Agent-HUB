import React from "react";
import { clsx } from "clsx";

interface SectionHeaderProps {
  /** Section prefix like "// 01.", "// 02." etc. */
  sectionNumber?: string;
  /** Right-aligned meta label e.g. "SELF-HOSTABLE · ZERO SUBSCRIPTIONS" */
  rightMeta?: string;
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
  /** Accent color for the eyebrow / section number */
  eyebrowColor?: string;
}

export function SectionHeader({
  sectionNumber,
  rightMeta,
  eyebrow,
  eyebrowIcon,
  heading,
  subhead,
  align = "left",
  className,
  as: Tag = "h2",
  eyebrowColor = "text-cyan-400",
}: SectionHeaderProps) {
  // If sectionNumber is provided or heading starts with "//", render the terminal banner layout shown in the designs
  const hasBannerStyle = Boolean(sectionNumber || heading.startsWith("//"));

  if (hasBannerStyle) {
    return (
      <div className={clsx("space-y-3", className)}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {sectionNumber && (
              <span
                className={clsx("font-pixel text-lg sm:text-xl font-bold tracking-wider", eyebrowColor)}
                style={{ fontFamily: "'VT323', monospace" }}
              >
                {sectionNumber}
              </span>
            )}
            <Tag
              className="font-pixel text-lg sm:text-xl uppercase tracking-wider text-[var(--text-primary)]"
              style={{ fontFamily: "'VT323', monospace" }}
            >
              {heading}
            </Tag>
          </div>
          {rightMeta && (
            <span
              className={clsx("font-pixel text-xs sm:text-sm uppercase tracking-wider", eyebrowColor)}
              style={{ fontFamily: "'VT323', monospace" }}
            >
              {rightMeta}
            </span>
          )}
        </div>
        {subhead && (
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-sans max-w-3xl">
            {subhead}
          </p>
        )}
      </div>
    );
  }

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
            "inline-flex items-center gap-2 text-xs font-pixel uppercase tracking-wider",
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
          "font-pixel font-bold text-[var(--text-primary)] leading-tight tracking-wider uppercase",
          "text-2xl sm:text-3xl lg:text-4xl"
        )}
      >
        {heading}
      </Tag>
      {subhead && (
        <p
          className={clsx(
            "text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-sans",
            align === "center" && "max-w-2xl mx-auto"
          )}
        >
          {subhead}
        </p>
      )}
    </div>
  );
}
