/**
 * Feature component responsible for week view rendering and interactions.
 */
"use client";

import { useMemo } from "react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 23;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const SLOT_HEIGHT = 48; // px per 30 min
const ROW_HEIGHT = SLOT_HEIGHT * 2; // px per hour

interface ScheduledEventData {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: number;
  creatorName?: string | null;
}

interface WeekViewProps {
  events?: ScheduledEventData[];
  weekStart: Date;
  onEmptySlotClick?: (start: Date) => void;
}

 // calculates how big of a window to render for an event, with top and height of the "card"
function getSlotPosition(
  slotStart: Date,
  slotEnd: Date,
  dayDate: Date
): { top: number; height: number } | null {
  const dayStart = new Date(dayDate);
  dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(DAY_END_HOUR, 0, 0, 0);

  // Clamp to day boundaries
  const clampedStart = slotStart < dayStart ? dayStart : slotStart;
  const clampedEnd = slotEnd > dayEnd ? dayEnd : slotEnd;

  if (clampedStart >= clampedEnd) return null;

  const startMinutes =
    (clampedStart.getHours() - DAY_START_HOUR) * 60 +
    clampedStart.getMinutes();
  const endMinutes =
    (clampedEnd.getHours() - DAY_START_HOUR) * 60 +
    clampedEnd.getMinutes();

  const top = (startMinutes / 60) * ROW_HEIGHT;
  const height = ((endMinutes - startMinutes) / 60) * ROW_HEIGHT;

  return { top, height: Math.max(height, 2) };
}

export function WeekView({
  events = [],
  weekStart,
  onEmptySlotClick,
}: WeekViewProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i),
    []
  );

  const now = new Date();
  const totalHeight = TOTAL_HOURS * ROW_HEIGHT;

  // Current time indicator position
  const currentTimePos = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < DAY_START_HOUR || h >= DAY_END_HOUR) return null;
    return ((h - DAY_START_HOUR) * 60 + m) / 60 * ROW_HEIGHT;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-x-auto border rounded-lg bg-card">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
          <div className="p-2 text-xs text-muted-foreground" />
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                "p-2 text-center border-l",
                isSameDay(day, now) && "bg-primary/5"
              )}
            >
              <div className="text-xs text-muted-foreground">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "text-sm font-medium",
                  isSameDay(day, now) &&
                    "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Time labels */}
          <div className="relative" style={{ height: totalHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-xs text-muted-foreground"
                style={{ top: (hour - DAY_START_HOUR) * ROW_HEIGHT - 6 }}
              >
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className={cn("relative border-l", onEmptySlotClick && "cursor-pointer")}
              style={{ height: totalHeight }}
              onClick={(e) => {
                if (!onEmptySlotClick) return;
                // Don't fire if user clicked on an event
                if ((e.target as HTMLElement).closest("[data-event]")) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const yOffset = e.clientY - rect.top;
                const rawMinutes = (yOffset / ROW_HEIGHT) * 60;
                const roundedMinutes = Math.floor(rawMinutes / 30) * 30;
                const clickedTime = new Date(day);
                clickedTime.setHours(DAY_START_HOUR, 0, 0, 0);
                clickedTime.setMinutes(clickedTime.getMinutes() + roundedMinutes);
                onEmptySlotClick(clickedTime);
              }}
            >
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-dashed border-muted"
                  style={{ top: (hour - DAY_START_HOUR) * ROW_HEIGHT }}
                />
              ))}

              {/* Half-hour grid lines */}
              {hours.map((hour) => (
                <div
                  key={`half-${hour}`}
                  className="absolute w-full border-t border-dotted border-muted/50"
                  style={{
                    top: (hour - DAY_START_HOUR) * ROW_HEIGHT + SLOT_HEIGHT,
                  }}
                />
              ))}

              {/* Scheduled group events */}
              {events.map((event) => {
                const eventStart = parseISO(event.start);
                const eventEnd = parseISO(event.end);
                if (!isSameDay(eventStart, day) && !isSameDay(eventEnd, day))
                  return null;
                const pos = getSlotPosition(eventStart, eventEnd, day);
                if (!pos) return null;

                return (
                  <div
                    key={`event-${event.id}`}
                    data-event
                    className="absolute left-0.5 right-0.5 rounded-sm bg-blue-500 dark:bg-blue-600 border border-blue-600 dark:border-blue-500 z-[5] overflow-hidden shadow-sm"
                    style={{ top: pos.top, height: pos.height }}
                    title={`${event.title}\n${format(eventStart, "HH:mm")} - ${format(eventEnd, "HH:mm")}${event.creatorName ? `\nAdded by ${event.creatorName}` : ""}`}
                  >
                    <div className="px-1.5 py-0.5 h-full flex flex-col">
                      <span className="text-[11px] font-medium text-white truncate">
                        {event.title}
                      </span>
                      {pos.height > 30 && (
                        <span className="text-[10px] text-blue-100 truncate">
                          {format(eventStart, "HH:mm")} - {format(eventEnd, "HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Current time indicator */}
              {isSameDay(day, now) && currentTimePos !== null && (
                <div
                  className="absolute left-0 right-0 z-10"
                  style={{ top: currentTimePos }}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-[2px] bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
