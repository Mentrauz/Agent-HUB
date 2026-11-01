"use client";

import React, { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
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

interface DashboardClientViewProps {
  initialStats: DashboardStatsDTO;
  blueprints: CanvasBlueprintDTO[];
}

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
    refetchInterval: 12000, // 12-second live pulse auto-refresh
  });

  const currentStats = stats || initialStats;

  const handleOpenQuickRun = (skillId?: string) => {
    setSelectedSkillForRun(skillId);
    setQuickRunModalOpen(true);
  };

  const ranges: { id: TimeRangeFilter; label: string }[] = [
    { id: "24h", label: "24H" },
    { id: "7d", label: "7D" },
    { id: "30d", label: "30D" },
    { id: "all", label: "ALL" },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-[1600px] mx-auto pb-12">
      {/* 1. Header with Controls & Action Hub */}
      <div className="relative z-30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-sans font-bold text-[var(--text-primary)] tracking-tight">
              Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
              Live
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-sans">
            Real-time multi-agent orchestration, telemetry, RAG knowledge &amp; tool reliability.
          </p>
        </div>

        <div className="relative z-30 flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Time Range Filter Bar */}
          <div className="inline-flex items-center rounded-[10px] border border-[hsl(var(--border))] bg-[var(--surface-raised)] p-1 text-xs font-sans shadow-sm">
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id)}
                className={`px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all cursor-pointer ${
                  timeRange === r.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            title="Refresh telemetry"
            disabled={isRefetching || isFetching}
            className="p-2 rounded-[10px] border border-[hsl(var(--border))] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-all cursor-pointer shadow-sm"
          >
            <RotateCw className={`h-4 w-4 ${isRefetching || isFetching ? "animate-spin text-indigo-500" : ""}`} />
          </button>

          {/* Quick Action Hub */}
          <QuickActionHub onOpenQuickRun={() => handleOpenQuickRun()} />
        </div>
      </div>

      {/* 2. Runtime Status & Integration Strip */}
      <SystemHealthStrip
        health={currentStats.systemHealth}
        liveCount={currentStats.liveExecutions.length}
      />

      {/* 3. Live Active In-flight Executions Monitor (only rendered while runs are in flight) */}
      <LiveExecutionTracker liveExecutions={currentStats.liveExecutions} />

      {/* 4. High-Level Telemetry & Operational Metrics */}
      <TelemetryMetricsGrid
        telemetry={currentStats.telemetry}
        activeSkillsCount={currentStats.totalSkillsCount}
        publishedSkillsCount={currentStats.publishedSkillsCount}
        agentGraphsCount={currentStats.agentGraphs.length}
        pendingApprovalsCount={currentStats.pendingApprovalsCount}
      />

      {/* 5. Human Review Queue, Recent Executions & System Audit (Equal 3-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <EnhancedApprovalQueue
          approvals={currentStats.pendingApprovals}
          totalCount={currentStats.pendingApprovalsCount}
        />
        <RecentExecutionsCard executions={currentStats.recentExecutions} />
        <SystemAuditActivityCard activity={currentStats.recentActivity} />
      </div>

      {/* 6. Pinned Skills & 1-Click Launchpad */}
      <PinnedSkillsLaunchpad
        skills={currentStats.pinnedSkills}
        onQuickRun={(skillId) => handleOpenQuickRun(skillId)}
      />

      {/* 7. Multi-Agent Canvas Architectures Showcase */}
      <MultiAgentCanvasShowcase agentGraphs={currentStats.agentGraphs} blueprints={blueprints} />

      {/* 8. Knowledge Base (RAG) & Tool Performance Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KnowledgeBaseCard insights={currentStats.ragInsights} />
        <ToolPerformanceLeaderboard tools={currentStats.toolLeaderboard} />
      </div>

      {/* 9. Interactive Quick Run Modal */}
      <QuickRunSkillModal
        isOpen={quickRunModalOpen}
        onClose={() => setQuickRunModalOpen(false)}
        skills={currentStats.pinnedSkills}
        initialSkillId={selectedSkillForRun}
      />
    </div>
  );
}
