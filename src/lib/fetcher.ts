/**
 * Shared SWR fetcher that enforces non-2xx handling.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`.trim());
  }

  return (await response.json()) as T;
}