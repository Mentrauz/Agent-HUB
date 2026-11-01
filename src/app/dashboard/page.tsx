import React from "react";
import { auth } from "@clerk/nextjs/server";
import { DashboardStatsService } from "@/services/DashboardStatsService";
import { DashboardClientView } from "@/components/dashboard/DashboardClientView";
import { CANVAS_TEMPLATES } from "@/components/canvas/AgentGraphTemplates";
import { CanvasBlueprintDTO } from "@/types/dashboard";

// Resolved server-side so the full template graphs stay out of the dashboard client bundle.
const blueprints: CanvasBlueprintDTO[] = CANVAS_TEMPLATES.slice(0, 3).map((t) => ({
  id: t.id,
  badge: t.badge,
  category: t.category,
  name: t.name,
  description: t.description,
  nodeCount: t.graph.nodes.length,
}));

export default async function DashboardPage() {
  const { userId } = await auth();
  const dashboardStatsService = new DashboardStatsService();

  const initialStats = await dashboardStatsService.getDashboardStats(userId || "", "7d");

  return <DashboardClientView initialStats={initialStats} blueprints={blueprints} />;
}
