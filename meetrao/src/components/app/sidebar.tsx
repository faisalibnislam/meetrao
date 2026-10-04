"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, Eyebrow } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { Logo } from "@/components/ui/logo";
import { cx } from "@/lib/cx";
import { SidebarUpgrade } from "./upgrade";

/* ─────────────────────────────────────────────────────────────────────────────
   Sidebar, 218px, #EFEDE7, one border to the right.

   Below 820px it becomes a horizontal bar with a hamburger drawer. That switch
   is CSS, not JS: the DOM is identical either way, so there is no frame where
   the layout is unstyled. Only the drawer's open state and the account menu
   need state.

   Below the nav the rail carries two things the product already knows: a way to
   create a meeting, and every bookable link. Four nav rows left roughly 600px of
   bare #EFEDE7 above the account block; these fill it with work rather than
   decoration. Nothing here is new state (the links are the meeting types.

   Settings is NOT a nav row) it lives in the account menu. The admin console
   keeps its own Settings row, because that is a different screen; an account
   menu offering Settings as well would give an admin two identical adjacent
   rows, the second dropping them out of the console.
   ───────────────────────────────────────────────────────────────────────────── */

/** One bookable link. `id` "all" is the account link that offers every type. */
export type BookingLink = { id: string; name: string; link: string };

/** Past this many rows the list stops and offers Meetings instead, so a host
    with a dozen meeting types cannot push the account block off the bottom. */
const LINK_CAP = 4;

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  count?: number | null;
  /** Extra paths that keep this row active (e.g. /meetings/new under Meetings). */
  match?: string[];
  /** Only the exact path activates the row, for an index like /admin. */
  exact?: boolean;
};

