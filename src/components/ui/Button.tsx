import React from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "tertiary";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const variantClasses: Record<ButtonVariant, string> = {
  /** Solid dark pill — primary CTA, like Cosmoq */
  primary: clsx(
    "bg-[var(--accent-contrast)] text-white",
    "hover:bg-slate-800 dark:hover:bg-slate-100 dark:text-slate-900 dark:bg-[var(--text-primary)]",
    "shadow-sm hover:shadow-md active:scale-[0.98]",
    "transition-all duration-200"
  ),
  /** Outlined / ghost pill — secondary CTA */
  secondary: clsx(
    "bg-transparent text-[var(--accent-primary)] border border-[var(--accent-primary)]",
    "hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
    "active:scale-[0.98] transition-all duration-200"
  ),
  /** Subtle ghost — neutral actions */
  ghost: clsx(
    "bg-transparent text-[var(--text-secondary)] border border-[hsl(var(--border))]",
    "hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
    "active:scale-[0.98] transition-all duration-200"
  ),
  /** Text link with arrow */
  tertiary: clsx(
    "bg-transparent text-[var(--accent-primary)] underline-offset-4 hover:underline",
    "p-0 rounded-none transition-colors duration-150"
  ),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:  "px-4 py-1.5 text-xs gap-1.5",
  md:  "px-6 py-2.5 text-sm gap-2",
  lg:  "px-8 py-3.5 text-base gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isTertiary = variant === "tertiary";

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center font-sans font-semibold select-none cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        isTertiary ? "" : "rounded-pill",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3-3-3h4z" />
        </svg>
      )}
      {!loading && icon && iconPosition === "left" && (
        <span className="shrink-0">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === "right" && (
        <span className="shrink-0">{icon}</span>
      )}
      {variant === "tertiary" && !icon && (
        <span className="ml-0.5" aria-hidden="true">→</span>
      )}
    </button>
  );
}
