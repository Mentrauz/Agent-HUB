import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export interface StoreMemoryInput {
  userId: string;
  skillId?: string;
  memoryType?: "semantic" | "episodic" | "preference";
  key: string;
  content: string;
  metadata?: Record<string, unknown>;
  organizationId?: string;
}

export interface RetrieveMemoryInput {
  userId: string;
  skillId?: string;
  query?: string;
  memoryType?: "semantic" | "episodic" | "preference";
  limit?: number;
  organizationId?: string;
}

export class MemoryService {
  /**
   * Stores or updates a long-term memory entry for a user/skill.
   */
  async storeMemory(input: StoreMemoryInput) {
    const memoryType = input.memoryType ?? "semantic";

    // Find existing memory with same key for this user
    const existing = await prisma.agentMemory.findFirst({
      where: {
        userId: input.userId,
        skillId: input.skillId ?? null,
        key: input.key,
      },
    });

    if (existing) {
      return prisma.agentMemory.update({
        where: { id: existing.id },
        data: {
          content: input.content,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
          lastAccessedAt: new Date(),
        },
      });
    }

    return prisma.agentMemory.create({
      data: {
        userId: input.userId,
        skillId: input.skillId || null,
        memoryType,
        key: input.key,
        content: input.content,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        organizationId: input.organizationId || null,
      },
    });
  }

  /**
   * Retrieves relevant memories matching user, skill, and search criteria.
   */
  async retrieveRelevantMemories(input: RetrieveMemoryInput) {
    const limit = input.limit ?? 5;

    const whereClause: Record<string, unknown> = {
      userId: input.userId,
    };

    if (input.organizationId) {
      whereClause.organizationId = input.organizationId;
    }

    if (input.memoryType) {
      whereClause.memoryType = input.memoryType;
    }

    // Match either global user memories (skillId is null) or specific to this skill
    if (input.skillId) {
      whereClause.OR = [{ skillId: input.skillId }, { skillId: null }];
    }

    if (input.query) {
      whereClause.OR = [
        { content: { contains: input.query, mode: "insensitive" } },
        { key: { contains: input.query, mode: "insensitive" } },
      ];
    }

    const memories = await prisma.agentMemory.findMany({
      where: whereClause,
      orderBy: { lastAccessedAt: "desc" },
      take: limit,
    });

    // Touch lastAccessedAt for retrieved memories asynchronously
    if (memories.length > 0) {
      const ids = memories.map((m) => m.id);
      void prisma.agentMemory
        .updateMany({
          where: { id: { in: ids } },
          data: { lastAccessedAt: new Date() },
        })
        .catch(() => {});
    }

    return memories;
  }

  /**
   * Automatically extracts user preferences or key facts from a completed agent turn.
   */
  async extractAndSaveTurnMemories(
    userId: string,
    skillId: string,
    userInput: unknown,
    output: unknown
  ) {
    try {
      const inputText = typeof userInput === "object" ? JSON.stringify(userInput) : String(userInput);
      const outputText = typeof output === "object" ? JSON.stringify(output) : String(output);

      // Extract user preferences (e.g. "I prefer", "always use", "remember that", "my name is")
      const prefMatch = inputText.match(/(?:i prefer|always use|remember that|my name is|our company is)\s+([^.,;\n]+)/i);
      if (prefMatch && prefMatch[1]) {
        const fact = prefMatch[0].trim();
        await this.storeMemory({
          userId,
          skillId,
          memoryType: "preference",
          key: `pref_${Date.now().toString(36)}`,
          content: fact,
          metadata: { extractedFrom: "user_prompt" },
        });
        logger.info({ userId, fact }, "Extracted and persisted user preference memory");
      }
    } catch (err) {
      logger.warn({ err }, "Failed to auto-extract turn memories");
    }
  }

  /**
   * Formats a list of memory records into a markdown section ready for prompt injection.
   */
  static formatMemoriesForPrompt(
    memories: Array<{ key: string; content: string; memoryType: string }>
  ): string {
    if (!memories || memories.length === 0) return "";

    const lines = memories.map(
      (m) => `- [${m.memoryType.toUpperCase()} | ${m.key}]: ${m.content}`
    );

    return `\n\n### Long-Term Episodic & Semantic Memories:\n${lines.join("\n")}\n`;
  }
}
