# FriendSync

A group planning webapp for small friend groups. Manage a shared calendar and todo list to schedule events together.

**Features:**
- Username/password authentication (no third-party accounts needed)
- Week view showing planned group events
- Shared todo list with scheduling in your group calendar
- Invite friends via shareable link

## How to Use

### First time setup
1. Register with a username and password
2. Go to **Settings** and set your timezone
3. Create a group or accept an invite

### Inviting friends
1. Open your group → **Settings** tab
2. Click **Create Invite Link**
3. Share the link with your friends
4. They sign in, open the link, and join the group

### Calendar
- Open a group → **Calendar** tab
- Blue blocks = events your group has scheduled
- Green blocks = available time slots with no planned events

### Scheduling a todo
1. Go to the **Todos** tab and create a todo (title, duration, description)
2. Click the calendar icon on the todo → a dialog opens showing free slots that fit the duration
3. Click a green slot to select it, then confirm
4. The event appears on the group calendar

### Note to self: run migrations on production upon deployment and redeploy

```bash
DATABASE_URL="neon_direct_url" npx prisma migrate deploy
```