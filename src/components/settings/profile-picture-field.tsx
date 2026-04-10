"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

interface ProfilePictureFieldProps {
  username?: string | null;
  initialImage?: string | null;
}

/**
 * Component for profile picture
 */
export function ProfilePictureField({
  username,
  initialImage,
}: ProfilePictureFieldProps) {
  const { update } = useSession();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialImage ?? null);

  async function saveAvatar(image: string | null) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save avatar");
    }

    setAvatarUrl(image);
    await update({ image });
  }

  async function handleAvatarUpload(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 4 MB");
      return;
    }

    setAvatarUploading(true);
    try {
      const signRes = await fetch("/api/user/avatar/sign", {
        method: "POST",
      });
      if (!signRes.ok) {
        const data = await signRes.json();
        throw new Error(data.error || "Failed to get upload signature");
      }
      const sign = await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sign.apiKey);
      formData.append("timestamp", String(sign.timestamp));
      formData.append("signature", sign.signature);
      formData.append("folder", sign.folder);
      formData.append("transformation", sign.transformation);
      formData.append("eager", sign.eager);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Cloudinary upload failed");

      const uploadData = await uploadRes.json();
      const image = uploadData.eager?.[0]?.secure_url || uploadData.secure_url;
      await saveAvatar(image);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarUploading(true);
    try {
      await saveAvatar(null);
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove photo");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Profile photo</Label>
      <div className="flex items-center gap-3">
        <UserAvatar name={username} image={avatarUrl} className="h-10 w-10" />

        <label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={avatarUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAvatarUpload(file);
              e.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={avatarUploading}
            asChild
          >
            <span>{avatarUploading ? "Uploading..." : "Upload"}</span>
          </Button>
        </label>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={avatarUploading || !avatarUrl}
          onClick={handleAvatarRemove}
        >
          Remove
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">JPEG, PNG or WebP up to 4 MB.</p>
    </div>
  );
}