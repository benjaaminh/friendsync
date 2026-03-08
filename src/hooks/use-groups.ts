import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

export function useGroups() {
  const { data, error, isLoading, mutate } = useSWR("/api/groups", fetcher);
  return { groups: data, error, isLoading, mutate };
}
