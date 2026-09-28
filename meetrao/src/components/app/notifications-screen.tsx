"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { clearRead, markAllRead, markRead } from "@/lib/actions/notifications";
import type { NotificationKind, NotificationView } from "@/lib/data/notifications";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Notifications.

   Every row is written by a database trigger, so this screen only ever changes
   one thing: whether something has been seen. That keeps it honest — there is
   no state here that can disagree with what actually happened.

   Unread is the default view, because the question this screen answers is
   "what did I miss", not "what has ever happened". The whole list is one click
   away.
   ───────────────────────────────────────────────────────────────────────────── */

const LOOK: Record<NotificationKind, { icon: IconName; ring: string; tint: string; label: string }> = {
  booking_new: { icon: "calendar", ring: "border-accent-line bg-accent-soft", tint: "text-accent", label: "New booking" },
  booking_cancelled: { icon: "circle-xmark", ring: "border-red-line bg-red-soft", tint: "text-red", label: "Cancelled" },
  booking_changed: { icon: "rotate-left", ring: "border-amber-line bg-amber-soft", tint: "text-amber", label: "Moved" },
  /* Amber, not red: the guest said no in their calendar, which is news — but
     the meeting is still in the diary until somebody cancels it. */
  booking_declined: { icon: "circle-exclamation", ring: "border-amber-line bg-amber-soft", tint: "text-amber", label: "Declined" },
};

export function NotificationsScreen({ notifications }: { notifications: NotificationView[] }) {
  const toast = useToast();
  const [onlyUnread, setOnlyUnread] = useState(true);
  const [busy, startBusy] = useTransition();

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const shown = onlyUnread ? notifications.filter((n) => !n.read) : notifications;

  function run(work: () => Promise<{ error?: string }>, ok: string) {
    startBusy(async () => {
      const result = await work();
      if (result.error) return toast({ tone: "bad", title: "That did not work", text: result.error });
      toast({ tone: "ok", title: ok });
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <div className="flex flex-wrap items-center gap-[10px] border-b border-line pb-[14px]">
        <div className="flex gap-[6px]">
          {(
            [
              [true, "Unread", unread],
              [false, "All", notifications.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={label}
              type="button"
              aria-pressed={onlyUnread === value}
              onClick={() => setOnlyUnread(value)}
              className={cx(
                "inline-flex h-[30px] cursor-pointer items-center gap-[7px] rounded-[6px] border px-[11px] text-[12.5px]",
                "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
                onlyUnread === value
                  ? "border-accent bg-accent font-semibold text-white"
                  : "border-line-strong bg-surface font-medium text-ink hover:bg-fill",
              )}
            >
              {label}
              <span
                className={cx(
                  "inline-flex h-[17px] min-w-[18px] items-center justify-center rounded-[4px] px-[5px] text-[10.5px] font-semibold",
                  onlyUnread === value ? "bg-white/20 text-white" : "bg-fill-2 text-ink-2",
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap gap-[8px]">
          <Button
            variant="secondary"
            size={30}
            icon="check"
            disabled={unread === 0}
            busy={busy}
            onClick={() => run(markAllRead, "All caught up")}
          >
            Mark all as read
          </Button>
          <Button
            variant="ghost"
            size={30}
            disabled={notifications.length === unread}
            busy={busy}
            onClick={() => run(clearRead, "Read notifications cleared")}
          >
            Clear read
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={onlyUnread ? "Nothing unread" : "No notifications yet"}
          text={
            onlyUnread
              ? "You are caught up. Switch to All to see everything that has happened."
              : "Bookings, cancellations and changes will appear here as they happen."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
          {shown.map((n, i) => {
            const look = LOOK[n.kind];
            return (
              <div
                key={n.id}
                className={cx(
                  "flex flex-wrap items-start gap-[12px] px-[15px] py-[13px] transition-colors duration-[120ms]",
                  i > 0 && "border-t border-line-soft",
                  n.read ? "bg-surface hover:bg-fill" : "bg-accent-soft/35 hover:bg-accent-soft/55",
                )}
              >
                <span
                  className={cx(
                    "inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] border",
                    look.ring,
                    look.tint,
                  )}
                >
                  <Icon name={look.icon} weight={n.kind === "booking_cancelled" ? "solid" : "light"} size={13} />
                </span>

                <div className="flex min-w-[200px] flex-1 flex-col gap-[2px]">
                  <span className="flex flex-wrap items-center gap-[8px]">
                    {/* The dot, not a bold title: weight is already doing work
                        for the meeting name inside the sentence. */}
                    {!n.read ? (
                      <span aria-label="Unread" className="h-[6px] w-[6px] flex-none rounded-full bg-accent" />
                    ) : null}
                    <span className={cx("text-[13.5px]", n.read ? "font-medium text-ink-2" : "font-semibold text-ink")}>
                      {n.title}
                    </span>
                  </span>
                  {n.body ? <span className="text-[12.5px] text-ink-3">{n.body}</span> : null}
                  <span className="flex flex-wrap items-center gap-[7px] pt-[2px]">
                    <span className="text-[11.5px] text-ink-3">{n.when}</span>
                    <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-line-strong" />
                    <span className="text-[11.5px] text-ink-3">{look.label}</span>
                  </span>
                </div>

                <div className="flex flex-none flex-wrap items-center gap-[6px]">
                  {n.bookingId ? (
                    <Link
                      href="/bookings"
                      className="unlink inline-flex h-[28px] items-center rounded-[6px] border border-transparent px-[10px] text-[12.5px] font-semibold text-ink-2 hover:bg-fill hover:text-ink"
                    >
                      View
                    </Link>
                  ) : null}
                  <Button
                    variant="ghost"
                    size={28}
                    busy={busy}
                    onClick={() => run(() => markRead(n.id, !n.read), n.read ? "Marked unread" : "Marked read")}
                  >
                    {n.read ? "Mark unread" : "Mark read"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
