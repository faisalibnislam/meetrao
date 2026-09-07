"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button-style";
import { cn } from "@/lib/cn";

/**
 * The public site's header. Rendered once by `(marketing)/layout.tsx` for the
 * landing page and every standalone public page — the prototype duplicates this
 * markup across five files only because it has no layout primitive.
 *
 * Section links point at the landing page absolutely, so they work from /help
 * or /terms as well as from within the landing page itself.
 */
const SECTION_LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#how", label: "How it works" },
  { href: "/#usecases", label: "Use cases" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-[14px] pt-[12px] sm:px-[26px]">
      <nav
        aria-label="Site"
        className={cn(
          "mx-auto flex max-w-[1200px] items-center gap-[14px] rounded-[14px] border border-line",
          "bg-surface/85 px-[14px] py-[10px] backdrop-blur-[10px] sm:px-[18px]",
          "shadow-[0_1px_2px_rgba(26,25,23,0.04),0_10px_24px_-18px_rgba(26,25,23,0.25)]",
        )}
      >
        <Link
          href="/"
          className="inline-flex min-h-[44px] flex-none items-center no-underline sm:min-h-0"
          aria-label="Meetrao home"
        >
          <Logo height={20} />
        </Link>

        {/* The four section links hide below 720px: four of them plus Log in
            plus the CTA cannot share a phone row, and every destination is
            also in the footer. */}
        <div className="ml-[10px] hidden flex-1 items-center gap-[4px] min-[720px]:flex">
          {SECTION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-[34px] items-center rounded-[7px] px-[10px] text-[13.5px] font-medium text-ink-2 no-underline transition-colors duration-[120ms] hover:bg-fill hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-[9px] min-[720px]:flex">
          <Link
            href="/login"
            className="inline-flex h-[34px] items-center rounded-[7px] px-[10px] text-[13.5px] font-medium text-ink-2 no-underline transition-colors duration-[120ms] hover:bg-fill hover:text-ink"
          >
            Log in
          </Link>
          <Link href="/signup" className={buttonClass({ size: "base" })}>
            Get started
          </Link>
        </div>

        {/* Phone: one 44px control, matching the app shell's drawer pattern. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-nav-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto inline-flex size-[44px] flex-none cursor-pointer items-center justify-center rounded-[8px] border border-line-strong bg-surface text-ink min-[720px]:hidden"
        >
          <span aria-hidden="true" className="relative block size-[18px]">
            <span
              className={cn(
                "absolute left-0 h-[1.5px] w-[18px] rounded-full bg-ink transition-transform duration-[160ms]",
                open ? "top-[8px] rotate-45" : "top-[3px]",
              )}
            />
            <span
              className={cn(
                "absolute left-0 h-[1.5px] w-[18px] rounded-full bg-ink transition-transform duration-[160ms]",
                open ? "top-[8px] -rotate-45" : "top-[13px]",
              )}
            />
          </span>
        </button>
      </nav>

      <div
        id="site-nav-menu"
        hidden={!open}
        className="mx-auto mt-[8px] flex max-w-[1200px] flex-col gap-[2px] rounded-[14px] border border-line bg-surface p-[10px] shadow-[var(--pop)] min-[720px]:hidden"
      >
        {SECTION_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="flex h-[44px] items-center rounded-[8px] px-[12px] text-[14px] font-medium text-ink-2 no-underline hover:bg-fill hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/login"
          onClick={() => setOpen(false)}
          className="flex h-[44px] items-center rounded-[8px] px-[12px] text-[14px] font-medium text-ink-2 no-underline hover:bg-fill hover:text-ink"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          onClick={() => setOpen(false)}
          className={cn(buttonClass({ size: "3xl", full: true }), "mt-[4px]")}
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
