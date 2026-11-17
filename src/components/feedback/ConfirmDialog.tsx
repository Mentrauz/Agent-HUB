"use client";

import React from "react";
import { clsx } from "clsx";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/surfaces";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "warning";
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  variant = "danger",
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-fadeInUp space-y-5 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
      >
        <div className="space-y-2">
          <h3 className="font-sans text-base font-medium text-[var(--text-primary)]">{title}</h3>
          <p className="font-sans text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button type="button" onClick={onClose} disabled={isPending} className={clsx(BTN_SECONDARY, "w-full sm:w-auto")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={clsx(
              "w-full sm:w-auto",
              isDanger ? clsx(BTN_SECONDARY, "text-[var(--state-error)]") : BTN_PRIMARY
            )}
          >
            {isPending ? "Processing" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
