import { NextRequest, NextResponse } from "next/server";
import { TriggerService } from "@/services/TriggerService";
import { logger } from "@/lib/logger";
import { env } from "@/lib/config/env";
import { bearerTokenMatches } from "@/lib/api/bearer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing cron schedule id" }, { status: 400 });
    }

    // Called by external schedulers (e.g. Vercel Cron), so this route is public
    // at the proxy. Fail closed: without CRON_SECRET no caller is accepted.
    if (!env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Cron triggers are disabled: CRON_SECRET is not configured" },
        { status: 503 }
      );
    }
    if (!bearerTokenMatches(req, env.CRON_SECRET)) {
      return NextResponse.json({ success: false, error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const triggerService = new TriggerService();
    const result = await triggerService.executeCron(id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, "Error executing cron trigger");
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
