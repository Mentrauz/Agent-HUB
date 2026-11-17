import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createToolRegistry, getToolCategory } from "@/modules/tools";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { findToolDefinition, probeHealth } from "@/lib/tools";
import { ToolCallDTO } from "@/types/execution";
import { ToolCategory } from "@/types/tool";
import { clsx } from "clsx";
import { CARD, CARD_HEAD, CARD_TITLE, META, PageHeader, Tag } from "@/components/ui/surfaces";

const CALL_TONE: Record<string, "good" | "warn" | "bad"> = {
  SUCCESS: "good",
  BLOCKED: "warn",
  ERROR: "bad",
  REJECTED: "bad",
};

const HEALTH_TONE: Record<string, "good" | "warn" | "bad"> = {
  healthy: "good",
  degraded: "warn",
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function JsonPreview({ title, hint, value }: { title: string; hint: string; value: unknown }) {
  return (
    <section className={CARD}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>{title}</h2>
        <span className={META}>{hint}</span>
      </div>
      <div className="p-5">
        <pre className="max-h-72 overflow-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 font-mono text-xs leading-5 text-[var(--text-secondary)]">
          {JSON.stringify(value ?? {}, null, 2)}
        </pre>
      </div>
    </section>
  );
}

export default async function ToolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { userId } = await auth();
  const { name } = await params;
  const { category } = await searchParams;
  // Preserve the dashboard category filter on the back link when present.
  const backHref = category ? `/dashboard/tools?category=${category}` : "/dashboard/tools";

  const registry = createToolRegistry();
  const tool = registry.getTool(name);
  const [definition, executionRepo] = [await findToolDefinition(name), new ExecutionRepository()];

  if (!definition && !tool) notFound();

  // Recent invocations + usage are scoped to the signed-in user so tool calls
  // (which carry args/results) never leak across accounts.
  const [health, usageCounts, recentCalls] = tool && userId
    ? await Promise.all([
        probeHealth(tool),
        executionRepo.countToolCallsByTool(userId),
        executionRepo.findToolCallsByToolName(name, userId, 10),
      ])
    : ([null, {} as Record<string, number>, [] as ToolCallDTO[]] as const);

  const usage = usageCounts[name] ?? 0;
  const displayName = definition?.displayName ?? tool?.displayName ?? name;
  const categoryId = (tool?.category ?? definition?.category ?? "COMPUTE") as ToolCategory;
  const categoryMeta = getToolCategory(categoryId);
  const type = (definition?.type ?? tool?.type) ?? "READ";
  const description = definition?.description ?? tool?.description;
  const needsApproval = definition?.requiresApproval || tool?.requiresApproval;

  return (
    <div className="w-full space-y-6">
      <Link
        href={backHref}
        className="inline-flex rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        Tool registry
      </Link>

      <PageHeader
        title={displayName}
        meta={
          <span className={clsx(META, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
            <span>{name}</span>
            <span>{categoryMeta.label.toLowerCase()}</span>
            <span>{type === "WRITE" ? "write" : "read"}</span>
            {needsApproval && <Tag tone="warn">Needs approval</Tag>}
            {health && (
              <Tag tone={HEALTH_TONE[health.status] ?? "bad"}>
                {health.status} · {health.latencyMs} ms
              </Tag>
            )}
            <span>{usage.toLocaleString()} calls</span>
          </span>
        }
      />

      {description && <p className="max-w-2xl font-sans text-sm leading-6 text-[var(--text-secondary)]">{description}</p>}
      <p className="max-w-2xl font-sans text-[13px] leading-5 text-[var(--text-muted)]">
        {categoryMeta.label}: {categoryMeta.description}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <JsonPreview title="Input schema" hint="accepted shape" value={tool?.inputSchema ?? definition?.parameters ?? {}} />
        <JsonPreview title="Output schema" hint="structured result" value={tool?.outputSchema ?? {}} />
      </div>

      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h2 className={CARD_TITLE}>Recent calls</h2>
          <span className={META}>last 10</span>
        </div>
        {recentCalls.length === 0 ? (
          <p className="px-5 py-10 text-center font-sans text-sm text-[var(--text-muted)]">
            No calls yet. Run a skill that uses this tool to see them here.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {recentCalls.map((call) => (
              <li key={call.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className={META}>{formatDate(call.executedAt)}</span>
                  <span className="font-sans text-sm text-[var(--text-primary)]">{call.action}</span>
                  <Tag tone={CALL_TONE[call.status] ?? "bad"}>{call.status.toLowerCase()}</Tag>
                  {call.durationMs != null && <span className={META}>{(call.durationMs / 1000).toFixed(2)} s</span>}
                  {call.errorMessage && (
                    <span className="font-sans text-[13px] text-[var(--state-error)]">{call.errorMessage}</span>
                  )}
                </div>
                <pre className="overflow-x-auto font-mono text-xs leading-5 text-[var(--text-muted)]">
                  {JSON.stringify(call.inputArgs)}
                  {call.outputResult !== null && call.outputResult !== undefined
                    ? ` → ${JSON.stringify(call.outputResult).slice(0, 240)}`
                    : ""}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
