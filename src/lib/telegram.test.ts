import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTelegramEventsText,
  buildTelegramTodoSummaryText,
  escapeTelegramHtml,
  formatTelegramDateTime,
  formatTelegramEventLine,
  formatTelegramRange,
  formatTelegramTodoLine,
  getTelegramEnvironmentUrl,
  getTelegramGroupMessage,
  getTelegramHelpText,
  getTelegramWebhookSecret,
  normalizeTelegramStatusFilter,
  parseTelegramCommand,
  parseTelegramDateTime,
  sendTelegramMessage,
  splitTelegramArgs,
} from "./telegram";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

describe("telegram helpers", () => {
  it("escapes HTML entities", () => {
    expect(escapeTelegramHtml(`<tag attr='x'>&\"`)).toBe(
      "&lt;tag attr=&#39;x&#39;&gt;&amp;&quot;"
    );
  });

  it("parses commands with and without args", () => {
    expect(parseTelegramCommand("/help")).toEqual({ command: "help", args: "" });
    expect(parseTelegramCommand("/todos scheduled")).toEqual({
      command: "todos",
      args: "scheduled",
    });
    expect(parseTelegramCommand(" /todos@friendsync_bot all ")).toEqual({
      command: "todos",
      args: "all",
    });
    expect(parseTelegramCommand("hello there")).toBeNull();
  });

  it("splits piped args and removes empty parts", () => {
    expect(splitTelegramArgs(" title | 60 | note ")).toEqual(["title", "60", "note"]);
    expect(splitTelegramArgs("|||title||")).toEqual(["title"]);
  });

  it("parses ISO and European date formats", () => {
    const iso = parseTelegramDateTime("2026-04-16 18:30", "Europe/Helsinki");
    const eu = parseTelegramDateTime("16.04.2026 18:30", "Europe/Helsinki");

    expect(iso).toBeInstanceOf(Date);
    expect(eu).toBeInstanceOf(Date);
    expect(iso?.toISOString()).toBe(eu?.toISOString());
    expect(parseTelegramDateTime("invalid-date", "Europe/Helsinki")).toBeNull();
  });

  it("formats date and ranges in target timezone", () => {
    const start = new Date("2026-04-16T15:30:00.000Z");
    const end = new Date("2026-04-16T16:30:00.000Z");

    expect(formatTelegramDateTime(start, "Europe/Helsinki")).toBe("16.04.2026 18:30");
    expect(formatTelegramRange(start, end, "Europe/Helsinki")).toBe(
      "16.04.2026 18:30 - 19:30"
    );
  });

  it("formats todo and event lines", () => {
    const todoLine = formatTelegramTodoLine(
      {
        id: "1",
        title: "Buy <snacks>",
        status: "PENDING",
        duration: 45,
        scheduledAt: new Date("2026-04-16T15:30:00.000Z"),
        creator: { username: "alice" },
      },
      "Europe/Helsinki"
    );

    const eventLine = formatTelegramEventLine(
      {
        id: "2",
        title: "Movie & night",
        duration: 60,
        scheduledAt: new Date("2026-04-16T15:30:00.000Z"),
        creatorName: "bob",
      },
      "Europe/Helsinki"
    );

    expect(todoLine).toContain("Buy &lt;snacks&gt;");
    expect(todoLine).toContain("[PENDING]");
    expect(todoLine).toContain("45m");
    expect(todoLine).toContain("@alice");

    expect(eventLine).toContain("Movie &amp; night");
    expect(eventLine).toContain("16.04.2026 18:30 - 19:30");
    expect(eventLine).toContain("@bob");
  });

  it("builds summary text and handles empty arrays", () => {
    expect(buildTelegramTodoSummaryText([], "UTC", "pending")).toBe("No pending todos found.");
    expect(buildTelegramEventsText([], "UTC")).toBe(
      "No scheduled events found for the selected range."
    );

    const todosText = buildTelegramTodoSummaryText(
      [
        {
          id: "1",
          title: "Task 1",
          status: "PENDING",
          duration: 60,
          scheduledAt: null,
          creator: null,
        },
      ],
      "UTC",
      "pending"
    );

    const eventsText = buildTelegramEventsText(
      [
        {
          id: "2",
          title: "Event 1",
          duration: 60,
          scheduledAt: new Date("2026-04-16T15:30:00.000Z"),
          creatorName: null,
        },
      ],
      "UTC"
    );

    expect(todosText).toContain("1. Task 1");
    expect(eventsText).toContain("1. Event 1");
  });

  it("returns help text and status normalization", () => {
    const withBot = getTelegramHelpText("https://app.example.com", "friendsync_bot");
    const withoutBot = getTelegramHelpText("https://app.example.com");

    expect(withBot).toContain("@friendsync_bot");
    expect(withBot).toContain("/link CODE");
    expect(withoutBot).toContain("Add the bot to your group");

    expect(normalizeTelegramStatusFilter(" pending ")).toBe("pending");
    expect(normalizeTelegramStatusFilter("ALL")).toBe("all");
    expect(normalizeTelegramStatusFilter("in-progress")).toBeNull();
  });

  it("returns group and env defaults", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.TELEGRAM_WEBHOOK_SECRET = "secret";

    expect(getTelegramGroupMessage("Friends")).toBe("Linked to Friends");
    expect(getTelegramGroupMessage()).toBe("Linked to this Telegram group");
    expect(getTelegramEnvironmentUrl()).toBe("https://app.example.com");
    expect(getTelegramWebhookSecret()).toBe("secret");

    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getTelegramEnvironmentUrl()).toBe("http://localhost:3000");
  });

  it("sends telegram messages and throws on bad responses", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "token123";

    const okFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", okFetch);

    await sendTelegramMessage(123, "hello", { parseMode: "HTML" });
    expect(okFetch).toHaveBeenCalledTimes(1);
    expect(okFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bottoken123/sendMessage",
      expect.objectContaining({ method: "POST" })
    );

    const badFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", badFetch);
    await expect(sendTelegramMessage(123, "hello")).rejects.toThrow(
      "Telegram sendMessage failed: 500"
    );

    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendTelegramMessage(123, "hello")).rejects.toThrow(
      "TELEGRAM_BOT_TOKEN is not configured"
    );
  });
});
