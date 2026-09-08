"use client";

import React from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { UserCheck, Sparkles, ArrowRight, LogIn, MousePointerClick, Terminal } from "lucide-react";

/**
 * Client-side auth section for the landing page hero.
 * Moved to a client component so the main page stays a pure RSC.
 */
export function HeroAuthSection() {
  return (
    <>
      {/* Auth status badge (signed-in only) */}
      <div className="animate-fadeInUp text-xs" style={{ animationDelay: "250ms" }}>
        <SignedIn>
          <div className="inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm text-[11px] font-semibold">
            <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">Authenticated · Workspace Access Granted</span>
          </div>
        </SignedIn>
      </div>

      {/* CTAs */}
      <div
        className="animate-fadeInUp flex flex-wrap items-center gap-3 sm:gap-4 pt-2"
        style={{ animationDelay: "300ms" }}
      >
        <SignedOut>
          {/* Primary: solid dark pill */}
          <SignUpButton mode="modal">
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-pill bg-[var(--accent-contrast)] text-white font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 dark:text-slate-900 dark:bg-[var(--text-primary)] shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap">
              <Sparkles className="h-4 w-4" />
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </button>
          </SignUpButton>

          {/* Secondary: outlined ghost pill */}
          <SignInButton mode="modal">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-pill border border-[hsl(var(--border))] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm transition-all cursor-pointer text-sm font-medium whitespace-nowrap">
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-pill bg-[var(--accent-contrast)] text-white font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 dark:text-slate-900 dark:bg-[var(--text-primary)] shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            Open Studio Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </SignedIn>

        {/* Tertiary: live demo link */}
        <a
          href="#canvas"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-pill border border-[hsl(var(--border))] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm transition-all cursor-pointer text-sm font-medium whitespace-nowrap"
        >
          <MousePointerClick className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          Live Demo
        </a>

        {/* Subtle GitHub link */}
        <a
          href="https://github.com/Mentrauz/Agent-HUB"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors whitespace-nowrap"
        >
          <Terminal className="h-4 w-4" />
          GitHub →
        </a>
      </div>
    </>
  );
}

/**
 * Footer CTA — client component to keep the footer inside an RSC.
 */
export function FooterAuthCTA() {
  return (
    <SignUpButton mode="modal">
      <button className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-pill bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer w-full sm:w-auto">
        <Sparkles className="h-4 w-4" />
        Get Started Free
        <ArrowRight className="h-4 w-4" />
      </button>
    </SignUpButton>
  );
}
