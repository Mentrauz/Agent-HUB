import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ExecutionService } from "./ExecutionService";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { SkillRepository } from "@/repositories/SkillRepository";
import { AuditLogRepository } from "@/repositories/AuditLogRepository";
import { logger } from "@/lib/logger";

export interface CreateWebhookTriggerInput {
  userId: string;
  skillId: string;
  name: string;
  secret?: string;
  inputMapping?: Record<string, unknown>;
  organizationId?: string;
}

export interface CreateCronScheduleInput {
  userId: string;
  skillId: string;
  name: string;
  cronExpression: string;
  payloadTemplate?: Record<string, unknown>;
  organizationId?: string;
}

export interface WebhookExecutionPayload {
  body: unknown;
  headers: Record<string, string>;
  query?: Record<string, string>;
}

export class TriggerService {
  private executionService: ExecutionService;

  constructor(executionService?: ExecutionService) {
    this.executionService =
      executionService ??
      new ExecutionService(
        new ExecutionRepository(),
        new SkillRepository(),
        new AuditLogRepository()
      );
  }

  /** Generate a secure random token for public webhook URLs */
  static generateToken(): string {
    return `wh_${crypto.randomBytes(24).toString("hex")}`;
  }

  /** Verify HMAC-SHA256 signature if a secret is configured on the webhook */
  static verifySignature(
    payloadRaw: string,
    signatureHeader: string | undefined,
    secret: string
  ): boolean {
    if (!secret) return true;
    if (!signatureHeader) return false;

    // Handle "sha256=" prefix if present (GitHub / Stripe convention)
    const cleanSignature = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice(7)
      : signatureHeader;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payloadRaw)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, "hex"),
        Buffer.from(expected, "hex")
      );
    } catch {
      return false;
    }
  }

  /** Maps incoming webhook payload into graph input parameters based on template rules */
  static mapPayloadToInput(
    payload: WebhookExecutionPayload,
    mappingRules: Record<string, unknown>
  ): Record<string, unknown> {
    const input: Record<string, unknown> = {};

    // If explicit mapping rules exist
    if (mappingRules && Object.keys(mappingRules).length > 0) {
      for (const [targetKey, sourceExpr] of Object.entries(mappingRules)) {
        if (typeof sourceExpr === "string") {
          if (sourceExpr === "{{body}}") {
            input[targetKey] = payload.body;
          } else if (sourceExpr.startsWith("{{body.") && sourceExpr.endsWith("}}")) {
            const path = sourceExpr.slice(7, -2);
            input[targetKey] = TriggerService.getNestedValue(payload.body, path);
          } else if (sourceExpr.startsWith("{{headers.") && sourceExpr.endsWith("}}")) {
            const headerKey = sourceExpr.slice(10, -2).toLowerCase();
            input[targetKey] = payload.headers[headerKey];
          } else if (sourceExpr.startsWith("{{query.") && sourceExpr.endsWith("}}")) {
            const queryKey = sourceExpr.slice(8, -2);
            input[targetKey] = payload.query ? payload.query[queryKey] : undefined;
          } else {
            input[targetKey] = sourceExpr;
          }
        } else {
          input[targetKey] = sourceExpr;
        }
      }
    } else {
      // Default mapping: pass body directly or wrapped in standard fields
      if (typeof payload.body === "object" && payload.body !== null && !Array.isArray(payload.body)) {
        Object.assign(input, payload.body);
      }
      input._webhook = {
        headers: payload.headers,
        query: payload.query,
        receivedAt: new Date().toISOString(),
      };
    }

    return input;
  }

  private static getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== "object") return undefined;
    const parts = path.split(".");
    let curr: unknown = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined || typeof curr !== "object") return undefined;
      curr = (curr as Record<string, unknown>)[part];
    }
    return curr;
  }

  // --- Webhook Triggers ---

  async createWebhookTrigger(input: CreateWebhookTriggerInput) {
    const token = TriggerService.generateToken();

    return prisma.webhookTrigger.create({
      data: {
        userId: input.userId,
        skillId: input.skillId,
        name: input.name,
        token,
        secret: input.secret || null,
        inputMapping: (input.inputMapping ?? {}) as Prisma.InputJsonValue,
        organizationId: input.organizationId || null,
      },
      include: {
        skill: {
          select: { id: true, name: true, publishedVersionId: true, currentDraftId: true },
        },
      },
    });
  }

  async getWebhookTriggerByToken(token: string) {
    return prisma.webhookTrigger.findUnique({
      where: { token },
      include: {
        skill: {
          include: {
            versions: {
              where: { status: "PUBLISHED" },
              orderBy: { versionNumber: "desc" },
              take: 1,
            },
          },
        },
      },
    });
  }

  async listWebhookTriggers(userId: string, organizationId?: string) {
    return prisma.webhookTrigger.findMany({
      where: organizationId
        ? { organizationId }
        : { userId, organizationId: null },
      include: {
        skill: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteWebhookTrigger(id: string, userId: string) {
    return prisma.webhookTrigger.deleteMany({
      where: { id, userId },
    });
  }

  async toggleWebhookTrigger(id: string, userId: string, isActive: boolean) {
    return prisma.webhookTrigger.updateMany({
      where: { id, userId },
      data: { isActive },
    });
  }

  async executeWebhook(
    token: string,
    payload: WebhookExecutionPayload,
    rawBody: string = ""
  ) {
    const trigger = await this.getWebhookTriggerByToken(token);
    if (!trigger) {
      throw new Error("Webhook trigger not found");
    }

    if (!trigger.isActive) {
      throw new Error("Webhook trigger is deactivated");
    }

    // If secret configured, verify signature from headers
    if (trigger.secret) {
      const sig =
        payload.headers["x-hub-signature-256"] ||
        payload.headers["x-signature-256"] ||
        payload.headers["x-webhook-signature"] ||
        payload.headers["authorization"];

      const isValid = TriggerService.verifySignature(rawBody, sig, trigger.secret);
      if (!isValid) {
        throw new Error("Invalid webhook signature verification");
      }
    }

    const versionId =
      trigger.skill.publishedVersionId ||
      trigger.skill.versions[0]?.id ||
      trigger.skill.currentDraftId;

    if (!versionId) {
      throw new Error("No executable version found for target skill");
    }

    const inputData = TriggerService.mapPayloadToInput(
      payload,
      (trigger.inputMapping as Record<string, unknown>) ?? {}
    );

    // Update stats asynchronously
    await prisma.webhookTrigger.update({
      where: { id: trigger.id },
      data: {
        triggerCount: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    });

    logger.info(
      { triggerId: trigger.id, skillId: trigger.skillId, token },
      "Webhook triggered agent execution"
    );

    // Launch execution
    const execution = await this.executionService.startExecution({
      userId: trigger.userId,
      skillVersionId: versionId,
      inputData,
      organizationId: trigger.organizationId ?? undefined,
    });

    return {
      executionId: execution.id,
      status: execution.status,
      triggeredAt: new Date().toISOString(),
    };
  }

  // --- Cron Schedules ---

  async createCronSchedule(input: CreateCronScheduleInput) {
    return prisma.cronSchedule.create({
      data: {
        userId: input.userId,
        skillId: input.skillId,
        name: input.name,
        cronExpression: input.cronExpression,
        payloadTemplate: (input.payloadTemplate ?? {}) as Prisma.InputJsonValue,
        organizationId: input.organizationId || null,
      },
      include: {
        skill: {
          select: { id: true, name: true, publishedVersionId: true, currentDraftId: true },
        },
      },
    });
  }

  async listCronSchedules(userId: string, organizationId?: string) {
    return prisma.cronSchedule.findMany({
      where: organizationId
        ? { organizationId }
        : { userId, organizationId: null },
      include: {
        skill: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteCronSchedule(id: string, userId: string) {
    return prisma.cronSchedule.deleteMany({
      where: { id, userId },
    });
  }

  async executeCron(id: string) {
    const schedule = await prisma.cronSchedule.findUnique({
      where: { id },
      include: {
        skill: {
          include: {
            versions: {
              where: { status: "PUBLISHED" },
              orderBy: { versionNumber: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!schedule || !schedule.isActive) {
      throw new Error("Cron schedule not found or deactivated");
    }

    const versionId =
      schedule.skill.publishedVersionId ||
      schedule.skill.versions[0]?.id ||
      schedule.skill.currentDraftId;

    if (!versionId) {
      throw new Error("No executable version found for target skill");
    }

    const inputData = (schedule.payloadTemplate as Record<string, unknown>) ?? {
      scheduledTriggerTime: new Date().toISOString(),
      cronExpression: schedule.cronExpression,
    };

    await prisma.cronSchedule.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: new Date(),
      },
    });

    const execution = await this.executionService.startExecution({
      userId: schedule.userId,
      skillVersionId: versionId,
      inputData,
      organizationId: schedule.organizationId ?? undefined,
    });

    return {
      executionId: execution.id,
      status: execution.status,
      executedAt: new Date().toISOString(),
    };
  }
}
