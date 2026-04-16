/**
 * API route handlers for Telegram group linking.
 */
import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { requireGroupAccess } from "@/lib/group-access";
import { prisma } from "@/lib/prisma";

const generateTelegramCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8); //random code
const LINK_CODE_TTL_HOURS = 24;

// generate code for group
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId, { requireAdmin: true });
  if (!access.ok) return access.response;

  const linkCode = generateTelegramCode();
  const telegramLinkCodeExpiresAt = new Date(Date.now() + LINK_CODE_TTL_HOURS * 60 * 60 * 1000);

  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      telegramLinkCode: linkCode,
      telegramLinkCodeExpiresAt,
    },
  });

  return NextResponse.json({
    groupId: group.id,
    linkCode,
    telegramLinkCodeExpiresAt,
    telegramChatId: group.telegramChatId,
    telegramChatTitle: group.telegramChatTitle,
  });
}

//delete bot integration with group
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId, { requireAdmin: true });
  if (!access.ok) return access.response;

  await prisma.group.update({
    where: { id: groupId },
    data: {
      telegramChatId: null,
      telegramChatTitle: null,
      telegramLinkCode: null,
      telegramLinkCodeExpiresAt: null,
      telegramLinkedAt: null,
    },
  });

  return NextResponse.json({ success: true });
}