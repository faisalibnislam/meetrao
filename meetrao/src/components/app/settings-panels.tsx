"use client";

import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { GoogleG } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge, Switch } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { RouteLink } from "@/components/ui/route-link";
import { AvatarUpload } from "./avatar-upload";
import {
  DURATION_SELECT_OPTIONS,
  NOTICE_OPTIONS,
} from "./meeting-form";
import { timezoneOptions } from "@/lib/timezones";
import {
  changePassword,
  deleteAccount,
  disconnectCalendar,
  updateBookingDefaults,
  updateProfile,
  updateTimezone,
} from "@/lib/actions/profile";
import {
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/actions/notifications";

function SectionHeading({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex flex-col gap-[2px]">
      <h2 className="m-0 text-[14.5px] font-semibold text-ink">{title}</h2>
      <p className="m-0 text-[12.5px] text-ink-3">{blurb}</p>
    </div>
  );
}

/* ── Profile ─────────────────────────────────────────────────────────────── */

export function ProfilePanel({
  initial,
  bookingHost,
  avatarUrl,
}: {
  initial: {
    fullName: string;
    jobTitle: string;
    email: string;
    username: string;
  };
  bookingHost: string;
  avatarUrl: string | null;
}) {
  const { notify } = useToast();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof values, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  function save() {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        notify("bad", "Could not save", result.message ?? "Try again.");
        return;
      }
      setSaved(true);
      notify("ok", "Settings saved", "Your changes are live.");
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <SectionHeading
        title="Profile"
        blurb="How you appear to guests on your booking page."
      />

      <div className="flex items-center gap-[14px] border-b border-line pb-[15px]">
        <AvatarUpload
          avatarUrl={avatarUrl}
          initials={values.fullName || values.username}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[13px]">
        <Field label="Name">
          <Input
            fieldSize="sm"
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </Field>
        <Field label="Job title">
          <Input
            fieldSize="sm"
            value={values.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <Input
            fieldSize="sm"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field
          label="Username"
          helper={`${bookingHost}/${values.username || "you"}`}
        >
          <Input
            fieldSize="sm"
            value={values.username}
            onChange={(e) => set("username", e.target.value)}
          />
        </Field>
      </div>

      <div>
        <Button size="lg" loading={pending} onClick={save}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ── Calendar ────────────────────────────────────────────────────────────── */

export function CalendarPanel({
  connected,
  accountEmail,
  timezone,
}: {
  connected: boolean;
  accountEmail: string | null;
  timezone: string;
}) {
  const { notify } = useToast();
  const [zone, setZone] = useState(timezone);
  const [pending, startTransition] = useTransition();
  const options = useMemo(() => timezoneOptions(), []);

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectCalendar();
      if (!result.ok) {
        notify("bad", "Could not disconnect", result.message ?? "Try again.");
        return;
      }
      notify(
        "warn",
        "Calendar disconnected",
        "Meetrao can no longer check for conflicts.",
      );
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <SectionHeading
        title="Calendar"
        blurb="Meetrao checks this calendar for conflicts before offering a time."
      />

      <div className="flex flex-wrap items-center gap-[13px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <span className="inline-flex flex-none items-center text-accent">
          <GoogleG size={17} />
        </span>
        <div className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">
            Google Calendar
          </span>
          <span className="text-[12.5px] text-ink-3">
            {connected ? (accountEmail ?? "Connected") : "Not connected"}
          </span>
        </div>
        <Badge tone={connected ? "ok" : "off"}>
          {connected ? "Connected" : "Disconnected"}
        </Badge>
        {connected ? (
          <Button
            variant="secondary"
            size="md"
            loading={pending}
            onClick={disconnect}
          >
            Disconnect
          </Button>
        ) : (
          <RouteLink
            href="/api/google/connect?next=/settings/calendar"
            className="inline-flex h-[30px] flex-none cursor-pointer items-center gap-[7px] rounded-[6px] border border-accent bg-accent px-[11px] text-[12.5px] font-semibold text-white no-underline hover:bg-accent-2 hover:text-white"
          >
            <GoogleG size={13} />
            Connect
          </RouteLink>
        )}
      </div>

      <div className="flex max-w-[320px] flex-col gap-[6px]">
        <span className="text-[12.5px] font-semibold text-ink">Timezone</span>
        <MenuSelect
          label="Timezone"
          searchable
          options={options}
          value={zone}
          onChange={(v) => {
            setZone(v);
            startTransition(async () => {
              const result = await updateTimezone(v);
              if (!result.ok) {
                notify("bad", "Could not save", result.message ?? "Try again.");
                return;
              }
              notify("ok", "Timezone saved", "Your hours move with it.");
            });
          }}
        />
      </div>
    </div>
  );
}

/* ── Booking defaults ────────────────────────────────────────────────────── */

export function BookingPanel({
  durationMinutes,
  noticeMinutes,
}: {
  durationMinutes: number;
  noticeMinutes: number;
}) {
  const { notify } = useToast();
  const [duration, setDuration] = useState(String(durationMinutes));
  const [notice, setNotice] = useState(String(noticeMinutes));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateBookingDefaults({
        durationMinutes: Number(duration),
        noticeMinutes: Number(notice),
      });
      if (!result.ok) {
        notify("bad", "Could not save", result.message ?? "Try again.");
        return;
      }
      setSaved(true);
      notify("ok", "Settings saved", "Your changes are live.");
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <SectionHeading
        title="Booking defaults"
        blurb="Applied to every new meeting you create."
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(186px,1fr))] gap-[13px]">
        <div className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">
            Default duration
          </span>
          <MenuSelect
            label="Default duration"
            options={DURATION_SELECT_OPTIONS}
            value={duration}
            onChange={(v) => {
              setDuration(v);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">
            Default minimum notice
          </span>
          <MenuSelect
            label="Default minimum notice"
            options={NOTICE_OPTIONS}
            value={notice}
            onChange={(v) => {
              setNotice(v);
              setSaved(false);
            }}
          />
        </div>
      </div>

      <div>
        <Button size="lg" loading={pending} onClick={save}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ── Notifications ───────────────────────────────────────────────────────── */

/**
 * The five rows, in the design's order. `key` is the field on
 * NotificationPreferences; the copy is verbatim from the spec.
 */
const NOTIFICATION_ROWS: {
  key: keyof NotificationPreferences;
  label: string;
  helper: string;
}[] = [
  {
    key: "newBooking",
    label: "New booking",
    helper: "When someone books a time with you.",
  },
  {
    key: "bookingChanged",
    label: "Booking changed",
    helper: "When a booking is rescheduled or edited.",
  },
  {
    key: "bookingCancelled",
    label: "Booking cancelled",
    helper: "When you or your guest cancels.",
  },
  {
    key: "dailyAgenda",
    label: "Daily agenda",
    helper: "One email each morning listing the day's meetings.",
  },
  {
    key: "productNews",
    label: "Product news",
    helper: "Occasional updates about new Meetrao features.",
  },
];

export function NotificationsPanel({
  initial,
}: {
  initial: NotificationPreferences;
}) {
  const { notify } = useToast();
  const [prefs, setPrefs] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof NotificationPreferences, next: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: next }));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const result = await updateNotificationPreferences(prefs);
      if (!result.ok) {
        notify("bad", "Could not save", result.message ?? "Try again.");
        return;
      }
      setSaved(true);
      notify("ok", "Settings saved", "Your changes are live.");
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <SectionHeading
        title="Notifications"
        blurb="Which emails Meetrao sends you."
      />

      <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
        {NOTIFICATION_ROWS.map((row, i) => (
          <div
            key={row.key}
            className={cn(
              "flex items-center gap-[14px] px-[15px] py-[13px]",
              i > 0 && "border-t border-line-soft",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="text-[13.5px] font-semibold text-ink">
                {row.label}
              </span>
              <span className="text-[12.5px] leading-[1.5] text-ink-3">
                {row.helper}
              </span>
            </div>
            <Switch
              checked={prefs[row.key]}
              onChange={(next) => toggle(row.key, next)}
              label={row.label}
              disabled={pending}
            />
          </div>
        ))}
      </div>

      <p className="m-0 text-[12.5px] leading-[1.55] text-ink-3">
        Turning everything off does not stop the emails your guests receive, or
        password and security emails.
      </p>

      <div>
        <Button size="lg" loading={pending} onClick={save}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ── Account ─────────────────────────────────────────────────────────────── */

export function AccountPanel({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const { notify } = useToast();
  const [dialog, setDialog] = useState<"password" | "delete" | null>(null);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function submitPassword() {
    startTransition(async () => {
      const result = await changePassword(password);
      if (!result.ok) {
        notify("bad", "Could not update", result.message ?? "Try again.");
        return;
      }
      setDialog(null);
      setPassword("");
      notify("ok", "Password updated", "Use it next time you sign in.");
    });
  }

  function submitDelete() {
    startTransition(async () => {
      const result = await deleteAccount();
      // A success redirects, so reaching here means it failed.
      notify("bad", "Could not delete", result?.message ?? "Try again.");
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <SectionHeading title="Account" blurb="Sign-in and account removal." />

      <div className="flex flex-wrap items-center gap-[14px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-[13.5px] font-semibold text-ink">
            Email address
          </span>
          <span className="truncate font-mono text-[12.5px] text-ink-2">
            {email}
          </span>
        </div>
        <Badge tone={verified ? "ok" : "warn"}>
          {verified ? "Verified" : "Unverified"}
        </Badge>
      </div>

      <div className="flex items-center gap-[14px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-ink">Password</span>
          <span className="text-[12.5px] text-ink-3">
            Set a new password for email sign-in.
          </span>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setDialog("password")}
        >
          Change
        </Button>
      </div>

      <div className="flex items-center gap-[14px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[12px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-red">
            Delete account
          </span>
          <span className="text-[12.5px] leading-[1.45] text-red-ink">
            Removes your booking page and cancels every upcoming meeting.
          </span>
        </div>
        <Button variant="danger" size="md" onClick={() => setDialog("delete")}>
          Delete
        </Button>
      </div>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="secondary">
          Log out
        </Button>
      </form>

      <Modal
        open={dialog === "password"}
        onClose={() => setDialog(null)}
        title="Change password"
        primaryLabel="Update password"
        onPrimary={submitPassword}
        primaryLoading={pending}
        secondaryLabel="Cancel"
        onSecondary={() => setDialog(null)}
      >
        <Field label="New password" helper="At least 8 characters.">
          <Input
            fieldSize="sm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="Delete your account?"
        primaryLabel="Delete account"
        primaryVariant="danger"
        onPrimary={submitDelete}
        primaryLoading={pending}
        secondaryLabel="Keep my account"
        onSecondary={() => setDialog(null)}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          This removes your booking page, meetings and availability for good.
          Upcoming meetings will be cancelled and your guests notified. This
          cannot be undone.
        </span>
      </Modal>
    </div>
  );
}
