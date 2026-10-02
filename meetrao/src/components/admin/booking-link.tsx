"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckBox } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Callout, SectionHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { checkBookingLink, releaseBookingLink, setBookingLink } from "@/lib/actions/admin";
import { cx } from "@/lib/cx";
import { bookingLink, isBadStatus, sanitizeUsername, usernameNote, usernameStatus, type UsernameStatus } from "@/lib/username";

/* ─────────────────────────────────────────────────────────────────────────────
   Changing somebody else's booking link.

   Deliberately the same field, the same rules and the same debounced check as
   the host's own Settings → Profile, because an admin who can save a name the
   host could never have typed has produced a link the host cannot edit back.
   The two differences are both about consequence, not validation:

     · retiring the old name, which only an admin can do, and
     · the warning that this breaks a URL somebody else has been handing out.
   ───────────────────────────────────────────────────────────────────────────── */

/** The host's own statuses, plus the one only an admin can run into. */
type AdminStatus = UsernameStatus | "retired";

/**
 * Every piece of state here is about one username, so after a save the whole
 * lot has to go — the typed value, the status, the alternatives, the checkbox.
 * The page keys this component on the username for exactly that reason: a save
 * followed by router.refresh() remounts it, and React discards the state for
 * us. Syncing it back in an effect instead is both a cascading render and, in
 * this component, a race with an in-flight availability check.
 */

