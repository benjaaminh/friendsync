/**
 * Next.js page component for the /(app)/groups/new route segment.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }

      const group = await res.json();
      toast.success("Group created!");
      router.push(`/groups/${group.id}/calendar`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="relative overflow-hidden rounded-[1.1rem] border border-sky-200/80 bg-gradient-to-br from-sky-200/75 via-cyan-100/65 to-emerald-100/70 p-5 shadow-[0_24px_45px_rgba(17,118,174,0.24)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-9 border-b border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.75)_0%,rgba(201,232,250,0.55)_100%)]" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/60 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-cyan-300/50 blur-2xl" />
        <p className="relative pt-5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/90">
          New Group
        </p>
      </div>
      <Card className="overflow-hidden border-sky-200/80 bg-white/70 shadow-[0_22px_38px_rgba(22,114,171,0.2)]">
        <CardHeader>
          <CardTitle>Create a New Group</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Weekend Crew"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What's this group about?"
                rows={3}
                maxLength={200}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
