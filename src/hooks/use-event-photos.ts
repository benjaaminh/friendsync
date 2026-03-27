/**
 * Custom React hook for fetching event photos for a group.
 */
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface EventPhoto {
  id: string;
  todoId: string;
  cloudinaryId: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    username: string;
    image: string | null;
  };
  todo: {
    id: string;
    title: string;
  };
}

interface PhotosData {
  photos: EventPhoto[];
}

export function useEventPhotos(groupId: string, todoId?: string) {
  const searchParams = todoId ? `?todoId=${todoId}` : "";
  const url = groupId ? `/api/groups/${groupId}/photos${searchParams}` : null;

  const { data, error, isLoading, mutate } = useSWR<PhotosData>(url, fetcher);

  return {
    photos: data?.photos ?? [],
    error,
    isLoading,
    mutate,
  };
}
