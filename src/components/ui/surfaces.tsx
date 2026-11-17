import React from "react";
import { clsx } from "clsx";
import { ExecutionStatus } from "@/types/execution";

/** Shared dashboard surfaces. Everything comes from theme tokens so Calm Green and Punk both apply. */
export const CARD = "rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]";
export const CARD_HEAD = "flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4";
export const CARD_TITLE = "font-sans text-sm font-medium text-[var(--text-primary)]";
export const SECTION_TITLE = "font-sans text-base font-medium text-[var(--text-primary)]";
export const HEAD_LINK =
  "shrink-0 rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";
export const META = "font-mono text-xs tabular-nums text-[var(--text-muted)]";
export const PAGE_TITLE = "font-sans text-2xl font-medium text-[var(--text-primary)]";
export const FIELD =
  "rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-sunken)] font-sans text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50";
export const INPUT = clsx(FIELD, "h-9 px-3");
export const LABEL = "block font-sans text-[13px] text-[var(--text-secondary)]";
export const TH = "px-5 py-3 font-sans text-[13px] font-normal text-[var(--text-muted)]";
export const ROW_HOVER = "transition-colors hover:bg-[var(--text-primary)]/[0.04]";

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[8px] border font-sans font-medium whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

export const BTN_PRIMARY = clsx(
  BUTTON_BASE,
  "h-9 px-4 text-sm border-[var(--cta-primary-border)] bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] hover:bg-[var(--cta-primary-hover)] active:scale-[0.98]"
);
export const BTN_SECONDARY = clsx(
  BUTTON_BASE,
  "h-9 px-4 text-sm border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.05]"
);
export const BTN_PRIMARY_SM = clsx(BTN_PRIMARY, "h-8 px-3 text-[13px]");
export const BTN_SECONDARY_SM = clsx(BTN_SECONDARY, "h-8 px-3 text-[13px]");

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

const STATUS: Record<ExecutionStatus, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "var(--text-muted)" },
  RUNNING: { label: "Running", color: "var(--accent-primary)" },
  PAUSED_FOR_APPROVAL: { label: "Awaiting approval", color: "var(--state-warning)" },
  COMPLETED: { label: "Completed", color: "var(--state-success)" },
  FAILED: { label: "Failed", color: "var(--state-error)" },
  CANCELLED: { label: "Cancelled", color: "var(--text-muted)" },
  STEP_LIMIT_EXCEEDED: { label: "Step limit", color: "var(--state-error)" },
};

/** Quiet status readout: a dot in the status colour plus a sentence-case label. */
export function StatusDot({ status }: { status: ExecutionStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex shrink-0 items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

/** Page title block: title, one mono or sans meta line, and an optional action on the right. */
export function PageHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div className="space-y-1">
        <h1 className={PAGE_TITLE}>{title}</h1>
        {meta && <p className="font-sans text-sm text-[var(--text-secondary)]">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

const TAG_TONE = {
  neutral: "var(--text-muted)",
  accent: "var(--accent-primary)",
  good: "var(--state-success)",
  warn: "var(--state-warning)",
  bad: "var(--state-error)",
} as const;

/** Dot plus label, for any status that isn't an ExecutionStatus. */
export function Tag({ tone = "neutral", children }: { tone?: keyof typeof TAG_TONE; children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 font-sans text-[13px] text-[var(--text-secondary)]">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: TAG_TONE[tone] }} />
      {children}
    </span>
  );
}

/** Key numbers in one hairline-divided panel: label, big figure, one plain line. */
export function StatGrid({ stats }: { stats: { label: string; value: React.ReactNode; detail?: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--border-subtle)] lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="space-y-3 bg-[var(--surface-raised)] p-5">
          <div className="font-sans text-[13px] text-[var(--text-muted)]">{s.label}</div>
          <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">{s.value}</div>
          {s.detail && <div className="font-sans text-[13px] text-[var(--text-secondary)]">{s.detail}</div>}
        </div>
      ))}
    </div>
  );
}

/** Small segmented control for choosing one of a few options. */
export function Segmented<T extends string>({
  label,
  hideLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  hideLabel?: boolean;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <div className={hideLabel ? "sr-only" : LABEL}>{label}</div>
      <div role="group" aria-label={label} className="inline-flex items-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={clsx(
              "h-8 cursor-pointer rounded-[6px] px-3 font-sans text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
              value === o.id
                ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
