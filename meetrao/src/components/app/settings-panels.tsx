"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Badge, Eyebrow } from "@/components/ui/badge";
import { AvatarUpload } from "./avatar-upload";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Help, Input, Switch } from "@/components/ui/controls";
import { GoogleG } from "@/components/ui/logo";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal } from "@/components/ui/modal";
import { Callout, Card, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { checkUsername } from "@/lib/actions/onboarding";
import {
  changePassword,
  deleteOwnAccount,
  disconnectCalendar,
  saveBookingDefaults,
  saveNotifications,
  saveProfile,
  saveTimezone,
} from "@/lib/actions/settings";
import { cx } from "@/lib/cx";
import type { TimezoneOption } from "@/lib/timezones";
import type { NotificationKey, Profile } from "@/lib/types";
import { bookingLink, isBadStatus, sanitizeUsername, usernameNote, usernameStatus, type UsernameStatus } from "@/lib/username";

const DURATIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
];

const NOTICES = [
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "240", label: "4 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
];

const NOTIFY_ROWS: { key: NotificationKey; label: string; text: string }[] = [
  { key: "notify_new_booking", label: "New booking", text: "When someone books a time with you." },
  { key: "notify_booking_changed", label: "Booking changed", text: "When a booking is rescheduled or edited." },
  { key: "notify_booking_cancelled", label: "Booking cancelled", text: "When you or your guest cancels." },
  {
    key: "notify_reminders",
    label: "Meeting reminders",
    text: "A nudge the day before and an hour before. Your guest is reminded either way.",
  },
  { key: "notify_daily_agenda", label: "Daily agenda", text: "One email each morning listing the day’s meetings." },
  { key: "notify_product_news", label: "Product news", text: "Occasional updates about new Meetrao features." },
];

/** "Save changes" → "Saving…" → "Saved". */
function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <Button variant="accent" size={34} busy={saving} onClick={onClick}>
      {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
    </Button>
  );
}

/* ── Profile ──────────────────────────────────────────────────────────────── */

