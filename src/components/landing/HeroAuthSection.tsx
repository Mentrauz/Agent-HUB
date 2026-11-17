"use client";

import React from "react";
import Link from "next/link";
import { SignUpButton, Show } from "@clerk/nextjs";

const PRIMARY_BUTTON =
  "inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-[10px] bg-[var(--cta-primary-bg)] px-5 font-sans text-sm font-medium text-[var(--cta-primary-text)] border border-[var(--cta-primary-border)] transition-colors hover:bg-[var(--cta-primary-hover)] active:scale-[0.98] cursor-pointer whitespace-nowrap";

/**
 * Client-side auth section for the landing page hero.
 * One primary action (sign up, or open the dashboard when signed in) and one secondary action.
 */
export function HeroAuthSection() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Show when="signed-out">
        <SignUpButton mode="modal">
          <button className={PRIMARY_BUTTON}>Get started free</button>
        </SignUpButton>
      </Show>

      <Show when="signed-in">
        <Link href="/dashboard" className={PRIMARY_BUTTON}>
          Open studio dashboard
        </Link>
      </Show>

      <a
        href="#canvas"
        className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-5 font-sans text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-muted)] whitespace-nowrap"
      >
        Try the live demo
      </a>
    </div>
  );
}

/**
 * Footer CTA — client component to keep the footer inside an RSC.
 */
export function FooterAuthCTA() {
  return (
    <SignUpButton mode="modal">
      <button className={PRIMARY_BUTTON}>Get started free</button>
    </SignUpButton>
  );
}
