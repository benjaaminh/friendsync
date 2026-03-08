/**
 * API route handler for assigning a specific time slot to a group todo. route: /groups/:groupId/todos/:todoId/schedule
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Schedules a pending todo into a concrete start/end slot.
 * Rejects overlaps with already scheduled todos in the same group.
 * @param request Incoming request containing `start` and `end` timestamps.
 */
export async function POST(
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

  const todo = await prisma.todo.findUnique({ where: { id: todoId, groupId } });
  if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  if (todo.status !== "PENDING") {
    return NextResponse.json({ error: "Todo is not in PENDING status" }, { status: 400 });
  }

  const body = await request.json();
  const { start, end } = body;

  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  }

  const startAt = new Date(start);
  const endAt = new Date(end);

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt) {
    return NextResponse.json({ error: "Invalid start/end range" }, { status: 400 });
  }

  // Verify slot doesn't overlap with already scheduled todos in this group
  const scheduledTodos = await prisma.todo.findMany({
    where: {
      groupId,
      status: "SCHEDULED",
      scheduledAt: {
        lt: endAt,
      },
    },
    select: { duration: true, scheduledAt: true },
  });

  const hasOverlap = scheduledTodos.some((scheduledTodo) => {
    if (!scheduledTodo.scheduledAt) return false;

    const scheduledStart = scheduledTodo.scheduledAt.getTime();
    const scheduledEnd = scheduledStart + scheduledTodo.duration * 60 * 1000;

    return scheduledEnd > startAt.getTime();
  });

  if (hasOverlap) {
    return NextResponse.json(
      { error: "Time slot overlaps an existing scheduled event" },
      { status: 409 }
    );
  }

  // Update todo status in-app only
  const updatedTodo = await prisma.todo.update({
    where: { id: todoId },
    data: {
      status: "SCHEDULED",
      scheduledAt: startAt,
      calendarEventId: null,
    },
    include: {
      creator: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({
    todo: updatedTodo,
    calendarEventId: null,
  });
}
