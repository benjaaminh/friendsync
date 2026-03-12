/**
 * API route handlers for updating or deleting a specific todo in a group.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
import { prisma } from "@/lib/prisma";

/**
 * Updates mutable fields for a specific todo in a group.
 * @param request Incoming request with optional `title`, `description`, `duration`, and `status`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; todoId: string }> }
) {
  const { groupId, todoId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const body = await request.json();
  const { title, description, duration, status } = body;

  const todo = await prisma.todo.update({
    where: { id: todoId, groupId },
    data: {
      ...(title && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(duration && { duration }),
      ...(status && { status }),
    },
    include: {
      creator: { select: { id: true, username: true, image: true } },
    },
  });

  return NextResponse.json(todo);
}

/**
 * Deletes a specific todo from a group.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string; todoId: string }> }
) {
  const { groupId, todoId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  await prisma.todo.delete({ where: { id: todoId, groupId } });

  return NextResponse.json({ success: true });
}