export function BookingLinkPanel({
  userId,
  name,
  username,
}: {
  userId: string;
  name: string;
  username: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [value, setValue] = useState(username);
  const [status, setStatus] = useState<AdminStatus>("empty");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [retireOld, setRetireOld] = useState(true);
  const [confirm, setConfirm] = useState<"save" | "release" | "force" | null>(null);
  const [busy, startAction] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function edit(next: string) {
    const clean = sanitizeUsername(next);
    setValue(clean);
    setIdeas([]);

    clearTimeout(timer.current);
    if (clean === username) {
      setStatus("empty");
      return;
    }

    const syntax = usernameStatus(clean);
    setStatus(syntax);
    if (syntax !== "checking") return;

    // Every keystroke is somebody else's account, so the lookup is debounced
    // and stale answers are dropped by ticket rather than by arrival order.
    const ticket = ++latest.current;
    timer.current = setTimeout(async () => {
      const result = await checkBookingLink(userId, clean);
      if (ticket !== latest.current) return;
      setStatus(result.state === "taken" ? "taken" : result.state === "retired" ? "retired" : "ok");
      setIdeas(result.state === "taken" ? result.ideas : []);
    }, 620);
  }

  const changed = value !== username;
  const ok = status === "ok";
  const retired = status === "retired";
  const bad = retired || isBadStatus(status as UsernameStatus);

  const note = !changed
    ? "This is their current link."
    : retired
      ? `meetrao.com/${value} is held back from an earlier removal.`
      : usernameNote(status as UsernameStatus, value, ideas.length > 0) || "Checking availability…";

  function save(force: boolean) {
    startAction(async () => {
      const result = await setBookingLink({ userId, username: value, retireOld, force });
      if (result.error) {
        toast({ tone: "bad", title: "Could not change the link", text: result.error });
        return;
      }
      setConfirm(null);
      toast({
        tone: "ok",
        title: "Booking link changed",
        text: `${name} is now at ${bookingLink(value)}.`,
      });
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-[11px]">
      <SectionHeading title="Booking link" meta={bookingLink(username)} />

      <div className="flex flex-col gap-[13px] rounded-[8px] border border-line bg-surface px-[14px] py-[13px]">
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="admin-link" className="text-[12.5px] font-semibold text-ink">
            Where guests find {name}
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
              id="admin-link"
              type="text"
              value={value}
              onChange={(e) => edit(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-describedby="admin-link-status"
              aria-invalid={bad}
              className="h-full min-w-0 flex-1 border-0 bg-transparent py-0 pr-[11px] pl-[1px] text-[13px] font-medium text-ink outline-none"
            />
            {status === "checking" && changed ? (
              <span
                aria-hidden="true"
                className="animate-spin-slow mr-[11px] h-[12px] w-[12px] flex-none rounded-full border-2 border-line-strong border-t-accent"
              />
            ) : null}
            {changed && (ok || status === "taken" || retired) ? (
              <Icon
                name={ok ? "check" : "xmark"}
                weight="solid"
                size={11}
                className={cx("mr-[11px] flex-none", ok ? "text-accent-ink" : "text-red")}
              />
            ) : null}
          </div>

          <span
            id="admin-link-status"
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
                  onClick={() => edit(idea)}
                  className="inline-flex h-[28px] cursor-pointer items-center gap-[7px] rounded-[6px] border border-accent-line bg-accent-soft px-[10px] text-[12px] text-accent-ink transition-colors duration-[120ms] hover:bg-[var(--accent-soft-hover)]"
                >
                  <Icon name="plus" size={9} />
                  {idea}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {changed && (ok || retired) ? (
          <button
            type="button"
            aria-pressed={retireOld}
            onClick={() => setRetireOld(!retireOld)}
            className="flex cursor-pointer items-start gap-[9px] border-0 bg-transparent p-0 text-left"
          >
            <span className="pt-[2px]">
              <CheckBox checked={retireOld} />
            </span>
            <span className="text-[12.5px] leading-[1.5] text-ink-2">
              Hold <span className="font-semibold text-ink">/{username}</span> back so nobody can register it
              again — {name} included.
            </span>
          </button>
        ) : null}

        {changed && retired ? (
          <Callout tone="amber">
            <span className="font-semibold text-ink">/{value}</span> was held back after an earlier removal.
            Assigning it undoes that hold.
          </Callout>
        ) : null}

        <div className="flex flex-wrap gap-[8px]">
          <Button
            variant="accent"
            size={32}
            busy={busy && confirm === null}
            disabled={!changed || !(ok || retired)}
            onClick={() => setConfirm(retired ? "force" : "save")}
          >
            Change link
          </Button>
          <Button variant="secondary" size={32} disabled={!changed} onClick={() => edit(username)}>
            Reset
          </Button>
        </div>
      </div>

      {/* Retiring is its own panel, not a third button above: it is the only one
          of the three that chooses the new name for you. */}
      <div className="flex flex-wrap items-center gap-[14px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[13px]">
        <div className="flex min-w-[220px] flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-red">Retire this link</span>
          <span className="text-[12.5px] leading-[1.45] text-red-ink">
            Takes <span className="font-semibold">/{username}</span> out of circulation and moves {name} to a
            placeholder. The account keeps working.
          </span>
        </div>
        <Button variant="danger" size={30} className="flex-none" onClick={() => setConfirm("release")}>
          Retire link
        </Button>
      </div>

      <Modal
        open={confirm === "save" || confirm === "force"}
        onClose={() => setConfirm(null)}
        title="Change this booking link?"
        primary={{
          label: busy ? "Changing…" : "Change link",
          busy,
          onClick: () => save(confirm === "force"),
        }}
        secondary={{ label: "Leave it", onClick: () => setConfirm(null) }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          {bookingLink(username)} stops working immediately and anyone who saved it sees a page-not-found —
          including any link {name} has already shared. Existing bookings are unaffected.{" "}
          {retireOld
            ? `/${username} will be held back, so it cannot be registered again.`
            : `/${username} will be released, so anyone can register it.`}
        </span>
      </Modal>

      <Modal
        open={confirm === "release"}
        onClose={() => setConfirm(null)}
        title="Retire this booking link?"
        primary={{
          label: busy ? "Retiring…" : "Retire link",
          variant: "danger",
          busy,
          onClick: () =>
            startAction(async () => {
              const result = await releaseBookingLink(userId);
              if (result.error) {
                toast({ tone: "bad", title: "Could not retire the link", text: result.error });
                return;
              }
              setConfirm(null);
              toast({
                tone: "bad",
                title: "Booking link retired",
                text: `${name} moved to ${bookingLink(result.username ?? "")}.`,
              });
              router.refresh();
            }),
        }}
        secondary={{ label: "Keep it", onClick: () => setConfirm(null) }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          {bookingLink(username)} stops working and is held back, so neither {name} nor anyone else can register
          it again. They are moved to a neutral placeholder and can pick a new link themselves from Settings.
          This does not suspend the account or cancel any bookings — suspend it separately if the page should go
          dark.
        </span>
      </Modal>
    </section>
  );
}
