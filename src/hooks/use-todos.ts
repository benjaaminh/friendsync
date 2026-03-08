/**
 * Custom React hook for use todos state, fetching, and derived data.
 */
import useSWR from "swr";
import type { TodoWithCreator } from "@/types";
import { fetcher } from "@/lib/fetcher";

/**
 * Loads todos for a group, optionally filtering by status.
 * @param groupId Group identifier.
 * @param status Optional todo status filter.
 */
export function useTodos(groupId: string, status?: string) {
  const url = groupId
    ? `/api/groups/${groupId}/todos${status ? `?status=${status}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<TodoWithCreator[]>(url, fetcher);

  return {
    todos: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
