/**
 * Next.js page component for the weekly calendar view of a group.
 */
"use client";

import { useState, useMemo } from "react";
import { startOfWeek, addDays, format } from "date-fns";
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
  // null = new event, string = existing todo id
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const [saving, setSaving] = useState(false);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  
  const weekEnd = addDays(weekStart, 7);

  // parseable as ISO strings
  const from = weekStart.toISOString();
  const to = weekEnd.toISOString();

  const { events, isLoading, mutate } = useGroupEvents(groupId, from, to);
  const { todos: pendingTodos } = useTodos(groupId, "PENDING");

  function handleEmptySlotClick(start: Date) {
    setClickedTime(start);
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

  async function handleCreate() {
    if (!clickedTime || !activeTitle.trim()) return;
    setSaving(true);

    try {
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

      const end = new Date(clickedTime.getTime() + durationMinutes * 60 * 1000); //end time of event

      //schedule the created todo
      const scheduleRes = await fetch(`/api/groups/${groupId}/todos/${todoId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: clickedTime.toISOString(),
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
        />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 border border-blue-600" />
          Planned events
        </span>
        <span className="text-muted-foreground/60">Click on a timeslot to add an event</span>
      </div>

      {/* Create event dialog. Open based on flag */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            {clickedTime && (
              <p className="text-sm text-muted-foreground">
                {format(clickedTime, "EEEE, do 'of' MMMM 'at' HH:mm", { locale: enGB })}
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

            {/* New event fields — disabled when a todo is selected */}
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
            <Button onClick={handleCreate} disabled={saving || !activeTitle.trim()}>
              {saving ? "Adding..." : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
