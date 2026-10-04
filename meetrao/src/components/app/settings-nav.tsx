"use client";

import Link from "next/link";
import { cx } from "@/lib/cx";
import { type SettingsTab } from "@/lib/settings-tabs";


/* A sticky sub-nav on desktop, a horizontal chip row on mobile. Real links, so
   each panel has its own URL and the browser's back button behaves.

   The tabs are passed in rather than imported: which ones exist depends on the
   workspace in force, and that is decided on the server where the cookie is
   read. */
export function SettingsNav({
  current,
  tabs,
}: {
  current: SettingsTab;
  tabs: readonly { key: string; label: string }[];
}) {
  return (
    <nav
      aria-label="Settings"
      className={cx(
        "flex flex-col gap-[2px] sticky top-0",
        /* w-full and min-w-0 on phones, or the strip takes its natural width
           and the whole page pans sideways: the wrapper's desktop `items-start`
           carries into the stacked layout, so nothing stretches this to fit.
           It scrolls inside itself instead, which is what overflow-x was for. */
        "max-[820px]:flex-row max-[820px]:gap-[4px] max-[820px]:overflow-x-auto max-[820px]:pb-[2px] max-[820px]:w-full max-[820px]:min-w-0",
      )}
    >
      {tabs.map((tab) => {
        const on = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={`/settings/${tab.key}`}
            aria-current={on ? "page" : undefined}
            className={cx(
              "unlink flex h-[30px] items-center border-0 bg-transparent px-[10px] text-left font-sans text-[13px]",
              "transition-colors duration-[120ms] border-l-2",
              on ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-ink-2 hover:text-ink",
              // mobile: a chip row, so the left border becomes a full outline
              "max-[820px]:inline-flex max-[820px]:flex-none max-[820px]:rounded-[6px] max-[820px]:border max-[820px]:px-[11px] max-[820px]:whitespace-nowrap",
              on
                ? "max-[820px]:border-line max-[820px]:bg-surface"
                : "max-[820px]:border-transparent max-[820px]:bg-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