export function Sidebar({
  items,
  name,
  email,
  isAdmin,
  avatarUrl,
  links = [],
  onSignOut,
  showUpgrade = false,
}: {
  items: NavItem[];
  name: string;
  email: string;
  isAdmin: boolean;
  /** Free accounts only. The single standing upsell in the whole app. */
  showUpgrade?: boolean;
  avatarUrl?: string | null;
  /** Account link first, then one row per active meeting type. */
  links?: BookingLink[];
  onSignOut: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyLink(row: BookingLink) {
    await navigator.clipboard?.writeText(`https://${row.link}`).catch(() => {});
    clearTimeout(copyTimer.current);
    setCopied(row.id);
    toast({ tone: "ok", title: "Copied", text: row.link });
    copyTimer.current = setTimeout(() => setCopied(null), 1800);
  }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const navRef = useRef<HTMLElement>(null);

  // Navigating closes both menus. Adjusted during render rather than in an
  // effect, so the open menu never paints for a frame on the new route.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawerOpen(false);
    setMenuOpen(false);
  }

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
        // pb mirrors pt. The design file says `padding:14px 12px 58px`, and 58px
        // left the account block floating ~60px clear of the bottom edge,
        // measured, not guessed. Deliberate departure from the token.
        "box-border flex w-[218px] flex-col border-r bg-sidebar pt-[14px] pr-[12px] pb-[14px] pl-[12px]",
        // mobile: a bar above the content
        "max-[820px]:relative max-[820px]:z-70 max-[820px]:w-full max-[820px]:flex-row max-[820px]:items-center",
        "max-[820px]:gap-[10px] max-[820px]:border-r-0 max-[820px]:border-b max-[820px]:bg-ground max-[820px]:p-[8px_12px]",
      )}
    >
      <div className="flex items-center justify-between gap-[8px] px-[4px] pt-[2px] pb-[16px] max-[820px]:flex-none max-[820px]:gap-[8px] max-[820px]:p-0">
        <Logo height={20} />
        {isAdmin ? (
          <span className="inline-flex h-[18px] items-center rounded-[4px] border border-line-strong px-[6px] text-[10px] tracking-[0.08em] text-ink-2">
            ADMIN
          </span>
        ) : null}
      </div>

      {/* The everyday action gets the rail's one primary slot. Creating a
          meeting TYPE is setup, done rarely, and already has a button on the
          Meetings screen, its empty state and the dashboard's. A second copy
          here would crowd out the thing a host does most days.
          Hidden on the mobile bar; the drawer below carries its own row. */}
      <Link
        href="/bookings/new"
        className="unlink mb-[12px] box-border inline-flex h-[32px] w-full items-center justify-center gap-[7px] rounded-[6px] border border-accent bg-accent px-[11px] text-[12.5px] font-semibold text-on-accent transition-colors duration-[120ms] hover:border-accent-2 hover:bg-accent-2 hover:text-on-accent max-[820px]:hidden"
      >
        <Icon name="user-plus" size={12} />
        Invite to Meet
      </Link>

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
              <NavIcon name={item.icon} active={active} />
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
            {avatarUrl ? (
              <Avatar name={name} size={32} src={avatarUrl} />
            ) : (
              <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-[12px] font-bold text-accent-ink">
                {initials}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
              <span className="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-ink">
                {name}
              </span>
              <span className="overflow-hidden text-[11.5px] text-ellipsis whitespace-nowrap text-ink-3">
                {email}
              </span>
            </span>
          </div>
          {!isAdmin ? <DrawerLink href="/bookings/new" icon="user-plus" label="Invite to Meet" /> : null}
          {!isAdmin ? <DrawerLink href="/settings" icon="gear" label="Settings" /> : null}
          <DrawerLink href="/help" icon="circle-question" label="Help centre" newTab />
          <DrawerLink href="/support" icon="envelope" label="Contact support" />
          <button type="button" onClick={onSignOut} className={drawerItem}>
            <Icon name="sign-out" size={13} className="w-[16px] flex-none text-ink-3" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {links.length ? (
        <div className="mt-auto flex flex-none flex-col gap-[7px] pt-[16px] pb-[12px] max-[820px]:hidden">
          <Eyebrow size={10.5} className="px-[4px]">
            {links.length > 2 ? "Your links" : "Your link"}
          </Eyebrow>
          <div className="overflow-hidden rounded-[6px] border border-line bg-white/55">
            {links.slice(0, LINK_CAP + 1).map((row, i) => (
              <button
                key={row.id}
                type="button"
                onClick={() => void copyLink(row)}
                title={`Copy ${row.link}`}
                className={cx(
                  "flex w-full cursor-pointer items-center gap-[8px] border-0 bg-transparent px-[9px] py-[7px] text-left hover:bg-white/70",
                  i > 0 && "border-t border-line-soft",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
                  <span className="overflow-hidden text-[12px] font-semibold text-ellipsis whitespace-nowrap text-ink">
                    {row.name}
                  </span>
                  <span className="overflow-hidden text-[10.5px] text-ellipsis whitespace-nowrap text-ink-3">
                    {row.id === "all" ? row.link : `/${row.link.split("/").pop()}`}
                  </span>
                </span>
                <Icon
                  name={copied === row.id ? "check" : "copy"}
                  weight={copied === row.id ? "solid" : "light"}
                  size={10}
                  className={cx("flex-none", copied === row.id ? "text-accent-ink" : "text-ink-3")}
                />
              </button>
            ))}
            {links.length > LINK_CAP + 1 ? (
              <Link
                href="/meetings"
                className="unlink block border-t border-line-soft px-[9px] py-[7px] text-[11px] font-medium text-ink-3 hover:bg-white/70 hover:text-ink"
              >
                +{links.length - LINK_CAP - 1} more in Meetings
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {showUpgrade ? <SidebarUpgrade /> : null}

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
            {avatarUrl ? (
              <Avatar name={name} size={26} src={avatarUrl} />
            ) : (
              <span className="inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[5px] bg-accent-soft text-[11px] font-bold text-accent-ink">
                {initials}
              </span>
            )}
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
              <MenuLink href="/help" icon="circle-question" label="Help centre" newTab />
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

/**
 * A nav row's icon, which doubles as its pending indicator.
 *
 * Every app route now has a loading.tsx, so a click usually paints a skeleton
 * within a few milliseconds and this never becomes visible. The CSS holds it
 * back for 120ms for exactly that reason. It earns its place in the cases a
 * skeleton cannot cover: the first click after a cold start, or a prefetch that
 * has not finished on a slow connection, where the rail would otherwise sit
 * completely inert while the content area waits.
 *
 * It is the icon rather than an added dot deliberately. The rail is 218px wide
 * and the labels already ellipsis; a 5px dot plus its gap would take 15px off
 * every label forever, to show something that is usually invisible. Recolouring
 * a glyph that is always there costs no layout at all.
 *
 * useLinkStatus only reports from inside a <Link>, so this has to be its own
 * component rather than a value read in the row above.
 */
function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span data-pending={pending} className="nav-hint-slot flex w-[15px] flex-none items-center justify-center">
      <Icon name={name} size={13} className={cx(active ? "text-accent-ink" : "text-ink-3")} />
    </span>
  );
}

const menuItem =
  "unlink box-border flex h-[32px] w-full cursor-pointer items-center gap-[10px] rounded-[6px] border-0 " +
  "bg-transparent px-[8px] text-left font-sans text-[13px] font-medium text-ink hover:bg-fill";

const drawerItem =
  "unlink box-border flex min-h-[44px] w-full cursor-pointer items-center gap-[11px] rounded-[8px] border-0 " +
  "bg-transparent px-[12px] text-left font-sans text-[13.5px] font-medium text-ink hover:bg-fill";

/* `newTab` is for the Help centre. Reading an answer should not close the
   screen the question is about, and coming back should not mean losing it. */
function MenuLink({
  href,
  icon,
  label,
  newTab,
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
      className={menuItem}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <Icon name={icon} size={12} className="w-[15px] flex-none text-ink-3" />
      <span className="flex-1">{label}</span>
      {newTab ? <Icon name="external-link" size={10} className="flex-none text-ink-3" /> : null}
    </Link>
  );
}

function DrawerLink({
  href,
  icon,
  label,
  newTab,
}: {
  href: string;
  icon: IconName;
  label: string;
  newTab?: boolean;
}) {
  return (
    <Link
      href={href}
      className={drawerItem}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <Icon name={icon} size={13} className="w-[16px] flex-none text-ink-3" />
      <span className="flex-1">{label}</span>
      {newTab ? <Icon name="external-link" size={10} className="flex-none text-ink-3" /> : null}
    </Link>
  );
}
