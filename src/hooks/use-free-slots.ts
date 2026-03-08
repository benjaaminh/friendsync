import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

interface FreeSlotData {
  slots: Array<{ start: string; end: string; durationMinutes: number }>;
  busySlots: Array<{ userId: string; start: string; end: string }>;
}

export function useFreeSlots(
  groupId: string,
  from: string,
  to: string,
  minDuration: number = 30
) {
  const url = groupId && from && to
    ? `/api/groups/${groupId}/calendar/free-slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&minDuration=${minDuration}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<FreeSlotData>(url, fetcher);

  return {
    slots: data?.slots ?? [],
    busySlots: data?.busySlots ?? [],
    error,
    isLoading,
    mutate,
  };
}
