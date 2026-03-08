/**
 * Feature component responsible for join with code rendering and interactions.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinWithCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/invite/${trimmed}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid code");

      if (data.alreadyMember) {
        toast.info("You're already in this group");
      } else {
        toast.success(`Joined ${data.groupName}!`);
      }

      router.push(`/groups/${data.groupId}/calendar`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleJoin} className="flex gap-2">
      <Input
        placeholder="Enter invite code…"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="max-w-48"
        disabled={loading}
      />
      <Button type="submit" variant="outline" disabled={!code.trim() || loading}>
        {loading ? "Joining…" : "Join"}
      </Button>
    </form>
  );
}
