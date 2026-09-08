"use client";

import React from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { UserCheck, Sparkles, LogIn, MousePointerClick } from "lucide-react";

/**
 * Client-side auth section for the landing page hero.
 * Styled to match the dark graphite developer infrastructure aesthetic.
 */
export function HeroAuthSection() {
  return (
    <>
      {/* Auth status badge (signed-in only) */}
      <div className="animate-fadeInUp text-xs" style={{ animationDelay: "250ms" }}>
        <Show when="signed-in">
          <div className="inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-800/40 bg-emerald-950/40 text-emerald-400 shadow-sm text-[11px] font-semibold font-sans">
            <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">Authenticated · Workspace Access Granted</span>
          </div>
        </Show>
      </div>

      {/* CTAs */}
      <div
        className="animate-fadeInUp flex flex-wrap items-center gap-3 sm:gap-4 pt-2"
        style={{ animationDelay: "300ms" }}
      >
        <Show when="signed-out">
          {/* Primary: indigo action button */}
          <SignUpButton mode="modal">
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm border border-indigo-400/40 shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap font-sans">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Get Started Free →
            </button>
          </SignUpButton>

          {/* Secondary: outlined ghost button */}
          <SignInButton mode="modal">
            <button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] shadow-sm transition-all cursor-pointer text-sm font-medium whitespace-nowrap font-sans">
              <LogIn className="h-4 w-4 text-cyan-400" />
              Sign In
            </button>
          </SignInButton>
        </Show>

        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm border border-indigo-400/40 shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap font-sans"
          >
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Open Studio Dashboard →
          </Link>
        </Show>

        {/* Tertiary: live demo link */}
        <a
          href="#canvas"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] shadow-sm transition-all cursor-pointer text-sm font-medium whitespace-nowrap font-sans"
        >
          <MousePointerClick className="h-4 w-4 text-[var(--accent-primary)]" />
          Live Interactive Demo
        </a>

        {/* Subtle GitHub link */}
        <a
          href="https://github.com/Mentrauz/Agent-HUB"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-sm font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors whitespace-nowrap"
        >
          <span>&gt;_ GitHub</span>
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
      <button className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm border border-indigo-400/40 shadow-sm hover:shadow-md transition-all cursor-pointer w-full sm:w-auto font-sans">
        <Sparkles className="h-4 w-4 text-cyan-300" />
        Get Started Free →
      </button>
    </SignUpButton>
  );
}
