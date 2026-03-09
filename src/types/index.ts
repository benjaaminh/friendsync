/**
 * Central TypeScript type exports used across application modules.
 */
import { GroupMemberRole, TodoStatus } from "@/generated/prisma/enums";

export type { GroupMemberRole, TodoStatus };

export interface GroupWithMembers {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: Date;
  members: { //members of group
    id: string;
    role: GroupMemberRole;
    user: {
      id: string;
      username: string;
      image: string | null;
    };
  }[];
  _count: {
    members: number;
    todos: number;
  };
}

export interface FreeSlot {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface TodoWithCreator {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  status: TodoStatus;
  scheduledAt: Date | null;
  calendarEventId: string | null;
  createdById: string;
  createdAt: Date;
  creator: { //creator of todo
    id: string;
    username: string;
    image: string | null;
  };
}
