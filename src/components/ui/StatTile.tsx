import React from "react";
import { clsx } from "clsx";

interface StatTileProps {
  value: string;
  label: string;
  detail?: string;
  badge?: string;
  icon?: React.ReactNode;
  /** Accent color classes for icon chip bg + text */
  accentClass?: string;
  className?: string;
}

export function StatTile({
  value,
  label,
  detail,
  badge,
  icon,
  accentClass = "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40",
  className,
}: StatTileProps) {
  return (
    <div
      className={clsx(
        "relative bg-[var(--surface-raised)] rounded-md border border-[hsl(var(--border))]",
        "shadow-card p-6 space-y-3",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
        "hover:border-indigo-200 dark:hover:border-indigo-800/50",
        className
      )}
    >
      {/* Icon chip */}
      {icon && (
        <div
          className={clsx(
            "w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0",
            accentClass
          )}
        >
          {icon}
        </div>
      )}

      {/* Large numeral */}
      <div
        className={clsx(
          "font-sans font-extrabold text-3xl sm:text-4xl leading-none tracking-tight",
          "text-[var(--text-primary)]"
        )}
      >
        {value}
      </div>

      {/* Label */}
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </div>

      {/* Detail text */}
      {detail && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {detail}
        </p>
      )}

      {/* Badge */}
      {badge && (
        <span
          className={clsx(
            "absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider",
            "px-2 py-0.5 rounded-full border",
            accentClass,
            "border-current/20"
          )}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
