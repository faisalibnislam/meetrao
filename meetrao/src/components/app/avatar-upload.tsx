"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { initialsOf } from "@/lib/initials";
import { setAvatarUrl } from "@/lib/actions/avatar";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Uploads straight from the browser to the `avatars` bucket. The object path is
 * `<user id>/avatar-<timestamp>.<ext>`; storage RLS ties that first segment to
 * the signed-in user, and the timestamp busts the CDN cache on replacement.
 */
export function AvatarUpload({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null;
  initials: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      notify("bad", "Unsupported file", "Use a PNG, JPEG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      notify("bad", "That image is too large", "Keep photos under 2 MB.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      notify("bad", "You are signed out", "Sign in again to upload a photo.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      notify("bad", "Upload failed", error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    startTransition(async () => {
      const result = await setAvatarUrl(publicUrl);
      if (!result.ok) {
        notify("bad", "Could not save", result.message ?? "Try again.");
        return;
      }
      setUrl(publicUrl);
      notify("ok", "Photo updated", "Guests see it on your booking page.");
    });
  }

  return (
    <>
      {url ? (
        <Image
          src={url}
          alt=""
          width={42}
          height={42}
          unoptimized
          className="size-[42px] flex-none rounded-[8px] object-cover"
        />
      ) : (
        <Avatar initials={initialsOf(initials)} size={42} />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />

      <Button
        variant="secondary"
        size="md"
        loading={pending}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="upload" size={11} />
        Upload photo
      </Button>
    </>
  );
}
