import { NextResponse } from "next/server";
import { unauthorized, forbidden, notFound, handleApiError } from "@/lib/api/handlers";
import { apiServices } from "@/lib/api/services";
import { resolveRequestAuth, hasScope, isOutsideKeyOrganization } from "@/lib/api/middleware/apiKeyAuth";

const { executionService, executionRepo } = apiServices();

/** POST /api/executions/[id]/cancel — session, or API key (scope `executions:cancel`) within its org. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth first — Clerk errors are never business-logic errors.
  const ctx = await resolveRequestAuth(request);
  if (!ctx) return unauthorized();
  if (!hasScope(ctx, "executions:cancel")) return forbidden();
  const { userId } = ctx;

  try {
    const { id } = await params;
    if (ctx.via === "api_key") {
      const execution = await executionRepo.findById(id);
      if (!execution || isOutsideKeyOrganization(ctx, execution.organizationId)) {
        return notFound("Execution not found");
      }
    }
    const execution = await executionService.cancelExecutionForUser(id, userId);
    return NextResponse.json({ success: true, data: execution });
  } catch (error) {
    return handleApiError(error);
  }
}
