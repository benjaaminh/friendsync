import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncUserBusySlots } from "@/lib/google-calendar";
import { addDays } from "date-fns";

export async function POST(
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

  let body: { timeMin?: string; timeMax?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Use defaults
  }

  const timeMin = body.timeMin || new Date().toISOString();
  const timeMax = body.timeMax || addDays(new Date(), 14).toISOString();

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true, user: { select: { name: true } } },
  });

  let synced = 0;
  const errors: string[] = [];

  await Promise.allSettled(
    members.map(async (member) => {
      try {
        await syncUserBusySlots(member.userId, timeMin, timeMax);
        synced++;
      } catch (err) {
        errors.push(
          `Failed to sync ${member.user.name || "unknown"}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    })
  );

  return NextResponse.json({ synced, errors, total: members.length });
}
