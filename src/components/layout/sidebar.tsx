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
    <aside className="relative hidden h-screen w-72 flex-col overflow-hidden border-r border-sky-200/70 bg-[linear-gradient(180deg,rgba(206,238,255,0.82)_0%,rgba(188,225,246,0.72)_24%,rgba(210,238,252,0.62)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_30px_rgba(27,93,146,0.22)] backdrop-blur-2xl md:flex">
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.68)_0%,rgba(255,255,255,0)_100%)]" />
      <div className="relative flex h-16 items-center justify-between border-b border-white/70 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            FriendSync
          </span>
        </Link>
      </div>
      <Separator className="bg-white/70" />
      <ScrollArea className="relative flex-1 px-4 py-3">
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                  pathname === item.href
                    ? "border-white/70 bg-white/85 text-foreground shadow-[0_8px_18px_rgba(37,106,172,0.18)]"
                    : "border-transparent text-muted-foreground hover:border-white/50 hover:bg-white/60 hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Groups
            </h3>
            <Link href="/groups/new">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2.5 text-xs"
              >
                + New
              </Button>
            </Link>
          </div>
          <nav className="space-y-1.5">
            {groups?.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}/calendar`}>
                <span
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all",
                    pathname?.startsWith(`/groups/${group.id}`)
                      ? "border-white/75 bg-white/85 text-foreground shadow-[0_8px_18px_rgba(37,106,172,0.18)]"
                      : "border-transparent text-muted-foreground hover:border-white/50 hover:bg-white/60 hover:text-foreground"
                  )}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="rounded-full border border-white/65 bg-white/75 px-1.5 py-0.5 text-[11px] text-muted-foreground">
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
      <Separator className="bg-white/70" />
      <div className="relative p-4">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2">
          <UserAvatar
            name={session?.user?.username}
            image={session?.user?.image}
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold">
              @{session?.user?.username}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-xl border border-white/55 text-muted-foreground hover:text-foreground"
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
    <header className="md:hidden flex h-16 items-center justify-between border-b border-sky-200/70 bg-[linear-gradient(180deg,rgba(214,241,255,0.95)_0%,rgba(190,226,246,0.82)_100%)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
      <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
        FriendSync
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/settings">
          <UserAvatar
            name={session?.user?.username}
            image={session?.user?.image}
          />
        </Link>
      </div>
    </header>
  );
}
