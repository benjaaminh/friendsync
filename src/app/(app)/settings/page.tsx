/**
 * Next.js page component for the /(app)/settings route segment.
 */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProfilePictureField } from "@/components/settings/profile-picture-field";
import { getAvailableTimezones } from "@/lib/timezones";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserSettingsPage() {
  const { data: session } = useSession();
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [timezones] = useState(getAvailableTimezones);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data.timezone) setTimezone(data.timezone);
        setUserImage(data.image ?? null);
      });
  }, []);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  // automatic timezone
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="max-w-md space-y-6">
      <div className="aero-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80">
          Settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Username:</span>{" "}
            @{session?.user?.username}
          </div>
          <ProfilePictureField
            username={session?.user?.username}
            initialImage={userImage ?? session?.user?.image ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Your timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => ( // list timezones
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")} {/* replace underscores with space for user readability */}
                    {tz === detectedTimezone ? " (detected)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Detected: {detectedTimezone}
            </p>
          </div>
          <Button onClick={handleSave} disabled={loading} size="sm">
            {loading ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
