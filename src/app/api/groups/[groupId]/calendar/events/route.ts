/**
 * API route handler that returns scheduled calendar events for a group.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
import { prisma } from "@/lib/prisma";

// get all events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  // length of calendar (a week)
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params are required" }, { status: 400 });
  }

  // find the events
  const scheduledEvents = await prisma.todo.findMany({
    where: {
      groupId,
      status: "SCHEDULED",
      scheduledAt: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    select: {
      id: true,
      title: true,
      duration: true,
      scheduledAt: true,
      creator: { select: { username: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({
    events: scheduledEvents
      .filter((e) => e.scheduledAt !== null)
      .map((event) => ({
        id: event.id,
        title: event.title,
        start: event.scheduledAt!.toISOString(),
        end: new Date(event.scheduledAt!.getTime() + event.duration * 60 * 1000).toISOString(), // both as iso strings for easier API use
        duration: event.duration,
        creatorName: event.creator.username,
      })),
  });
}
