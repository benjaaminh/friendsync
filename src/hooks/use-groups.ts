/**
 * Custom React hook for use groups state, fetching, and derived data.
 */
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

/**
 * Loads all groups for the currently authenticated user.
 */
export function useGroups() {
  const { data, error, isLoading, mutate } = useSWR("/api/groups", fetcher);
  return { groups: data, error, isLoading, mutate };
}
