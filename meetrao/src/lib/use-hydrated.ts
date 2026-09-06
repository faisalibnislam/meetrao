"use client";

import { useSyncExternalStore } from "react";

/** Never fires — the value flips once, at hydration, and then never changes. */
const subscribe = () => () => {};

/**
 * `false` during SSR and the first client render, `true` afterwards.
 *
 * This is how to render something the server cannot know — the viewer's
 * timezone, the current time — without a hydration mismatch and without a
 * `setState` inside an effect. The first paint matches the server HTML; React
 * then re-renders with the real value.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
