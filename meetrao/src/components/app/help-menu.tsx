"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Help, support and the way out, at the foot of the rail.

   SETTINGS USED TO LIVE HERE TOO, behind this collapsible, and that was the
   wrong call. Settings is a screen like Bookings or Availability: somebody
   goes there on purpose and expects to find it where the other screens are.
   Hidden in a menu at the very bottom of the rail it was the one destination
   that took two clicks and a search, so it is now a plain row in the nav
   (see sidebar.tsx) and this menu keeps only the things that are genuinely
   occasional and are not screens of the app: the help centre, support and
   logging out.

   These still stay off the workspace switcher at the top. Switching is
   something somebody does several times an hour; logging out is something
   they do once a month, and it does not belong in the same list.

   OPENS UPWARD, because it sits at the bottom of the rail. A menu that opened
   downward from here would run off the screen.
   ───────────────────────────────────────────────────────────────────────── */

const item =
  "box-border flex w-full cursor-pointer items-center gap-[9px] rounded-[6px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-ink no-underline hover:bg-fill";

export function HelpMenu({ onSignOut }: { onSignOut: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={box} className="relative mt-[10px] max-[820px]:hidden">
      {open ? (
        <div
          role="menu"
          className="animate-in absolute bottom-[calc(100%+6px)] right-0 left-0 z-95 min-w-[180px] rounded-[8px] border border-line bg-surface p-[6px] shadow-[var(--pop)]"
        >
          <MenuLink href="/help" icon="circle-question" label="Help centre" newTab />
          <MenuLink href="/support" icon="envelope" label="Support" />
          <span aria-hidden="true" className="mx-[2px] my-[5px] block h-[1px] bg-line-soft" />
          <button type="button" role="menuitem" onClick={onSignOut} className={item}>
            <Icon name="sign-out" size={12} className="w-[15px] flex-none text-ink-3" />
            <span>Log out</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "box-border flex w-full cursor-pointer items-center gap-[9px] rounded-[7px] border p-[8px]",
          "text-[12.5px] font-semibold transition-[background-color,border-color] duration-[120ms] ease-[ease]",
          open ? "border-line bg-surface text-ink" : "border-transparent bg-transparent text-ink-2 hover:bg-fill hover:text-ink",
        )}
      >
        <Icon name="circle-question" size={13} className="flex-none text-ink-3" />
        <span className="min-w-0 flex-1 text-left">Help and log out</span>
        <Icon
          name="chevron-down"
          size={9}
          className="flex-none text-ink-3 transition-transform duration-[140ms]"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
        />
      </button>
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
