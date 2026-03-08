import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const invite = await prisma.inviteLink.findUnique({
    where: { code },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!invite || !invite.active) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.expiresAt && new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
  }

  if (invite.maxUses && invite.uses >= invite.maxUses) {
    return NextResponse.json({ error: "Invite link has reached maximum uses" }, { status: 410 });
  }

  return NextResponse.json({
    groupName: invite.group.name,
    groupDescription: invite.group.description,
    memberCount: invite.group._count.members,
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;

  const invite = await prisma.inviteLink.findUnique({
    where: { code },
    include: { group: { select: { id: true, name: true } } },
  });

  if (!invite || !invite.active) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.expiresAt && new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
  }

  if (invite.maxUses && invite.uses >= invite.maxUses) {
    return NextResponse.json({ error: "Invite link has reached maximum uses" }, { status: 410 });
  }

  // Check if already a member
  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: invite.groupId } },
  });

  if (existing) {
    return NextResponse.json({
      groupId: invite.groupId,
      groupName: invite.group.name,
      alreadyMember: true,
    });
  }

  // Join the group
  await prisma.$transaction([
    prisma.groupMember.create({
      data: {
        userId: session.user.id,
        groupId: invite.groupId,
        role: "MEMBER",
      },
    }),
    prisma.inviteLink.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({
    groupId: invite.groupId,
    groupName: invite.group.name,
    alreadyMember: false,
  });
}
