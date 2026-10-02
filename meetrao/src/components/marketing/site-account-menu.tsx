"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

/* The marketing nav, for someone who is already signed in.

   "Log in" and "Get started" are the wrong two buttons to show a host
   who reached the Help centre from inside the product. This replaces them with
   the way back: their dashboard, support, and a way out.

   Mirrors the sidebar's account menu rather than inventing a second pattern,
   same trigger shape, same rows, same dismissal behaviour. */

export function SiteAccountMenu({
  name,
  email,
  avatarUrl,
  onSignOut,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onSignOut: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocument(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocument);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocument);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <div ref={wrap} className="relative flex-none">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "box-border inline-flex h-[38px] cursor-pointer items-center gap-[8px] rounded-[8px] border bg-surface pr-[9px] pl-[6px]",
          "transition-colors duration-[120ms] ease-[ease]",
          open ? "border-line-strong bg-fill" : "border-line hover:border-line-strong",
        )}
      >
        {avatarUrl ? (
          <Avatar name={name} size={26} src={avatarUrl} />
        ) : (
          <span className="inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[5px] bg-accent-soft text-[10.5px] font-bold text-accent-ink">
            {initials}
          </span>
        )}
        <span className="max-w-[130px] overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-ink max-[560px]:hidden">
          {name}
        </span>
        <Icon
          name="chevron-down"
          size={9}
          className="flex-none text-ink-3 transition-transform duration-[140ms]"
          style={{ transform: `rotate(${open ? 180 : 0}deg)` }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+6px)] right-0 z-95 w-[218px] rounded-[8px] border border-line bg-surface p-[6px] shadow-pop"
        >
          <div className="flex flex-col gap-[1px] border-b border-line-soft px-[9px] pt-[5px] pb-[8px]">
            <span className="overflow-hidden text-[12.5px] font-semibold text-ellipsis whitespace-nowrap text-ink">
              {name}
            </span>
            <span className="overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-ink-3">
              {email}
            </span>
          </div>

          <div className="flex flex-col gap-[1px] pt-[5px]">
            <Row href="/dashboard" icon="house" label="Back to dashboard" />
            <Row href="/support" icon="envelope" label="Support" />

            <span aria-hidden="true" className="mx-[2px] my-[5px] block h-[1px] bg-line-soft" />

            <form action={onSignOut}>
              <button type="submit" role="menuitem" className={ROW}>
                <Icon name="sign-out" size={12} className="w-[15px] flex-none text-ink-3" />
                <span>Log out</span>
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const ROW =
  "unlink flex w-full cursor-pointer items-center gap-[9px] rounded-[6px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[13px] text-ink hover:bg-fill";

function Row({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} role="menuitem" className={ROW}>
      <Icon name={icon} size={12} className="w-[15px] flex-none text-ink-3" />
      <span>{label}</span>
    </Link>
  );
}
