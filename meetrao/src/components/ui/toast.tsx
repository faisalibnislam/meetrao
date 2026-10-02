"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icon";

/* Bottom-right, 320px, auto-dismiss after 3200ms, manual dismiss button.
   Four tones, each with its own glyph and colour. */

export type ToastTone = "ok" | "bad" | "warn" | "neutral";

export type Toast = { tone: ToastTone; title: string; text?: string };

const GLYPH: Record<ToastTone, { icon: IconName; className: string }> = {
  ok: { icon: "circle-check", className: "text-accent-ink" },
  bad: { icon: "circle-exclamation", className: "text-red" },
  warn: { icon: "triangle-exclamation", className: "text-amber" },
  neutral: { icon: "circle-info", className: "text-ink-3" },
};

const ToastContext = createContext<(t: Toast) => void>(() => {});

/** `const toast = useToast(); toast({ tone: "ok", title: "Copied", text: link })` */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const push = useCallback((t: Toast) => {
    clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const glyph = toast ? GLYPH[toast.tone] : null;

  return (
    <ToastContext.Provider value={push}>
      {children}
      {toast && glyph ? (
        <div
          role="status"
          aria-live="polite"
          className="app-toast animate-in fixed right-[18px] bottom-[58px] z-130 flex max-w-[320px] items-start gap-[11px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px] shadow-[var(--pop)]"
        >
          <Icon name={glyph.icon} weight="solid" size={13} className={`mt-[1px] flex-none ${glyph.className}`} />
          <div className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-[13px] font-semibold text-ink">{toast.title}</span>
            {toast.text ? (
              <span className="text-[12.5px] leading-[1.45] break-words text-ink-2">{toast.text}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="inline-flex h-[22px] w-[22px] flex-none cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent text-ink-3 hover:bg-fill"
          >
            <Icon name="xmark" size={11} />
          </button>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
