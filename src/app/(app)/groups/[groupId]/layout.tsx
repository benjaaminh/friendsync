/**
 * Next.js layout component for a single group's nested pages and navigation. kind of a dashboard for the group
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!group || group.members.length === 0) notFound();

  return (
    <div className="space-y-4">
      <div className="aero-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80">
          Group Space
        </p>
        <h1 className="mt-1 text-2xl font-bold">{group.name}</h1>
        {group.description && (
          <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
        )}
      </div>
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 p-1 sm:w-fit">
          <Link href={`/groups/${groupId}/calendar`}>
            <TabsTrigger value="calendar" asChild className="px-3 py-1.5">
              <span>Calendar</span>
            </TabsTrigger>
          </Link>
          <Link href={`/groups/${groupId}/todos`}>
            <TabsTrigger value="todos" asChild className="px-3 py-1.5">
              <span>Todos</span>
            </TabsTrigger>
          </Link>
          <Link href={`/groups/${groupId}/photos`}>
            <TabsTrigger value="photos" asChild className="px-3 py-1.5">
              <span>Photos</span>
            </TabsTrigger>
          </Link>
          <Link href={`/groups/${groupId}/settings`}>
            <TabsTrigger value="settings" asChild className="px-3 py-1.5">
              <span>Settings</span>
            </TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
