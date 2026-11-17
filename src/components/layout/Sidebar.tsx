"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useAuth } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Workflow,
  Play,
  GitCompare,
  Shield,
  Wrench,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  ScrollText,
  Settings,
  X,
  Network,
  Database,
  Bot,
  Award,
  Scale,
  Building2,
} from "lucide-react";
import { clsx } from "clsx";
import { SignOutModal } from "@/components/feedback/SignOutModal";
import { useSidebar } from "@/components/providers/SidebarContext";

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> };

const navGroups: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Build",
    items: [
      { name: "Studio",        href: "/dashboard/skills",    icon: Workflow },
      { name: "Agent canvas",  href: "/dashboard/canvas",    icon: Network },
      { name: "Knowledge",     href: "/dashboard/knowledge", icon: Database },
      { name: "Tool registry", href: "/dashboard/tools",     icon: Wrench },
    ],
  },
  {
    label: "Run",
    items: [
      { name: "Executions",   href: "/dashboard/executions", icon: Play },
      { name: "Human review", href: "/dashboard/review",     icon: Shield },
      { name: "A2A protocol", href: "/dashboard/a2a",        icon: Bot },
    ],
  },
  {
    label: "Evaluate",
    items: [
      { name: "Observability", href: "/dashboard/history",    icon: Gauge },
      { name: "Benchmarks",    href: "/dashboard/benchmarks", icon: Award },
      { name: "Evals",         href: "/dashboard/evals",      icon: Scale },
      { name: "Compare",       href: "/dashboard/compare",    icon: GitCompare },
      { name: "Audit log",     href: "/dashboard/audit",      icon: ScrollText },
    ],
  },
  {
    label: "Workspace",
    items: [
      { name: "Organizations", href: "/organizations",      icon: Building2 },
      { name: "Settings",      href: "/dashboard/settings", icon: Settings },
    ],
  },
];

const ICON_BUTTON =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded } = useAuth();
  const { mobileOpen, closeMobile, collapsed, toggleCollapsed } = useSidebar();
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  useEffect(() => { closeMobile(); }, [pathname, closeMobile]);

  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/versions") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/organizations") ||
    pathname.startsWith("/invitations");

  if (!isLoaded || !isSignedIn || pathname === "/" || !isAppRoute) return null;

  const iconOnly = collapsed && !mobileOpen;

  const rowClass = (active: boolean) =>
    clsx(
      "flex h-8 items-center gap-2.5 rounded-[8px] font-sans text-sm transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
      iconOnly ? "mx-auto w-9 justify-center" : "px-2.5",
      active
        ? "bg-[var(--text-primary)]/[0.08] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/[0.05] hover:text-[var(--text-primary)]"
    );

  const sidebarContent = (
    <div className="flex h-full min-h-0 select-none flex-col">
      {/* Collapse toggle (desktop) / close (mobile) */}
      <div className={clsx("flex shrink-0 items-center pb-2", iconOnly ? "justify-center" : "justify-end")}>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={clsx(ICON_BUTTON, "hidden md:inline-flex")}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" strokeWidth={1.5} /> : <ChevronsLeft className="h-4 w-4" strokeWidth={1.5} />}
        </button>
        <button type="button" onClick={closeMobile} title="Close sidebar" aria-label="Close sidebar" className={clsx(ICON_BUTTON, "md:hidden")}>
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-3" aria-label="Dashboard navigation">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? "home"} className={clsx(gi > 0 && (iconOnly ? "mt-3 border-t border-[var(--border-subtle)] pt-3" : "mt-6"))}>
            {group.label && !iconOnly && (
              <div className="px-2.5 pb-2 font-sans text-xs text-[var(--text-muted)]">{group.label}</div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMobile}
                      title={iconOnly ? item.name : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={rowClass(isActive)}
                    >
                      <Icon
                        className={clsx("h-4 w-4 shrink-0", isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}
                        strokeWidth={1.5}
                      />
                      {!iconOnly && <span className="truncate">{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] pt-3">
        <button
          type="button"
          onClick={() => { closeMobile(); setIsSignOutModalOpen(true); }}
          title={iconOnly ? "Sign out" : undefined}
          className={clsx(rowClass(false), "w-full cursor-pointer", iconOnly && "w-9")}
        >
          <LogOut className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} />
          {!iconOnly && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden animate-fadeIn"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col",
          "bg-[var(--surface-raised)] p-3",
          "border-r border-[var(--border-subtle)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden overflow-hidden h-full"
        )}
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop permanent sidebar */}
      <aside
        className={clsx(
          "hidden md:flex flex-col shrink-0 h-full overflow-hidden",
          "bg-[var(--surface-raised)]",
          "border-r border-[var(--border-subtle)]",
          collapsed ? "w-16 p-2" : "w-60 p-3"
        )}
      >
        {sidebarContent}
      </aside>

      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={() => {
          setIsSignOutModalOpen(false);
          signOut({ redirectUrl: "/" });
        }}
      />
    </>
  );
}
