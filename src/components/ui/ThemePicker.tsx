"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { clsx } from "clsx";
import { usePixelThemeTransition } from "@/components/effects/PixelThemeTransition";
import {
  parseThemeKey,
  type ThemeIdentity,
  type ThemeAppearance,
} from "@/components/providers/ThemeProvider";

// ─── Theme identity definitions ─────────────────────────────────────────────
const IDENTITIES: {
  id: ThemeIdentity;
  label: string;
  description: string;
  swatchColors: [string, string]; // [primary, secondary]
}[] = [
  {
    id: "calm-green",
    label: "Calm Green",
    description: "Calm · Technical · Mature",
    swatchColors: ["#7FAF9B", "#718A96"],
  },
  {
    id: "punk",
    label: "Punk",
    description: "Bold · Energetic · Experimental",
    swatchColors: ["#22D3EE", "#6366F1"],
  },
];

// ─── Swatch component ────────────────────────────────────────────────────────
function IdentitySwatch({
  colors,
  label,
  isActive,
  onClick,
}: {
  colors: [string, string];
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={`Switch to ${label} theme`}
      aria-pressed={isActive}
      className={clsx(
        "relative flex flex-col items-center gap-2 p-2 rounded-lg transition-all duration-150",
        "cursor-pointer select-none focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
        isActive
          ? "bg-[var(--surface-elevated)] border border-[var(--accent-primary)]/40"
          : "hover:bg-[var(--surface-elevated)]/60 border border-transparent"
      )}
    >
      {/* Color circle */}
      <div className="relative">
        <span
          className="relative block w-11 h-11 rounded-full flex-shrink-0 overflow-hidden shadow-inner transition-transform hover:scale-105"
          style={{
            background: `conic-gradient(${colors[0]} 0deg 180deg, ${colors[1]} 180deg 360deg)`,
            boxShadow: isActive
              ? `0 0 0 2px var(--surface-raised), 0 0 12px ${colors[0]}40`
              : "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
        {isActive && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow"
            style={{
              backgroundColor: colors[0],
              color: "#000000",
            }}
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}
      </div>

      {/* Label */}
      <span
        className={clsx(
          "text-xs font-medium leading-none tracking-wide",
          isActive
            ? "text-[var(--text-primary)] font-semibold"
            : "text-[var(--text-secondary)]"
        )}
      >
        {label}
      </span>
    </button>
  );
}

// ─── ThemePicker ─────────────────────────────────────────────────────────────
export function ThemePicker() {
  const { theme, resolvedTheme } = useTheme();
  const { setThemeWithPixelTransition, isTransitioning } =
    usePixelThemeTransition();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"mode" | "color">("mode");
  const [isSystem, setIsSystem] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)]" />
    );
  }

  const currentTheme = theme || resolvedTheme || "calm-green-dark";
  const { identity: currentIdentity, appearance: currentAppearance } =
    parseThemeKey(currentTheme);

  function switchIdentity(identity: ThemeIdentity) {
    const next = `${identity}-${currentAppearance}`;
    setThemeWithPixelTransition(next);
  }

  function switchAppearance(appearance: ThemeAppearance) {
    setIsSystem(false);
    const next = `${currentIdentity}-${appearance}`;
    setThemeWithPixelTransition(next);
  }

  function handleSystem() {
    setIsSystem(true);
    if (typeof window !== "undefined") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const next = `${currentIdentity}-${prefersDark ? "dark" : "light"}`;
      setThemeWithPixelTransition(next);
    }
  }

  const TriggerIcon = currentAppearance === "dark" ? Moon : Sun;

  return (
    <div className="relative">
      {/* Trigger button matching reference design */}
      <button
        ref={triggerRef}
        type="button"
        id="theme-picker-trigger"
        aria-label="Open theme picker"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={isTransitioning}
        className={clsx(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          "bg-[var(--surface-sunken)] border border-[var(--border-subtle)]",
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          "hover:bg-[var(--surface-raised)] hover:border-[var(--border-strong)]",
          "transition-all cursor-pointer select-none",
          open && "bg-[var(--surface-raised)] border-[var(--border-strong)] text-[var(--text-primary)]",
          isTransitioning && "opacity-60 pointer-events-none"
        )}
      >
        <TriggerIcon className="h-4 w-4" />
      </button>

      {/* Picker panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Theme picker"
          className={clsx(
            "absolute right-0 top-[calc(100%+8px)] z-50",
            "w-[230px] rounded-xl overflow-hidden p-3",
            "bg-[var(--surface-raised)] border border-[var(--border-strong)]",
            "shadow-[0_12px_36px_rgba(0,0,0,0.55)]",
            "animate-fadeInUp"
          )}
        >
          {/* Segmented Control: [ Mode ]  [ 🎨 Color ] */}
          <div
            className="flex p-1 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] mb-3"
            role="tablist"
            aria-label="Theme options"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "mode"}
              onClick={() => setActiveTab("mode")}
              className={clsx(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 cursor-pointer select-none text-center",
                activeTab === "mode"
                  ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Mode
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "color"}
              onClick={() => setActiveTab("color")}
              className={clsx(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 cursor-pointer select-none text-center flex items-center justify-center gap-1",
                activeTab === "color"
                  ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Palette className="w-3.5 h-3.5" />
              Color
            </button>
          </div>

          {/* ── Mode Tab Content ── */}
          {activeTab === "mode" && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Appearance mode">
                {/* Light */}
                <button
                  type="button"
                  title="Light mode"
                  aria-label="Light mode"
                  aria-pressed={!isSystem && currentAppearance === "light"}
                  onClick={() => switchAppearance("light")}
                  className={clsx(
                    "flex items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer select-none",
                    !isSystem && currentAppearance === "light"
                      ? "bg-[var(--surface-elevated)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm"
                      : "bg-[var(--surface-sunken)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <Sun className="w-4 h-4" />
                </button>

                {/* Dark */}
                <button
                  type="button"
                  title="Dark mode"
                  aria-label="Dark mode"
                  aria-pressed={!isSystem && currentAppearance === "dark"}
                  onClick={() => switchAppearance("dark")}
                  className={clsx(
                    "flex items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer select-none",
                    !isSystem && currentAppearance === "dark"
                      ? "bg-[var(--surface-elevated)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm"
                      : "bg-[var(--surface-sunken)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <Moon className="w-4 h-4" />
                </button>

                {/* System */}
                <button
                  type="button"
                  title="System preference"
                  aria-label="System preference"
                  aria-pressed={isSystem}
                  onClick={handleSystem}
                  className={clsx(
                    "flex items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer select-none",
                    isSystem
                      ? "bg-[var(--surface-elevated)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm"
                      : "bg-[var(--surface-sunken)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-muted)] text-center">
                  Theme:{" "}
                  <span className="text-[var(--text-secondary)] font-medium">
                    {IDENTITIES.find((i) => i.id === currentIdentity)?.label}
                  </span>{" "}
                  ·{" "}
                  <span className="text-[var(--text-secondary)] font-medium capitalize">
                    {isSystem ? "System" : currentAppearance}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* ── Color Tab Content ── */}
          {activeTab === "color" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme identity">
                {IDENTITIES.map(({ id, label, swatchColors }) => (
                  <IdentitySwatch
                    key={id}
                    colors={swatchColors}
                    label={label}
                    isActive={currentIdentity === id}
                    onClick={() => switchIdentity(id)}
                  />
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-muted)] text-center">
                  {IDENTITIES.find((i) => i.id === currentIdentity)?.description}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
