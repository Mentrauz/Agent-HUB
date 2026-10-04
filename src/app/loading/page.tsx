"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AgentStudioPreloader } from "@/components/feedback/AgentStudioPreloader";

export default function LinuxBootLoadingPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace("/dashboard");
  };

  return (
    <AgentStudioPreloader
      fullscreen={true}
      className="min-h-screen"
      title="Agent Hub Linux Kernel"
      subtitle="vmlinuz-6.12.8-agenthub"
      duration={3200}
      allowSkip={true}
      onComplete={handleComplete}
    />
  );
}
