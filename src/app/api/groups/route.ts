/**
 * API route handlers for /api/groups requests and responses.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns all groups the authenticated user belongs to, including members and aggregate counts.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, name: true, image: true } } },
      },
      _count: { select: { members: true, todos: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(groups);
}

/**
 * Creates a new group and automatically adds the creator as an ADMIN member.
 * @param request Incoming request containing `name` and optional `description`.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdById: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "ADMIN",
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, name: true, image: true } } },
      },
      _count: { select: { members: true, todos: true } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
