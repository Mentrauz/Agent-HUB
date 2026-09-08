import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET must be set in production").default("dev-only-secret-not-for-production"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  /**
   * Bearer token external MCP clients (Cursor, Claude Desktop) present when
   * connecting to /api/mcp/sse. When unset, only Clerk-authenticated sessions
   * may connect.
   */
  MCP_ACCESS_TOKEN: z.string().optional(),
  COMPOSIO_API_KEY: z.string().optional(),
  ARCADE_API_KEY: z.string().optional(),
  /**
   * Optional upstream A2A registry base URL. When set, the discover endpoint
   * and auction participants pull manifests from this registry before falling
   * back to the built-in presets.
   */
  A2A_REGISTRY_URL: z.string().url().optional().or(z.literal("")),
  A2A_REGISTRY_TOKEN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const isServer = typeof window === "undefined";

  // Normalize empty strings to undefined so Zod defaults and optional() behave correctly
  const cleanedEnv: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== "" && value !== undefined) {
      cleanedEnv[key] = value;
    }
  }

  // Auto-detect Vercel deployment URL if NEXT_PUBLIC_APP_URL is not explicitly set
  if (!cleanedEnv.NEXT_PUBLIC_APP_URL && process.env.VERCEL_URL) {
    cleanedEnv.NEXT_PUBLIC_APP_URL = `https://${process.env.VERCEL_URL}`;
  }

  const result = envSchema.safeParse(cleanedEnv);
  if (!result.success) {
    const formatted = result.error.format();

    // Check if we are in Next.js build phase
    const isBuildPhase =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "build";

    // In production runtime on the server (not during build phase), log fatal error
    if (process.env.NODE_ENV === "production" && isServer && !isBuildPhase) {
      console.error("[FATAL] Invalid environment variables in production runtime:");
      console.error(JSON.stringify(formatted, null, 2));
      if (typeof process !== "undefined" && typeof process.exit === "function") {
        process.exit(1);
      }
    }

    // In development, build phase, or when variables are missing during build, log warning
    if (isServer) {
      console.warn("[Config Warning] Some environment variables are missing or invalid:");
      console.warn(JSON.stringify(formatted, null, 2));
    }

    // Re-parse with safe defaults
    const fallback = envSchema.partial().parse({});
    return envSchema.parse({
      DATABASE_URL:
        (cleanedEnv.DATABASE_URL as string) ||
        (fallback.DATABASE_URL ??
          "postgresql://postgres:postgres@localhost:5432/agent_studio?schema=public"),
      NEXTAUTH_SECRET: fallback.NEXTAUTH_SECRET ?? "dev-only-secret-not-for-production",
      NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) || "development",
      LOG_LEVEL: ((cleanedEnv.LOG_LEVEL as string) as Env["LOG_LEVEL"]) || "info",
      NEXT_PUBLIC_APP_URL:
        (cleanedEnv.NEXT_PUBLIC_APP_URL as string) ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        (cleanedEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as string) ||
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    });
  }
  return result.data;
}

export const env = parseEnv();
