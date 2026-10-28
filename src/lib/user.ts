import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClerkClient } from "@clerk/nextjs/server";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerk = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null;

/**
 * Ensures a User record exists in the database for the given Clerk userId.
 * New users get the regular USER role, their Clerk email & name are kept in
 * sync, and they get a personal Enterprise organization where they are OWNER.
 *
 * The global ADMIN role is a super-admin bypass for every RBAC and ownership
 * check, so it is never granted or rewritten here — promote a user explicitly
 * in the database (`UPDATE users SET role = 'ADMIN' WHERE id = '<clerk id>'`).
 */
export async function ensureUserExists(
  userId: string,
  client: Prisma.TransactionClient | PrismaClient = prisma
): Promise<void> {
  if (!userId) return;

  let email = `${userId}@agent-studio.internal`;
  let name: string | null = null;

  if (clerk) {
    try {
      const clerkUser = await clerk.users.getUser(userId);
      if (clerkUser) {
        const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (primaryEmail) email = primaryEmail;
        const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
        if (fullName) name = fullName;
      }
    } catch {
      // Non-blocking in testing or offline environments
    }
  }

  await client.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      name,
      role: "USER",
    },
    update: {
      ...(email !== `${userId}@agent-studio.internal` && { email }),
      ...(name && { name }),
    },
  });

  // Ensure the user has an Enterprise Organization Workspace where they are OWNER
  try {
    const existingOrgMembership = await client.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!existingOrgMembership) {
      const displayName = name || email.split("@")[0] || "My";
      const orgName = `${displayName}'s Workspace`;
      const cleanSlug = `org-${userId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18)}`;

      await client.organization.create({
        data: {
          name: orgName,
          slug: cleanSlug,
          plan: "enterprise",
          billingEmail: email.includes("@") ? email : undefined,
          settings: {
            sso: true,
            auditExport: true,
            customRoles: true,
          },
          members: {
            create: {
              userId,
              role: "OWNER",
              permissions: [],
            },
          },
        },
      });
    }
  } catch {
    // Non-blocking if already exists or concurrent creation
  }
}
