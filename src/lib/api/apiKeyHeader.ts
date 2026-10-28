/**
 * Dependency-free API key extraction, shared by the edge proxy and route handlers.
 *
 * Keys are accepted only from headers — never from the query string, where they
 * would leak into access logs and browser history.
 */

/** Prefix of every key minted by `ApiKeyService` (`as_<version>_<secret>`). */
export const API_KEY_PREFIX = "as_";

export function extractApiKey(headers: Headers): string | null {
  const xApiKey = headers.get("x-api-key")?.trim();
  if (xApiKey) return xApiKey;

  // Only treat a Bearer token as an API key when it carries our prefix, so other
  // bearer tokens (e.g. MCP_ACCESS_TOKEN, CRON_SECRET) are left alone.
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith(API_KEY_PREFIX)) return token;
  }

  return null;
}
