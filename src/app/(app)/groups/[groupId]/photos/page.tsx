/**
 * Next.js page component for the group photo board.
 * Displays a polaroid-style wall of photos from completed events.
 */
"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEventPhotos } from "@/hooks/use-event-photos";
import { useTodos } from "@/hooks/use-todos";
import { PhotoBoard } from "@/components/photos/photo-board";
import { PhotoUpload } from "@/components/photos/photo-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function PhotosPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const { data: session } = useSession();

  const initialTodoId = searchParams.get("todoId");
  const [selectedTodoId, setSelectedTodoId] = useState<string>(initialTodoId || "all");

  // Fetch completed todos to populate the event picker
  const { todos: completedTodos } = useTodos(groupId, "COMPLETED");

  // Fetch photos (optionally filtered by event)
  const todoFilter = selectedTodoId === "all" ? undefined : selectedTodoId;
  const { photos, isLoading, mutate } = useEventPhotos(groupId, todoFilter);

  // Can only upload if a specific completed event is selected
  const canUpload = selectedTodoId !== "all";

  // Sorted completed events for the picker
  const eventOptions = useMemo(
    () =>
      completedTodos.map((t) => ({ id: t.id, title: t.title })),
    [completedTodos]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div className="space-y-1.5 w-full sm:w-auto">
          <Label>Filter by event</Label>
          <Select value={selectedTodoId} onValueChange={setSelectedTodoId}>
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {eventOptions.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canUpload && (
          <PhotoUpload
            groupId={groupId}
            todoId={selectedTodoId}
            onUploaded={() => mutate()}
          />
        )}
      </div>

      {!canUpload && completedTodos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Select a completed event to upload photos.
        </p>
      )}

      {completedTodos.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Complete some events first to start adding photos!
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading photos...
        </div>
      ) : (
        <PhotoBoard
          photos={photos}
          groupId={groupId}
          currentUserId={session?.user?.id ?? ""}
          onDeleted={() => mutate()}
        />
      )}
    </div>
  );
}
