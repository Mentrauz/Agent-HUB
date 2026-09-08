import { describe, it, expect } from "vitest";
import { MemoryService } from "@/services/MemoryService";

describe("Phase 4: Agent Memory Service Tests", () => {
  it("formats list of memories cleanly for system prompt injection", () => {
    const sampleMemories = [
      { key: "preferred_db", content: "PostgreSQL with Neon serverless", memoryType: "preference" },
      { key: "company_name", content: "Acme Corp Logistics", memoryType: "semantic" },
    ];

    const formatted = MemoryService.formatMemoriesForPrompt(sampleMemories);

    expect(formatted).toContain("### Long-Term Episodic & Semantic Memories:");
    expect(formatted).toContain("- [PREFERENCE | preferred_db]: PostgreSQL with Neon serverless");
    expect(formatted).toContain("- [SEMANTIC | company_name]: Acme Corp Logistics");
  });

  it("returns empty string when no memories exist", () => {
    const formatted = MemoryService.formatMemoriesForPrompt([]);
    expect(formatted).toBe("");
  });
});
