"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar, CountBadge } from "@/components/ui/controls";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  count?: number | null;
  /** Extra prefixes that should also light this item up. */
  alsoActiveFor?: string[];
};

export const HOST_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/bookings", label: "Bookings", icon: "calendar" },
  { href: "/meetings", label: "Meetings", icon: "list" },
  { href: "/availability", label: "Availability", icon: "clock" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { href: "/admin/settings", label: "Settings", icon: "gear" },
];

/** Rows the drawer adds below the nav, standing in for the desktop account menu. */
const DRAWER_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/help", label: "Help centre", icon: "circleInfo" },
  { href: "/support", label: "Contact support", icon: "users" },
];

function isActive(pathname: string, item: NavItem) {
  if (pathname === item.href) return true;
  // /admin must not match /admin/users, but /meetings should match
  // /meetings/new and /meetings/:id/edit.
  if (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)) return true;
  return (item.alsoActiveFor ?? []).some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Three bars that become an X. Driven entirely by `open`. */
function HamburgerBars({ open }: { open: boolean }) {
  const bar =
    "absolute left-[11px] h-[1.5px] w-[18px] rounded-full bg-ink transition-transform duration-[160ms] ease-out";
  return (
    <span aria-hidden="true" className="relative block size-[40px]">
      <span
        className={cn(bar, open ? "top-[19px] rotate-45" : "top-[14px]")}
      />
      <span
        className={cn(
          bar,
          "top-[19px] transition-opacity",
          open && "opacity-0",
        )}
      />
      <span
        className={cn(bar, open ? "top-[19px] -rotate-45" : "top-[24px]")}
      />
    </span>
  );
}

export function Sidebar({
  items,
  isAdmin,
  name,
  email,
  initials,
  upcomingCount,
}: {
  items: NavItem[];
  isAdmin: boolean;
  name: string;
  email: string;
  initials: string;
  upcomingCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Every other menu in the app closes on outside click and on Escape; the
  // drawer is not an exception. Both listeners are only attached while it is
  // open, and both are removed on close.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const navRow = (item: NavItem, mobile: boolean) => {
    const active = isActive(pathname, item);
    const count =
      item.label === "Bookings" && !isAdmin ? upcomingCount : item.count;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        // Picking anything navigates *and* closes the drawer.
        onClick={() => setOpen(false)}
        className={cn(
          "box-border flex flex-none items-center gap-[10px] rounded-[6px] border px-[9px] text-[13px] no-underline",
          "transition-colors duration-[120ms]",
          // 44px touch targets in the drawer; the desktop column keeps 32px.
          mobile ? "h-[44px] w-full" : "h-[32px] md:w-full",
          active
            ? "border-line bg-surface font-semibold text-ink shadow-[0_1px_1px_rgba(26,25,23,0.03)]"
            : "border-transparent bg-transparent font-medium text-ink-2 hover:bg-white/55 hover:text-ink",
        )}
      >
        <Icon
          name={item.icon}
          size={13}
          className={cn("w-[15px] text-center", active ? "text-accent" : "text-ink-3")}
        />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        {count ? <CountBadge active={active}>{count}</CountBadge> : null}
      </Link>
    );
  };

  return (
    <nav
      ref={navRef}
      aria-label={isAdmin ? "Admin" : "Main"}
      className={cn(
        // Mobile: a bar with the logo and a hamburger. `relative` anchors the
        // drawer; there is deliberately no overflow-x here — it would clip it.
        "relative flex flex-none items-center justify-between border-b border-line bg-sidebar px-[12px] py-[8px]",
        // Desktop: the 218px column, unchanged.
        "md:w-[218px] md:flex-col md:items-stretch md:justify-start md:gap-0 md:border-r md:border-b-0 md:px-[12px] md:pt-[14px] md:pb-[14px]",
      )}
    >
      <div className="flex flex-none items-center gap-[8px] md:w-full md:justify-between md:px-[4px] md:pt-[2px] md:pb-[16px]">
        <Link
          href={isAdmin ? "/admin" : "/dashboard"}
          className="block no-underline"
          onClick={() => setOpen(false)}
        >
          <Logo height={20} />
        </Link>
        {isAdmin ? (
          <span className="inline-flex h-[18px] items-center rounded-[4px] border border-line-strong px-[6px] font-mono text-[9.5px] tracking-[0.08em] text-ink-2">
            ADMIN
          </span>
        ) : null}
      </div>

      {/* Hamburger — mobile only. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="app-nav-drawer"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-[2px] inline-flex size-[44px] flex-none cursor-pointer items-center justify-center rounded-[6px] border border-transparent bg-transparent hover:bg-white/55 md:hidden"
      >
        <HamburgerBars open={open} />
      </button>

      {/* Drawer — mobile only, anchored under the bar. */}
      <div
        id="app-nav-drawer"
        hidden={!open}
        className={cn(
          "absolute top-full right-0 left-0 z-40 flex flex-col gap-[2px] overflow-y-auto",
          "max-h-[calc(100vh-120px)] border-b border-line bg-sidebar px-[12px] py-[10px]",
          "shadow-[var(--pop)] md:hidden",
        )}
      >
        {items.map((item) => navRow(item, true))}

        <div className="mt-[8px] flex items-center gap-[9px] border-t border-line px-[9px] pt-[12px] pb-[6px]">
          <Avatar initials={initials} size={26} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[12.5px] font-semibold text-ink">
              {name}
            </span>
            <span className="truncate text-[11.5px] text-ink-3">{email}</span>
          </div>
        </div>

        {DRAWER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="box-border flex h-[44px] flex-none items-center gap-[10px] rounded-[6px] border border-transparent px-[9px] text-[13px] font-medium text-ink-2 no-underline transition-colors duration-[120ms] hover:bg-white/55 hover:text-ink"
          >
            <Icon name={link.icon} size={13} className="w-[15px] text-center text-ink-3" />
            <span className="min-w-0 flex-1 truncate text-left">{link.label}</span>
          </Link>
        ))}

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="box-border flex h-[44px] w-full cursor-pointer items-center gap-[10px] rounded-[6px] border border-transparent bg-transparent px-[9px] text-[13px] font-medium text-ink-2 transition-colors duration-[120ms] hover:bg-white/55 hover:text-ink"
          >
            <Icon name="arrowRight" size={13} className="w-[15px] text-center text-ink-3" />
            <span className="min-w-0 flex-1 truncate text-left">Log out</span>
          </button>
        </form>
      </div>

      {/* Nav list — desktop only; the drawer carries it on mobile. */}
      <div className="hidden md:flex md:min-h-0 md:w-full md:flex-1 md:flex-col md:items-stretch md:gap-[2px] md:overflow-y-auto">
        {items.map((item) => navRow(item, false))}
      </div>

      {/* Account row — desktop only. The drawer carries this on mobile. */}
      <div className="hidden md:flex md:w-full md:flex-none md:items-center md:gap-[9px] md:border-t md:border-line md:px-[4px] md:pt-[12px] md:pb-[2px]">
        <Avatar initials={initials} size={26} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12.5px] font-semibold text-ink">
            {name}
          </span>
          <span className="truncate text-[11.5px] text-ink-3">{email}</span>
        </div>
        <form action="/auth/signout" method="post" className="flex-none">
          <button
            type="submit"
            title="Log out"
            aria-label="Log out"
            className="inline-flex size-[26px] cursor-pointer items-center justify-center rounded-[5px] border border-transparent bg-transparent text-ink-3 hover:bg-fill-2 hover:text-ink"
          >
            <Icon name="arrowRight" size={12} />
          </button>
        </form>
      </div>
    </nav>
  );
}