export function ProfilePanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState(profile.full_name);
  const [jobTitle, setJobTitle] = useState(profile.job_title);
  const [username, setUsername] = useState(profile.username);
  const [status, setStatus] = useState<UsernameStatus>("empty");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function editUsername(next: string) {
    const clean = sanitizeUsername(next);
    setUsername(clean);
    setSaved(false);
    setIdeas([]);

    clearTimeout(timer.current);
    if (clean === profile.username) {
      setStatus("empty");
      return;
    }

    const syntax = usernameStatus(clean);
    setStatus(syntax);
    if (syntax !== "checking") return;

    const ticket = ++latest.current;
    timer.current = setTimeout(async () => {
      const result = await checkUsername(clean);
      if (ticket !== latest.current) return;
      setStatus(result.status);
      setIdeas(result.ideas);
    }, 620);
  }

  const changed = username !== profile.username;
  const bad = isBadStatus(status);
  const ok = status === "ok";
  const note = changed
    ? usernameNote(status, username, ideas.length > 0) || "Checking availability…"
    : `Your links are meetrao.com/${profile.username}/ and the meeting's name.`;

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading title="Profile" subtitle="How you appear to guests on your booking page." />

      <AvatarUpload name={fullName || profile.username} initialUrl={profile.avatar_url} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[13px]">
        <Field label="Name" htmlFor="prof-name">
          <Input
            id="prof-name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
          />
        </Field>

        <Field label="Job title" htmlFor="prof-title">
          <Input
            id="prof-title"
            value={jobTitle}
            onChange={(e) => {
              setJobTitle(e.target.value);
              setSaved(false);
            }}
          />
        </Field>

        <Field label="Email" htmlFor="prof-email" help="Change this from the Account tab.">
          <Input id="prof-email" type="email" value={profile.email} readOnly disabled />
        </Field>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="prof-link" className="text-[12.5px] font-semibold text-ink">
            Link name
          </label>

          <div
            className={cx(
              "box-border flex h-[34px] w-full items-center rounded-[6px] border bg-surface transition-[border-color] duration-[140ms]",
              ok ? "border-accent" : bad ? "border-red" : "border-line-strong",
            )}
          >
            <span aria-hidden="true" className="flex-none pl-[11px] text-[13px] text-ink-3">
              meetrao.com/
            </span>
            <input
              id="prof-link"
              type="text"
              value={username}
              onChange={(e) => editUsername(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-describedby="prof-status"
              aria-invalid={bad}
              className="h-full min-w-0 flex-1 border-0 bg-transparent py-0 pr-[11px] pl-[1px] text-[13px] font-medium text-ink outline-none"
            />
            {status === "checking" && changed ? (
              <span
                aria-hidden="true"
                className="animate-spin-slow mr-[11px] h-[12px] w-[12px] flex-none rounded-full border-2 border-line-strong border-t-accent"
              />
            ) : null}
            {changed && (ok || status === "taken") ? (
              <Icon
                name={ok ? "check" : "xmark"}
                weight="solid"
                size={11}
                className={cx("mr-[11px] flex-none", ok ? "text-accent-ink" : "text-red")}
              />
            ) : null}
          </div>

          <span
            id="prof-status"
            role="status"
            aria-live="polite"
            className={cx(
              "block min-h-[18px] text-[12px] leading-[1.5]",
              ok ? "text-accent-ink" : bad ? "text-red" : "text-ink-3",
            )}
          >
            {note}
          </span>

          {changed && status === "taken" && ideas.length ? (
            <div role="group" aria-label="Available alternatives" className="flex flex-wrap gap-[6px] pt-[2px]">
              {ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => editUsername(idea)}
                  className="inline-flex h-[28px] cursor-pointer items-center gap-[7px] rounded-[6px] border border-accent-line bg-accent-soft px-[10px] text-[12px] text-accent-ink transition-colors duration-[120ms] hover:bg-[var(--accent-soft-hover)]"
                >
                  <Icon name="plus" size={9} />
                  {idea}
                </button>
              ))}
            </div>
          ) : null}

          {changed && ok ? (
            <Callout tone="amber">
              Changing this breaks your old link.{" "}
              <span className="font-semibold text-ink">{bookingLink(profile.username)}</span> will stop working, and anyone
              who saved it sees a page-not-found. Existing bookings are unaffected.
            </Callout>
          ) : null}
        </div>
      </div>

      <div>
        <SaveButton
          saving={saving}
          saved={saved}
          onClick={() =>
            startSave(async () => {
              if (changed && !ok) {
                toast({
                  tone: "bad",
                  title: "Can't save yet",
                  text: status === "taken" ? "That booking link is already taken." : "Fix your booking link first.",
                });
                return;
              }
              const result = await saveProfile({ fullName, jobTitle, username });
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              setSaved(true);
              setStatus("empty");
              toast({ tone: "ok", title: "Settings saved", text: "Your changes are live." });
              router.refresh();
            })
          }
        />
      </div>
    </div>
  );
}

/* ── Calendar ─────────────────────────────────────────────────────────────── */

