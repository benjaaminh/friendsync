/**
 * API route handlers for fetching and updating a single group's metadata.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
import { prisma } from "@/lib/prisma";

/**
 * Returns a group's metadata, members, and caller role when the caller is a member.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, image: true } } },
      },
      _count: { select: { members: true, todos: true } },
    },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  return NextResponse.json({ ...group, currentUserRole: access.membership.role });
}

/**
 * Updates group name/description. Only admins are allowed to modify group metadata.
 * @param request Incoming request with optional `name` and `description` fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId, { requireAdmin: true });
  if (!access.ok) return access.response;

  const body = await request.json();
  const { name, description } = body;

  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
  });

  return NextResponse.json(group);
}

/**
 * Deletes a group. Only admins can perform this operation.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId, { requireAdmin: true });
  if (!access.ok) return access.response;

  await prisma.group.delete({ where: { id: groupId } });

  return NextResponse.json({ success: true });
}
