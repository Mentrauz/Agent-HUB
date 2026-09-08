import { NextRequest, NextResponse } from "next/server";
import { TriggerService } from "@/services/TriggerService";
import { logger } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing cron schedule id" }, { status: 400 });
    }

    // Cron endpoints can be triggered by external cron services or internal workers
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
