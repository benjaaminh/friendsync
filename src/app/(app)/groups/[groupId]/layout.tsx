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
      <div>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.description && (
          <p className="text-muted-foreground">{group.description}</p>
        )}
      </div>
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <Link href={`/groups/${groupId}/calendar`}>
            <TabsTrigger value="calendar" asChild>
              <span>Calendar</span>
            </TabsTrigger>
          </Link>
          <Link href={`/groups/${groupId}/todos`}>
            <TabsTrigger value="todos" asChild>
              <span>Todos</span>
            </TabsTrigger>
          </Link>
          <Link href={`/groups/${groupId}/settings`}>
            <TabsTrigger value="settings" asChild>
              <span>Settings</span>
            </TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
