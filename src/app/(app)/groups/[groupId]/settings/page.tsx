/**
 * Next.js page component for managing group settings, members, and invite links.
 */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/auth/user-avatar";
import { fetcher } from "@/lib/fetcher";
import { getAvailableTimezones } from "@/lib/timezones";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    username: string;
    image: string | null;
  };
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  currentUserRole: string;
  timezone: string;
  telegramChatId: string | null;
  telegramChatTitle: string | null;
  telegramLinkCode: string | null;
  telegramLinkCodeExpiresAt: string | null;
  members: Member[];
}

interface InviteData {
  id: string;
  code: string;
  url?: string;
  uses: number;
  maxUses: number | null;
  active: boolean;
}

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const groupId = params.groupId as string;

  //groups fetched
  const { data: group, mutate: mutateGroup } = useSWR<GroupData>(
    `/api/groups/${groupId}`,
    fetcher
  );
  //invites fetched
  const { data: invites, mutate: mutateInvites } = useSWR<InviteData[]>(
    group?.currentUserRole === "ADMIN" ? `/api/groups/${groupId}/invite` : null,
    fetcher
  );
  //group name
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [telegramLinkCode, setTelegramLinkCode] = useState<string | null>(null);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const timezones = getAvailableTimezones();

  const isAdmin = group?.currentUserRole === "ADMIN";
  const telegramCodeExpiresAt = group?.telegramLinkCodeExpiresAt
    ? new Date(group.telegramLinkCodeExpiresAt)
    : null;
  const currentTelegramLinkCode = telegramLinkCode ?? group?.telegramLinkCode ?? null;

  useEffect(() => {
    if (group) setName(group.name);
    if (group?.timezone) setTimezone(group.timezone);
    setTelegramLinkCode(group?.telegramLinkCode ?? null);
  }, [group]);

  // update name
  async function handleUpdateGroup(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      });
      if (!res.ok) throw new Error();
      toast.success("Group updated");
      mutateGroup();
    } catch {
      toast.error("Failed to update group");
    }
  }

  async function handleCreateInvite() {
    try {
      const res = await fetch(`/api/groups/${groupId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      await navigator.clipboard.writeText(data.url);
      toast.success("Invite link copied to clipboard!");
      mutateInvites();
    } catch {
      toast.error("Failed to create invite");
    }
  }

  async function handleGenerateTelegramLinkCode() {
    setTelegramLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/telegram`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTelegramLinkCode(data.linkCode);
      toast.success("Telegram link code generated");
      mutateGroup();
    } catch {
      toast.error("Failed to generate Telegram code");
    } finally {
      setTelegramLoading(false);
    }
  }

  async function handleUnlinkTelegram() {
    setTelegramLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/telegram`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setTelegramLinkCode(null);
      toast.success("Telegram chat unlinked");
      mutateGroup();
    } catch {
      toast.error("Failed to unlink Telegram chat");
    } finally {
      setTelegramLoading(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Member removed");
      mutateGroup();
      setShowRemoveMember(null);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveGroup() {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.user?.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Left group");
      // go back to dashboard
      router.push("/dashboard");
    } catch {
      toast.error("Failed to leave group");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGroup() {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Group deleted");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setLoading(false);
    }
  }

  if (!group) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* settings visible to admins only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name</Label>
                <Input id="groupName" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Group Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="sm">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* telegram bot settings */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Telegram Bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a one-time code here, then send <span className="font-medium">/link CODE</span> in the Telegram group chat.
            </p>
            <div className="rounded-2xl border border-white/55 bg-white/55 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                {group?.telegramChatId ? (
                  <Badge>Linked</Badge>
                ) : (
                  <Badge variant="secondary">Not linked</Badge>
                )}
                {group?.telegramChatTitle && (
                  <span className="text-muted-foreground">{group.telegramChatTitle}</span>
                )}
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Link code:</span>{" "}
                  <span className="font-mono text-foreground">
                    {currentTelegramLinkCode ?? "Generate a code to start linking"}
                  </span>
                </div>
                {telegramCodeExpiresAt && (
                  <div className="text-muted-foreground">
                    Expires: {telegramCodeExpiresAt.toLocaleString(undefined, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleGenerateTelegramLinkCode} disabled={telegramLoading}>
                {telegramLoading ? "Generating..." : "Generate link code"}
              </Button>
              <Button type="button" variant="outline" onClick={handleUnlinkTelegram} disabled={telegramLoading || !group?.telegramChatId}>
                Unlink Telegram
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add your bot to the Telegram group first. If you regenerate the code, the previous one stops working.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Members ({group.members.length})</CardTitle>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleCreateInvite}>
              Create Invite Link
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* show all group members */}
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/45 px-3 py-2">
              <UserAvatar name={member.user.username} image={member.user.image} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">@{member.user.username}</p>
              </div>
              <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                {member.role.toLowerCase()}
              </Badge>
              {isAdmin && member.user.id !== session?.user?.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setShowRemoveMember(member)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite links. visible only to admins */}
      {isAdmin && invites && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Invite Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/50 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900/55"
              >
                <code className="flex-1 truncate rounded-lg bg-white/80 px-2 py-1 text-xs dark:bg-slate-800/80 dark:text-slate-100">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invite.code}`}
                </code>
                <span className="text-xs text-muted-foreground">
                  {invite.uses} use{invite.uses !== 1 ? "s" : ""}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/invite/${invite.code}`
                    );
                    toast.success("Copied!");
                  }}
                >
                  Copy
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* leave and delete group */}
      <div className="rounded-2xl border border-red-300/35 bg-red-100/35 p-4">
        <div className="flex gap-2">
          {!isAdmin && (
            <Button variant="outline" className="text-destructive" onClick={() => setShowLeave(true)}>
              Leave Group
            </Button>
          )}
          {isAdmin && (
            <Button variant="destructive" onClick={() => setShowDeleteGroup(true)}>
              Delete Group
            </Button>
          )}
        </div>
      </div>

      {/* Leave dialog */}
      <Dialog open={showLeave} onOpenChange={setShowLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Group</DialogTitle>
            <DialogDescription>Are you sure you want to leave {group.name}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeave(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeaveGroup} disabled={loading}>
              {loading ? "Leaving..." : "Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete group dialog */}
      <Dialog open={showDeleteGroup} onOpenChange={setShowDeleteGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              This will permanently delete {group.name} and all its data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteGroup(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={loading}>
              {loading ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member dialog. Member is either null or Member type */}
      <Dialog open={!!showRemoveMember} onOpenChange={() => setShowRemoveMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove @{showRemoveMember?.user.username} from the group?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveMember(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => showRemoveMember && handleRemoveMember(showRemoveMember.user.id)}
              disabled={loading}
            >
              {loading ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
