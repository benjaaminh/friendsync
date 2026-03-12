import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RequireGroupAccessOptions = {
  requireAdmin?: boolean;
};

type GroupAccessAllowed = {
  ok: true;
  userId: string;
  membership: NonNullable<
    Awaited<ReturnType<typeof prisma.groupMember.findUnique>>
  >;
};

type GroupAccessDenied = {
  ok: false;
  response: NextResponse;
};

export type GroupAccessResult = GroupAccessAllowed | GroupAccessDenied;

/**
 * Ensures the caller is authenticated and belongs to the target group.
 * Optionally enforces ADMIN role.
 */
export async function requireGroupAccess(
  groupId: string,
  options: RequireGroupAccessOptions = {}
): Promise<GroupAccessResult> {
  const session = await auth();

  //logged in check
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // need to check membership with userId_groupId because user might be member of other groups
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not a member" }, { status: 403 }),
    };
  }

  //admin check
  if (options.requireAdmin && membership.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    membership,
  };
}
