import React from "react";
import { AgentStudioPreloader } from "@/components/feedback/AgentStudioPreloader";

export default function RootLoading() {
  return (
    <AgentStudioPreloader
      fullscreen={true}
      className="min-h-screen"
      title="Agent Hub Linux Kernel"
      subtitle="vmlinuz-6.12.8-agenthub"
      allowSkip={true}
    />
  );
}
