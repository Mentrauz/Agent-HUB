"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Sun, Moon, Menu, X, Sparkles, LogIn } from "lucide-react";
import { useSidebar } from "@/components/providers/SidebarContext";
import { usePixelThemeTransition } from "@/components/effects/PixelThemeTransition";
import { clsx } from "clsx";

const landingNavLinks = [
  { label: "[ RUNTIME ]",    href: "#canvas" },
  { label: "[ FEATURES ]",   href: "#opensource" },
  { label: "[ TOOLS ]",      href: "#tooling" },
  { label: "[ GUARDRAILS ]", href: "#guardrails" },
  { label: "[ FAQ ]",        href: "#faq" },
];

export function Header() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { theme, resolvedTheme } = useTheme();
  const { togglePixelTheme, isTransitioning } = usePixelThemeTransition();
  const { toggleMobileOpen, mobileOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [landingMenuOpen, setLandingMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setLandingMenuOpen(false); }, [pathname]);

  /* Scroll-shadow effect */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-40 bg-[var(--surface-base)]/80 backdrop-blur-md",
          "border-b border-[hsl(var(--border))]",
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
                className="md:hidden p-2 rounded-[10px] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            <Link href="/" className="group flex items-center gap-2">
              <span
                className="font-pixel text-xl sm:text-2xl tracking-wider text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase"
                style={{ fontFamily: "'VT323', monospace" }}
              >
                AGENT STUDIO
              </span>
            </Link>
          </div>

          {/* ── Center: Landing page nav links ── */}
          {isLanding && (
            <nav className="hidden lg:flex items-center gap-2" aria-label="Main navigation">
              {landingNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "px-2.5 py-1 text-sm sm:text-base font-pixel tracking-wider",
                    "text-cyan-400/80 hover:text-cyan-300 transition-colors"
                  )}
                  style={{ fontFamily: "'VT323', monospace" }}
                >
                  {link.label}
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

            {/* Theme toggle */}
            {mounted && (
              <button
                type="button"
                onClick={(e) => togglePixelTheme(e)}
                disabled={isTransitioning}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-label="Toggle theme"
                className={clsx(
                  "p-2 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]",
                  "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  "hover:bg-[var(--surface-raised)] hover:border-[var(--border-strong)]",
                  "transition-all cursor-pointer select-none",
                  isTransitioning && "opacity-60 pointer-events-none"
                )}
              >
                {isDark
                  ? <Sun  className="h-4 w-4 text-amber-400" />
                  : <Moon className="h-4 w-4 text-cyan-400" />}
              </button>
            )}

            <SignedOut>
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button
                    aria-label="Sign in"
                    className={clsx(
                      "hidden sm:inline-flex items-center gap-1.5",
                      "px-3 py-1 rounded text-xs sm:text-sm font-pixel tracking-wider",
                      "text-cyan-300 border border-cyan-500/30 bg-cyan-950/30",
                      "hover:text-cyan-100 hover:border-cyan-400 hover:bg-cyan-900/40",
                      "transition-all duration-150 cursor-pointer"
                    )}
                    style={{ fontFamily: "'VT323', monospace" }}
                  >
                    <LogIn className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    [ SIGN IN ]
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    aria-label="Get started for free"
                    className={clsx(
                      "inline-flex items-center gap-1.5",
                      "px-3.5 py-1 rounded text-xs sm:text-sm font-pixel tracking-wider",
                      "text-white bg-indigo-600 border border-indigo-400/40",
                      "hover:bg-indigo-500 hover:border-indigo-300",
                      "shadow-sm transition-all duration-150 cursor-pointer"
                    )}
                    style={{ fontFamily: "'VT323', monospace" }}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                    [ GET STARTED ]
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>

        {/* Mobile landing nav dropdown */}
        {isLanding && landingMenuOpen && (
          <nav
            className="lg:hidden border-t border-[hsl(var(--border))] bg-[var(--surface-raised)] px-4 py-4 flex flex-col gap-1"
            aria-label="Mobile navigation"
          >
            {landingNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setLandingMenuOpen(false)}
                className="px-3 py-2.5 rounded-[10px] text-sm font-medium font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-all"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 mt-1 border-t border-[hsl(var(--border))] flex flex-col gap-2">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button
                    onClick={() => setLandingMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-pill text-sm font-semibold font-sans bg-[var(--accent-contrast)] text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    Get Started Free
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button
                    onClick={() => setLandingMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-pill text-sm font-semibold font-sans border border-[hsl(var(--border))] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-all cursor-pointer"
                  >
                    <LogIn className="h-4 w-4 shrink-0" />
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
