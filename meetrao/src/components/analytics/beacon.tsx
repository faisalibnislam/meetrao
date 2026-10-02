"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   The page-view beacon.

   Sends two strings (the path and, once, the referrer) to
   /api/analytics/collect, which is where every decision about what is actually
   stored lives. Nothing is read from the browser and nothing is written to it:
   no cookie, no localStorage, no identifier. That is why this needs no consent
   banner, and it is a property of this file as much as of the route.

   Mounted in the root layout, which means it would otherwise fire on the host's
   own dashboard too. It does not, see SKIP.
   ───────────────────────────────────────────────────────────────────────────── */

const ENDPOINT = "/api/analytics/collect";

/* The signed-in product. Not recorded at all.

   Two reasons, and the first is the one that matters: on a single-operator
   product the owner is most of the traffic, and a graph that counts their own
   tab-clicking tells them about their own habits instead of about visitors.
   The second is that these paths carry ids (/meetings/<uuid>/edit) and a path
   column that accumulates them is a list of somebody's meetings.

   Anchored at the start and matched against the pathname only, so /booking and
   /bookings cannot be confused: a guest's /booking/<ref> IS recorded, a host's
   /bookings list is not. */
const SKIP = [
  /^\/dashboard(\/|$)/,
  /^\/bookings(\/|$)/,
  /^\/meetings(\/|$)/,
  /^\/contacts(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/availability(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/preview(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/api(\/|$)/,
];

export function AnalyticsBeacon() {
  const pathname = usePathname();
  /* Null until the first view has been sent. Doubles as the "is this the first
     view" flag below, so the two never disagree. */
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastSent.current === pathname) return;
    if (SKIP.some((skip) => skip.test(pathname))) return;

    const first = lastSent.current === null;
    lastSent.current = pathname;

    /* The referrer goes with the FIRST view only.

       Document.referrer does not change during client-side navigation, so
       sending it every time would credit google.com with the visitor's whole
       session, five internal clicks reported as five arrivals from Google.
       Subsequent views send nothing, which the route reads as direct. */
    const body = JSON.stringify({ path: pathname, referrer: first ? document.referrer : "" });

    try {
      /* text/plain keeps the request CORS-simple, which is what lets
         sendBeacon send it at all; the body is still JSON and the route parses
         it as such. sendBeacon is preferred because it survives the page being
         closed. A visitor who reads the landing page and leaves is the exact
         visitor a fetch would lose. */
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon?.(ENDPOINT, blob)) return;

      void fetch(ENDPOINT, {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "text/plain;charset=UTF-8" },
      }).catch(() => {
        /* A page view that fails to record is not worth a console entry on
           somebody else's machine. */
      });
    } catch {
      /* Private modes and hardened browsers block both. Nothing to do, and
         nothing about the page should change because of it. */
    }
  }, [pathname]);

  return null;
}
