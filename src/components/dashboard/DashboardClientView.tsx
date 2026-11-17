"use client";

import React, { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { clsx } from "clsx";
import { CanvasBlueprintDTO, DashboardStatsDTO, TimeRangeFilter } from "@/types/dashboard";
import { dashboardApi } from "@/lib/api/dashboard";
import { SystemHealthStrip } from "./SystemHealthStrip";
import { LiveExecutionTracker } from "./LiveExecutionTracker";
import { QuickActionHub } from "./QuickActionHub";
import { QuickRunSkillModal } from "./QuickRunSkillModal";
import { TelemetryMetricsGrid } from "./TelemetryMetricsGrid";
import { PinnedSkillsLaunchpad } from "./PinnedSkillsLaunchpad";
import { MultiAgentCanvasShowcase } from "./MultiAgentCanvasShowcase";
import { KnowledgeBaseCard } from "./KnowledgeBaseCard";
import { ToolPerformanceLeaderboard } from "./ToolPerformanceLeaderboard";
import { EnhancedApprovalQueue } from "./EnhancedApprovalQueue";
import { RecentExecutionsCard, SystemAuditActivityCard } from "./RecentExecutionsAndActivity";
import { META } from "@/components/ui/surfaces";

interface DashboardClientViewProps {
  initialStats: DashboardStatsDTO;
  blueprints: CanvasBlueprintDTO[];
}

const ranges: { id: TimeRangeFilter; label: string; long: string }[] = [
  { id: "24h", label: "24h", long: "Last 24 hours" },
  { id: "7d", label: "7d", long: "Last 7 days" },
  { id: "30d", label: "30d", long: "Last 30 days" },
  { id: "all", label: "All", long: "All time" },
];

export function DashboardClientView({ initialStats, blueprints }: DashboardClientViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>(initialStats.timeRange || "7d");
  const [quickRunModalOpen, setQuickRunModalOpen] = useState(false);
  const [selectedSkillForRun, setSelectedSkillForRun] = useState<string | undefined>(undefined);

  const {
    data: stats,
    isRefetching,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["dashboardStats", timeRange],
    queryFn: () => dashboardApi.getStats(timeRange),
    initialData: timeRange === initialStats.timeRange ? initialStats : undefined,
    // Keep showing the previous range's numbers while a newly selected range loads
    placeholderData: keepPreviousData,
    refetchInterval: 12000, // 12-second live auto-refresh
  });

  const currentStats = stats || initialStats;
  const busy = isRefetching || isFetching;

  const handleOpenQuickRun = (skillId?: string) => {
    setSelectedSkillForRun(skillId);
    setQuickRunModalOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-12">
      {/* Header: title, range, refresh, actions */}
      <div className="relative z-30 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-medium text-[var(--text-primary)]">Dashboard</h1>
          <p className={META}>
            {ranges.find((r) => r.id === timeRange)?.long} · refreshes every 12 s
          </p>
        </div>

        <div className="relative z-30 flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end">
          <div className="flex items-center gap-2">
            {/* Time range */}
            <div
              role="group"
              aria-label="Time range"
              className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-0.5"
            >
              {ranges.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={timeRange === r.id}
                  onClick={() => setTimeRange(r.id)}
                  className={clsx(
                    "h-8 min-w-10 rounded-[6px] px-2.5 font-mono text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                    timeRange === r.id
                      ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              title="Refresh"
              aria-label="Refresh"
              disabled={busy}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors cursor-pointer hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <RotateCw className={clsx("h-4 w-4", busy && "animate-spin")} strokeWidth={1.5} />
            </button>
          </div>

          <QuickActionHub onOpenQuickRun={() => handleOpenQuickRun()} />
        </div>
      </div>

      {/* Runtime and integration readout */}
      <SystemHealthStrip health={currentStats.systemHealth} liveCount={currentStats.liveExecutions.length} />

      {/* Runs in flight (only while any are running) */}
      <LiveExecutionTracker liveExecutions={currentStats.liveExecutions} />

      {/* Key numbers */}
      <TelemetryMetricsGrid
        telemetry={currentStats.telemetry}
        activeSkillsCount={currentStats.totalSkillsCount}
        publishedSkillsCount={currentStats.publishedSkillsCount}
        agentGraphsCount={currentStats.agentGraphs.length}
        pendingApprovalsCount={currentStats.pendingApprovalsCount}
      />

      {/* Review queue, recent runs, audit log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <EnhancedApprovalQueue
            approvals={currentStats.pendingApprovals}
            totalCount={currentStats.pendingApprovalsCount}
          />
        </div>
        <div className="xl:col-span-4">
          <RecentExecutionsCard executions={currentStats.recentExecutions} />
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <SystemAuditActivityCard activity={currentStats.recentActivity} />
        </div>
      </div>

      {/* Skills */}
      <PinnedSkillsLaunchpad
        skills={currentStats.pinnedSkills}
        onQuickRun={(skillId) => handleOpenQuickRun(skillId)}
      />

      {/* Canvas templates and graphs */}
      <MultiAgentCanvasShowcase agentGraphs={currentStats.agentGraphs} blueprints={blueprints} />

      {/* Knowledge base and tools */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <KnowledgeBaseCard insights={currentStats.ragInsights} />
        </div>
        <div className="xl:col-span-7">
          <ToolPerformanceLeaderboard tools={currentStats.toolLeaderboard} />
        </div>
      </div>

      <QuickRunSkillModal
        isOpen={quickRunModalOpen}
        onClose={() => setQuickRunModalOpen(false)}
        skills={currentStats.pinnedSkills}
        initialSkillId={selectedSkillForRun}
      />
    </div>
  );
}
