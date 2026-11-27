"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Callout } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { refreshCalendarFeed, removeCalendarFeed, saveCalendarFeed, saveVideoLink } from "@/lib/actions/settings";

/* ─────────────────────────────────────────────────────────────────────────────
   The two things a host sets up so bookings work without any calendar
   permission: their calendar's private feed address (conflicts) and their own
   video link (where "Video call" meetings happen). Used by Settings and by
   onboarding, so the two say the same thing.
   ───────────────────────────────────────────────────────────────────────────── */

export type FeedView = {
  connected: boolean;
  hint: string | null;
  state: "ok" | "unreachable" | null;
  fetchedAt: number | null;
  lastError: string | null;
};

function ago(ms: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function FeedHowTo() {
  return (
    <details className="text-[12.5px] leading-[1.55] text-ink-2">
      <summary className="cursor-pointer font-semibold text-ink">Where do I find this address?</summary>
      <ul className="mt-[6px] flex list-disc flex-col gap-[4px] pl-[18px]">
        <li>
          <strong>Google Calendar</strong> (on a computer): Settings, pick your calendar under &ldquo;Settings for
          my calendars&rdquo;, then Integrate calendar, and copy <em>Secret address in iCal format</em>.
        </li>
        <li>
          <strong>Outlook</strong>: Settings, Calendar, Shared calendars, Publish a calendar. Choose &ldquo;Can view
          when I&rsquo;m busy&rdquo;, publish, and copy the ICS link.
        </li>
        <li>
          <strong>iCloud</strong>: in the Calendar app, share the calendar, turn on Public Calendar and copy the link.
        </li>
      </ul>
      <p className="mt-[6px]">
        Treat the address like a password: anyone who has it can see that calendar. Meetrao keeps only when you are
        busy, never what the events are.
      </p>
    </details>
  );
}

export function FeedForm({ feed, compact = false }: { feed: FeedView; compact?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!feed.connected);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveCalendarFeed(url);
      if (r.error) {
        setError(r.error);
        return;
      }
      setUrl("");
      setEditing(false);
      toast({ tone: "ok", title: "Calendar feed added", text: "Busy times on it now block your booking page." });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-[12px]">
      {feed.connected && feed.state === "unreachable" ? (
        <Callout tone="red" title="Your calendar feed can't be read">
          {feed.lastError ?? "The last attempt to read it failed."} Until it can, only your Meetrao bookings block
          times. Check the address, or paste a fresh one.
        </Callout>
      ) : null}

      {feed.connected && !editing ? (
        <div className="flex flex-wrap items-center gap-[13px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
          <Icon name="calendar" size={17} className="flex-none text-accent-ink" />
          <div className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
            <span className="text-[13.5px] font-semibold text-ink">{feed.hint}</span>
            <span className="text-[12.5px] text-ink-3">
              {feed.state === "unreachable"
                ? "Unreachable"
                : feed.fetchedAt
                  ? `Checked ${ago(feed.fetchedAt)}`
                  : "Not checked yet"}
            </span>
          </div>
          <Button
            variant="secondary"
            size={30}
            busy={pending}
            onClick={() =>
              start(async () => {
                const r = await refreshCalendarFeed();
                toast(
                  r.error
                    ? { tone: "bad", title: "Couldn't read the feed", text: r.error }
                    : { tone: "ok", title: "Calendar checked", text: "Busy times are up to date." },
                );
                router.refresh();
              })
            }
          >
            Check now
          </Button>
          <Button variant="secondary" size={30} disabled={pending} onClick={() => setEditing(true)}>
            Replace
          </Button>
          <Button
            variant="secondary"
            size={30}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await removeCalendarFeed();
                toast(
                  r.error
                    ? { tone: "bad", title: "Could not remove it", text: r.error }
                    : { tone: "warn", title: "Calendar feed removed", text: "Only Meetrao bookings block times now." },
                );
                setEditing(true);
                router.refresh();
              })
            }
          >
            Remove
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-[10px]"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field
            label="Your calendar's private iCal address"
            htmlFor="feed-url"
            error={error ?? undefined}
            help={
              compact
                ? undefined
                : "It's checked for busy times only. We store it privately and never show it in full again."
            }
          >
            <Input
              id="feed-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
              value={url}
              invalid={Boolean(error)}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <div className="flex gap-[8px]">
            <Button type="submit" variant="accent" size={30} busy={pending} disabled={!url.trim()}>
              {feed.connected ? "Save new address" : "Add calendar"}
            </Button>
            {feed.connected ? (
              <Button variant="secondary" size={30} disabled={pending} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      )}

      <FeedHowTo />
      <Help>
        Google can take a few hours to update its feed, so an event you just added may not block a time straight
        away. Outlook and iCloud are usually quicker.
      </Help>
    </div>
  );
}

export function VideoLinkForm({ initial }: { initial: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [link, setLink] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = link.trim() !== (initial ?? "");

  return (
    <form
      className="flex flex-col gap-[10px]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await saveVideoLink(link);
          if (r.error) {
            setError(r.error);
            return;
          }
          toast({
            tone: "ok",
            title: link.trim() ? "Video link saved" : "Video link removed",
            text: link.trim() ? "New video call bookings will use it." : "Video call meetings can't be booked until you add one.",
          });
          router.refresh();
        });
      }}
    >
      <Field
        label="Your video meeting link"
        htmlFor="video-link"
        error={error ?? undefined}
        help="Your personal Zoom, Google Meet, Teams or Whereby room. Guests on a Video call meeting get this link in their invitation."
      >
        <Input
          id="video-link"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://zoom.us/j/1234567890"
          value={link}
          invalid={Boolean(error)}
          onChange={(e) => setLink(e.target.value)}
        />
      </Field>
      <div>
        <Button type="submit" variant="accent" size={30} busy={pending} disabled={!dirty}>
          Save link
        </Button>
      </div>
    </form>
  );
}
