"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

// ── Supported theme values ──────────────────────────────────────────────────
// Compound key format: "<identity>-<appearance>"
// Identity:   punk | calm-green
// Appearance: dark | light
// ────────────────────────────────────────────────────────────────────────────
export const THEME_IDENTITIES = ["calm-green", "punk"] as const;
export const THEME_APPEARANCES = ["dark", "light"] as const;
export const ALL_THEMES = [
  "calm-green-dark",
  "calm-green-light",
  "punk-dark",
  "punk-light",
] as const;

export type ThemeIdentity = (typeof THEME_IDENTITIES)[number];
export type ThemeAppearance = (typeof THEME_APPEARANCES)[number];
export type ThemeKey = (typeof ALL_THEMES)[number];

/** Parse a compound theme key into identity + appearance parts. */
export function parseThemeKey(key?: string | null): {
  identity: ThemeIdentity;
  appearance: ThemeAppearance;
} {
  if (key?.startsWith("punk")) {
    const appearance = key.endsWith("-light") ? "light" : "dark";
    return { identity: "punk", appearance };
  }
  // Default: calm-green
  const appearance = key?.endsWith("-light") ? "light" : "dark";
  return { identity: "calm-green", appearance };
}

/**
 * Migrate legacy theme values stored in localStorage before the upgrade.
 * Old: "dark" | "light"  →  New: "calm-green-dark" | "calm-green-light"
 */
function migrateLegacyTheme(setTheme: (t: string) => void) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      const migrated = stored === "light" ? "calm-green-light" : "calm-green-dark";
      localStorage.setItem("theme", migrated);
      setTheme(migrated);
    }
  } catch {
    // localStorage not available
  }
}

/** Sync data attributes and class names on <html> whenever the theme changes. */
function ThemeClassSync() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Migrate old localStorage values on first mount
  React.useEffect(() => {
    migrateLegacyTheme(setTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const currentTheme = theme || resolvedTheme || "calm-green-dark";

    const { identity, appearance } = parseThemeKey(currentTheme);

    // ── 1. Identity attribute ──
    root.setAttribute("data-theme-identity", identity);

    // ── 2. Appearance attribute ──
    root.setAttribute("data-theme-appearance", appearance);

    // ── 3. Keep data-theme="dark"/"light" for Clerk + any legacy selectors ──
    root.setAttribute("data-theme", appearance);

    // ── 4. Keep .dark / .light class for Tailwind dark: utilities ──
    //    next-themes already adds the compound class (e.g. "calm-green-dark")
    //    We only need to ensure the appearance class is also present.
    root.classList.remove("dark", "light");
    root.classList.add(appearance);
  }, [theme, resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeClassSync />
      {children}
    </NextThemesProvider>
  );
}
