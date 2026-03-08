import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFreeSlots } from "@/lib/free-slots";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const minDuration = parseInt(searchParams.get("minDuration") || "30", 10);

  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params are required" }, { status: 400 });
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });

  const userIds = members.map((m) => m.userId);

  const busySlots = await prisma.busySlot.findMany({
    where: {
      userId: { in: userIds },
      start: { gte: new Date(from) },
      end: { lte: new Date(to) },
    },
  });

  const slots = computeFreeSlots(
    busySlots.map((s) => ({ start: s.start, end: s.end })),
    new Date(from),
    new Date(to),
    minDuration
  );

  // Also return per-user busy slots for visualization
  const busyByUser = busySlots.map((s) => ({
    userId: s.userId,
    start: s.start.toISOString(),
    end: s.end.toISOString(),
  }));

  return NextResponse.json({
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      durationMinutes: s.durationMinutes,
    })),
    busySlots: busyByUser,
  });
}
