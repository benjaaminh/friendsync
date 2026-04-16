/**
 * Photo board that displays event photos in a grid.
 */
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EventPhoto } from "@/hooks/use-event-photos";

// Fixed set of slight rotations
const ROTATIONS = [
  "-rotate-2",
  "rotate-1",
  "-rotate-1",
  "rotate-2",
  "rotate-0",
  "-rotate-3",
  "rotate-3",
];

interface PhotoBoardProps {
  photos: EventPhoto[];
  groupId: string;
  currentUserId: string;
  onDeleted: () => void;
}

export function PhotoBoard({
  photos,
  groupId,
  currentUserId,
  onDeleted,
}: PhotoBoardProps) {
  const [lightbox, setLightbox] = useState<EventPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(photoId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Photo deleted");
      setLightbox(null);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No photos yet. Add the first one!
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightbox(photo)}
            className={cn(
              "group relative bg-white dark:bg-zinc-900 rounded-sm shadow-md p-2 pb-8 transition-transform hover:scale-105 hover:z-10 cursor-pointer",
              ROTATIONS[i % ROTATIONS.length]
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnailUrl}
              alt={photo.caption || "Event photo"}
              className="w-full aspect-square object-cover rounded-[2px]"
              loading="lazy"
            />
            <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground truncate">
                @{photo.uploadedBy.username}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(photo.createdAt), "d/M", { locale: enGB })}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox dialog */}
      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {lightbox?.todo.title}
            </DialogTitle>
            <DialogDescription>
              {lightbox && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserAvatar
                    name={lightbox.uploadedBy.username}
                    image={lightbox.uploadedBy.image}
                    className="h-5 w-5"
                  />
                  @{lightbox.uploadedBy.username} &middot;{" "}
                  {format(new Date(lightbox.createdAt), "d MMMM yyyy 'at' HH:mm", { locale: enGB })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {lightbox && (
            <div className="flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt={lightbox.caption || "Event photo"}
                className="w-full rounded-md object-contain max-h-[70vh]"
              />
              {lightbox.caption && (
                <p className="text-sm text-muted-foreground">{lightbox.caption}</p>
              )}
            </div>
          )}

          <DialogFooter>
            {lightbox && (lightbox.uploadedBy.id === currentUserId) && (
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => handleDelete(lightbox.id)}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setLightbox(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
