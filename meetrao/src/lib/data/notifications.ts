import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

export type NotificationKind = "booking_new" | "booking_cancelled" | "booking_changed";

export type NotificationView = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  bookingId: string | null;
  read: boolean;
  /** "2 hours ago", "Yesterday" — relative, because that is how recency reads. */
  when: string;
  at: string;
};

/** Anything older than this stops being news and starts being history. */
const PAGE = 100;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function relative(at: Date, now: number): string {
  const ago = now - at.getTime();
  if (ago < MINUTE) return "Just now";
  if (ago < HOUR) {
    const m = Math.floor(ago / MINUTE);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (ago < DAY) {
    const h = Math.floor(ago / HOUR);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(ago / DAY);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type Row = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  booking_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** One shape in, one shape out — so both backends land on the same view. */
function toView(rows: Row[]): NotificationView[] {
  const now = Date.now();
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    bookingId: n.booking_id,
    read: Boolean(n.read_at),
    when: relative(new Date(n.created_at), now),
    at: n.created_at,
  }));
}

export async function listNotifications(userId: string): Promise<NotificationView[]> {
  void userId; // the query is scoped by the caller's own identity
  const convex = await convexServer();
  const rows = await convex.query(api.notifications.listOwn, { limit: PAGE });
  return toView(rows as Row[]);
}

/** Just the badge. A count query, not a fetch-and-filter of the whole list. */
export async function unreadNotifications(userId: string): Promise<number> {
  void userId;
  const convex = await convexServer();
  return await convex.query(api.notifications.unreadCount, {});
}
