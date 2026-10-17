"use client";

import Link from "next/link";
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
  saveReminderTiming,
} from "@/lib/actions/settings";
import { cx } from "@/lib/cx";
import { LONG_OPTIONS, SHORT_OPTIONS, leadsOf, remindersText } from "@/lib/reminder-timing";
import type { NotificationKey, Profile } from "@/lib/types";
import { UpgradeHint } from "./upgrade";
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

/* The same lists a meeting offers, in src/components/app/meeting-form.tsx.
   A default is copied onto a new meeting as it stands, so it can only be
   something that form can show. */
const BUFFERS = [
  { value: "0", label: "None" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
];

const WINDOWS = [
  { value: "7", label: "7 days ahead" },
  { value: "14", label: "14 days ahead" },
  { value: "30", label: "30 days ahead" },
  { value: "60", label: "60 days ahead" },
];

const NOTIFY_ROWS: { key: NotificationKey; label: string; text: string }[] = [
  { key: "notify_new_booking", label: "New booking", text: "When someone books a time with you." },
  { key: "notify_booking_changed", label: "Booking changed", text: "When a booking is rescheduled or edited." },
  { key: "notify_booking_cancelled", label: "Booking cancelled", text: "When you or your guest cancels." },
  // The text is replaced at render with the configured times; see remindersText.
  { key: "notify_reminders", label: "Meeting reminders", text: "" },
  { key: "notify_daily_agenda", label: "Daily agenda", text: "One email each morning listing the day’s meetings." },
  { key: "notify_product_news", label: "Product news", text: "Occasional updates about new Meetrao features." },
];

/**
 * Why the email cannot be edited here, and who can change it.
 *
 * Said the same way on Profile and Account, because the two screens used to
 * point at each other: Profile sent people to Account, which only showed the
 * address. A support link is the honest answer while there is no
 * self-service change.
 */
function EmailHelp() {
  return (
    <>
      This is the address you sign in with. To change it,{" "}
      <Link href="/support" className="font-semibold">
        contact support
      </Link>
      .
    </>
  );
}

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

        {/* This used to send people to the Account tab to change it, and the
            Account tab has no way to change it. Convex Auth has no
            change-of-address flow: the address is the id of the password
            and email-link accounts, and the key Google and Apple sign-in
            link on, so swapping it safely means verifying the new address
            and moving every one of those records together. Until that exists
            support does it by hand, and the help text says so. */}
        <Field label="Email" htmlFor="prof-email" help={<EmailHelp />}>
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
  timezoneLabel,
  failure,
}: {
  connected: boolean;
  accountEmail: string | null;
  /** The host's zone as the timezone menus word it, e.g. "London (GMT+1)". */
  timezoneLabel: string;
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

      {/* One status line and one button. This card used to say it three
          times over when disconnected: "Not connected" under the name, a
          Disconnected badge beside it, and a Connect button, and the badge
          added nothing the other two had not. The line under the name is the
          status; the button is what to do about it. */}
      <div className="flex flex-wrap items-center gap-[13px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <Icon name="calendar" size={17} className="flex-none text-accent-ink" />
        <div className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">Google Calendar</span>
          <span className="text-[12.5px] text-ink-3">
            {connected ? (accountEmail ? `Connected as ${accountEmail}` : "Connected") : "Not connected"}
          </span>
        </div>

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

      {/* Read here, set on Availability. The zone used to be editable in
          both places, and two controls for one value meant changing it in one
          left somebody unsure whether the other had followed. It belongs
          beside the hours it is read in, so that is where it is edited. */}
      <div className="flex flex-wrap items-center gap-[13px] rounded-[8px] border border-line bg-surface px-[15px] py-[13px]">
        <div className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
          <span className="text-[13px] font-semibold text-ink">Timezone</span>
          <span className="text-[12.5px] text-ink-3">{timezoneLabel}</span>
        </div>
        <ButtonLink href="/availability" variant="secondary" size={30}>
          Change on Availability
        </ButtonLink>
      </div>
    </div>
  );
}

/* ── Booking defaults ─────────────────────────────────────────────────────── */

/* Four defaults, the four scheduling rules every meeting carries: how long it
   is, how much room it leaves after itself, how soon it can be booked and how
   far ahead. The screen used to set only the first and the third, so the
   other two were fixed at no buffer and 30 days and changed meeting by
   meeting. Each is copied onto a NEW meeting when it is created (see
   meetings/new); a meeting that already exists keeps its own, so changing a
   default here never moves somebody's existing links. */

/** One labelled menu, for the four defaults below. */
function DefaultSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <MenuSelect aria-label={label} options={options} value={value} onChange={onChange} />
    </div>
  );
}

export function BookingPanel({ profile }: { profile: Profile }) {
  const toast = useToast();
  const [duration, setDuration] = useState(String(profile.default_duration_minutes));
  const [buffer, setBuffer] = useState(String(profile.default_buffer_minutes ?? 0));
  const [notice, setNotice] = useState(String(profile.default_notice_minutes));
  const [windowDays, setWindowDays] = useState(String(profile.default_window_days ?? 30));
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  /** Every menu's change marks the form unsaved. */
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setSaved(false);
  };

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading
        title="Booking defaults"
        subtitle="What every new meeting starts with. Each meeting can change its own, and meetings you already have keep theirs."
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(186px,1fr))] gap-[13px]">
        <DefaultSelect label="Duration" options={DURATIONS} value={duration} onChange={edit(setDuration)} />
        <DefaultSelect label="Buffer after each meeting" options={BUFFERS} value={buffer} onChange={edit(setBuffer)} />
        <DefaultSelect label="Minimum notice" options={NOTICES} value={notice} onChange={edit(setNotice)} />
        <DefaultSelect label="Booking window" options={WINDOWS} value={windowDays} onChange={edit(setWindowDays)} />
      </div>

      <div>
        <SaveButton
          saving={saving}
          saved={saved}
          onClick={() =>
            startSave(async () => {
              const result = await saveBookingDefaults({
                duration: Number(duration),
                notice: Number(notice),
                buffer: Number(buffer),
                window: Number(windowDays),
              });
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              setSaved(true);
              toast({ tone: "ok", title: "Settings saved", text: "New meetings start with these." });
            })
          }
        />
      </div>
    </div>
  );
}

