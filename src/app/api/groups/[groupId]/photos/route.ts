/**
 * API route for listing and creating event photos.
 * GET  /api/groups/:groupId/photos?todoId=...
 * POST /api/groups/:groupId/photos
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
import { prisma } from "@/lib/prisma";

const MAX_PHOTOS_PER_EVENT = 10;
const MAX_PHOTOS_PER_USER_PER_EVENT = 2;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const todoId = request.nextUrl.searchParams.get("todoId");

  const where: Record<string, unknown> = {
    todo: { groupId },
  };
  if (todoId) where.todoId = todoId;

  const photos = await prisma.eventPhoto.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, username: true, image: true } },
      todo: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ photos });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const body = await request.json();
  const { todoId, cloudinaryId, url, thumbnailUrl, width, height, caption } = body;

  if (!todoId || !cloudinaryId || !url || !thumbnailUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the todo belongs to this group and is completed
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, groupId },
  });

  if (!todo) {
    return NextResponse.json({ error: "Event not found in this group" }, { status: 404 });
  }

  if (todo.status !== "COMPLETED") {
    return NextResponse.json({ error: "Can only add photos to completed events" }, { status: 400 });
  }

  // Quota checks
  const totalPhotos = await prisma.eventPhoto.count({ where: { todoId } });
  if (totalPhotos >= MAX_PHOTOS_PER_EVENT) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS_PER_EVENT} photos per event` }, { status: 400 });
  }

  const userPhotos = await prisma.eventPhoto.count({
    where: { todoId, uploadedById: access.userId },
  });
  if (userPhotos >= MAX_PHOTOS_PER_USER_PER_EVENT) {
    return NextResponse.json({ error: `You can upload up to ${MAX_PHOTOS_PER_USER_PER_EVENT} photos per event` }, { status: 400 });
  }

  const photo = await prisma.eventPhoto.create({
    data: {
      todoId,
      uploadedById: access.userId,
      cloudinaryId,
      url,
      thumbnailUrl,
      width: width ?? null,
      height: height ?? null,
      caption: caption?.trim() || null,
    },
    include: {
      uploadedBy: { select: { id: true, username: true, image: true } },
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
