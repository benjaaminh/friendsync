/**
 * Next.js page component for the /(auth)/signin route segment.
 */
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // next auth based sign in
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
        return;
      }

      router.push(callbackUrl); // go back to dashboard
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm border-0 bg-transparent py-5 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          <span className="text-primary">Friend</span>Cal
        </CardTitle>
        <CardDescription>
          Sign in to plan events with your friends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(urlError || error) && (
            <div className="rounded-xl border border-red-300/45 bg-red-100/60 p-3 text-sm text-destructive">
              {urlError === "token_expired"
                ? "Your session expired. Please sign in again."
                : error || "An error occurred. Please try again."}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sky-900/85">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sky-900/85">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-center text-sm text-muted-foreground/90">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-sky-700 underline underline-offset-4">
              Register
            </Link>
          </p>
        </form>
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
