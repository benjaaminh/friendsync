/**
 * API route handler that returns scheduled calendar events for a group.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// get all events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  // if no user is signed in, we cant fetch events
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  // ensure signed in user is member of the group with events
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

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
