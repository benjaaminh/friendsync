import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// Utility functions and types for Telegram bot integration in FriendSync.
export interface TelegramCommand {
  command: string;
  args: string;
}

export interface TelegramTodoSummary {
  id: string;
  title: string;
  status: string;
  duration: number;
  scheduledAt: Date | null;
  creator?: { username: string } | null;
}

export interface TelegramEventSummary {
  id: string;
  title: string;
  duration: number;
  scheduledAt: Date;
  creatorName?: string | null;
}

// Escapes special characters in a string for safe inclusion in Telegram messages, preventing HTML injection and formatting issues.
export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Parses a Telegram command from the message text. Returns null if the text is not a valid command.
export function parseTelegramCommand(text: string): TelegramCommand | null {
  const match = text.trim().match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+([\s\S]+))?$/);
  if (!match) return null;

  return {
    command: match[1].toLowerCase(),
    args: (match[2] ?? "").trim(),
  };
}

export function splitTelegramArgs(args: string): string[] {
  return args
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseTelegramDateTime(input: string, timeZone: string): Date | null {
  const value = input.trim();
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  const euroMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);

  const match = isoMatch ?? euroMatch;
  if (!match) return null;

  const year = Number(isoMatch ? match[1] : match[3]);
  const month = Number(isoMatch ? match[2] : match[2]);
  const day = Number(isoMatch ? match[3] : match[1]);
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");

  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(localDate.getTime())) return null;

  return fromZonedTime(localDate, timeZone);
}

export function formatTelegramDateTime(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "dd.MM.yyyy HH:mm");
}

export function formatTelegramRange(start: Date, end: Date, timeZone: string): string {
  return `${formatTelegramDateTime(start, timeZone)} - ${formatInTimeZone(end, timeZone, "HH:mm")}`;
}

// Formats a todo item into a single line of text for Telegram messages, including title, status, duration, scheduled time, and creator if available.
export function formatTelegramTodoLine(todo: TelegramTodoSummary, timeZone: string): string {
  const scheduled = todo.scheduledAt
    ? ` • ${formatTelegramDateTime(todo.scheduledAt, timeZone)}`
    : "";
  const creator = todo.creator?.username ? ` • @${escapeTelegramHtml(todo.creator.username)}` : "";

  return `${escapeTelegramHtml(todo.title)} [${todo.status}] • ${todo.duration}m${scheduled}${creator}`;
}

// Formats an event item into a single line of text for Telegram messages, including title, scheduled time, duration, and creator if available.
export function formatTelegramEventLine(event: TelegramEventSummary, timeZone: string): string {
  const end = new Date(event.scheduledAt.getTime() + event.duration * 60 * 1000);
  const creator = event.creatorName ? ` • @${escapeTelegramHtml(event.creatorName)}` : "";

  return `${escapeTelegramHtml(event.title)} • ${formatTelegramRange(event.scheduledAt, end, timeZone)}${creator}`;
}

// Generates the help text for Telegram bot commands, including dynamic app URL and bot username if available.
export function getTelegramHelpText(appUrl: string, botUsername?: string): string {
  const botLine = botUsername
    ? `Add the bot to your group: @${botUsername}`
    : "Add the bot to your group";

  return [
    "FriendSync Telegram commands:",
    botLine,
    `Link a group with <code>/link CODE</code>`,
    `<code>/todos [pending|scheduled|completed|cancelled|all]</code>`,
    `<code>/add title | 60 | optional description</code>`,
    `<code>/schedule todoId | 16.04.2026 18:30</code>`,
    `<code>/complete todoId</code>`,
    `<code>/delete todoId</code>`,
    `<code>/events</code> or <code>/scheduled</code>`,
    `Manage the link code from the web app: ${escapeTelegramHtml(appUrl)}`,
    "Dates use the group timezone configured in FriendSync.",
  ].join("\n");
}

export function buildTelegramTodoSummaryText(
  todos: TelegramTodoSummary[],
  timeZone: string,
  label: string
): string {
  if (todos.length === 0) {
    return `No ${label} todos found.`;
  }

  return todos
    .map((todo, index) => `${index + 1}. ${formatTelegramTodoLine(todo, timeZone)}`)
    .join("\n");
}

export function buildTelegramEventsText(events: TelegramEventSummary[], timeZone: string): string {
  if (events.length === 0) {
    return "No scheduled events found for the selected range.";
  }

  return events
    .map((event, index) => `${index + 1}. ${formatTelegramEventLine(event, timeZone)}`)
    .join("\n");
}

export function normalizeTelegramStatusFilter(rawStatus: string): string | null {
  const status = rawStatus.trim().toLowerCase();
  if (["pending", "scheduled", "completed", "cancelled", "all"].includes(status)) {
    return status;
  }

  return null;
}

export function getTelegramGroupMessage(chatTitle?: string | null): string {
  return chatTitle ? `Linked to ${chatTitle}` : "Linked to this Telegram group";
}

export function getTelegramEnvironmentUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// Helper to send a message reply to the same chat.
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { parseMode?: "HTML" | "MarkdownV2" }
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status}`);
  }
}

export function getTelegramWebhookSecret(): string | undefined {
  return process.env.TELEGRAM_WEBHOOK_SECRET;
}