"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { setContext } from "@/lib/actions/context";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Where you are and who you are, in one control.

   This replaces two: a "Working in" switcher at the top of the rail and an
   account button at the bottom. They answered the same question in two
   places, and with per-workspace settings they would have answered it
   differently: the switcher decided which workspace, the account button
   opened settings, and settings now belong to a workspace.

   WHAT IT SHOWS is the workspace, because that is what changes. Your name
   does not change as you move around the product; which company's branding,
   people and links you are editing does. The email stays underneath as the
   answer to "whose account is this", which matters most on a shared machine.

   WITH NO COMPANIES there is no workspace list at all and this is an account
   menu, which is what every account that has never made a company sees.
   ───────────────────────────────────────────────────────────────────────────── */

export type WorkspaceOption = {
  id: string | null;
  name: string;
  /** A square mark the company uploaded, for this menu. */
  avatarUrl: string | null;
  /** Its accent, which tints the initials when there is no mark. */
  color: string | null;
};

const item =
  "box-border flex w-full cursor-pointer items-center gap-[9px] rounded-[6px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-ink no-underline hover:bg-fill";

/** The first letters of a name, for when there is no picture of anything. */
function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * What a workspace looks like, at a size where a wordmark is unreadable.
 *
 * Personal wears the person's avatar, a company wears its own logo. A company
 * logo is usually a WIDE wordmark, so it is contained in the square on a plain
 * tile rather than cropped: a cropped wordmark is three letters of a word,
 * which is worse than the initial it would have fallen back to.
 *
 * With no logo the fallback is the company's initials on its accent, which is
 * the one thing every branded company has and is legible at 20px in a way a
 * wordmark is not.
 */
function WorkspaceMark({
  option,
  avatarUrl,
  name,
  size,
}: {
  option: WorkspaceOption;
  /** The signed-in person's photograph, which is what Personal wears. */
  avatarUrl?: string | null;
  name: string;
  size: number;
}) {
  const radius = Math.max(4, Math.round(size / 5));

  if (!option.id) {
    return avatarUrl ? (
      /* A plain <img> rather than <Avatar>, which only takes a fixed set of
         sizes and this is drawn at two that are not among them. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className="flex-none object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    ) : (
      <span
        aria-hidden="true"
        className="inline-flex flex-none items-center justify-center bg-accent-soft font-bold text-accent-ink"
        style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.42) }}
      >
        {initialsOf(name)}
      </span>
    );
  }

  /* The square mark if the company set one. The WORDMARK is deliberately not
     a fallback: contained in 20px it is three unreadable letters, which is
     worse than the initials below. */
  if (option.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex flex-none items-center justify-center overflow-hidden border border-line bg-white"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        {/* A plain <img>: this is somebody's uploaded file at a fixed tiny
            size, so there is nothing for the optimiser to decide. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={option.avatarUrl}
          alt=""
          className="h-full w-full object-contain"
          style={{ padding: Math.max(1, Math.round(size / 10)) }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.42),
        background: option.color ?? "var(--accent-soft)",
        color: option.color ? "#ffffff" : "var(--accent-ink)",
      }}
    >
      {initialsOf(option.name)}
    </span>
  );
}

export function WorkspaceMenu({
  name,
  email,
  avatarUrl,
  isAdmin,
  workspaces,
  activeId,
  onSignOut,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  /** Personal first, then every company. One entry means no list is shown. */
  workspaces: WorkspaceOption[];
  activeId: string | null;
  onSignOut: () => void | Promise<void>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, startBusy] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active: WorkspaceOption = workspaces.find((w) => w.id === activeId) ??
    workspaces[0] ?? { id: null, name: "Personal", logoUrl: null, color: null };

  function choose(id: string | null) {
    setOpen(false);
    if (id === activeId) return;
    startBusy(async () => {
      const result = await setContext(id);
      if (result.error) {
        toast({ tone: "bad", title: "Could not switch", text: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div ref={box} className="relative mb-[12px] max-[820px]:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${active.name}, signed in as ${email}. Open account and workspace menu.`}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "box-border flex w-full cursor-pointer items-center gap-[9px] rounded-[7px] border p-[6px]",
          "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
          open ? "border-line bg-surface" : "border-line bg-surface hover:bg-fill",
        )}
      >
        {/* The workspace, not the person. The label underneath already says
            whose account this is; the mark should match the name beside it. */}
        <WorkspaceMark option={active} avatarUrl={avatarUrl} name={name} size={26} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="overflow-hidden text-left text-[12.5px] font-semibold text-ellipsis whitespace-nowrap text-ink">
            {active.name}
          </span>
          <span className="overflow-hidden text-left text-[11.5px] text-ellipsis whitespace-nowrap text-ink-3">
            {email}
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={9}
          className="flex-none text-ink-3 transition-transform duration-[140ms]"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-in absolute top-[calc(100%+6px)] right-0 left-0 z-95 min-w-[200px] rounded-[8px] border border-line bg-surface p-[6px] shadow-[var(--pop)]"
        >
          {/* No list for an account with one workspace. A switcher offering a
              single choice teaches people a concept they do not have. */}
          {workspaces.length > 1 ? (
            <>
              <span className="block px-[9px] pt-[5px] pb-[6px] text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                Workspace
              </span>
              {workspaces.map((w) => (
                <button
                  key={w.id ?? "personal"}
                  type="button"
                  role="menuitemradio"
                  aria-checked={w.id === activeId}
                  onClick={() => choose(w.id)}
                  className={cx(item, w.id === activeId && "bg-accent-soft font-semibold text-accent-ink")}
                >
                  <WorkspaceMark option={w} avatarUrl={avatarUrl} name={name} size={20} />
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {w.name}
                  </span>
                  {w.id === activeId ? (
                    <Icon name="check" weight="solid" size={10} className="flex-none" aria-hidden="true" />
                  ) : null}
                </button>
              ))}
              <span aria-hidden="true" className="mx-[2px] my-[5px] block h-[1px] bg-line-soft" />
            </>
          ) : null}

          {/* Settings belongs to the workspace in force, which is why this
              control and the switcher had to become one thing. */}
          {!isAdmin ? <MenuLink href="/settings" icon="gear" label={`${active.name} settings`} /> : null}
          <MenuLink href="/help" icon="circle-question" label="Help centre" newTab />
          <MenuLink href="/support" icon="envelope" label="Support" />
          <span aria-hidden="true" className="mx-[2px] my-[5px] block h-[1px] bg-line-soft" />
          <button type="button" role="menuitem" onClick={onSignOut} className={item}>
            <Icon name="sign-out" size={12} className="w-[15px] flex-none text-ink-3" />
            <span>Log out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  newTab = false,
}: {
  href: string;
  icon: IconName;
  label: string;
  newTab?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={cx(item, "unlink")}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <Icon name={icon} size={12} className="w-[15px] flex-none text-ink-3" />
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
    </Link>
  );
}
