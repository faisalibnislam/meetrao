"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

function isActive(pathname: string, item: NavItem) {
  if (pathname === item.href) return true;
  // /admin must not match /admin/users, but /meetings should match
  // /meetings/new and /meetings/:id/edit.
  if (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)) return true;
  return (item.alsoActiveFor ?? []).some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
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

  return (
    <nav
      aria-label={isAdmin ? "Admin" : "Main"}
      className={cn(
        // Mobile: a horizontal scrolling rail above the content.
        "no-scrollbar flex flex-none items-center gap-[10px] overflow-x-auto border-b border-line bg-sidebar px-[12px] py-[8px]",
        // Desktop: the 218px column.
        "md:w-[218px] md:flex-col md:items-stretch md:gap-0 md:overflow-visible md:border-r md:border-b-0 md:px-[12px] md:pt-[14px] md:pb-[14px]",
      )}
    >
      <div className="flex flex-none items-center gap-[8px] md:justify-between md:px-[4px] md:pt-[2px] md:pb-[16px]">
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="block no-underline">
          <Logo height={20} />
        </Link>
        {isAdmin ? (
          <span className="inline-flex h-[18px] items-center rounded-[4px] border border-line-strong px-[6px] font-mono text-[9.5px] tracking-[0.08em] text-ink-2">
            ADMIN
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-[4px] md:min-h-0 md:flex-col md:items-stretch md:gap-[2px] md:overflow-y-auto">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const count =
            item.label === "Bookings" && !isAdmin ? upcomingCount : item.count;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "box-border flex h-[32px] flex-none items-center gap-[10px] rounded-[6px] border px-[9px] text-[13px] no-underline",
                "transition-colors duration-[120ms] md:w-full",
                active
                  ? "border-line bg-surface font-semibold text-ink shadow-[0_1px_1px_rgba(26,25,23,0.03)]"
                  : "border-transparent bg-transparent font-medium text-ink-2 hover:bg-white/55 hover:text-ink",
              )}
            >
              <Icon
                name={item.icon}
                size={13}
                className={cn(
                  "w-[15px] text-center",
                  active ? "text-accent" : "text-ink-3",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {item.label}
              </span>
              {count ? <CountBadge active={active}>{count}</CountBadge> : null}
            </Link>
          );
        })}
      </div>

      {/* Account row — desktop only. On mobile, log out lives in
          Settings › Account. */}
      <div className="hidden md:flex md:flex-none md:items-center md:gap-[9px] md:border-t md:border-line md:px-[4px] md:pt-[12px] md:pb-[2px]">
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
