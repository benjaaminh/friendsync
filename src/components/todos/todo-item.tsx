/**
 * Feature component responsible for todo item rendering and interactions.
 */
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/auth/user-avatar";
import { ScheduleDialog } from "./schedule-dialog";
import type { TodoWithCreator } from "@/types";

const statusConfig = {
  PENDING: { label: "Pending", variant: "outline" as const, className: "border-yellow-500 text-yellow-700 dark:text-yellow-400" },
  SCHEDULED: { label: "Scheduled", variant: "outline" as const, className: "border-blue-500 text-blue-700 dark:text-blue-400" },
  COMPLETED: { label: "Completed", variant: "outline" as const, className: "border-green-500 text-green-700 dark:text-green-400" },
  CANCELLED: { label: "Cancelled", variant: "outline" as const, className: "border-gray-500 text-gray-500" },
};

interface TodoItemProps {
  todo: TodoWithCreator;
  groupId: string;
  currentUserId: string;
  onUpdate: () => void;
}

export function TodoItem({ todo, groupId, currentUserId, onUpdate }: TodoItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = statusConfig[todo.status];

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/todos/${todo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Todo deleted");
      onUpdate();
    } catch {
      toast.error("Failed to delete todo");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  async function handleComplete() {
    try {
      const res = await fetch(`/api/groups/${groupId}/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Marked as complete");
      onUpdate();
    } catch {
      toast.error("Failed to update todo");
    }
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <UserAvatar name={todo.creator.name} image={todo.creator.image} className="mt-0.5 h-7 w-7" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium">{todo.title}</h3>
              <Badge variant={status.variant} className={status.className}>
                {status.label}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {todo.duration} min
              </Badge>
            </div>
            {todo.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {todo.description}
              </p>
            )}
            {todo.scheduledAt && (
              <p className="text-xs text-muted-foreground">
                Scheduled: {format(new Date(todo.scheduledAt), "PPp")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              by {todo.creator.name} &middot; {format(new Date(todo.createdAt), "MMM d")}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {todo.status === "PENDING" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)}>
                  Schedule
                </Button>
                <Button size="sm" variant="ghost" onClick={handleComplete}>
                  Done
                </Button>
              </>
            )}
            {todo.status === "SCHEDULED" && (
              <Button size="sm" variant="ghost" onClick={handleComplete}>
                Done
              </Button>
            )}
            {(todo.createdById === currentUserId || true) && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setShowDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Todo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{todo.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduleDialog
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        todo={{ id: todo.id, title: todo.title, duration: todo.duration }}
        groupId={groupId}
        onScheduled={() => {
          onUpdate();
          setShowSchedule(false);
        }}
      />
    </>
  );
}
