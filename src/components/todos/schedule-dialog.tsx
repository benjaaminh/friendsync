"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  todo: { id: string; title: string; duration: number };
  groupId: string;
  onScheduled: () => void;
}

export function ScheduleDialog({
  isOpen,
  onClose,
  todo,
  groupId,
  onScheduled,
}: ScheduleDialogProps) {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);

  async function handleSchedule() {
    const start = new Date(`${date}T${time}`);
    if (isNaN(start.getTime())) {
      toast.error("Invalid date or time");
      return;
    }

    const end = new Date(start.getTime() + todo.duration * 60 * 1000);

    setScheduling(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/todos/${todo.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule");
      }

      toast.success("Event scheduled!");
      onScheduled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule: {todo.title}</DialogTitle>
          <Badge variant="secondary" className="w-fit">{todo.duration} minutes</Badge>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="schedule-date">Date</Label>
            <Input
              id="schedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="schedule-time">Start time</Label>
            <Input
              id="schedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={scheduling}>
            {scheduling ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
