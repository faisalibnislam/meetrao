"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Sidebar — 218px, #EFEDE7, one border to the right.

   Below 820px it becomes a horizontal bar with a hamburger drawer. That switch
   is CSS, not JS: the DOM is identical either way, so there is no frame where
   the layout is unstyled. Only the drawer's open state and the account menu
   need state.

   Settings is NOT a nav row — it lives in the account menu. The admin console
   keeps its own Settings row, because that is a different screen; an account
   menu offering Settings as well would give an admin two identical adjacent
   rows, the second dropping them out of the console.
   ───────────────────────────────────────────────────────────────────────────── */

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  count?: number | null;
  /** Extra paths that keep this row active (e.g. /meetings/new under Meetings). */
  match?: string[];
  /** Only the exact path activates the row — for an index like /admin. */
  exact?: boolean;
};

export function Sidebar({
  items,
  name,
  email,
  isAdmin,
  onSignOut,
}: {
  items: NavItem[];
  name: string;
  email: string;
  isAdmin: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen && !menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, menuOpen]);

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (!item.exact && pathname.startsWith(`${item.href}/`)) ||
    (item.match ?? []).some((m) => pathname === m || pathname.startsWith(`${m}/`));

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      className={cx(
        "flex-none border-line",
        // desktop
        "box-border flex w-[218px] flex-col border-r bg-sidebar pt-[14px] pr-[12px] pb-[58px] pl-[12px]",
        // mobile: a bar above the content
        "max-[820px]:relative max-[820px]:z-70 max-[820px]:w-full max-[820px]:flex-row max-[820px]:items-center",
        "max-[820px]:gap-[10px] max-[820px]:border-r-0 max-[820px]:border-b max-[820px]:bg-ground max-[820px]:p-[8px_12px]",
      )}
    >
      <div className="flex items-center justify-between gap-[8px] px-[4px] pt-[2px] pb-[16px] max-[820px]:flex-none max-[820px]:gap-[8px] max-[820px]:p-0">
        <Logo height={20} />
        {isAdmin ? (
          <span className="inline-flex h-[18px] items-center rounded-[4px] border border-line-strong px-[6px] font-mono text-[10px] tracking-[0.08em] text-ink-2">
            ADMIN
          </span>
        ) : null}
      </div>

      <button
        type="button"
        aria-expanded={drawerOpen}
        aria-label={drawerOpen ? "Close menu" : "Open menu"}
        onClick={() => setDrawerOpen((v) => !v)}
        className={cx(
          "ml-auto hidden h-[44px] w-[44px] flex-none cursor-pointer flex-col items-center justify-center gap-[4px]",
          "rounded-[9px] border border-line-strong p-0 transition-colors duration-[140ms] max-[820px]:flex",
          drawerOpen ? "bg-fill-2" : "bg-surface",
        )}
      >
        <span
          aria-hidden="true"
          className="block h-[2px] w-[17px] rounded-[1px] bg-ink transition-transform duration-[200ms] ease-[cubic-bezier(.22,1,.36,1)]"
          style={drawerOpen ? { transform: "translateY(6px) rotate(45deg)" } : undefined}
        />
        <span
          aria-hidden="true"
          className="block h-[2px] w-[17px] rounded-[1px] bg-ink transition-opacity duration-[140ms]"
          style={{ opacity: drawerOpen ? 0 : 1 }}
        />
        <span
          aria-hidden="true"
          className="block h-[2px] w-[17px] rounded-[1px] bg-ink transition-transform duration-[200ms] ease-[cubic-bezier(.22,1,.36,1)]"
          style={drawerOpen ? { transform: "translateY(-6px) rotate(-45deg)" } : undefined}
        />
      </button>

      <div
        className={cx(
          "flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto",
          // mobile drawer
          "max-[820px]:absolute max-[820px]:top-full max-[820px]:right-0 max-[820px]:left-0 max-[820px]:z-70",
          "max-[820px]:max-h-[calc(100vh-120px)] max-[820px]:gap-[3px] max-[820px]:border-b max-[820px]:border-line",
          "max-[820px]:bg-surface max-[820px]:p-[10px] max-[820px]:shadow-[var(--pop)]",
          drawerOpen ? "max-[820px]:animate-in max-[820px]:flex" : "max-[820px]:hidden",
        )}
      >
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "unlink box-border flex w-full items-center gap-[10px] rounded-[6px] border text-[13px]",
                "transition-[background-color,color] duration-[120ms] ease-[ease]",
                "h-[32px] px-[9px] max-[820px]:h-auto max-[820px]:min-h-[44px] max-[820px]:px-[12px]",
                active
                  ? "border-line bg-surface font-semibold text-ink shadow-[var(--nav-shadow)]"
                  : "border-transparent bg-transparent font-medium text-ink-2 hover:bg-white/55 hover:text-ink",
              )}
            >
              <Icon
                name={item.icon}
                size={13}
                className={cx("w-[15px] flex-none", active ? "text-accent" : "text-ink-3")}
              />
              <span className="min-w-0 flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap">
                {item.label}
              </span>
              {item.count ? (
                <span
                  className={cx(
                    "inline-flex h-[17px] min-w-[18px] flex-none items-center justify-center rounded-[4px] px-[5px] text-[10.5px] font-semibold",
                    active ? "bg-ink text-white" : "bg-fill-2 text-ink-2",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          );
        })}

        {/* Mobile only: the account block below is hidden at this width, so
            without these Settings and Log out are unreachable on a phone. */}
        <div className="hidden max-[820px]:block">
          <div className="mt-[8px] flex items-center gap-[11px] border-t border-line-soft px-[12px] pt-[12px] pb-[11px]">
            <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-[12px] font-bold text-accent">
              {initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
              <span className="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-ink">
                {name}
              </span>
              <span className="overflow-hidden text-[11.5px] text-ellipsis whitespace-nowrap text-ink-3">
                {email}
              </span>
            </span>
          </div>
          {!isAdmin ? <DrawerLink href="/settings" icon="gear" label="Settings" /> : null}
          <DrawerLink href="/help" icon="circle-question" label="Help centre" />
          <DrawerLink href="/support" icon="envelope" label="Contact support" />
          <button type="button" onClick={onSignOut} className={drawerItem}>
            <Icon name="sign-out" size={13} className="w-[16px] flex-none text-ink-3" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      <div className="relative mt-auto flex flex-none items-center gap-[9px] border-t border-line px-[4px] pt-[12px] pb-[2px] max-[820px]:hidden">
        <div className="relative w-full">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
            className={cx(
              "box-border flex w-full cursor-pointer items-center gap-[9px] rounded-[7px] border p-[6px]",
              "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
              menuOpen ? "border-line bg-surface" : "border-transparent bg-transparent hover:bg-white/55",
            )}
          >
            <span className="inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[5px] bg-accent-soft text-[11px] font-bold text-accent">
              {initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="overflow-hidden text-left text-[12.5px] font-semibold text-ellipsis whitespace-nowrap text-ink">
                {name}
              </span>
              <span className="overflow-hidden text-left text-[11.5px] text-ellipsis whitespace-nowrap text-ink-3">
                {email}
              </span>
            </span>
            <Icon
              name="chevron-down"
              size={9}
              className="flex-none text-ink-3 transition-transform duration-[140ms]"
              style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="animate-in absolute bottom-[calc(100%+6px)] left-0 z-95 w-full min-w-[190px] rounded-[8px] border border-line bg-surface p-[6px] shadow-[var(--pop)]"
            >
              {!isAdmin ? <MenuLink href="/settings" icon="gear" label="Settings" /> : null}
              <MenuLink href="/help" icon="circle-question" label="Help centre" />
              <MenuLink href="/support" icon="envelope" label="Support" />
              <span aria-hidden="true" className="mx-[2px] my-[5px] block h-[1px] bg-line-soft" />
              <button type="button" role="menuitem" onClick={onSignOut} className={menuItem}>
                <Icon name="sign-out" size={12} className="w-[15px] flex-none text-ink-3" />
                <span>Log out</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

const menuItem =
  "unlink box-border flex h-[32px] w-full cursor-pointer items-center gap-[10px] rounded-[6px] border-0 " +
  "bg-transparent px-[8px] text-left font-sans text-[13px] font-medium text-ink hover:bg-fill";

const drawerItem =
  "unlink box-border flex min-h-[44px] w-full cursor-pointer items-center gap-[11px] rounded-[8px] border-0 " +
  "bg-transparent px-[12px] text-left font-sans text-[13.5px] font-medium text-ink hover:bg-fill";

function MenuLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} role="menuitem" className={menuItem}>
      <Icon name={icon} size={12} className="w-[15px] flex-none text-ink-3" />
      <span>{label}</span>
    </Link>
  );
}

function DrawerLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className={drawerItem}>
      <Icon name={icon} size={13} className="w-[16px] flex-none text-ink-3" />
      <span>{label}</span>
    </Link>
  );
}
