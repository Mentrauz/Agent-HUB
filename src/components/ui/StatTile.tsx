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
  accentClass = "text-cyan-400 bg-cyan-950/40 border border-cyan-800/40",
  className,
}: StatTileProps) {
  return (
    <div
      className={clsx(
        "relative bg-[var(--surface-raised)] rounded-md border border-[var(--border-subtle)]",
        "shadow-card p-6 space-y-3",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
        "hover:border-[var(--border-strong)]",
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

      {/* Large numeral in VT323 pixel font */}
      <div
        className={clsx(
          "font-pixel text-4xl sm:text-5xl leading-none tracking-wider",
          "text-[var(--text-primary)]"
        )}
      >
        {value}
      </div>

      {/* Label in VT323 pixel font */}
      <div className="font-pixel text-xs uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </div>

      {/* Detail text in clean Geist sans font */}
      {detail && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed font-sans">
          {detail}
        </p>
      )}

      {/* Badge in VT323 pixel font */}
      {badge && (
        <span
          className={clsx(
            "absolute top-4 right-4 text-[10px] font-pixel uppercase tracking-wider",
            "px-2 py-0.5 rounded border",
            accentClass,
            "border-current/30"
          )}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
