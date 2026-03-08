"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SyncButtonProps {
  groupId: string;
  onSyncComplete: () => void;
}

export function SyncButton({ groupId, onSyncComplete }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const timeMin = new Date().toISOString();
      const timeMax = addDays(new Date(), 14).toISOString();

      const res = await fetch(`/api/groups/${groupId}/calendar/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeMin, timeMax }),
      });

      if (!res.ok) throw new Error("Sync failed");

      const data = await res.json();
      if (data.errors?.length > 0) {
        toast.warning(`Synced ${data.synced}/${data.total} calendars`, {
          description: data.errors.join(". "),
        });
      } else {
        toast.success(`Synced ${data.synced} calendar${data.synced !== 1 ? "s" : ""}`);
      }
      onSyncComplete();
    } catch {
      toast.error("Failed to sync calendars");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleSync} disabled={loading} variant="outline" size="sm">
      {loading ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          Syncing...
        </>
      ) : (
        "Sync Calendars"
      )}
    </Button>
  );
}
