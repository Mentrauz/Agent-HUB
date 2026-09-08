import { NextRequest, NextResponse } from "next/server";
import { TriggerService } from "@/services/TriggerService";
import { logger } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ success: false, error: "Missing webhook token" }, { status: 400 });
    }

    const rawBody = await req.text();
    let body: unknown = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = { raw: rawBody };
      }
    }

    // Extract headers into a clean dictionary
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Extract search params / query
    const query: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const triggerService = new TriggerService();
    const result = await triggerService.executeWebhook(
      token,
      { body, headers, query },
      rawBody
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, "Error executing webhook trigger");
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("Invalid webhook signature")
      ? 401
      : message.includes("not found")
      ? 404
      : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  // Support GET webhooks with query parameters
  return POST(req, props);
}
