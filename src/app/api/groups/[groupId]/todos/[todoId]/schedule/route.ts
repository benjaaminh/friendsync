/**
 * API route handler for assigning a specific time slot to a group todo. route: /groups/:groupId/todos/:todoId/schedule
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
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
  const { groupId, todoId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  // get the todo
  const todo = await prisma.todo.findUnique({ where: { id: todoId, groupId } });
  if (!todo) return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  if (todo.status !== "PENDING") {
    return NextResponse.json({ error: "Todo is not in PENDING status" }, { status: 400 });
  }

  //get start and end from body
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

  // get already scheduled todos. only fetch those that may have overlap
  const scheduledTodos = await prisma.todo.findMany({
    where: {
      groupId,
      status: "SCHEDULED",
      scheduledAt: {
        lt: endAt, // fetch only those that start before this one ends (scheduledAt < endAt)
      },
    },
    select: { duration: true, scheduledAt: true },
  });

  // check if there is overlap between already scheduled todos and new
  const hasOverlap = scheduledTodos.some((scheduledTodo) => {
    if (!scheduledTodo.scheduledAt) return false;

    const scheduledStart = scheduledTodo.scheduledAt.getTime();
    const scheduledEnd = scheduledStart + scheduledTodo.duration * 60 * 1000;

    // if an existing todo ends after the one to be created starts, there is overlap.
    // for example: we want to start at 11, but an existing one ends at 13, so there must be overlap
    // we have already checked that the scheduledTodos should start before this one ends.
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
      creator: { select: { id: true, username: true, image: true } },
    },
  });

  return NextResponse.json({
    todo: updatedTodo,
    calendarEventId: null,
  });
}
