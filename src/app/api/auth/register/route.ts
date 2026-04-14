/**
 * API route handlers for /api/auth/register requests and responses.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Registers a new user account after validating email, username, and password constraints.
 * @param req Incoming request containing `email`, `username`, and `password`.
 */
export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Email, username, and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      return NextResponse.json(
        { error: "Username must be between 3 and 20 characters" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const [existingByUsername, existingByEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username: normalizedUsername } }),
      prisma.user.findFirst({ where: { email: normalizedEmail } }),
    ]);

    if (existingByUsername) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 409 }
      );
    }

    if (existingByEmail) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12); // typical bcrypt hashing

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
      },
    });

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
