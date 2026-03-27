/**
 * Upload button that handles Cloudinary signed uploads for event photos.
 */
"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

interface PhotoUploadProps {
  groupId: string;
  todoId: string;
  onUploaded: () => void;
}

export function PhotoUpload({ groupId, todoId, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 4 MB");
      return;
    }

    setUploading(true);
    try {
      // 1. Get signed upload params from our API
      const signRes = await fetch(`/api/groups/${groupId}/photos/sign`, {
        method: "POST",
      });
      if (!signRes.ok) {
        const data = await signRes.json();
        throw new Error(data.error || "Failed to get upload signature");
      }
      const sign = await signRes.json();

      // 2. Upload directly to Cloudinary
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

      // 3. Save metadata to our DB
      const thumbnailUrl =
        uploadData.eager?.[0]?.secure_url || uploadData.secure_url;

      const saveRes = await fetch(`/api/groups/${groupId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todoId,
          cloudinaryId: uploadData.public_id,
          url: uploadData.secure_url,
          thumbnailUrl,
          width: uploadData.width,
          height: uploadData.height,
        }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        throw new Error(data.error || "Failed to save photo");
      }

      toast.success("Photo uploaded!");
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading..." : "Add Photo"}
      </Button>
    </>
  );
}
