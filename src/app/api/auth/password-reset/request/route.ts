import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";
import {
  createPasswordResetToken,
  getPasswordResetIdentifier,
  hashPasswordResetToken,
} from "@/lib/password-reset";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const identifier = getPasswordResetIdentifier(user.id);
    const rawToken = createPasswordResetToken();
    const hashedToken = hashPasswordResetToken(rawToken);

    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: {
          identifier,
        },
      }),
      prisma.verificationToken.create({
        data: {
          identifier,
          token: hashedToken,
          expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: normalizedEmail, resetUrl });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        const message =
          error instanceof Error ? error.message : "Unknown SMTP error";
        console.error("Password reset email send failed:", error);
        return NextResponse.json(
          { error: `Reset email failed: ${message}` },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: "Reset email service is unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
