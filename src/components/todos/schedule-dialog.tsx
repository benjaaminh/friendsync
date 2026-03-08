"use client";

import { useState, useMemo } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFreeSlots } from "@/hooks/use-free-slots";
import { WeekView } from "@/components/calendar/week-view";

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekEnd = addDays(weekStart, 7);
  const from = weekStart.toISOString();
  const to = weekEnd.toISOString();

  const { slots, isLoading } = useFreeSlots(groupId, from, to, todo.duration);

  // Filter slots that fit the todo duration
  const validSlots = slots.filter((s) => s.durationMinutes >= todo.duration);

  function handleSlotClick(start: string, end: string) {
    // If the free slot is longer than needed, trim it to the todo duration
    const slotStart = new Date(start);
    const slotEnd = new Date(start);
    slotEnd.setMinutes(slotEnd.getMinutes() + todo.duration);

    // If trimmed end exceeds original slot end, keep original
    const actualEnd = slotEnd > new Date(end) ? end : slotEnd.toISOString();

    setSelectedSlot({ start, end: actualEnd });
  }

  async function handleSchedule() {
    if (!selectedSlot) return;
    setScheduling(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/todos/${todo.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSlot),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule");
      }

      toast.success("Event scheduled on everyone's calendar!");
      onScheduled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule: {todo.title}</DialogTitle>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary">{todo.duration} minutes</Badge>
            <span className="text-sm text-muted-foreground">
              Pick a free slot below
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWeekOffset((o) => o - 1);
                setSelectedSlot(null);
              }}
            >
              &larr; Prev
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(weekStart, "MMM d")} &ndash;{" "}
              {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWeekOffset((o) => o + 1);
                setSelectedSlot(null);
              }}
            >
              Next &rarr;
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading free slots...
            </div>
          ) : validSlots.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No free slots of {todo.duration}+ minutes this week.</p>
              <p className="text-sm">Try another week or sync calendars first.</p>
            </div>
          ) : (
            <WeekView
              freeSlots={validSlots}
              weekStart={weekStart}
              onSlotClick={handleSlotClick}
              selectedSlot={selectedSlot}
              minDuration={todo.duration}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={!selectedSlot || scheduling}>
            {scheduling ? "Scheduling..." : "Confirm Schedule"}
          </Button>
        </DialogFooter>

        {selectedSlot && (
          <p className="text-sm text-muted-foreground text-center">
            Selected: {format(new Date(selectedSlot.start), "EEEE, MMM d 'at' h:mm a")} &ndash;{" "}
            {format(new Date(selectedSlot.end), "h:mm a")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
