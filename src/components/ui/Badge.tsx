import React from "react";
import { clsx } from "clsx";

type BadgeVariant = "default" | "success" | "warning" | "error" | "purple" | "teal" | "amber" | "sky";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "xs" | "sm";
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-cyan-950/50 text-cyan-300 border-cyan-800/40",
  success: "bg-emerald-950/50 text-emerald-300 border-emerald-800/40",
  warning: "bg-amber-950/50 text-amber-300 border-amber-800/40",
  error:   "bg-red-950/50 text-red-300 border-red-800/40",
  purple:  "bg-violet-950/50 text-violet-300 border-violet-800/40",
  teal:    "bg-cyan-950/50 text-cyan-300 border-cyan-800/40",
  amber:   "bg-amber-950/50 text-amber-300 border-amber-800/40",
  sky:     "bg-sky-950/50 text-sky-300 border-sky-800/40",
};

const sizeClasses = {
  xs: "text-[9px] px-2 py-0.5",
  sm: "text-[11px] px-2.5 py-0.5",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold uppercase tracking-wider rounded-full border",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
