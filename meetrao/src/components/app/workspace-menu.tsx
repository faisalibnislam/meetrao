"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/badge";
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

export type WorkspaceOption = { id: string | null; name: string };

const item =
  "box-border flex w-full cursor-pointer items-center gap-[9px] rounded-[6px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-ink no-underline hover:bg-fill";

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

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0] ?? { id: null, name: "Personal" };
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

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
        {/* The person, not the company: a company has a logo on its booking
            pages and nothing small enough for a 26px square here. */}
        {avatarUrl ? (
          <Avatar name={name} size={26} src={avatarUrl} />
        ) : (
          <span className="inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[5px] bg-accent-soft text-[11px] font-bold text-accent-ink">
            {initials}
          </span>
        )}
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