/* ── Notifications ────────────────────────────────────────────────────────── */

/* REMINDER TIMING LIVES HERE NOW. It was on the Plan tab, "When reminders go
   out", while this tab described reminders as fixed at a day and an hour, so
   the two screens contradicted each other for every Pro host who had moved
   them. It sits under the reminders switch it qualifies, and the switch's own
   description is written from the times in force.

   The plan gate is unchanged: Free sees the times, disabled, with the one-line
   upgrade note under them (rule 3 in upgrade.tsx, show the feature, do not
   hide it), and Convex refuses the write for Free whatever the screen does.

   Saving is one button for the whole panel. The timing is written only when
   it changed and only for a paid plan, so a Free host saving their switches
   never sends a write Convex would refuse. */

export function NotificationsPanel({ profile, pro }: { profile: Profile; pro: boolean }) {
  const router = useRouter();
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
  /* The times in force, which for a lapsed Pro account can still be the ones
     it chose: convex/reminders.ts reads the stored pair whatever the plan. */
  const inForce = leadsOf(profile);
  const [long, setLong] = useState(String(inForce.long));
  const [short, setShort] = useState(String(inForce.short));
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  const timingChanged = Number(long) !== inForce.long || Number(short) !== inForce.short;

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
              <span className="text-[12.5px] leading-[1.45] text-ink-3">
                {row.key === "notify_reminders" ? remindersText(inForce.long, inForce.short) : row.text}
              </span>
            </div>
            <Switch
              checked={prefs[row.key]}
              label={row.label}
              onChange={(next) => {
                setPrefs((p) => ({ ...p, [row.key]: next }));
                setSaved(false);
              }}
            />

            {/* The timing, inside the reminders row so it reads as part of
                it. Shown whether the host's own copy is switched on or not,
                because the guest's reminders follow the same times. */}
            {row.key === "notify_reminders" ? (
              <div className="flex w-full flex-col gap-[10px] rounded-[7px] bg-fill px-[12px] py-[11px]">
                <div className="flex flex-wrap items-center gap-[8px]">
                  <span className="text-[12.5px] font-semibold text-ink">When reminders go out</span>
                  {!pro ? (
                    <Badge tone="off" dot={false}>
                      Pro
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-[12px]">
                  <div className="flex min-w-[160px] flex-1 flex-col gap-[6px]">
                    <span className="text-[12px] font-semibold text-ink-2">First reminder</span>
                    <MenuSelect
                      aria-label="First reminder"
                      options={LONG_OPTIONS}
                      value={long}
                      disabled={!pro}
                      onChange={(v) => {
                        setLong(v);
                        setSaved(false);
                      }}
                    />
                  </div>
                  <div className="flex min-w-[160px] flex-1 flex-col gap-[6px]">
                    <span className="text-[12px] font-semibold text-ink-2">Second reminder</span>
                    <MenuSelect
                      aria-label="Second reminder"
                      options={SHORT_OPTIONS}
                      value={short}
                      disabled={!pro}
                      onChange={(v) => {
                        setShort(v);
                        setSaved(false);
                      }}
                    />
                  </div>
                </div>
                {!pro ? <UpgradeHint to="pro" feature="Choosing when reminders go out" /> : null}
              </div>
            ) : null}
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
              if (pro && timingChanged) {
                const timing = await saveReminderTiming({ long: Number(long), short: Number(short) });
                if (timing.error) {
                  toast({ tone: "bad", title: "Could not save the reminder times", text: timing.error });
                  return;
                }
              }
              setSaved(true);
              toast({ tone: "ok", title: "Settings saved", text: "Your changes are live." });
              // The reminders description is written from the saved times.
              router.refresh();
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
      <PanelHeading title="Account" subtitle="How you sign in, signing out, and removing the account." />

      {/* The address, and the same sentence Profile uses about changing it.
          Profile used to send people here to change it, and this card only
          ever showed it. */}
      <div className="flex flex-wrap items-center gap-[12px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
        <div className="flex min-w-[170px] flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">Email address</span>
          <span className="text-[12px] text-ink-2">{profile.email}</span>
          <Help>
            <EmailHelp />
          </Help>
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

      {/* Log out before the danger zone, and the danger zone last. It used
          to be the other way round, so the everyday button sat underneath
          the one that cannot be undone, and reaching for the first meant
          passing the second. */}
      <div className="flex items-center gap-[14px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">Log out</span>
          <span className="text-[12.5px] text-ink-3">Sign out of Meetrao in this browser.</span>
        </div>
        <Button variant="secondary" size={30} icon="sign-out" className="flex-none" onClick={onSignOut}>
          Log out
        </Button>
      </div>

      <div className="mt-[6px] flex flex-col gap-[8px]">
        <Eyebrow size={10.5}>Danger zone</Eyebrow>
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
