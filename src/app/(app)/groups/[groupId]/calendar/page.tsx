/**
 * Next.js page component for the weekly calendar view of a group.
 */
"use client";

import { useState, useMemo } from "react";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useGroupEvents } from "@/hooks/use-group-events";
import { useTodos } from "@/hooks/use-todos";
import { WeekView } from "@/components/calendar/week-view";
import {
  TodoFormFields,
  TODO_DURATION_OPTIONS,
} from "@/components/todos/todo-form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function CalendarPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [weekOffset, setWeekOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [clickedTime, setClickedTime] = useState<Date | null>(null);
  // Keep local date/time strings for native inputs so users can adjust the clicked slot before saving.
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  // null = new event, string = existing todo id
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const [saving, setSaving] = useState(false);
  // Tracks an in-flight completion request to lock dialog actions and avoid duplicate submits.
  const [completingEventId, setCompletingEventId] = useState<string | null>(null);
  // Stores the event selected from the calendar to populate the completion confirmation dialog.
  const [eventToComplete, setEventToComplete] = useState<{
    id: string;
    title: string;
    start: string;
    end: string;
  } | null>(null);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  
  const weekEnd = addDays(weekStart, 7);

  // parseable as ISO strings
  const from = weekStart.toISOString();
  const to = weekEnd.toISOString();

  const { events, isLoading, mutate } = useGroupEvents(groupId, from, to);
  // mutate because they are modified
  const { todos: pendingTodos, mutate: mutatePendingTodos } = useTodos(groupId, "PENDING");

  function handleEmptySlotClick(start: Date) {
    setClickedTime(start);
    // Prefill from the exact slot that was clicked in week view.
    setStartDate(format(start, "yyyy-MM-dd"));
    setStartTime(format(start, "HH:mm"));
    setSelectedTodoId(null);
    setTitle("");
    setDuration("60");
    setCreateOpen(true);
  }

  // find duration for selected
  const activeDuration = selectedTodoId
    ? String(pendingTodos.find((t) => t.id === selectedTodoId)?.duration ?? 60)
    : duration;

  // and title
  const activeTitle = selectedTodoId
    ? (pendingTodos.find((t) => t.id === selectedTodoId)?.title ?? "")
    : title;

  // event duration options
  const calendarDurationOptions = useMemo(
    () => TODO_DURATION_OPTIONS.filter((option) => Number(option.value) <= 600),
    []
  );

  // preview-only Date built from the current input values (date + time)
  // this is not saved directly; it is used to render the header text in the modal
  const startPreview = new Date(`${startDate}T${startTime}`);
  // guard before formatting: Date input can be temporarily invalid while the user is typing.
  const hasValidStartPreview = !isNaN(startPreview.getTime());

  async function handleCreate() {
    if (!activeTitle.trim()) return;
    setSaving(true);

    try {
      // parse user-edited local date/time into a concrete timestamp used for scheduling.
      const scheduledStart = new Date(`${startDate}T${startTime}`);
      if (isNaN(scheduledStart.getTime())) {
        throw new Error("Invalid date or time");
      }

      let todoId: string;
      const durationMinutes = parseInt(activeDuration, 10);

      if (selectedTodoId) {
        // Use the existing todo directly
        todoId = selectedTodoId;
      } else {
        // Create a brand-new todo
        const createRes = await fetch(`/api/groups/${groupId}/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), duration: durationMinutes }),
        });
        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error || "Failed to create event");
        }
        const todo = await createRes.json();
        todoId = todo.id;
      }

      const end = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000); //end time of event

      // backend accepts ISO timestamps, so convert both bounds after local-time calculation.
      const scheduleRes = await fetch(`/api/groups/${groupId}/todos/${todoId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: scheduledStart.toISOString(),
          end: end.toISOString(),
        }),
      });

      if (!scheduleRes.ok) {
        const data = await scheduleRes.json();
        throw new Error(data.error || "Failed to schedule event");
      }

      toast.success("Event added!");
      setCreateOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleEventComplete(eventId: string) {
    // Guard against rapid repeated confirms while the PATCH is still running.
    if (completingEventId) return;
    setCompletingEventId(eventId);

    try {
      const res = await fetch(`/api/groups/${groupId}/todos/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to mark event as complete");
      }

      toast.success("Event completed");
      await Promise.all([mutate(), mutatePendingTodos()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCompletingEventId(null);
    }
  }

  function handleEventClick(event: {
    id: string;
    title: string;
    start: string;
    end: string;
  }) {
    // Clicking a calendar block opens confirmation; completion is only done after explicit confirm.
    setEventToComplete(event);
  }

  async function handleConfirmComplete() {
    if (!eventToComplete) return;
    await handleEventComplete(eventToComplete.id);
    // Close after request settles (success or failure) so state stays consistent with the loading lock.
    setEventToComplete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* buttons for weeks */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            &larr; Prev
          </Button> 
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekStart, "d MMMM", { locale: enGB })} &ndash; {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: enGB })}
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading calendar...
        </div>
      ) : (
        <WeekView
          events={events}
          weekStart={weekStart}
          onEmptySlotClick={handleEmptySlotClick}
          onEventClick={handleEventClick}
        />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 border border-blue-600" />
          Planned events
        </span>
        <span className="text-muted-foreground/60">Click on a timeslot to add an event</span>
        <span className="text-muted-foreground/60">Click an event to complete it</span>
      </div>

      {/* Create event dialog. Open based on flag */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            {clickedTime && (
              <p className="text-sm text-muted-foreground">
                {hasValidStartPreview /* render the date and time */
                  ? format(startPreview, "EEEE, do 'of' MMMM 'at' HH:mm", { locale: enGB })
                  : "Choose a valid date and time"}
              </p>
            )}
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Pending todos picker in the dialog*/}
            {pendingTodos.length > 0 && (
              <div className="grid gap-2">
                <Label>Schedule a pending todo</Label>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto rounded-md border p-1">
                  {pendingTodos.map((todo) => (
                    <button
                      key={todo.id}
                      type="button"
                      onClick={() => setSelectedTodoId(selectedTodoId === todo.id ? null : todo.id)}
                      className={cn(
                        "flex items-center justify-between rounded px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                        selectedTodoId === todo.id && "bg-primary/10 ring-1 ring-primary"
                      )}
                    >
                      <span className="font-medium truncate">{todo.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">{todo.duration} min</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {pendingTodos.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 border-t" />
                <span>or create new</span>
                <div className="flex-1 border-t" />
              </div>
            )}

            {/* new event fields — disabled when a todo is selected */}
            {/* date and time inputs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="event-start-date">Date</Label>
                <Input
                  id="event-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-start-time">Start time</Label>
                <Input
                  id="event-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className={cn("grid gap-4", selectedTodoId && "opacity-40 pointer-events-none")}>
              <TodoFormFields
                title={title}
                onTitleChange={setTitle}
                duration={duration}
                onDurationChange={setDuration}
                showDescription={false}
                autoFocus={pendingTodos.length === 0}
                titleId="event-title"
                titleLabel="Title"
                titlePlaceholder="e.g., Team meeting, Game night"
                durationOptions={calendarDurationOptions}
                onTitleEnter={() => {
                  if (activeTitle.trim()) handleCreate();
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !activeTitle.trim() || !startDate || !startTime}>
              {saving ? "Adding..." : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(eventToComplete)}
        onOpenChange={(open) => {
          // Keep dialog mounted while submitting to prevent accidental close mid-request.
          if (!open && !completingEventId) {
            setEventToComplete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Event?</DialogTitle>
            {eventToComplete && (
              <p className="text-sm text-muted-foreground">
                {eventToComplete.title} on {format(parseISO(eventToComplete.start), "EEEE, d MMMM 'at' HH:mm", { locale: enGB })}
              </p>
            )}
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEventToComplete(null)}
              disabled={Boolean(completingEventId)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmComplete} disabled={Boolean(completingEventId)}>
              {completingEventId ? "Completing..." : "Complete event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
