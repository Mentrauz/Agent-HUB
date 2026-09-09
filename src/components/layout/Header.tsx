"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import { Menu, X, Sparkles, LogIn } from "lucide-react";
import { useSidebar } from "@/components/providers/SidebarContext";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { useTheme } from "next-themes";
import { parseThemeKey } from "@/components/providers/ThemeProvider";
import { clsx } from "clsx";

const landingNavLinks = [
  { label: "[ RUNTIME ]",    clean: "Runtime",    href: "#canvas" },
  { label: "[ FEATURES ]",   clean: "Features",   href: "#opensource" },
  { label: "[ TOOLS ]",      clean: "Tools",      href: "#tooling" },
  { label: "[ GUARDRAILS ]", clean: "Guardrails", href: "#guardrails" },
  { label: "[ FAQ ]",        clean: "FAQ",        href: "#faq" },
];

export function Header() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { toggleMobileOpen, mobileOpen } = useSidebar();
  const [landingMenuOpen, setLandingMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { theme, resolvedTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setLandingMenuOpen(false); }, [pathname]);

  /* Scroll-shadow effect */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentThemeKey = theme || resolvedTheme || "calm-green-dark";
  const { identity } = parseThemeKey(currentThemeKey);
  const isCalmGreen = mounted && identity === "calm-green";

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-40 bg-[var(--surface-base)]/90 backdrop-blur-md",
          "border-b border-[var(--border-subtle)]",
          "text-[var(--text-primary)] transition-all duration-200",
          scrolled && "header-scrolled"
        )}
      >
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* ── Left: Hamburger (dashboard) + Logo ── */}
          <div className="flex items-center gap-3">
            {!isLanding && (
              <button
                type="button"
                onClick={toggleMobileOpen}
                aria-label="Toggle navigation"
                className="md:hidden p-2 rounded-[10px] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface-elevated)] transition-all cursor-pointer"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            <Link href="/" className="group flex items-center gap-2">
              <span
                className="font-pixel text-xl sm:text-2xl font-bold tracking-wider text-[var(--accent-primary)] group-hover:text-[var(--accent-hover,var(--accent-primary))] transition-colors uppercase"
              >
                AGENT STUDIO
              </span>
            </Link>
          </div>

          {/* ── Center: Landing page nav links ── */}
          {isLanding && (
            <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main navigation">
              {landingNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "px-3 py-1.5 text-sm font-pixel font-medium tracking-wide rounded-md transition-colors",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]/50"
                  )}
                >
                  {isCalmGreen ? link.clean : link.label}
                </a>
              ))}
            </nav>
          )}

          {/* ── Right: Theme toggle + Auth ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Mobile menu button for landing */}
            {isLanding && (
              <button
                type="button"
                onClick={() => setLandingMenuOpen((v) => !v)}
                aria-label="Toggle menu"
                className="lg:hidden p-2 rounded-[10px] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                {landingMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            {/* Theme picker */}
            <ThemePicker />

            <Show when="signed-out">
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button
                    aria-label="Sign in"
                    className={clsx(
                      "hidden sm:inline-flex items-center gap-1.5",
                      "px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-pixel font-medium tracking-wide",
                      "text-[var(--text-secondary)] border border-[var(--border-strong)] bg-[var(--surface-raised)]",
                      "hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-elevated)]",
                      "transition-all duration-150 cursor-pointer"
                    )}
                  >
                    <LogIn className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
                    {isCalmGreen ? "Sign In" : "[ SIGN IN ]"}
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    aria-label="Get started for free"
                    className={clsx(
                      "inline-flex items-center gap-1.5",
                      "px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-pixel font-medium tracking-wide",
                      "text-[var(--cta-primary-text)] bg-[var(--cta-primary-bg)] border border-[var(--cta-primary-border)]",
                      "hover:bg-[var(--cta-primary-hover)]",
                      "shadow-sm transition-all duration-150 cursor-pointer"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "currentColor" }} />
                    {isCalmGreen ? "Get Started" : "[ GET STARTED ]"}
                  </button>
                </SignUpButton>
              </div>
            </Show>

            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>

        {/* Mobile landing nav dropdown */}
        {isLanding && landingMenuOpen && (
          <nav
            className="lg:hidden border-t border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4 flex flex-col gap-1"
            aria-label="Mobile navigation"
          >
            {landingNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setLandingMenuOpen(false)}
                className="px-3 py-2.5 rounded-[10px] text-sm font-medium font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-all"
              >
                {isCalmGreen ? link.clean : link.label}
              </a>
            ))}
            <div className="pt-3 mt-1 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button
                    onClick={() => setLandingMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-sans bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] border border-[var(--cta-primary-border)] shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 shrink-0" style={{ color: "currentColor" }} />
                    {isCalmGreen ? "Get Started" : "Get Started Free"}
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button
                    onClick={() => setLandingMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-sans border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-all cursor-pointer"
                  >
                    <LogIn className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                    Sign In
                  </button>
                </SignInButton>
              </Show>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
