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

const navItems = [
  { name: "Dashboard",    href: "/dashboard",            icon: LayoutDashboard },
  { name: "Studio",       href: "/dashboard/skills",     icon: Workflow },
  { name: "Agent Canvas", href: "/dashboard/canvas",     icon: Network },
  { name: "Knowledge",    href: "/dashboard/knowledge",  icon: Database },
  { name: "A2A Protocol", href: "/dashboard/a2a",        icon: Bot },
  { name: "Benchmarks",   href: "/dashboard/benchmarks", icon: Award },
  { name: "MLOps Evals",  href: "/dashboard/evals",      icon: Scale },
  { name: "Executions",   href: "/dashboard/executions", icon: Play },
  { name: "Observability",href: "/dashboard/history",    icon: Gauge },
  { name: "Audit Log",    href: "/dashboard/audit",      icon: ScrollText },
  { name: "Compare",      href: "/dashboard/compare",    icon: GitCompare },
  { name: "Tool Registry",href: "/dashboard/tools",      icon: Wrench },
  { name: "Human Review", href: "/dashboard/review",     icon: Shield },
  { name: "Organizations",href: "/organizations",        icon: Building2 },
  { name: "Settings",     href: "/dashboard/settings",   icon: Settings },
];

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

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0 select-none">

      {/* ── Top: Section label + collapse toggle ── */}
      <div
        className={clsx(
          "shrink-0 flex items-center pb-3 border-b border-[var(--border-subtle)]",
          collapsed ? "justify-center" : "justify-between px-1"
        )}
      >
        {!collapsed && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Navigation
          </span>
        )}
        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:inline-flex items-center justify-center h-7 w-7 rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-all duration-150 cursor-pointer shrink-0"
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={closeMobile}
          title="Close sidebar"
          className="md:hidden inline-flex items-center justify-center h-7 w-7 rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Middle: Scrollable nav ── */}
      <nav
        className="flex-1 min-h-0 overflow-y-auto py-3 space-y-0.5 custom-scrollbar"
        aria-label="Dashboard navigation"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              title={collapsed ? item.name : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-[10px] text-sm font-medium font-sans",
                "transition-all duration-150",
                collapsed
                  ? "h-10 w-10 mx-auto justify-center"
                  : "px-3 py-2.5",
                isActive
                  ? [
                      "bg-cyan-950/40",
                      "text-cyan-300",
                      "border-l-2 border-cyan-400",
                      collapsed ? "border-l-0" : "pl-[10px]",
                    ]
                  : [
                      "text-[var(--text-secondary)]",
                      "hover:text-[var(--text-primary)]",
                      "hover:bg-[var(--surface-sunken)]",
                    ]
              )}
            >
              <Icon
                className={clsx(
                  "h-4 w-4 shrink-0",
                  isActive
                    ? "text-cyan-400"
                    : "text-[var(--text-muted)]"
                )}
              />
              {(!collapsed || mobileOpen) && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Sign out ── */}
      <div className="shrink-0 pt-3 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => { closeMobile(); setIsSignOutModalOpen(true); }}
          title={collapsed ? "Sign out" : undefined}
          className={clsx(
            "flex items-center gap-3 rounded-[10px] text-sm font-medium font-sans",
            "text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400",
            "hover:bg-red-50 dark:hover:bg-red-950/20",
            "transition-all duration-150 cursor-pointer w-full",
            collapsed && !mobileOpen
              ? "h-10 w-10 mx-auto justify-center"
              : "px-3 py-2.5"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobileOpen) && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col",
          "bg-[var(--surface-raised)] p-4",
          "border-r border-[var(--border-subtle)]",
          "shadow-elevated",
          "transition-transform duration-300 ease-in-out md:hidden overflow-hidden h-full"
        )}
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop permanent sidebar */}
      <aside
        className={clsx(
          "hidden md:flex flex-col shrink-0 h-full overflow-hidden",
          "bg-[var(--surface-raised)]/80 backdrop-blur-md",
          "border-r border-[var(--border-subtle)]",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-16 p-2" : "w-60 p-4"
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
