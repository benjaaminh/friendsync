/**
 * API route handlers for listing and updating membership within a group. route: /groups/:groupId/members
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Lists all members of a group for authenticated members.
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
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, username: true, name: true, image: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

/**
 * Removes a member from the group.
 * Members can remove themselves; admins can remove any member.
 * @param request Incoming request with `userId` of the member to remove.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const body = await request.json();
  const { userId: targetUserId } = body;

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Members can only remove themselves; admins can remove anyone
  if (membership.role !== "ADMIN" && targetUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });

  return NextResponse.json({ success: true });
}
