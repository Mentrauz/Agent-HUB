"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { DashboardStatsDTO, TimeRangeFilter } from "@/types/dashboard";
import { dashboardApi } from "@/lib/api/dashboard";
import { Reveal } from "@/components/Reveal";
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
}

export function DashboardClientView({ initialStats }: DashboardClientViewProps) {
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
    <div className="space-y-6 sm:space-y-8 w-full max-w-[1600px] mx-auto pb-12">
      {/* 1. Header with Controls & Action Hub */}
      <div className="relative z-30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <Reveal delay={0}>
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
        </Reveal>

        <Reveal delay={100} className="relative z-30">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
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
        </Reveal>
      </div>

      {/* 2. System Health & Integration Strip */}
      <Reveal delay={100}>
        <SystemHealthStrip health={currentStats.systemHealth} />
      </Reveal>

      {/* 3. Live Active In-flight Executions Monitor */}
      <Reveal delay={150}>
        <LiveExecutionTracker liveExecutions={currentStats.liveExecutions} />
      </Reveal>

      {/* 4. High-Level Telemetry & Operational Metrics */}
      <Reveal delay={200}>
        <TelemetryMetricsGrid
          telemetry={currentStats.telemetry}
          activeSkillsCount={currentStats.totalSkillsCount}
          publishedSkillsCount={currentStats.publishedSkillsCount}
          agentGraphsCount={currentStats.agentGraphs.length}
          pendingApprovalsCount={currentStats.pendingApprovals.length}
        />
      </Reveal>

      {/* 5. Pinned Skills & 1-Click Launchpad */}
      <Reveal delay={250}>
        <PinnedSkillsLaunchpad
          skills={currentStats.pinnedSkills}
          onQuickRun={(skillId) => handleOpenQuickRun(skillId)}
        />
      </Reveal>

      {/* 6. Multi-Agent Canvas Architectures Showcase */}
      <Reveal delay={300}>
        <MultiAgentCanvasShowcase agentGraphs={currentStats.agentGraphs} />
      </Reveal>

      {/* 7. Knowledge Base (RAG) & Tool Performance Leaderboard */}
      <Reveal delay={350}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KnowledgeBaseCard insights={currentStats.ragInsights} />
          <ToolPerformanceLeaderboard tools={currentStats.toolLeaderboard} />
        </div>
      </Reveal>

      {/* 8. Human Review Queue, Recent Executions & System Audit (Equal 3-Column Grid) */}
      <Reveal delay={400}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EnhancedApprovalQueue approvals={currentStats.pendingApprovals} />
          <RecentExecutionsCard executions={currentStats.recentExecutions} />
          <SystemAuditActivityCard activity={currentStats.recentActivity} />
        </div>
      </Reveal>

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
