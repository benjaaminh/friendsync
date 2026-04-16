/**
 * Telegram webhook for FriendSync bot commands.
 */
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  buildTelegramEventsText,
  buildTelegramTodoSummaryText,
  escapeTelegramHtml,
  formatTelegramDateTime,
  getTelegramEnvironmentUrl,
  getTelegramGroupMessage,
  getTelegramHelpText,
  getTelegramWebhookSecret,
  normalizeTelegramStatusFilter,
  parseTelegramCommand,
  parseTelegramDateTime,
  sendTelegramMessage,
  splitTelegramArgs,
} from "@/lib/telegram";

type TelegramUpdate = {
  message?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    text?: string;
  };
};

// Prefer human-readable chat label for persisted metadata.
function getChatLabel(chat: NonNullable<TelegramUpdate["message"]>["chat"]): string {
  return chat.title ?? chat.username ?? String(chat.id);
}

// Accept both "todoId | date" and "todoId date" formats for easier chat usage.
// Used in /schedule command
function parseScheduleInput(rawInput: string): { todoId: string; dateText: string } | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (trimmed.includes("|")) {
    const parts = splitTelegramArgs(trimmed);
    if (parts.length < 2) return null;
    return {
      todoId: parts[0],
      dateText: parts.slice(1).join(" | "),
    };
  }

  const [todoId, ...rest] = trimmed.split(/\s+/);
  if (!todoId || rest.length === 0) return null;

  return {
    todoId,
    dateText: rest.join(" "),
  };
}

// Helper to send a message reply to the same chat.
async function reply(chatId: number, text: string): Promise<void> {
  await sendTelegramMessage(chatId, text, { parseMode: "HTML" });
}

