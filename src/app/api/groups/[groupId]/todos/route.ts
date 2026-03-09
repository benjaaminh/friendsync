/**
 * API route handlers for listing and creating todos in a group.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Lists todos for a group, optionally filtered by status.
 */
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
  const status = searchParams.get("status");

  const todos = await prisma.todo.findMany({
    where: {
      groupId,
      ...(status && { status: status as "PENDING" | "SCHEDULED" | "COMPLETED" | "CANCELLED" }),
    },
    include: {
      creator: { select: { id: true, username: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(todos);
}

/**
 * Creates a new todo in the target group.
 * @param request Incoming request containing `title` and optional `description`/`duration`.
 */
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

  const body = await request.json();
  const { title, description, duration } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const todo = await prisma.todo.create({
    data: {
      groupId,
      createdById: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      duration: duration || 60,
    },
    include: {
      creator: { select: { id: true, username: true, image: true } },
    },
  });

  return NextResponse.json(todo, { status: 201 });
}
