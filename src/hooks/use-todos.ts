import useSWR from "swr";
import type { TodoWithCreator } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

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