export function CalendarPanel({
  connected,
  accountEmail,
  timezone,
  timezones,
  failure,
}: {
  connected: boolean;
  accountEmail: string | null;
  timezone: string;
  timezones: TimezoneOption[];
  failure: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startAction] = useTransition();

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading
        title="Calendar"
        subtitle="Meetrao checks this calendar for conflicts, then writes each booking to it and invites your guest."
      />

      {failure ? (
        <Callout tone="red" title="Couldn't connect to Google">
          {failure}
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-[13px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <Icon name="calendar" size={17} className="flex-none text-accent-ink" />
        <div className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">Google Calendar</span>
          <span className="text-[12.5px] text-ink-3">
            {connected ? (accountEmail ?? "Connected") : "Not connected"}
          </span>
        </div>
        <Badge tone={connected ? "ok" : "off"}>{connected ? "Connected" : "Disconnected"}</Badge>

        {connected ? (
          <Button
            variant="secondary"
            size={30}
            busy={pending}
            onClick={() =>
              startAction(async () => {
                /* The result is READ. It used to be discarded, so the warm
                   "Calendar disconnected" toast fired over a calendar that was
                   still connected, the card said Connected, the toast said
                   otherwise, and the toast was the one that was lying. */
                const r = await disconnectCalendar();
                toast(
                  r.error
                    ? { tone: "bad", title: "Could not disconnect", text: r.error }
                    : {
                        tone: "warn",
                        title: "Calendar disconnected",
                        text: "Meetrao can no longer check for conflicts.",
                      },
                );
                router.refresh();
              })
            }
          >
            Disconnect
          </Button>
        ) : (
          <ButtonLink variant="accent" size={30} href="/api/google/connect?next=/settings/calendar">
            <GoogleG size={13} />
            Connect
          </ButtonLink>
        )}
      </div>

      <div className="flex max-w-[320px] flex-col gap-[6px]">
        <span className="text-[12.5px] font-semibold text-ink">Timezone</span>
        <MenuSelect
          searchable
          aria-label="Timezone"
          options={timezones}
          value={timezone}
          onChange={(v) =>
            startAction(async () => {
              const result = await saveTimezone(v);
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              toast({ tone: "ok", title: "Timezone saved", text: "Your hours are read in this zone." });
              router.refresh();
            })
          }
        />
      </div>
    </div>
  );
}

/* ── Booking defaults ─────────────────────────────────────────────────────── */

export function BookingPanel({ profile }: { profile: Profile }) {
  const toast = useToast();
  const [duration, setDuration] = useState(String(profile.default_duration_minutes));
  const [notice, setNotice] = useState(String(profile.default_notice_minutes));
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading title="Booking defaults" subtitle="Applied to every new meeting you create." />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(186px,1fr))] gap-[13px]">
        <div className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Default duration</span>
          <MenuSelect
            aria-label="Default duration"
            options={DURATIONS}
            value={duration}
            onChange={(v) => {
              setDuration(v);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Default minimum notice</span>
          <MenuSelect
            aria-label="Default minimum notice"
            options={NOTICES}
            value={notice}
            onChange={(v) => {
              setNotice(v);
              setSaved(false);
            }}
          />
        </div>
      </div>

      <div>
        <SaveButton
          saving={saving}
          saved={saved}
          onClick={() =>
            startSave(async () => {
              const result = await saveBookingDefaults({ duration: Number(duration), notice: Number(notice) });
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              setSaved(true);
              toast({ tone: "ok", title: "Settings saved", text: "Your changes are live." });
            })
          }
        />
      </div>
    </div>
  );
}

/* ── Notifications ────────────────────────────────────────────────────────── */

export function NotificationsPanel({ profile }: { profile: Profile }) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Record<NotificationKey, boolean>>({
    notify_new_booking: profile.notify_new_booking,
    notify_booking_changed: profile.notify_booking_changed,
    notify_booking_cancelled: profile.notify_booking_cancelled,
    // Absent means on, as it does in the sweep that reads it.
    notify_reminders: profile.notify_reminders !== false,
    notify_daily_agenda: profile.notify_daily_agenda,
    notify_product_news: profile.notify_product_news,
  });
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading
        title="Email notifications"
        subtitle="Choose what Meetrao emails you about. Your guests always get their own booking confirmations."
      />

      <Card>
        {NOTIFY_ROWS.map((row, i) => (
          <div
            key={row.key}
            className={cx(
              "flex flex-wrap items-center gap-[14px] px-[15px] py-[13px]",
              i > 0 && "border-t border-line-soft",
            )}
          >
            <div className="flex min-w-[180px] flex-1 flex-col gap-[2px]">
              <span className="text-[13.5px] font-semibold text-ink">{row.label}</span>
              <span className="text-[12.5px] leading-[1.45] text-ink-3">{row.text}</span>
            </div>
            <Switch
              checked={prefs[row.key]}
              label={row.label}
              onChange={(next) => {
                setPrefs((p) => ({ ...p, [row.key]: next }));
                setSaved(false);
              }}
            />
          </div>
        ))}
      </Card>

      <span className="text-[12px] leading-[1.5] text-ink-3">
        Turning everything off does not stop the emails your guests receive, or password and security emails.
      </span>

      <div>
        <SaveButton
          saving={saving}
          saved={saved}
          onClick={() =>
            startSave(async () => {
              const result = await saveNotifications(prefs);
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              setSaved(true);
              toast({ tone: "ok", title: "Settings saved", text: "Your changes are live." });
            })
          }
        />
      </div>
    </div>
  );
}

