"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not start password reset");
        return;
      }

      setSuccess(
        "If that email exists, a reset link has been sent."
      );
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
          <span className="text-primary">Friend</span>Sync
        </CardTitle>
        <CardDescription>Reset your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || success) && (
            <div
              className={
                error
                  ? "rounded-xl border border-red-300/45 bg-red-100/60 p-3 text-sm text-destructive"
                  : "rounded-xl border border-emerald-300/45 bg-emerald-100/60 p-3 text-sm text-emerald-900"
              }
            >
              {error || success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sky-900/85">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending reset link..." : "Send reset link"}
          </Button>

          <p className="text-center text-sm text-muted-foreground/90">
            Remembered it?{" "}
            <Link href="/signin" className="font-medium text-sky-700 underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
