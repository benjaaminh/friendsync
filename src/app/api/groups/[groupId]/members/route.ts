/**
 * API route handlers for listing and updating membership within a group. route: /groups/:groupId/members
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
import { prisma } from "@/lib/prisma";

/**
 * Lists all members of a group for authenticated members.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, username: true, image: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

/**
 * Removes a member from the group by id.
 * Members can remove themselves; admins can remove any member.
 * @param request Incoming request with `userId` of the member to remove.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const body = await request.json();
  const { userId: targetUserId } = body;

  // Members can only remove themselves; admins can remove anyone
  if (access.membership.role !== "ADMIN" && targetUserId !== access.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // need to use userId_groupId because user may be part of other groups.
  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });

  return NextResponse.json({ success: true });
}