/* ── Account ──────────────────────────────────────────────────────────────── */

export function AccountPanel({
  profile,
  verified,
  onSignOut,
}: {
  profile: Profile;
  verified: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"password" | "delete" | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, startAction] = useTransition();

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading title="Account" subtitle="Sign-in and account removal." />

      <div className="flex flex-wrap items-center gap-[12px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
        <div className="flex min-w-[170px] flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">Email address</span>
          <span className="text-[12px] text-ink-3">{profile.email}</span>
        </div>
        <Badge tone={verified ? "ok" : "warn"}>{verified ? "Verified" : "Unverified"}</Badge>
      </div>

      <div className="flex items-center gap-[14px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">Password</span>
          <span className="text-[12.5px] text-ink-3">Used to sign in with your email address.</span>
        </div>
        <Button variant="secondary" size={30} className="flex-none" onClick={() => setDialog("password")}>
          Change
        </Button>
      </div>

      <div className="flex items-center gap-[14px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-red">Delete account</span>
          <span className="text-[12.5px] leading-[1.45] text-red-ink">
            Removes your booking page and cancels every upcoming meeting.
          </span>
        </div>
        <Button variant="danger" size={30} className="flex-none" onClick={() => setDialog("delete")}>
          Delete
        </Button>
      </div>

      <div>
        <Button variant="secondary" size={32} icon="sign-out" onClick={onSignOut}>
          Log out
        </Button>
      </div>

      <Modal
        open={dialog === "password"}
        onClose={() => setDialog(null)}
        title="Change password"
        primary={{
          label: busy ? "Updating…" : "Update password",
          busy,
          onClick: () =>
            startAction(async () => {
              const result = await changePassword({ current, next });
              if (result.error) {
                toast({ tone: "bad", title: "Could not update", text: result.error });
                return;
              }
              setDialog(null);
              setCurrent("");
              setNext("");
              toast({ tone: "ok", title: "Password updated", text: "Use it next time you sign in." });
            }),
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <div className="flex flex-col gap-[13px]">
          <Field label="Current password" htmlFor="current-password">
            <Input
              id="current-password"
              type="password"
              placeholder="••••••••"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <Field label="New password" htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <Help>At least 8 characters.</Help>
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="Delete your account?"
        primary={{
          label: busy ? "Deleting…" : "Delete account",
          variant: "danger",
          busy,
          onClick: () =>
            startAction(async () => {
              const result = await deleteOwnAccount();
              if (result.error) {
                toast({ tone: "bad", title: "Could not delete", text: result.error });
                return;
              }
              router.replace("/login");
            }),
        }}
        secondary={{ label: "Keep my account", onClick: () => setDialog(null) }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          This removes your booking page, meetings and availability for good. Upcoming meetings will be cancelled
          and your guests notified. This cannot be undone.
        </span>
      </Modal>
    </div>
  );
}

export { Eyebrow };
