import { NextResponse } from "next/server";
import { unauthorized, forbidden, handleApiError } from "@/lib/api/handlers";
import { NotFoundError } from "@/services/RBACService";
import { apiServices } from "@/lib/api/services";
import { resolveRequestAuth, hasScope, isOutsideKeyOrganization } from "@/lib/api/middleware/apiKeyAuth";

const { executionService, executionRepo, rbacService } = apiServices();

/** GET /api/executions/[id] — session, or API key (scope `executions:read`) within its org. */
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
    
    // 1. Check if user is the direct owner
    const userExecution = await executionService.getExecutionForUser(id, userId);
    if (userExecution && !isOutsideKeyOrganization(ctx, userExecution.organizationId)) {
      return NextResponse.json({ success: true, data: userExecution });
    }

    // 2. If not direct owner, check if it's an organization execution
    const execution = await executionRepo.findById(id);
    if (!execution || isOutsideKeyOrganization(ctx, execution.organizationId)) {
      throw new NotFoundError("Execution not found");
    }

    if (execution.organizationId) {
      const hasAccess = await rbacService.canAccessResource(
        userId,
        execution.organizationId,
        "execution",
        id,
        "read"
      );
      if (hasAccess) {
        return NextResponse.json({ success: true, data: execution });
      }
      throw new NotFoundError("Execution not found");
    }

    throw new NotFoundError("Execution not found");
  } catch (error) {
    return handleApiError(error);
  }
}
