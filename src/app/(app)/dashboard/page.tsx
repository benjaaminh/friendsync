/**
 * Next.js page component for the /(app)/dashboard route segment.
 * This page acts as the starting page for the application
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JoinWithCode } from "@/components/groups/join-with-code";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const groups = await prisma.group.findMany({
    // get all users groups with members
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, image: true } } },
        take: 5,
      },
      _count: { select: { members: true, todos: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6 aero-page">
      <section className="aero-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            Welcome back, {session.user.username}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <JoinWithCode /> {/* join a group with code */}
          <Link href="/groups/new">
            <Button>Create Group</Button>
          </Link>
        </div>
      </section>

      {groups.length === 0 ? ( // if no groups exist?
        <Card className="aero-panel border-0">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-semibold">No groups yet</h3>
            <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
              Create a group and invite your friends to plan events together.
            </p>
            <Link href="/groups/new">
              <Button>Create Your First Group</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => ( // if they exist, render all
            <Link key={group.id} href={`/groups/${group.id}/calendar`}> {/* navigate to specific group */}
              <Card className="h-full cursor-pointer border-white/65 transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-[0_16px_30px_rgba(36,104,168,0.2)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-3">
                    <Badge variant="secondary">
                      {group._count.members} member{group._count.members !== 1 ? "s" : ""}
                    </Badge>
                    {group._count.todos > 0 && (
                      <Badge variant="outline">
                        {group._count.todos} todo{group._count.todos !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex -space-x-2">
                    {group.members.map((member) => ( //the members of the group
                      <div
                        key={member.user.id}
                        className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white/80 text-xs font-medium"
                        title={member.user.username}
                      >
                        {member.user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.user.image}
                            alt={member.user.username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          member.user.username.charAt(0).toUpperCase() // render the first letter of the username as fallback avatar
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
