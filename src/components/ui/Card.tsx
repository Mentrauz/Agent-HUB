import React from "react";
import { clsx } from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual elevation — controls shadow strength */
  elevation?: "flat" | "raised" | "elevated";
  /** Hover lift effect */
  hoverable?: boolean;
  /** Removes internal padding for custom layouts */
  noPadding?: boolean;
}

const elevationClasses = {
  flat: "shadow-none border border-[hsl(var(--border))]",
  raised: "shadow-card border border-[hsl(var(--border))]",
  elevated: "shadow-elevated border border-transparent",
};

export function Card({
  elevation = "raised",
  hoverable = false,
  noPadding = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        "rounded-md bg-[var(--surface-raised)] transition-all duration-300",
        elevationClasses[elevation],
        hoverable && [
          "cursor-pointer",
          "hover:-translate-y-1 hover:shadow-elevated",
          "hover:border-[var(--border-strong)]",
        ],
        !noPadding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Compact feature card with icon chip */
interface FeatureCardProps {
  icon?: React.ReactNode;
  iconColor?: string;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export function FeatureCard({
  icon,
  iconColor = "text-[var(--accent-primary)]",
  title,
  description,
  badge,
  className,
}: FeatureCardProps) {
  return (
    <Card hoverable className={clsx("flex flex-col gap-4", className)}>
      {icon && (
        <div
          className={clsx(
            "w-10 h-10 rounded-[10px] flex items-center justify-center border border-[var(--border-subtle)]",
            "bg-[var(--surface-sunken)]",
            iconColor
          )}
        >
          {icon}
        </div>
      )}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-snug">
            {title}
          </h3>
          {badge && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  );
}
