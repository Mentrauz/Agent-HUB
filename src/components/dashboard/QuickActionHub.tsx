"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Play, Network, Database, Wrench, ChevronDown, FileCode2 } from "lucide-react";
import { clsx } from "clsx";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/surfaces";

interface QuickActionHubProps {
  onOpenQuickRun: () => void;
}

const MENU_ITEM =
  "flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left font-sans text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] focus-visible:outline-none focus-visible:bg-[var(--text-primary)]/[0.06] cursor-pointer";
const MENU_ICON = "h-4 w-4 shrink-0 text-[var(--text-muted)]";

export function QuickActionHub({ onOpenQuickRun }: QuickActionHubProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const close = () => setDropdownOpen(false);

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onOpenQuickRun} className={BTN_PRIMARY}>
        <Play className="h-4 w-4" strokeWidth={1.5} />
        Quick run
      </button>

      <Link href="/dashboard/canvas/new" className={clsx(BTN_SECONDARY, "hidden sm:inline-flex")}>
        New graph
      </Link>

      <Link href="/dashboard/skills/new" className={clsx(BTN_SECONDARY, "hidden md:inline-flex")}>
        New skill
      </Link>

      <div className="relative z-50" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          className={clsx(BTN_SECONDARY, "px-3", dropdownOpen && "bg-[var(--text-primary)]/[0.05]")}
        >
          More
          <ChevronDown
            className={clsx("h-4 w-4 text-[var(--text-muted)] transition-transform duration-150", dropdownOpen && "rotate-180")}
            strokeWidth={1.5}
          />
        </button>

        {dropdownOpen && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 animate-fadeIn rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onOpenQuickRun();
              }}
              className={MENU_ITEM}
            >
              <Play className={MENU_ICON} strokeWidth={1.5} />
              Quick run a skill
            </button>
            <Link href="/dashboard/canvas/new" role="menuitem" onClick={close} className={MENU_ITEM}>
              <Network className={MENU_ICON} strokeWidth={1.5} />
              New canvas
            </Link>
            <Link href="/dashboard/knowledge" role="menuitem" onClick={close} className={MENU_ITEM}>
              <Database className={MENU_ICON} strokeWidth={1.5} />
              Add knowledge
            </Link>
            <Link href="/dashboard/tools" role="menuitem" onClick={close} className={MENU_ITEM}>
              <Wrench className={MENU_ICON} strokeWidth={1.5} />
              Browse tools
            </Link>

            <div className="my-1 h-px bg-[var(--border-subtle)]" />

            <Link href="/dashboard/skills/synthesizer" role="menuitem" onClick={close} className={MENU_ITEM}>
              <FileCode2 className={MENU_ICON} strokeWidth={1.5} />
              Skill synthesizer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