// Main webhook handler for Telegram bot commands. 
// Sends responses based on commands
export async function POST(request: NextRequest) {
  // Optional webhook secret check. If configured, reject calls not coming from Telegram.
  const webhookSecret = getTelegramWebhookSecret();
  if (webhookSecret) {
    const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (receivedSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;

  // Ignore non-text updates (joins, stickers, photos, etc.).
  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const command = parseTelegramCommand(message.text);

  if (!command) {
    return NextResponse.json({ ok: true });
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const appUrl = getTelegramEnvironmentUrl();

  // Help is always available, even before the chat is linked to a FriendSync group.
  if (command.command === "start" || command.command === "help") {
    await reply(chatId, getTelegramHelpText(appUrl, botUsername));
    return NextResponse.json({ ok: true });
  }

  // /link binds this Telegram chat to a specific FriendSync group using a temporary code.
  if (command.command === "link") {
    const code = command.args.trim().toUpperCase();
    if (!code) {
      await reply(chatId, "Send <code>/link CODE</code> from the group chat after generating a code in FriendSync.");
      return NextResponse.json({ ok: true });
    }

    // Find a group with the matching code that hasn't expired. A group can only be linked to one Telegram chat, but a chat can be relinked to a different group by generating a new code.
    const group = await prisma.group.findFirst({
      where: {
        telegramLinkCode: code,
        OR: [
          { telegramLinkCodeExpiresAt: null },
          { telegramLinkCodeExpiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!group) {
      await reply(chatId, "That link code is invalid or expired. Generate a new one in FriendSync settings.");
      return NextResponse.json({ ok: true });
    }

    // Prevent one FriendSync group from being linked to multiple Telegram chats.
    if (group.telegramChatId && group.telegramChatId !== String(chatId)) {
      await reply(chatId, "This FriendSync group is already linked to a different Telegram chat.");
      return NextResponse.json({ ok: true });
    }

    // Link the group to the Telegram chat and clear the link code so it can't be reused.
    await prisma.group.update({
      where: { id: group.id },
      data: {
        telegramChatId: String(chatId),
        telegramChatTitle: getChatLabel(message.chat),
        telegramLinkedAt: new Date(),
        telegramLinkCode: null,
        telegramLinkCodeExpiresAt: null,
      },
    });

    await reply(
      chatId,
      `Linked <b>${escapeTelegramHtml(group.name)}</b> to this chat.\n\n${getTelegramGroupMessage(message.chat.title)}`
    );
    return NextResponse.json({ ok: true });
  }

  // All commands below require the current chat to be linked to a FriendSync group.
  const linkedGroup = await prisma.group.findFirst({
    where: { telegramChatId: String(chatId) },
  });

  if (!linkedGroup) {
    await reply(
      chatId,
      "This chat is not linked yet. Open the group settings in FriendSync, generate a Telegram code, then send /link CODE here."
    );
    return NextResponse.json({ ok: true });
  }

  const timeZone = linkedGroup.timezone || "UTC";

  // List todos with optional status filter (default: pending).
  if (command.command === "todos" || command.command === "list") {
    const statusFilter = normalizeTelegramStatusFilter(command.args || "pending");
    if (!statusFilter) {
      await reply(chatId, "Use /todos pending, /todos scheduled, /todos completed, /todos cancelled, or /todos all.");
      return NextResponse.json({ ok: true });
    }

    const todos = await prisma.todo.findMany({
      where: {
        groupId: linkedGroup.id,
        ...(statusFilter !== "all"
          ? { status: statusFilter.toUpperCase() as "PENDING" | "SCHEDULED" | "COMPLETED" | "CANCELLED" }
          : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        duration: true,
        scheduledAt: true,
        creator: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const summaryLabel = statusFilter === "all" ? "all matching" : statusFilter;

    await reply(
      chatId,
      `<b>${escapeTelegramHtml(linkedGroup.name)} todos</b>\n${buildTelegramTodoSummaryText(todos, timeZone, summaryLabel)}\n\nTimezone: ${escapeTelegramHtml(timeZone)}`
    );
    return NextResponse.json({ ok: true });
  }

  // Show scheduled items in the next 7 days.
  if (command.command === "events" || command.command === "scheduled") {
    const now = new Date();
    const nextWeek = addDays(now, 7);

    const events = await prisma.todo.findMany({
      where: {
        groupId: linkedGroup.id,
        status: "SCHEDULED",
        scheduledAt: {
          gte: now,
          lt: nextWeek,
        },
      },
      select: {
        id: true,
        title: true,
        duration: true,
        scheduledAt: true,
        creator: { select: { username: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const normalizedEvents = events
      .filter((event): event is typeof event & { scheduledAt: Date } => event.scheduledAt !== null)
      .map((event) => ({
        id: event.id,
        title: event.title,
        duration: event.duration,
        scheduledAt: event.scheduledAt,
        creatorName: event.creator.username,
      }));

    await reply(
      chatId,
      `<b>${escapeTelegramHtml(linkedGroup.name)} upcoming events</b>\n${buildTelegramEventsText(normalizedEvents, timeZone)}`
    );
    return NextResponse.json({ ok: true });
  }

  // Create a new pending todo from chat input.
  // Parses input like /add title | 60 | optional description or /add title 60 optional description
  if (command.command === "add") {
    const parts = splitTelegramArgs(command.args);
    if (parts.length === 0) {
      await reply(chatId, "Use /add title | 60 | optional description");
      return NextResponse.json({ ok: true });
    }

    const title = parts[0];
    const duration = Number(parts[1] ?? "60");
    const description = parts[2] ?? null;

    if (!title.trim()) {
      await reply(chatId, "Title is required.");
      return NextResponse.json({ ok: true });
    }

    const todo = await prisma.todo.create({
      data: {
        groupId: linkedGroup.id,
        createdById: linkedGroup.createdById,
        title: title.trim(),
        description: description?.trim() || null,
        duration: Number.isFinite(duration) && duration > 0 ? duration : 60,
      },
    });

    await reply(
      chatId,
      `Created todo <b>${escapeTelegramHtml(todo.title)}</b> with id <code>${todo.id}</code>.`
    );
    return NextResponse.json({ ok: true });
  }

  // Schedule an existing pending todo if the requested slot does not overlap.
  // Parses input like /schedule todoId | 16.04.2026 18:30 or /schedule todoId 16.04.2026 18:30
  if (command.command === "schedule") {
    const parsedSchedule = parseScheduleInput(command.args);
    if (!parsedSchedule) {
      await reply(chatId, "Use /schedule todoId | 16.04.2026 18:30");
      return NextResponse.json({ ok: true });
    }

    const scheduledStart = parseTelegramDateTime(parsedSchedule.dateText, timeZone);

    if (!scheduledStart) {
      await reply(chatId, "Invalid date. Use DD.MM.YYYY HH:mm or YYYY-MM-DD HH:mm.");
      return NextResponse.json({ ok: true });
    }

    const todo = await prisma.todo.findFirst({
      where: { id: parsedSchedule.todoId, groupId: linkedGroup.id },
      select: { id: true, title: true, duration: true, status: true },
    });

    if (!todo) {
      await reply(chatId, "Todo not found in this group.");
      return NextResponse.json({ ok: true });
    }

    if (todo.status !== "PENDING") {
      await reply(chatId, "Only pending todos can be scheduled.");
      return NextResponse.json({ ok: true });
    }

    const scheduledEnd = new Date(scheduledStart.getTime() + todo.duration * 60 * 1000);
    // Fetch candidates that start before the proposed end; overlap check is done in-memory below.
    const overlappingTodos = await prisma.todo.findMany({
      where: {
        groupId: linkedGroup.id,
        status: "SCHEDULED",
        scheduledAt: { lt: scheduledEnd },
      },
      select: { duration: true, scheduledAt: true },
    });

    const hasOverlap = overlappingTodos.some((candidate) => {
      if (!candidate.scheduledAt) return false;
      const candidateStart = candidate.scheduledAt.getTime();
      const candidateEnd = candidateStart + candidate.duration * 60 * 1000;
      return candidateEnd > scheduledStart.getTime();
    });

    if (hasOverlap) {
      await reply(chatId, "That time slot overlaps an existing scheduled event.");
      return NextResponse.json({ ok: true });
    }

    await prisma.todo.update({
      where: { id: todo.id },
      data: {
        status: "SCHEDULED",
        scheduledAt: scheduledStart,
      },
    });

    await reply(
      chatId,
      `Scheduled <b>${escapeTelegramHtml(todo.title)}</b> for ${escapeTelegramHtml(formatTelegramDateTime(scheduledStart, timeZone))}.`
    );
    return NextResponse.json({ ok: true });
  }

  // Mark todo as completed.
  if (command.command === "complete") {
    const todoId = command.args.trim();
    if (!todoId) {
      await reply(chatId, "Use /complete todoId");
      return NextResponse.json({ ok: true });
    }

    const todo = await prisma.todo.findFirst({
      where: { id: todoId, groupId: linkedGroup.id },
      select: { id: true, title: true },
    });

    if (!todo) {
      await reply(chatId, "Todo not found in this group.");
      return NextResponse.json({ ok: true });
    }

    await prisma.todo.update({
      where: { id: todo.id },
      data: { status: "COMPLETED" },
    });

    await reply(chatId, `Marked <b>${escapeTelegramHtml(todo.title)}</b> as completed.`);
    return NextResponse.json({ ok: true });
  }

  // Delete todo by id.
  if (command.command === "delete") {
    const todoId = command.args.trim();
    if (!todoId) {
      await reply(chatId, "Use /delete todoId");
      return NextResponse.json({ ok: true });
    }

    const todo = await prisma.todo.findFirst({
      where: { id: todoId, groupId: linkedGroup.id },
      select: { id: true, title: true },
    });

    if (!todo) {
      await reply(chatId, "Todo not found in this group.");
      return NextResponse.json({ ok: true });
    }

    await prisma.todo.delete({ where: { id: todo.id } });

    await reply(chatId, `Deleted <b>${escapeTelegramHtml(todo.title)}</b>.`);
    return NextResponse.json({ ok: true });
  }

  // Graceful fallback for unknown commands.
  await reply(chatId, `Unknown command. Use /help for available commands.\n\n${getTelegramHelpText(appUrl, botUsername)}`);
  return NextResponse.json({ ok: true });
}