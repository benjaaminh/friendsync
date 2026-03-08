/**
 * Feature component responsible for sign in button rendering and interactions.
 */
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
      variant="outline"
      size="lg"
      className="w-full"
    >
      Sign In
    </Button>
  );
}
