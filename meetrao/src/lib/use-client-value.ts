"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Reading values only the browser can know — the visitor's timezone, a media
   query, the current time — without a hydration mismatch and without a
   set-state-in-effect cascade.

   `useSyncExternalStore` is the right tool: it renders the server value during
   hydration and the real one immediately afterwards, in one pass.
   ───────────────────────────────────────────────────────────────────────────── */

const noopSubscribe = () => () => {};

/**
 * A stable browser-only value. `compute` must return the same result for the
 * same browser state — it is called on every render.
 */
export function useClientValue<T>(compute: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, compute, () => serverValue);
}

/** True when the media query matches. False during server render. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * The current time, re-read every `intervalMs`. The snapshot is cached in a ref
 * so repeated renders see the same Date object — returning a fresh one each
 * call would loop forever.
 */
export function useNow(intervalMs: number, serverNow: Date): Date {
  const snapshot = useRef<Date>(serverNow);

  const subscribe = useCallback(
    (onChange: () => void) => {
      snapshot.current = new Date();
      onChange();
      const id = setInterval(() => {
        snapshot.current = new Date();
        onChange();
      }, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );

  return useSyncExternalStore(
    subscribe,
    () => snapshot.current,
    () => serverNow,
  );
}
