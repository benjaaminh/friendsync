import { prisma } from "./prisma";
import { refreshAccessToken } from "./token-refresh";

async function getGoogleAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("No Google account linked");
  }

  if (account.expires_at && Date.now() >= account.expires_at * 1000) {
    const refreshed = await refreshAccessToken(account);
    if (refreshed.error) throw new Error("Token refresh failed");
    return refreshed.access_token!;
  }

  return account.access_token;
}

interface BusyInterval {
  start: string;
  end: string;
}

export async function fetchBusySlots(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<BusyInterval[]> {
  const accessToken = await getGoogleAccessToken(userId);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "UTC",
        items: [{ id: "primary" }],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Failed to fetch busy slots");
  }

  const data = await response.json();
  return data.calendars?.primary?.busy ?? [];
}

export async function createCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendeeEmails: string[];
  }
): Promise<string> {
  const accessToken = await getGoogleAccessToken(userId);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description
          ? `${event.description}\n\nScheduled via FriendCal`
          : "Scheduled via FriendCal",
        start: { dateTime: event.start, timeZone: "UTC" },
        end: { dateTime: event.end, timeZone: "UTC" },
        attendees: event.attendeeEmails.map((email) => ({ email })),
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Failed to create calendar event");
  }

  const data = await response.json();
  return data.id;
}

export async function syncUserBusySlots(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<void> {
  const busyIntervals = await fetchBusySlots(userId, timeMin, timeMax);

  // Delete old slots in this range
  await prisma.busySlot.deleteMany({
    where: {
      userId,
      start: { gte: new Date(timeMin) },
      end: { lte: new Date(timeMax) },
    },
  });

  // Insert fresh slots
  if (busyIntervals.length > 0) {
    await prisma.busySlot.createMany({
      data: busyIntervals.map((interval) => ({
        userId,
        start: new Date(interval.start),
        end: new Date(interval.end),
      })),
    });
  }
}
