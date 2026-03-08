import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncUserBusySlots, createCalendarEvent } from "@/lib/google-calendar";

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

  // Get all members
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  // Re-sync busy slots to ensure freshness
  const syncErrors: string[] = [];
  await Promise.allSettled(
    members.map(async (member) => {
      try {
        await syncUserBusySlots(member.userId, start, end);
      } catch (err) {
        syncErrors.push(
          `Sync failed for ${member.user.name}: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    })
  );

  // Verify slot is still free
  const conflicting = await prisma.busySlot.findFirst({
    where: {
      userId: { in: members.map((m) => m.userId) },
      start: { lt: new Date(end) },
      end: { gt: new Date(start) },
    },
  });

  if (conflicting) {
    return NextResponse.json(
      { error: "Time slot is no longer available for all members" },
      { status: 409 }
    );
  }

  // Create calendar event on organizer's calendar with all attendees
  const attendeeEmails = members
    .map((m) => m.user.email)
    .filter((e): e is string => e !== null);

  let calendarEventId: string | undefined;
  try {
    calendarEventId = await createCalendarEvent(session.user.id, {
      summary: todo.title,
      description: todo.description || undefined,
      start,
      end,
      attendeeEmails,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to create calendar event: ${err instanceof Error ? err.message : "Unknown"}` },
      { status: 500 }
    );
  }

  // Update todo status
  const updatedTodo = await prisma.todo.update({
    where: { id: todoId },
    data: {
      status: "SCHEDULED",
      scheduledAt: new Date(start),
      calendarEventId,
    },
    include: {
      creator: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({
    todo: updatedTodo,
    calendarEventId,
    syncErrors,
  });
}
