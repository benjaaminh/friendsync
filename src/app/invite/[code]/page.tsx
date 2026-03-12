/**
 * Next.js page component for accepting a group invite using an invite code.
 */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InviteInfo {
  groupName: string;
  groupDescription: string | null;
  memberCount: number;
  error?: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const code = params.code as string;

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInfo(data);
        }
      })
      .catch(() => setError("Failed to load invite"));
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await fetch(`/api/invite/${code}`, { method: "POST" });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.alreadyMember) {
        toast.info("You're already in this group");
      } else {
        toast.success(`Joined ${data.groupName}!`);
      }

      router.push(`/groups/${data.groupId}/calendar`);// go to group calendar
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Ask the group admin for a new invite link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    /* group info */
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Join {info.groupName}</CardTitle>
          {info.groupDescription && (
            <CardDescription>{info.groupDescription}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Badge variant="secondary">
            {info.memberCount} member{info.memberCount !== 1 ? "s" : ""}
          </Badge>

          {status === "loading" ? (
            <p className="text-sm text-muted-foreground">Checking session...</p>
          ) : session?.user ? ( // if logged in
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Signed in as @{session.user.username}
              </p>
              {/* join it */}
              <Button className="w-full" onClick={handleJoin} disabled={joining}>
                {joining ? "Joining..." : "Join Group"}
              </Button>
            </div>
          ) : (
            //sign in if not logged in
            <Button
              className="w-full"
              onClick={() =>
                signIn(undefined, {
                  callbackUrl: `/invite/${code}`,
                })
              }
            >
              Sign in to Join
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
