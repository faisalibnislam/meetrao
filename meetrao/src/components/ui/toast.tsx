"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import type { Tone } from "./controls";

type Toast = { tone: Tone; title: string; text: string };

const TONE_GLYPH: Record<Tone, { icon: IconName; className: string }> = {
  ok: { icon: "circleCheck", className: "text-accent" },
  bad: { icon: "circleExclamation", className: "text-red" },
  warn: { icon: "triangleExclamation", className: "text-amber" },
  off: { icon: "circleInfo", className: "text-ink-3" },
};

const AUTO_DISMISS_MS = 3200;

type ToastApi = {
  notify: (tone: Tone, title: string, text: string) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const notify = useCallback((tone: Tone, title: string, text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ tone, title, text });
    timer.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);
  const glyph = toast ? TONE_GLYPH[toast.tone] : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-[18px] bottom-[18px] z-[130] max-w-[320px]"
      >
        {toast && glyph ? (
          <div className="animate-mu-in pointer-events-auto flex items-start gap-[11px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px] shadow-[var(--pop)]">
            <Icon
              name={glyph.icon}
              weight={900}
              size={13}
              className={`${glyph.className} mt-[1px]`}
            />
            <div className="flex min-w-0 flex-col gap-[2px]">
              <span className="text-[13px] font-semibold text-ink">
                {toast.title}
              </span>
              <span className="text-[12.5px] leading-[1.45] break-words text-ink-2">
                {toast.text}
              </span>
            </div>
            <button
              type="button"
              onClick={dismiss}
              title="Dismiss"
              aria-label="Dismiss notification"
              className="inline-flex size-[22px] flex-none cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent text-ink-3 hover:bg-fill"
            >
              <Icon name="close" size={11} />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
