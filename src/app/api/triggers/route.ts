import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TriggerService } from "@/services/TriggerService";
import { unauthorized, handleApiError } from "@/lib/api/handlers";
import { rateLimit } from "@/lib/api/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request);
  if (rl) return rl;

  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const organizationId =
      request.headers.get("X-Organization-Id") ||
      request.nextUrl.searchParams.get("organizationId") ||
      undefined;

    const triggerService = new TriggerService();
    const [webhooks, cronSchedules] = await Promise.all([
      triggerService.listWebhookTriggers(userId, organizationId),
      triggerService.listCronSchedules(userId, organizationId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        webhooks,
        cronSchedules,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request);
  if (rl) return rl;

  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const triggerService = new TriggerService();
    const type = body.type; // "webhook" | "cron"

    if (type === "webhook") {
      const webhook = await triggerService.createWebhookTrigger({
        userId,
        skillId: body.skillId,
        name: body.name || "Webhook Trigger",
        secret: body.secret,
        inputMapping: body.inputMapping,
        organizationId: body.organizationId,
      });
      return NextResponse.json({ success: true, data: webhook });
    } else if (type === "cron") {
      const schedule = await triggerService.createCronSchedule({
        userId,
        skillId: body.skillId,
        name: body.name || "Cron Schedule",
        cronExpression: body.cronExpression || "0 * * * *",
        payloadTemplate: body.payloadTemplate,
        organizationId: body.organizationId,
      });
      return NextResponse.json({ success: true, data: schedule });
    }

    return NextResponse.json(
      { success: false, error: "Invalid trigger type: specify 'webhook' or 'cron'" },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const rl = await rateLimit(request);
  if (rl) return rl;

  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "webhook" | "cron"

    if (!id || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required query params: id and type" },
        { status: 400 }
      );
    }

    const triggerService = new TriggerService();
    if (type === "webhook") {
      await triggerService.deleteWebhookTrigger(id, userId);
    } else if (type === "cron") {
      await triggerService.deleteCronSchedule(id, userId);
    }

    return NextResponse.json({ success: true, message: "Trigger deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
