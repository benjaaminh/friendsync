/**
 * Feature component responsible for sidebar rendering and interactions.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/auth/user-avatar";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

interface Group {
  id: string;
  name: string;
  _count: { members: number };
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: groups } = useSWR<Group[]>("/api/groups", fetcher);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "grid" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center px-4 font-semibold text-lg">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-primary">FC</span>
          <span>FriendSync</span>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Groups
            </h3>
            <Link href="/groups/new">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                + New
              </Button>
            </Link>
          </div>
          <nav className="space-y-1">
            {groups?.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}/calendar`}>
                <span
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                    pathname?.startsWith(`/groups/${group.id}`)
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {group._count.members}
                  </span>
                </span>
              </Link>
            ))}
            {groups?.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No groups yet
              </p>
            )}
          </nav>
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <div className="flex items-center gap-3 px-2 mb-2">
          <UserAvatar
            name={session?.user?.name}
            image={session?.user?.image}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {session?.user?.name}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/signin" })}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const { data: session } = useSession();

  return (
    <header className="md:hidden flex h-14 items-center justify-between border-b px-4 bg-card">
      <Link href="/dashboard" className="font-semibold text-lg">
        <span className="text-primary">FC</span> FriendSync
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/settings">
          <UserAvatar
            name={session?.user?.name}
            image={session?.user?.image}
          />
        </Link>
      </div>
    </header>
  );
}
