"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateToken() {
      if (!token) {
        setValidating(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/password-reset/confirm?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();

        if (!cancelled) {
          setIsTokenValid(Boolean(data.valid));
        }
      } catch {
        if (!cancelled) {
          setIsTokenValid(false);
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    }

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Missing reset token");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not reset password");
        return;
      }

      setSuccess("Password updated. Redirecting to sign in...");
      setTimeout(() => {
        router.push("/signin");
      }, 1200);
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
        <CardDescription>Create a new password</CardDescription>
      </CardHeader>
      <CardContent>
        {validating ? (
          <p className="text-center text-sm text-muted-foreground">Validating reset link...</p>
        ) : !isTokenValid ? (
          <div className="space-y-3 text-center">
            <div className="rounded-xl border border-red-300/45 bg-red-100/60 p-3 text-sm text-destructive">
              This reset link is invalid or expired.
            </div>
            <Link href="/forgot-password" className="text-sm font-medium text-sky-700 underline underline-offset-4">
              Request a new link
            </Link>
          </div>
        ) : (
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
              <Label htmlFor="password" className="text-sky-900/85">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sky-900/85">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating password..." : "Update password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
