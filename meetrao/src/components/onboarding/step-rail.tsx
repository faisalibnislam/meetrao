"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { cx } from "@/lib/cx";

/* The fixed top rail: logo, a five-node step tracker, and an account button.
   On mobile the node labels hide and the connectors shorten. */

const STEPS = ["Your link", "Calendar", "Meeting", "Hours", "Ready"] as const;

export function StepRail({
  step,
  name,
  email,
  onSignOut,
}: {
  step: number;
  name: string;
  email: string;
  onSignOut: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
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
    <div className="flex items-center justify-between gap-[16px] border-b border-line px-[22px] py-[13px] max-[820px]:px-[16px]">
      <Logo height={21} />

      <div className="ml-auto flex min-w-0 items-center gap-[14px]">
        <Eyebrow size={10.5} className="whitespace-nowrap">
          Step {step} / 5
        </Eyebrow>

        <ol className="flex min-w-0 list-none items-center p-0" aria-label="Setup progress">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li
                key={label}
                className={cx("flex flex-none items-center", current && "gap-[8px]")}
                aria-current={current ? "step" : undefined}
              >
                {n > 1 ? (
                  <span
                    aria-hidden="true"
                    className={cx(
                      "h-[2px] w-[18px] flex-none max-[820px]:w-[10px]",
                      done || current ? "bg-accent" : "bg-line-strong",
                    )}
                  />
                ) : null}
                <span
                  className={cx(
                    "box-border inline-flex flex-none items-center justify-center rounded-full border font-semibold transition-all duration-[160ms]",
                    current ? "h-[22px] w-[22px] text-[11px]" : "h-[18px] w-[18px] text-[10px]",
                    done && "border-accent bg-accent text-white",
                    current && "border-accent bg-accent text-white shadow-[0_0_0_3px_var(--accent-soft)]",
                    !done && !current && "border-line-strong bg-surface text-ink-3",
                  )}
                >
                  {done ? <Icon name="check" weight="solid" size={8} /> : n}
                </span>
                {current ? (
                  <span className="text-[12.5px] font-semibold whitespace-nowrap text-ink max-[820px]:hidden">
                    {label}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>

        <span aria-hidden="true" className="h-[22px] w-[1px] flex-none bg-line" />

        <div ref={box} className="relative flex-none">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            title="Account"
            onClick={() => setOpen((v) => !v)}
            className={cx(
              "inline-flex h-[34px] cursor-pointer items-center gap-[7px] rounded-[8px] border bg-surface pr-[8px] pl-[5px]",
              "transition-colors duration-[120ms]",
              open ? "border-line-strong" : "border-line hover:border-line-strong",
            )}
          >
            <span className="inline-flex h-[24px] w-[24px] flex-none items-center justify-center rounded-[5px] bg-accent-soft text-[10.5px] font-bold text-accent">
              {initials}
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
              className="animate-in absolute top-[calc(100%+7px)] right-0 z-95 min-w-[210px] rounded-[8px] border border-line bg-surface p-[6px] shadow-[var(--pop)]"
            >
              <div className="flex flex-col gap-[1px] px-[8px] pt-[6px] pb-[8px]">
                <span className="overflow-hidden text-[12.5px] font-semibold text-ellipsis whitespace-nowrap text-ink">
                  {name}
                </span>
                <span className="overflow-hidden text-[11.5px] text-ellipsis whitespace-nowrap text-ink-3">
                  {email}
                </span>
              </div>
              <span aria-hidden="true" className="mx-[2px] mb-[5px] block h-[1px] bg-line-soft" />
              <Link href="/help" role="menuitem" className={item} target="_blank" rel="noopener noreferrer">
                <Icon name="circle-question" size={12} className="w-[15px] flex-none text-ink-3" />
                <span>Help centre</span>
              </Link>
              <Link href="/support" role="menuitem" className={item}>
                <Icon name="envelope" size={12} className="w-[15px] flex-none text-ink-3" />
                <span>Support</span>
              </Link>
              <button type="button" role="menuitem" onClick={onSignOut} className={item}>
                <Icon name="sign-out" size={12} className="w-[15px] flex-none text-ink-3" />
                <span>Log out</span>
              </button>
              <span className="block px-[8px] pt-[7px] pb-[4px] text-[11.5px] leading-[1.45] text-ink-3">
                Your progress is saved. You can finish setting up later.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const item =
  "unlink box-border flex h-[32px] w-full cursor-pointer items-center gap-[10px] rounded-[6px] border-0 " +
  "bg-transparent px-[8px] text-left font-sans text-[13px] font-medium text-ink hover:bg-fill";
