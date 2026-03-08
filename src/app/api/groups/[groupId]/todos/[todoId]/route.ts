/**
 * API route handlers for updating or deleting a specific todo in a group.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Updates mutable fields for a specific todo in a group.
 * @param request Incoming request with optional `title`, `description`, `duration`, and `status`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; todoId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, todoId } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

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
      creator: { select: { id: true, name: true, image: true } },
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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, todoId } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  await prisma.todo.delete({ where: { id: todoId, groupId } });

  return NextResponse.json({ success: true });
}
