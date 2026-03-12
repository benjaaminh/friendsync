/**
 * Feature component responsible for todo form rendering and interactions.
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TodoFormFields } from "@/components/todos/todo-form-fields";

interface TodoFormProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  defaultValues?: { id: string; title: string; description?: string; duration: number };
  onSuccess: () => void;
}

export function TodoForm({ isOpen, onClose, groupId, defaultValues, onSuccess }: TodoFormProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [duration, setDuration] = useState(String(defaultValues?.duration || 60));

  const isEdit = !!defaultValues?.id;

  useEffect(() => {
    if (!isOpen) return;
    setTitle(defaultValues?.title ?? "");
    setDescription(defaultValues?.description ?? "");
    setDuration(String(defaultValues?.duration ?? 60));
  }, [defaultValues, isOpen]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      const url = isEdit
        ? `/api/groups/${groupId}/todos/${defaultValues!.id}` //edit a todo
        : `/api/groups/${groupId}/todos`; // add a todo

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          duration: parseInt(duration, 10),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(isEdit ? "Todo updated" : "Todo added");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Todo" : "Add Todo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TodoFormFields
            title={title}
            onTitleChange={setTitle}
            description={description}
            onDescriptionChange={setDescription}
            duration={duration}
            onDurationChange={setDuration}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Saving..." : isEdit ? "Update" : "Add Todo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
