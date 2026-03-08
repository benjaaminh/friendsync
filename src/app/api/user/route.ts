/**
 * API route handlers for /api/user requests and responses.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns profile information for the authenticated user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, name: true, image: true, timezone: true },
  });

  return NextResponse.json(user);
}

/**
 * Updates mutable profile settings for the authenticated user.
 * Currently supports `timezone`.
 * @param request Incoming request containing profile update fields.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { timezone } = body;

  if (timezone && typeof timezone === "string") {
    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { ...(timezone && { timezone }) },
    select: { id: true, name: true, image: true, timezone: true },
  });

  return NextResponse.json(user);
}
