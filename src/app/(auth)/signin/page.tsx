"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInButton } from "@/components/auth/sign-in-button";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          <span className="text-primary">Friend</span>Cal
        </CardTitle>
        <CardDescription>
          Sign in to sync calendars with your friends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error === "token_expired"
              ? "Your session expired. Please sign in again."
              : "An error occurred. Please try again."}
          </div>
        )}
        <SignInButton />
        <p className="text-center text-xs text-muted-foreground">
          We&apos;ll access your Google Calendar to find free time slots.
          Your event details are never shared.
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
