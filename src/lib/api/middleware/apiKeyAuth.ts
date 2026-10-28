/**
 * Request authentication: Clerk session or organization API key.
 *
 * An API key acts as the user who created it, but only inside the key's
 * organization and only for the scopes granted to it. The creator's normal
 * org RBAC still applies on top of the scopes, and a key stops working as soon
 * as its creator leaves the organization.
 *
 * Keys are read from `X-API-Key` or `Authorization: Bearer as_…` (see
 * `apiKeyHeader.ts`). A request that presents a key is never silently
 * downgraded to the session: an invalid key is a 401.
 */

import { auth } from "@clerk/nextjs/server";
import { extractApiKey } from "@/lib/api/apiKeyHeader";
import { logger } from "@/lib/logger";

export interface SessionAuth {
  via: "session";
  userId: string;
}

export interface ApiKeyAuth {
  via: "api_key";
  userId: string;
  organizationId: string;
  scopes: string[];
  keyId: string;
}

export type RequestAuth = SessionAuth | ApiKeyAuth;

/** Resolves the caller, or returns null when the request is unauthenticated. */
export async function resolveRequestAuth(request: Request): Promise<RequestAuth | null> {
  const apiKey = extractApiKey(request.headers);

  if (apiKey) {
    try {
      // Loaded lazily so session-only requests never touch the key tables.
      const [{ ApiKeyService }, { prisma }] = await Promise.all([
        import("@/services/ApiKeyService"),
        import("@/lib/prisma"),
      ]);

      const validation = await new ApiKeyService().validateKey(apiKey);
      if (!validation.valid || !validation.userId || !validation.organizationId) return null;

      const stillMember = await prisma.organizationMember.findFirst({
        where: { organizationId: validation.organizationId, userId: validation.userId },
        select: { id: true },
      });
      if (!stillMember) {
        logger.warn({ keyId: validation.keyId }, "API key rejected: creator is no longer an org member");
        return null;
      }

      return {
        via: "api_key",
        userId: validation.userId,
        organizationId: validation.organizationId,
        scopes: validation.scopes ?? [],
        keyId: validation.keyId!,
      };
    } catch (error) {
      logger.error({ err: error }, "API key validation failed");
      return null;
    }
  }

  const { userId } = await auth();
  return userId ? { via: "session", userId } : null;
}

/** Sessions carry every scope; API keys need `*` or the exact scope. */
export function hasScope(ctx: RequestAuth, scope: string): boolean {
  if (ctx.via === "session") return true;
  return ctx.scopes.includes("*") || ctx.scopes.includes(scope);
}

/**
 * Organization context for a request. API keys are pinned to their own org:
 * asking for a different org is refused (`mismatch`), and omitting it uses the
 * key's org, so a key can never reach its creator's personal resources.
 */
export function resolveOrganizationId(
  ctx: RequestAuth,
  requested: string | undefined
): { organizationId: string | undefined; mismatch: boolean } {
  if (ctx.via === "api_key") {
    return {
      organizationId: ctx.organizationId,
      mismatch: Boolean(requested && requested !== ctx.organizationId),
    };
  }
  return { organizationId: requested, mismatch: false };
}

/** True when an API key is used on a resource outside its organization. */
export function isOutsideKeyOrganization(
  ctx: RequestAuth,
  resourceOrganizationId: string | null | undefined
): boolean {
  return ctx.via === "api_key" && resourceOrganizationId !== ctx.organizationId;
}
