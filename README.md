# FriendSync

A group planning webapp for small friend groups. Manage a shared calendar and todo list to schedule events together.

**Features:**
- Username/password authentication (no third-party accounts needed)
- Email-based password reset links (SMTP)
- Week view showing planned group events
- Shared todo list with scheduling in your group calendar
- Invite friends via shareable link

### Note to self: run migrations on production upon deployment and redeploy

```bash
DATABASE_URL="database_url" npx prisma migrate deploy
```
