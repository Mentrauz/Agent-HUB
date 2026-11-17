import React from "react";
import Link from "next/link";
import { ToolDefinitionRepository } from "@/repositories/ToolDefinitionRepository";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { createToolRegistry, TOOL_CATEGORIES, getToolCategory } from "@/modules/tools";
import { probeHealth } from "@/lib/tools";
import { ToolCategory, ToolDefinitionDTO } from "@/types/tool";
import { EmptyState } from "@/components/feedback/EmptyState";
import { clsx } from "clsx";
import { McpServerHub } from "./mcp/McpServerHub";
import { OpenApiHub } from "./openapi/OpenApiHub";
import { CARD, META, PageHeader, ROW_HOVER, SECTION_TITLE, Tag } from "@/components/ui/surfaces";

const HEALTH_TONE: Record<string, "good" | "warn" | "bad"> = {
  healthy: "good",
  degraded: "warn",
  unavailable: "bad",
};

const TABS = [
  { id: "tools", label: "Built-in tools", href: "/dashboard/tools" },
  { id: "mcp", label: "MCP servers", href: "/dashboard/tools?tab=mcp" },
  { id: "openapi", label: "OpenAPI and REST", href: "/dashboard/tools?tab=openapi" },
] as const;

const LINK_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

export default async function ToolsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab === "mcp" ? "mcp" : params.tab === "openapi" ? "openapi" : "tools";
  const activeCategory = (params.category as ToolCategory) || undefined;

  const definitionRepo = new ToolDefinitionRepository();
  const executionRepo = new ExecutionRepository();
  const registry = createToolRegistry();

  const [definitions, usageCounts, healthList] = await Promise.all([
    definitionRepo.list(),
    executionRepo.countToolCallsByTool(),
    Promise.all(
      registry.listTools().map(async (tool) => {
        const probe = await probeHealth(tool);
        return { toolName: tool.name, ...probe };
      })
    ),
  ]);

  const health = new Map(healthList.map((h) => [h.toolName, h]));

  const categoryCounts: Record<string, number> = {};
  for (const cat of TOOL_CATEGORIES) {
    categoryCounts[cat.id] = definitions.filter((d) => d.category === cat.id).length;
  }

  const byCategory = new Map<ToolCategory, ToolDefinitionDTO[]>();
  for (const def of definitions) {
    if (!def.category) continue;
    const list = byCategory.get(def.category) ?? [];
    list.push(def);
    byCategory.set(def.category, list);
  }

  const visibleCategories = activeCategory
    ? TOOL_CATEGORIES.filter((c) => c.id === activeCategory)
    : TOOL_CATEGORIES;

  const totalUsage = Object.values(usageCounts).reduce((a: number, b: number) => a + b, 0);
  const toolCount = registry.listTools().length;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Tool registry"
        meta="Schema-validated tools with approval locks, health checks, the MCP hub and OpenAPI imports"
        action={
          <span className={META}>
            {TOOL_CATEGORIES.length} categories · {toolCount} tools · {totalUsage.toLocaleString()} calls
          </span>
        }
      />

      <nav aria-label="Tool sources" className="flex items-center gap-6 overflow-x-auto border-b border-[var(--border-subtle)]">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={activeTab === t.id ? "page" : undefined}
            className={clsx(
              "-mb-px flex h-10 shrink-0 items-center border-b-2 font-sans text-sm whitespace-nowrap transition-colors",
              LINK_FOCUS,
              activeTab === t.id
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {activeTab === "mcp" ? (
        <McpServerHub />
      ) : activeTab === "openapi" ? (
        <OpenApiHub />
      ) : (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm">
            <Link
              href="/dashboard/tools"
              className={clsx(
                "rounded-[6px] transition-colors",
                LINK_FOCUS,
                !activeCategory ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              All <span className={META}>{toolCount}</span>
            </Link>
            {TOOL_CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/tools?category=${c.id}`}
                className={clsx(
                  "rounded-[6px] transition-colors",
                  LINK_FOCUS,
                  activeCategory === c.id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {c.label} <span className={META}>{categoryCounts[c.id]}</span>
              </Link>
            ))}
          </div>

          {definitions.length === 0 ? (
            <EmptyState
              title="No tools registered"
              description="The tool catalog is empty. Built-in tools register themselves on first run."
            />
          ) : (
            <div className="space-y-8">
              {visibleCategories.map((cat) => {
                const toolsInCategory = byCategory.get(cat.id) ?? [];
                if (toolsInCategory.length === 0) return null;
                const categoryMeta = getToolCategory(cat.id);
                const categoryUsage = toolsInCategory.reduce((sum, d) => sum + (usageCounts[d.name] ?? 0), 0);
                return (
                  <section key={cat.id} className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <div className="space-y-1">
                        <h2 className={SECTION_TITLE}>{categoryMeta.label}</h2>
                        <p className="font-sans text-[13px] text-[var(--text-muted)]">{categoryMeta.description}</p>
                      </div>
                      <span className={META}>
                        {toolsInCategory.length} tools · {categoryUsage.toLocaleString()} calls
                      </span>
                    </div>

                    <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
                      {toolsInCategory.map((definition: ToolDefinitionDTO) => {
                        const tool = registry.getTool(definition.name);
                        const probe = health.get(definition.name);
                        const usage = usageCounts[definition.name] ?? 0;
                        return (
                          <li key={definition.name}>
                            <Link
                              href={`/dashboard/tools/${definition.name}?category=${cat.id}`}
                              className={clsx(
                                ROW_HOVER,
                                "flex flex-col justify-between gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)] lg:flex-row lg:items-center lg:gap-8"
                              )}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                  <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">
                                    {definition.displayName}
                                  </h3>
                                  <span className={META}>{definition.name}</span>
                                </div>
                                <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                                  {definition.description}
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1">
                                <span className={META}>{definition.type === "WRITE" ? "write" : "read"}</span>
                                {definition.requiresApproval && <Tag tone="warn">Needs approval</Tag>}
                                {tool?.enabled === false && <Tag tone="bad">Disabled</Tag>}
                                {probe ? (
                                  <Tag tone={HEALTH_TONE[probe.status] ?? "bad"}>{probe.status}</Tag>
                                ) : (
                                  <span className={META}>no probe</span>
                                )}
                                <span className={clsx(META, "w-20 text-right")}>{usage.toLocaleString()} calls</span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
