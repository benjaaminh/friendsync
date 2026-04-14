import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPasswordResetToken,
  parsePasswordResetIdentifier,
} from "@/lib/password-reset";

function isPasswordValid(password: string) {
  return password.length >= 6;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const hashedToken = hashPasswordResetToken(token);

    const existingToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
      select: {
        identifier: true,
        expires: true,
      },
    });

    if (!existingToken) {
      return NextResponse.json({ valid: false });
    }

    const userId = parsePasswordResetIdentifier(existingToken.identifier);
    const isExpired = existingToken.expires < new Date();

    if (!userId || isExpired) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || !isPasswordValid(password)) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const hashedToken = hashPasswordResetToken(token);

    const existingToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
      select: {
        token: true,
        identifier: true,
        expires: true,
      },
    });

    if (!existingToken) {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    const userId = parsePasswordResetIdentifier(existingToken.identifier);
    const isExpired = existingToken.expires < new Date();

    if (!userId || isExpired) {
      await prisma.verificationToken.deleteMany({
        where: { token: existingToken.token },
      });
      return NextResponse.json({ error: "Reset token has expired" }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.verificationToken.deleteMany({
        where: { token: existingToken.token },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
