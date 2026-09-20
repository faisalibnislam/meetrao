"use client";

import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { clearAvatar, saveAvatar, saveAvatarFromStorageId, avatarUploadUrl } from "@/lib/actions/avatar";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AvatarCropper } from "./avatar-cropper";

/* The photo is uploaded from the browser, against the host's own session, so
   the storage policy is what decides — not a server action holding the service
   role. The path starts with their user id, which is exactly what
   `avatars_insert_own` checks. */

const BUCKET = "avatars";

/** The bucket rejects anything larger, and it is a 512px square in the end. */
const MAX_BYTES = 2 * 1024 * 1024;

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function AvatarUpload({
  userId,
  name,
  initialUrl,
}: {
  userId: string;
  name: string;
  initialUrl: string | null;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [file, setFile] = useState<File | null>(null);
  // Bumped on every pick so the cropper remounts with fresh zoom and offset.
  const [pick, setPick] = useState(0);
  const [saving, startSave] = useTransition();

  function choose(picked: File | null) {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      toast({ tone: "bad", title: "That image is too large", text: "Pick one under 2MB." });
      return;
    }
    setFile(picked);
    setPick((n) => n + 1);
  }

  function upload(blob: Blob) {
    startSave(async () => {
      // Timestamped, so a replaced photo is never served from a stale cache at
      // the same URL. The old object is deleted server-side once this is saved.
      /* Convex: ask for a one-time upload URL, post the bytes, hand back the
         storage id. The client never names a path, so there is nothing to
         forge — which is what replaces the old storage policy. */
      // The server decides which storage this deployment uses.
      const ticket = await avatarUploadUrl();
      if (ticket.error) {
        toast({ tone: "bad", title: "Upload failed", text: ticket.error });
        return;
      }

      if (ticket.url) {
        const posted = await fetch(ticket.url, {
          method: "POST",
          headers: { "Content-Type": "image/webp" },
          body: blob,
        });
        if (!posted.ok) {
          toast({ tone: "bad", title: "Upload failed", text: "The image could not be stored." });
          return;
        }

        const { storageId } = (await posted.json()) as { storageId: string };
        const saved = await saveAvatarFromStorageId(storageId);
        if (saved.error) {
          toast({ tone: "bad", title: "Could not save", text: saved.error });
          return;
        }

        setUrl(saved.url ?? null);
        setFile(null);
        toast({ tone: "ok", title: "Photo updated", text: "Guests will see it on your booking page." });
        return;
      }

      // Timestamped, so a replaced photo is never served from a stale cache at
      // the same URL. The old object is deleted server-side once this is saved.
      const path = `${userId}/avatar-${Date.now()}.webp`;

      const { error } = await supabaseBrowser()
        .storage.from(BUCKET)
        .upload(path, blob, { contentType: "image/webp", upsert: true });

      if (error) {
        toast({ tone: "bad", title: "Upload failed", text: error.message });
        return;
      }

      const result = await saveAvatar(path);
      if (result.error) {
        toast({ tone: "bad", title: "Could not save", text: result.error });
        return;
      }

      setUrl(result.url ?? null);
      setFile(null);
      toast({ tone: "ok", title: "Photo updated", text: "Guests will see it on your booking page." });
    });
  }

  function remove() {
    startSave(async () => {
      const result = await clearAvatar();
      if (result.error) {
        toast({ tone: "bad", title: "Could not remove", text: result.error });
        return;
      }
      setUrl(null);
      toast({ tone: "neutral", title: "Photo removed", text: "Your initials are shown instead." });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-[14px] border-b border-line pb-[15px]">
      <Avatar name={name} size={42} src={url} />

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          choose(e.target.files?.[0] ?? null);
          // Reset, so picking the same file twice still fires a change.
          e.target.value = "";
        }}
      />

      <Button variant="secondary" size={30} icon="upload" disabled={saving} onClick={() => input.current?.click()}>
        {url ? "Change photo" : "Upload photo"}
      </Button>

      {url ? (
        <Button variant="ghost" size={30} disabled={saving} onClick={remove}>
          Remove
        </Button>
      ) : null}

      <AvatarCropper key={pick} file={file} busy={saving} onCancel={() => setFile(null)} onCropped={upload} />
    </div>
  );
}
