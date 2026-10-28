import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, validateKeyMock, findMemberMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  validateKeyMock: vi.fn(),
  findMemberMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/services/ApiKeyService", () => ({
  ApiKeyService: vi.fn(function () {
    return { validateKey: validateKeyMock };
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { organizationMember: { findFirst: findMemberMock } },
}));

import { extractApiKey } from "@/lib/api/apiKeyHeader";
import { bearerTokenMatches } from "@/lib/api/bearer";
import {
  resolveRequestAuth,
  hasScope,
  resolveOrganizationId,
  isOutsideKeyOrganization,
  type RequestAuth,
} from "@/lib/api/middleware/apiKeyAuth";

const keyCtx: RequestAuth = {
  via: "api_key",
  userId: "creator",
  organizationId: "org-1",
  scopes: ["skills:read"],
  keyId: "key-1",
};
const sessionCtx: RequestAuth = { via: "session", userId: "user-1" };

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/skills", { headers });
}

describe("extractApiKey", () => {
  it("reads X-API-Key", () => {
    expect(extractApiKey(new Headers({ "x-api-key": "as_1_abc" }))).toBe("as_1_abc");
  });

  it("reads Bearer tokens only when they carry the as_ prefix", () => {
    expect(extractApiKey(new Headers({ authorization: "Bearer as_1_abc" }))).toBe("as_1_abc");
    expect(extractApiKey(new Headers({ authorization: "Bearer some-mcp-token" }))).toBeNull();
  });

  it("ignores the query string", () => {
    const r = new Request("http://localhost/api/skills?api_key=as_1_abc");
    expect(extractApiKey(r.headers)).toBeNull();
  });
});

describe("bearerTokenMatches", () => {
  const r = (h?: string) => new Request("http://x", { headers: h ? { authorization: h } : {} });

  it("fails closed when no secret is configured", () => {
    expect(bearerTokenMatches(r("Bearer anything"), undefined)).toBe(false);
    expect(bearerTokenMatches(r("Bearer "), "")).toBe(false);
  });

  it("matches only the exact token", () => {
    expect(bearerTokenMatches(r("Bearer s3cret"), "s3cret")).toBe(true);
    expect(bearerTokenMatches(r("Bearer s3cret2"), "s3cret")).toBe(false);
    expect(bearerTokenMatches(r(), "s3cret")).toBe(false);
  });
});

describe("resolveRequestAuth", () => {
  beforeEach(() => {
    authMock.mockReset();
    validateKeyMock.mockReset();
    findMemberMock.mockReset();
  });

  it("uses the Clerk session when no key is presented", async () => {
    authMock.mockResolvedValue({ userId: "user-1" });
    await expect(resolveRequestAuth(req())).resolves.toEqual(sessionCtx);
  });

  it("returns null without a session or key", async () => {
    authMock.mockResolvedValue({ userId: null });
    await expect(resolveRequestAuth(req())).resolves.toBeNull();
  });

  it("acts as the key's creator inside the key's organization", async () => {
    validateKeyMock.mockResolvedValue({
      valid: true,
      userId: "creator",
      organizationId: "org-1",
      scopes: ["skills:read"],
      keyId: "key-1",
    });
    findMemberMock.mockResolvedValue({ id: "m-1" });

    await expect(resolveRequestAuth(req({ "x-api-key": "as_1_abc" }))).resolves.toEqual(keyCtx);
    expect(authMock).not.toHaveBeenCalled();
  });

  it("does not fall back to the session when the key is invalid", async () => {
    validateKeyMock.mockResolvedValue({ valid: false });
    authMock.mockResolvedValue({ userId: "user-1" });

    await expect(resolveRequestAuth(req({ "x-api-key": "as_1_bad" }))).resolves.toBeNull();
    expect(authMock).not.toHaveBeenCalled();
  });

  it("rejects keys whose creator has left the organization", async () => {
    validateKeyMock.mockResolvedValue({
      valid: true,
      userId: "creator",
      organizationId: "org-1",
      scopes: ["*"],
      keyId: "key-1",
    });
    findMemberMock.mockResolvedValue(null);

    await expect(resolveRequestAuth(req({ "x-api-key": "as_1_abc" }))).resolves.toBeNull();
  });
});

describe("scope and organization helpers", () => {
  it("grants every scope to sessions and only granted scopes to keys", () => {
    expect(hasScope(sessionCtx, "executions:create")).toBe(true);
    expect(hasScope(keyCtx, "skills:read")).toBe(true);
    expect(hasScope(keyCtx, "skills:create")).toBe(false);
    expect(hasScope({ ...keyCtx, scopes: ["*"] }, "skills:create")).toBe(true);
  });

  it("pins API keys to their own organization", () => {
    expect(resolveOrganizationId(keyCtx, undefined)).toEqual({ organizationId: "org-1", mismatch: false });
    expect(resolveOrganizationId(keyCtx, "org-1")).toEqual({ organizationId: "org-1", mismatch: false });
    expect(resolveOrganizationId(keyCtx, "org-2")).toEqual({ organizationId: "org-1", mismatch: true });
    expect(resolveOrganizationId(sessionCtx, "org-2")).toEqual({ organizationId: "org-2", mismatch: false });
  });

  it("flags resources outside the key's organization, including personal ones", () => {
    expect(isOutsideKeyOrganization(keyCtx, "org-1")).toBe(false);
    expect(isOutsideKeyOrganization(keyCtx, "org-2")).toBe(true);
    expect(isOutsideKeyOrganization(keyCtx, null)).toBe(true);
    expect(isOutsideKeyOrganization(sessionCtx, null)).toBe(false);
  });
});
