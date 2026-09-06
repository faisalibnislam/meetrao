"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SETTINGS_TABS } from "@/lib/settings-tabs";

/**
 * Sticky 2px-left-border sub-nav on desktop; a horizontal chip row on mobile.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const current = pathname.split("/")[2] ?? "profile";

  return (
    <nav
      aria-label="Settings"
      className="no-scrollbar flex gap-[4px] overflow-x-auto pb-[2px] md:sticky md:top-0 md:flex-col md:gap-[2px] md:overflow-visible md:pb-0"
    >
      {SETTINGS_TABS.map((tab) => {
        const on = current === tab.slug;
        return (
          <Link
            key={tab.slug}
            href={`/settings/${tab.slug}`}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex h-[30px] flex-none items-center text-[13px] whitespace-nowrap no-underline transition-colors duration-[120ms]",
              // Mobile chip
              "rounded-[6px] border px-[11px]",
              on
                ? "border-line bg-surface font-semibold text-ink"
                : "border-transparent bg-transparent font-medium text-ink-2 hover:text-ink",
              // Desktop rail
              "md:rounded-none md:border-0 md:border-l-2 md:bg-transparent md:px-[10px] md:text-left",
              on ? "md:border-l-ink" : "md:border-l-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
