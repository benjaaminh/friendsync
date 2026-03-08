/**
 * API route handlers for creating and managing invite links for a group.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

/**
 * Returns active invite links for a group. Requires admin membership.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const invites = await prisma.inviteLink.findMany({
    where: { groupId, active: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}

/**
 * Creates an invite link for a group with optional expiry and max use constraints.
 * @param request Incoming request with optional `expiresInHours` and `maxUses`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: { expiresInHours?: number; maxUses?: number } = {};
  try {
    body = await request.json();
  } catch {
    // Use defaults
  }

  const code = nanoid(8);
  const expiresAt = body.expiresInHours
    ? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000)
    : null;

  const invite = await prisma.inviteLink.create({
    data: {
      groupId,
      code,
      expiresAt,
      maxUses: body.maxUses || null,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    ...invite,
    url: `${appUrl}/invite/${code}`,
  }, { status: 201 });
}
