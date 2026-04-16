# FriendSync

A group planning webapp for small friend groups. Manage a shared calendar and todo list to schedule events together.

**Features:**
- Username/password authentication (no third-party accounts needed)
- Week view showing planned group events
- Shared todo list with scheduling in your group calendar
- Invite friends via shareable link
- Telegram bot integration for group chats

### Note to self: run migrations on production upon deployment and redeploy

```bash
DATABASE_URL="database_url" npx prisma migrate deploy
```

## Telegram bot

The Telegram bot runs inside the same Next.js app through a webhook route.

Required environment variables:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`

Supported commands:

- `/help`
- `/link CODE`
- `/todos [pending|scheduled|completed|cancelled|all]`
- `/add title | 60 | optional description`
- `/schedule todoId | 16.04.2026 18:30`
- `/complete todoId`
- `/delete todoId`
- `/events`
