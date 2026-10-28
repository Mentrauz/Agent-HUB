import { timingSafeEqual } from "node:crypto";

/**
 * True when the request carries `Authorization: Bearer <expected>`.
 * Compared in constant time; always false when no secret is configured, so
 * endpoints guarded by this fail closed.
 */
export function bearerTokenMatches(request: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;

  const given = Buffer.from(header.slice(7).trim());
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
