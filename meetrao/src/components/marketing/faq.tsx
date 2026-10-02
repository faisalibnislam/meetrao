"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

import { FAQS } from "@/lib/faq";

export function Faq() {
  const [open, setOpen] = useState("what");

  const columns = [FAQS.slice(0, 7), FAQS.slice(7)];

  return (
    <div className="mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-[14px]">
      {columns.map((items, ci) => (
        <div
          key={ci}
          className="min-w-0 self-start overflow-hidden rounded-[14px] border border-line bg-surface"
        >
          {items.map(([key, question, answer], i) => {
            const isOpen = open === key;
            return (
              <div
                key={key}
                className={cx("flex flex-col", i > 0 && "border-t border-line-soft", isOpen && "bg-fill")}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? "" : key)}
                  className="box-border flex w-full cursor-pointer items-center gap-[14px] border-0 bg-transparent px-[18px] py-[15px] font-sans text-[14px] font-semibold text-ink transition-colors duration-[120ms] hover:bg-fill"
                >
                  <span className="min-w-0 flex-1 text-left">{question}</span>
                  <Icon
                    name="plus"
                    size={12}
                    className={cx(
                      "flex-none transition-transform duration-[180ms] ease-[cubic-bezier(.22,1,.36,1)]",
                      isOpen ? "rotate-45 text-accent-ink" : "text-ink-3",
                    )}
                  />
                </button>

                {isOpen ? (
                  <div className="animate-in px-[18px] pb-[16px]">
                    <span className="block text-[13.5px] leading-[1.65] text-pretty text-ink-2">{answer}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
