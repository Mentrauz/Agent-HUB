import { NextResponse } from "next/server";
import { unauthorized, forbidden, serverError, notFound } from "@/lib/api/handlers";
import { apiServices } from "@/lib/api/services";
import { resolveRequestAuth, hasScope, isOutsideKeyOrganization } from "@/lib/api/middleware/apiKeyAuth";

const { historyService, executionRepo } = apiServices();

/** Full execution detail: trace data, structured logs, timeline, and approval events. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveRequestAuth(request);
  if (!ctx) return unauthorized();
  if (!hasScope(ctx, "executions:read")) return forbidden();
  const { userId } = ctx;

  try {
    const { id } = await params;
    if (ctx.via === "api_key") {
      const execution = await executionRepo.findById(id);
      if (!execution || isOutsideKeyOrganization(ctx, execution.organizationId)) {
        return notFound("Execution not found");
      }
    }
    const detail = await historyService.getDetail(id, userId);
    if (!detail) return notFound("Execution not found");
    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return serverError(error);
  }
}
