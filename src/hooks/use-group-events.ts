/**
 * Custom React hook for fetching group calendar events.
 */
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface ScheduledEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: number;
  creatorName: string | null;
}

interface EventsData {
  events: ScheduledEvent[];
}

export function useGroupEvents(
  groupId: string,
  from: string,
  to: string
) {
  // get events between dates
  const url = groupId && from && to
    ? `/api/groups/${groupId}/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<EventsData>(url, fetcher);

  return {
    events: data?.events ?? [],
    error,
    isLoading,
    mutate,
  };
}
