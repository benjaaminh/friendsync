"use client";

import { useState, useMemo } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import { useParams } from "next/navigation";
import { useFreeSlots } from "@/hooks/use-free-slots";
import { WeekView } from "@/components/calendar/week-view";
import { SyncButton } from "@/components/calendar/sync-button";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekEnd = addDays(weekStart, 7);

  const from = weekStart.toISOString();
  const to = weekEnd.toISOString();

  const { slots, busySlots, isLoading, mutate } = useFreeSlots(groupId, from, to);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            &larr; Prev
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekStart, "MMM d")} &ndash; {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            Next &rarr;
          </Button>
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
            >
              Today
            </Button>
          )}
        </div>
        <SyncButton groupId={groupId} onSyncComplete={() => mutate()} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading calendar...
        </div>
      ) : (
        <WeekView
          freeSlots={slots}
          busySlots={busySlots}
          weekStart={weekStart}
        />
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900 border border-green-500" />
          Free for everyone
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-200/50 dark:bg-red-900/50 border border-red-300 dark:border-red-700" />
          Someone is busy
        </span>
      </div>
    </div>
  );
}
